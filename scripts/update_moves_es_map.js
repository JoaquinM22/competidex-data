"use strict";

/*
  Versionado con limpieza (Moves ES map) + BOOTSTRAP:
  - Lee public/moves/manifest.json -> moves_url actual (puede ser null / faltar / archivo faltante)
  - Si hay archivo actual: lo carga. Si no hay: arranca con map vacío (bootstrap)
  - Chequeo liviano: GET /move?limit=1 (count)
    - Si hay mapa previo y count <= localCount => no hace nada
    - Si no hay mapa previo (bootstrap) => siempre continúa
  - Mantiene un índice local de /machine en public/moves/machines_index.json
  - Sincroniza máquinas de forma incremental por defecto
  - Hace rebuild completo del índice de /machine solo si pasó 12 meses o si hace falta por seguridad
  - Trae índice completo /move?limit=100000
  - Agrega faltantes o migra entradas viejas con pool
  - Enriquce cada move con id + display ES + type + damage_class + isContact + power + accuracy + pp + machinesByGroup
  - Escribe NUEVO move_es_map.YYYY-MM-DD.json
  - Actualiza manifest.json a ese nuevo archivo
  - Borra el archivo viejo (si existía y es distinto)
*/

const { readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs");
const { join } = require("path");

const API = "https://pokeapi.co/api/v2";
const SHOWDOWN_MOVES_URL = "https://play.pokemonshowdown.com/data/moves.json";
const MACHINE_API = `${API}/machine`;
const MACHINE_CACHE_FILE = "machines_index.json";
const MACHINE_REBUILD_DAYS = 365;

function readJSON(p)
{
    return JSON.parse(readFileSync(p, "utf8"));
}

function writeJSON(p, obj)
{
    writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function todayISO()
{
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseISODateUTC(dateStr)
{
    if(!dateStr || typeof dateStr !== "string")
    {
        return null;
    }

    const d = new Date(`${dateStr}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
}

function daysBetweenUTC(fromDate, toDate)
{
    const ms = toDate.getTime() - fromDate.getTime();
    return Math.floor(ms / 86400000);
}

function getCountFromListResponse(listJson)
{
    const c = listJson && typeof listJson.count === "number" ? listJson.count : null;
    return c !== null && isFinite(c) ? c : null;
}

async function getJson(url)
{
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if(!res.ok) throw new Error(`HTTP ${res.status} GET ${url}`);
    return res.json();
}

function pickSpanishName(mvJson)
{
    const arr = mvJson && mvJson.names ? mvJson.names : [];

    for(let i = 0; i < arr.length; i++)
    {
        const n = arr[i];
        if(n && n.language && n.language.name === "es" && n.name)
        {
            return n.name;
        }
    }

    return null;
}

function pickNumberField(mvJson, fieldName)
{
    return mvJson && typeof mvJson[fieldName] === "number" ? mvJson[fieldName] : null;
}

function hasOwn(obj, key)
{
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function isMoveV2Record(record)
{
    if(!record || typeof record !== "object")
    {
        return false;
    }

    return hasOwn(record, "id") &&
        hasOwn(record, "display") &&
        hasOwn(record, "type") &&
        hasOwn(record, "damage_class") &&
        hasOwn(record, "isContact") &&
        hasOwn(record, "power") &&
        hasOwn(record, "accuracy") &&
        hasOwn(record, "pp") &&
        hasOwn(record, "machinesByGroup");
}

function needsMoveRefresh(record)
{
    if(!record || typeof record !== "object")
    {
        return true;
    }

    if(!isMoveV2Record(record))
    {
        return true;
    }

    return record.display === null || typeof record.display === "undefined";
}

function normalizeShowdownKey(name)
{
    return String(name || "").toLowerCase().replace(/-/g, "");
}

function buildShowdownIndex(showdownJson)
{
    const index = {};
    const entries = showdownJson && typeof showdownJson === "object" ? Object.entries(showdownJson) : [];

    for(const [key, value] of entries)
    {
        index[normalizeShowdownKey(key)] = value;
    }

    return index;
}

function getShowdownMove(showdownIndex, pokeApiName)
{
    return showdownIndex[normalizeShowdownKey(pokeApiName)] || null;
}

function getIsContact(showdownIndex, pokeApiName)
{
    const mv = getShowdownMove(showdownIndex, pokeApiName);

    if(!mv)
    {
        return null;
    }

    return !!(mv.flags && Object.prototype.hasOwnProperty.call(mv.flags, "contact"));
}

function toSpanishMachineName(itemName)
{
    const name = String(itemName || "");

    if(/^tm\d+$/i.test(name))
    {
        return `MT${name.slice(2)}`;
    }

    if(/^tr\d+$/i.test(name))
    {
        return `DT${name.slice(2)}`;
    }

    if(/^hm\d+$/i.test(name))
    {
        return `MO${name.slice(2)}`;
    }

    return name.toUpperCase();
}

function upsertMachineIndexEntry(index, machine)
{
    const moveName = machine && machine.move && machine.move.name ? machine.move.name : null;
    const groupName = machine && machine.version_group && machine.version_group.name ? machine.version_group.name : null;
    const machineName = machine && machine.item && machine.item.name ? machine.item.name : null;

    if(!moveName || !groupName || !machineName)
    {
        return false;
    }

    if(!index[moveName])
    {
        index[moveName] = {};
    }

    index[moveName][groupName] = {
        machine: machineName,
        machine_es: toSpanishMachineName(machineName),
    };

    return true;
}

function buildMachinesByGroup(moveName, machineIndex, moveJson)
{
    const byGroup = {};
    const moveMachines = moveJson && Array.isArray(moveJson.machines) ? moveJson.machines : [];
    const indexedGroups = machineIndex && machineIndex[moveName] ? machineIndex[moveName] : {};

    for(let i = 0; i < moveMachines.length; i++)
    {
        const entry = moveMachines[i];
        const groupName = entry && entry.version_group && entry.version_group.name ? entry.version_group.name : null;

        if(!groupName)
        {
            continue;
        }

        const machineInfo = indexedGroups[groupName] || null;

        if(machineInfo)
        {
            byGroup[groupName] = {
                machine: machineInfo.machine,
                machine_es: machineInfo.machine_es,
            };
        }
    }

    return byGroup;
}

function buildMoveRecord(moveJson, showdownIndex, machineIndex)
{
    const moveName = moveJson && moveJson.name ? moveJson.name : null;

    return {
        id: pickNumberField(moveJson, "id"),
        display: pickSpanishName(moveJson),
        type: moveJson && moveJson.type ? moveJson.type.name : null,
        damage_class: moveJson && moveJson.damage_class ? moveJson.damage_class.name : null,
        isContact: getIsContact(showdownIndex, moveName),
        power: pickNumberField(moveJson, "power"),
        accuracy: pickNumberField(moveJson, "accuracy"),
        pp: pickNumberField(moveJson, "pp"),
        machinesByGroup: buildMachinesByGroup(moveName, machineIndex, moveJson),
    };
}

function sortMoveMapById(map)
{
    const orderedKeys = Object.keys(map).sort(function(a, b)
    {
        const ia = map[a] && typeof map[a].id === "number" ? map[a].id : Number.MAX_SAFE_INTEGER;
        const ib = map[b] && typeof map[b].id === "number" ? map[b].id : Number.MAX_SAFE_INTEGER;

        if(ia !== ib)
        {
            return ia - ib;
        }

        return a.localeCompare(b);
    });

    const orderedMap = {};

    for(let i = 0; i < orderedKeys.length; i++)
    {
        orderedMap[orderedKeys[i]] = map[orderedKeys[i]];
    }

    return orderedMap;
}

async function withPool(items, poolSize, workerFn)
{
    let p = 0;

    async function worker()
    {
        while(p < items.length)
        {
            const idx = p++;
            await workerFn(items[idx], idx);
        }
    }

    const n = Math.min(poolSize, items.length);
    await Promise.all(Array.from({ length: n }, worker));
}

function safeUnlink(filePath)
{
    try
    {
        if(filePath && existsSync(filePath))
        {
            unlinkSync(filePath);
        }

    }catch(e)
    {
        console.warn("[WARN] No pude borrar:", filePath, e && e.message ? e.message : e);
    }
}

function safeObj(x)
{
    return x && typeof x === "object" ? x : {};
}

async function buildFullMachineIndex()
{
    const list = await getJson(`${MACHINE_API}?limit=100000`);
    const results = list && list.results ? list.results : [];
    console.log("[INFO] Machines en API (results):", results.length);

    const urls = [];

    for(let i = 0; i < results.length; i++)
    {
        const url = results[i] && results[i].url ? results[i].url : null;
        if(url)
        {
            urls.push(url);
        }
    }

    const index = {};
    const POOL = Number(process.env.MACHINES_POOL || 12);
    console.log("[INFO] Concurrencia pool machines:", POOL);

    let processed = 0;

    await withPool(urls, POOL, async (url) =>
    {
        try
        {
            const machine = await getJson(url);
            upsertMachineIndexEntry(index, machine);

            processed++;

            if(processed % 100 === 0)
            {
                console.log(`[INFO] Machines procesadas ${processed}/${urls.length}`);
            }

        }catch(e)
        {
            console.warn("[WARN] No pude cargar machine:", url, e && e.message ? e.message : e);
        }
    });

    console.log("[INFO] Índice de machines cargado:", Object.keys(index).length);
    return index;
}

async function buildMachineIndexDelta(startId, endId)
{
    const ids = [];

    for(let id = startId; id <= endId; id++)
    {
        ids.push(id);
    }

    const index = {};
    const POOL = Number(process.env.MACHINES_POOL || 12);
    console.log("[INFO] Concurrencia pool machines delta:", POOL);

    let processed = 0;

    await withPool(ids, POOL, async (id) =>
    {
        try
        {
            const machine = await getJson(`${MACHINE_API}/${id}/`);
            upsertMachineIndexEntry(index, machine);

            processed++;

            if(processed % 25 === 0 || processed === ids.length)
            {
                console.log(`[INFO] Machines delta procesadas ${processed}/${ids.length}`);
            }

        }catch(e)
        {
            console.warn("[WARN] No pude cargar machine delta:", id, e && e.message ? e.message : e);
        }
    });

    console.log("[INFO] Delta de machines cargado:", Object.keys(index).length);
    return index;
}

function mergeMachineIndexes(target, source)
{
    const out = target && typeof target === "object" ? target : {};
    const entries = source && typeof source === "object" ? Object.entries(source) : [];

    for(const [moveName, groups] of entries)
    {
        if(!out[moveName])
        {
            out[moveName] = {};
        }

        const groupEntries = groups && typeof groups === "object" ? Object.entries(groups) : [];
        for(const [groupName, machineInfo] of groupEntries)
        {
            out[moveName][groupName] = machineInfo;
        }
    }

    return out;
}

function applyMachineIndexDeltaToMoves(esMap, deltaIndex)
{
    let touched = 0;
    const entries = deltaIndex && typeof deltaIndex === "object" ? Object.entries(deltaIndex) : [];

    for(const [moveName, groups] of entries)
    {
        if(!esMap[moveName])
        {
            continue;
        }

        if(!esMap[moveName].machinesByGroup || typeof esMap[moveName].machinesByGroup !== "object")
        {
            esMap[moveName].machinesByGroup = {};
        }

        const groupEntries = groups && typeof groups === "object" ? Object.entries(groups) : [];
        for(const [groupName, machineInfo] of groupEntries)
        {
            esMap[moveName].machinesByGroup[groupName] = machineInfo;
            touched++;
        }
    }

    return touched;
}

async function main()
{
    const repoRoot = process.cwd();

    const movesDir = join(repoRoot, "public", "moves");
    const manifestPath = join(movesDir, "manifest.json");
    if(!existsSync(manifestPath)) throw new Error("No existe public/moves/manifest.json");

    const machineCachePath = join(movesDir, MACHINE_CACHE_FILE);
    const manifest = safeObj(readJSON(manifestPath));

    // moves_url: "/moves/move_es_map.2026-02-20.json" (puede ser null/faltar)
    const movesUrlPath = manifest && manifest.moves_url ? String(manifest.moves_url) : null;

    let oldFileName = null;
    let oldMapPath = null;

    let esMap = {};
    let knownKeys = new Set();

    // BOOTSTRAP: si hay moves_url y el archivo existe, lo cargo. Si no, arranco vacío.
    if(movesUrlPath)
    {
        oldFileName = movesUrlPath.split("/").filter(Boolean).pop();
        oldMapPath = oldFileName ? join(movesDir, oldFileName) : null;

        if(oldMapPath && existsSync(oldMapPath))
        {
            esMap = safeObj(readJSON(oldMapPath));
            knownKeys = new Set(Object.keys(esMap));
            console.log("[INFO] Archivo actual:", oldFileName);
            console.log("[INFO] Cantidad actual en map:", knownKeys.size);

        }else
        {
            console.log("[INFO] No existe el mapa previo (archivo faltante). Bootstrap desde cero.");
        }

    }else
    {
        console.log("[INFO] manifest sin moves_url. Bootstrap desde cero.");
    }

    // Showdown: fuente extra para isContact
    const showdownRaw = await getJson(SHOWDOWN_MOVES_URL);
    const showdownIndex = buildShowdownIndex(showdownRaw);
    console.log("[INFO] Showdown moves index cargado:", Object.keys(showdownIndex).length);

    let changed = false;

    // Backfill de isContact para lo que ya existe en el mapa local
    for(const name of Object.keys(esMap))
    {
        const nextIsContact = getIsContact(showdownIndex, name);

        if(esMap[name].isContact !== nextIsContact)
        {
            esMap[name].isContact = nextIsContact;
            changed = true;
        }
    }

    const nullDisplayKeys = [];
    for(const name of Object.keys(esMap))
    {
        if(!esMap[name] || esMap[name].display === null || typeof esMap[name].display === "undefined")
        {
            nullDisplayKeys.push(name);
        }
    }

    if(nullDisplayKeys.length)
    {
        console.log("[INFO] Moves con display null a reintentar:", nullDisplayKeys.length);

        const DISPLAY_POOL = Number(process.env.MOVES_DISPLAY_POOL || 5);
        console.log("[INFO] Concurrencia pool display:", DISPLAY_POOL);

        let displayAdded = 0;
        let displayFailed = 0;

        await withPool(nullDisplayKeys, DISPLAY_POOL, async (name, idx) =>
        {
            try
            {
                const mv = await getJson(`${API}/move/${name}`);
                const nextDisplay = pickSpanishName(mv);

                if(nextDisplay)
                {
                    esMap[name].display = nextDisplay;
                    changed = true;
                    displayAdded++;
                }

                if((idx + 1) % 50 === 0)
                {
                    console.log(`[INFO] Display reintentos ${idx + 1}/${nullDisplayKeys.length} | completados=${displayAdded} | fallidos=${displayFailed}`);
                }

            }catch(e)
            {
                displayFailed++;
                console.warn("[WARN] No pude reintentar display:", name, e && e.message ? e.message : e);
            }
        });

        console.log("[INFO] Display completados:", displayAdded, "| sin cambio:", nullDisplayKeys.length - displayAdded, "| fallidos:", displayFailed);
    }

    const schemaRefreshNeeded = Object.keys(esMap).some((name) => needsMoveRefresh(esMap[name]));
    if(schemaRefreshNeeded)
    {
        changed = true;
    }

    // 1.A) Chequeo liviano: count
    const moveHead = await getJson(`${API}/move?limit=1`);
    const apiMoveCount = getCountFromListResponse(moveHead);
    const localMoveCount = knownKeys.size;

    console.log("[INFO] Moves local:", localMoveCount, "| Moves API (count):", apiMoveCount);

    const isBootstrap = localMoveCount === 0;

    const machineHead = await getJson(`${API}/machine?limit=1`);
    const apiMachineCount = getCountFromListResponse(machineHead);
    const localMachineCount = manifest && typeof manifest.machines_count === "number" ? manifest.machines_count : null;
    const lastFullRebuildDate = parseISODateUTC(
        manifest && manifest.machines_full_rebuild_at ? String(manifest.machines_full_rebuild_at) : null
    );
    const todayDate = parseISODateUTC(todayISO());
    const machineRebuildDue = !lastFullRebuildDate || daysBetweenUTC(lastFullRebuildDate, todayDate) >= MACHINE_REBUILD_DAYS;
    const forceMachineRebuild = String(process.env.FORCE_FULL_MACHINE_REBUILD || "") === "1";

    let machineIndex = {};
    if(existsSync(machineCachePath))
    {
        machineIndex = safeObj(readJSON(machineCachePath));
        console.log("[INFO] Machine cache cargado:", Object.keys(machineIndex).length);
    }

    let machineSyncMode = "none";
    let machineIndexTouched = false;
    let machineDeltaIndex = {};

    if(forceMachineRebuild || machineRebuildDue || !existsSync(machineCachePath) || Object.keys(machineIndex).length === 0 || localMachineCount === null || (apiMachineCount !== null && localMachineCount !== null && apiMachineCount < localMachineCount))
    {
        machineSyncMode = "full";
        console.log("[INFO] Modo machines: rebuild completo");
        machineIndex = await buildFullMachineIndex();
        machineIndexTouched = true;
        manifest.machines_full_rebuild_at = todayISO();

        if(apiMachineCount !== null)
        {
            manifest.machines_count = apiMachineCount;
        }

    }else if(apiMachineCount !== null && localMachineCount !== null && apiMachineCount > localMachineCount)
    {
        machineSyncMode = "incremental";
        console.log("[INFO] Modo machines: incremental", localMachineCount, "->", apiMachineCount);
        machineDeltaIndex = await buildMachineIndexDelta(localMachineCount + 1, apiMachineCount);
        machineIndex = mergeMachineIndexes(machineIndex, machineDeltaIndex);
        machineIndexTouched = true;
        manifest.machines_count = apiMachineCount;

    }else
    {
        console.log("[INFO] Modo machines: sin cambios");

        if(apiMachineCount !== null && localMachineCount === null)
        {
            manifest.machines_count = apiMachineCount;
        }
    }

    if(machineSyncMode === "incremental" && Object.keys(machineDeltaIndex).length)
    {
        const touched = applyMachineIndexDeltaToMoves(esMap, machineDeltaIndex);
        if(touched > 0)
        {
            changed = true;
            console.log("[INFO] Moves actualizados por delta de machines:", touched);
        }
    }

    const listNeeded = isBootstrap || changed || machineSyncMode === "full" || (apiMoveCount !== null && apiMoveCount > localMoveCount);
    if(!listNeeded && machineSyncMode === "none")
    {
        console.log("[OK] No hay moves nuevos, no hubo cambios en isContact/display y no hay sync de machines. Nada que actualizar.");
        return;
    }

    // 1) Índice completo
    const list = await getJson(`${API}/move?limit=100000`);
    const results = list && list.results ? list.results : [];
    console.log("[INFO] Moves en API (results):", results.length);

    // 2) Faltantes
    const missing = [];
    const toRefresh = [];

    for(let i = 0; i < results.length; i++)
    {
        const name = results[i] && results[i].name ? results[i].name : null;

        if(!name)
        {
            continue;
        }

        if(machineSyncMode === "full")
        {
            toRefresh.push(name);
            continue;
        }

        if(!knownKeys.has(name))
        {
            missing.push(name);
            continue;
        }

        if(needsMoveRefresh(esMap[name]))
        {
            toRefresh.push(name);
        }
    }

    const candidates = missing.concat(toRefresh);

    if(!candidates.length)
    {
        if(!changed)
        {
            console.log("[OK] No hay moves nuevos ni schema viejo para migrar. Nada que actualizar.");
            if(machineIndexTouched)
            {
                writeJSON(machineCachePath, machineIndex);
                writeJSON(manifestPath, manifest);
            }
            return;
        }

        console.log("[INFO] No hay moves nuevos, pero sí cambios en isContact/display o machines. Se reescribe el map.");
    }

    console.log("[INFO] Moves a agregar:", missing.length, "| a refrescar:", toRefresh.length);

    // 3) Detalles con concurrencia
    const POOL = Number(process.env.MOVES_POOL || 5);
    console.log("[INFO] Concurrencia pool:", POOL);

    let added = 0;
    let failed = 0;

    await withPool(candidates, POOL, async (name, idx) =>
    {
        try
        {
            const mv = await getJson(`${API}/move/${name}`);
            esMap[name] = buildMoveRecord(mv, showdownIndex, machineIndex);

            changed = true;
            added++;

            if((idx + 1) % 50 === 0)
            {
                console.log(`[INFO] Procesados ${idx + 1}/${candidates.length} | agregados=${added} | fallidos=${failed}`);
            }

        }catch(e)
        {
            failed++;
            console.warn("[WARN] No pude agregar/refrescar:", name, e && e.message ? e.message : e);
        }
    });

    // 4) Escribir NUEVO archivo versionado
    const version = todayISO();
    const newFileName = `move_es_map.${version}.json`;
    const newMapPath = join(movesDir, newFileName);
    const orderedMap = sortMoveMapById(esMap);

    writeJSON(newMapPath, orderedMap);

    // 5) Actualizar manifest
    if(machineIndexTouched)
    {
        writeJSON(machineCachePath, machineIndex);
    }

    manifest.version = version;
    manifest.moves_url = `/moves/${newFileName}`;
    writeJSON(manifestPath, manifest);

    // 6) Borrar el viejo si corresponde
    if(oldFileName && oldFileName !== newFileName)
    {
        safeUnlink(oldMapPath);
        console.log("[OK] Borrado viejo:", oldFileName);

    }else if(oldFileName === newFileName)
    {
        console.log("[INFO] Viejo y nuevo coinciden (mismo día). No se borra.");
    }

    console.log("[OK] Generado:", newFileName);
    console.log("[OK] Manifest actualizado a version:", version);
    console.log("[OK] Total agregados/refrescados:", added, "| fallidos:", failed);
}

main().catch((e) => {
    console.error("[FATAL]", e);
    process.exit(1);
});