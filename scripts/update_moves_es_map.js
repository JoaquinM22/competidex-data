"use strict";

/*
  Versionado con limpieza (Moves ES map) + BOOTSTRAP:
  - Lee public/moves/manifest.json -> moves_url actual (puede ser null / faltar / archivo faltante)
  - Si hay archivo actual: lo carga. Si no hay: arranca con map vacío (bootstrap)
  - Chequeo liviano: GET /move?limit=1 (count)
    - Si hay mapa previo y count <= localCount => no hace nada
    - Si no hay mapa previo (bootstrap) => siempre continúa
  - Trae índice completo /move?limit=100000
  - Agrega faltantes con pool (GET /move/{name} para id + nombre ES + type + damage_class)
  - Escribe NUEVO move_es_map.YYYY-MM-DD.json
  - Actualiza manifest.json a ese nuevo archivo
  - Borra el archivo viejo (si existía y es distinto)
*/

const { readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs");
const { join } = require("path");

const API = "https://pokeapi.co/api/v2";
const SHOWDOWN_MOVES_URL = "https://play.pokemonshowdown.com/data/moves.json";

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

function getCountFromListResponse(listJson)
{
    const c = listJson && typeof listJson.count === "number" ? listJson.count : null;
    return c !== null && isFinite(c) ? c : null;
}

async function getJson(url)
{
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} GET ${url}`);
    return res.json();
}

function pickSpanishName(mvJson)
{
    const arr = mvJson && mvJson.names ? mvJson.names : [];
    for(let i = 0; i < arr.length; i++)
    {
        const n = arr[i];
        if (n && n.language && n.language.name === "es" && n.name) return n.name;
    }
    return null;
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

function getNullDisplayKeys(map)
{
    const keys = [];

    for(const name of Object.keys(map))
    {
        if(!map[name] || map[name].display === null || typeof map[name].display === "undefined")
        {
            keys.push(name);
        }
    }

    return keys;
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
        if (filePath && existsSync(filePath)) unlinkSync(filePath);
    
    }catch(e)
    {
        console.warn("[WARN] No pude borrar:", filePath, e && e.message ? e.message : e);
    }
}

function safeObj(x)
{
    return x && typeof x === "object" ? x : {};
}

async function main()
{
    const repoRoot = process.cwd();

    const movesDir = join(repoRoot, "public", "moves");
    const manifestPath = join(movesDir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error("No existe public/moves/manifest.json");

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

    const nullDisplayKeys = getNullDisplayKeys(esMap);

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

    // 1.A) Chequeo liviano: count
    const head = await getJson(`${API}/move?limit=1`);
    const apiCount = getCountFromListResponse(head);
    const localCount = knownKeys.size;

    console.log("[INFO] Moves local:", localCount, "| Moves API (count):", apiCount);

    const isBootstrap = localCount === 0;

    // Si no es bootstrap y el count no creció, corto
    if(!isBootstrap && apiCount !== null && apiCount <= localCount && !changed)
    {
        console.log("[OK] El count no creció y no hubo cambios en isContact. Nada que actualizar.");
        return;
    }

    // 1.B) Índice completo
    // (mejor usar 100000 para no quedarte corto)
    const list = await getJson(`${API}/move?limit=100000`);
    const results = list && list.results ? list.results : [];
    console.log("[INFO] Moves en API (results):", results.length);

    // 2) Faltantes
    const missing = [];
    for(let i = 0; i < results.length; i++)  
    {
        const name = results[i] && results[i].name ? results[i].name : null;
        if (name && !knownKeys.has(name)) missing.push(name);
    }

    if(!missing.length)
    {
        if(!changed)
        {
            console.log("[OK] No hay moves nuevos (missing=0) ni cambios en isContact. Nada que actualizar.");
            return;
        }

        console.log("[INFO] No hay moves nuevos, pero sí cambios en isContact. Se reescribe el map.");
    }

    console.log("[INFO] Moves a agregar:", missing.length);

    // 3) Detalles con concurrencia
    const POOL = Number(process.env.MOVES_POOL || 5);
    console.log("[INFO] Concurrencia pool:", POOL);

    let added = 0;
    let failed = 0;

    await withPool(missing, POOL, async (name, idx) =>
    {
        try
        {
            const mv = await getJson(`${API}/move/${name}`);

            esMap[name] = {
                id: mv && typeof mv.id === "number" ? mv.id : null,
                isContact: getIsContact(showdownIndex, name),
                display: pickSpanishName(mv) || null,
                type: mv && mv.type ? mv.type.name : null,
                damage_class: mv && mv.damage_class ? mv.damage_class.name : null,
            };

            changed = true;

            added++;

            if((idx + 1) % 50 === 0)
            {
                console.log(`[INFO] Procesados ${idx + 1}/${missing.length} | agregados=${added} | fallidos=${failed}`);
            }

        }catch(e)
        {
            failed++;
            console.warn("[WARN] No pude agregar:", name, e && e.message ? e.message : e);
        }

    });

    // 4) Escribir NUEVO archivo versionado
    const version = todayISO();
    const newFileName = `move_es_map.${version}.json`;
    const newMapPath = join(movesDir, newFileName);

    writeJSON(newMapPath, esMap);

    // 5) Actualizar manifest
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
    console.log("[OK] Total agregados:", added, "| fallidos:", failed);
}

main().catch((e) => {
    console.error("[FATAL]", e);
    process.exit(1);
});