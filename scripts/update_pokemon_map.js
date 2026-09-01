"use strict";

/*
  Versionado con limpieza (Pokemon map) + BOOTSTRAP:
  - Lee public/pokemon/manifest.json -> pokemon_url actual (puede ser null en 1ra vez)
  - Si hay archivo actual: lo carga. Si no hay: arranca con map vacío (bootstrap)
  - Chequeo liviano: GET /pokemon?limit=1 (count)
    - Si hay mapa previo y count <= localCount => no hace nada, salvo que haya schema viejo o rebuild anual pendiente
    - Si no hay mapa previo (bootstrap) => siempre continúa
  - Cada pokemon guarda
    id, types, generation, abilities, weight, height, stats,
    malePercentage, femalePercentage, sinSexo (booleano), captureRate, puedeCriar (booleano),
    color, hasMegaForms (booleano), hasGigaForm (booleano), eggGroups y categoryPkm
  - Los datos salen de /pokemon/{name} y /pokemon-species/{id or name}
  - Guarda en manifest.json la fecha del último rebuild completo
  - Fuerza un rebuild completo una vez por año
  - Escribe NUEVO pokemon_map.YYYY-MM-DD.json
  - Actualiza manifest.json a ese nuevo archivo
  - Borra el archivo viejo (si existía y es distinto)
*/

const { readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs");
const { join } = require("path");
const { canPokemonBreed, toPokemonDisplayName, getColorPkmByKey, getPokemonGenByKey, getPokemonAbilitiesFromRaw, hasPokemonGigaForm, hasPokemonMegaForms } = require("../utils/pokemon_scripts_utils");

const API = "https://pokeapi.co/api/v2";
const POKEMON_FULL_REBUILD_DAYS = 365;

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
    return (c !== null && isFinite(c)) ? c : null;
}

async function getJson(url)
{
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if(!res.ok) throw new Error(`HTTP ${res.status} GET ${url}`);
    return res.json();
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
    return (x && typeof x === "object") ? x : {};
}

function safeNumber(value)
{
    return (typeof value === "number" && Number.isFinite(value)) ? value : null;
}

function safeText(value)
{
    if(typeof value !== "string")
    {
        return null;
    }

    const txt = value.trim();
    return txt !== "" ? txt : null;
}

function formatWeight(value)
{
    const num = safeNumber(value);
    if(num === null) return null;
    return Number((num / 10).toFixed(1));
}

function formatHeight(value)
{
    const num = safeNumber(value);
    if(num === null) return null;
    return Number((num / 10).toFixed(1));
}

function getRawTypes(raw)
{
    const types = Array.isArray(raw)
        ? raw
        : (raw && Array.isArray(raw.types) ? raw.types : []);

    return types
        .map((item) => item?.type?.name)
        .filter(Boolean);
}

function getStats(rawStats)
{
    const statsPoke = returnEmptyStats();
    const arr = Array.isArray(rawStats) ? rawStats : [];

    for(const item of arr)
    {
        const name = item?.stat?.name;
        const base = safeNumber(item?.base_stat);
        const effort = safeNumber(item?.effort);

        switch(name)
        {
            case "hp":
                statsPoke.hp = base;
                statsPoke.effort_hp = effort;
                break;

            case "attack":
                statsPoke.atk = base;
                statsPoke.effort_atk = effort;
                break;

            case "defense":
                statsPoke.def = base;
                statsPoke.effort_def = effort;
                break;

            case "special-attack":
                statsPoke.spe_atk = base;
                statsPoke.effort_spe_atk = effort;
                break;

            case "special-defense":
                statsPoke.spe_def = base;
                statsPoke.effort_spe_def = effort;
                break;

            case "speed":
                statsPoke.speed = base;
                statsPoke.effort_speed = effort;
                break;
        }
    }

    return statsPoke;
}

function returnEmptyStats()
{
    return {
        hp: null,
        effort_hp: null,
        atk: null,
        effort_atk: null,
        def: null,
        effort_def: null,
        spe_atk: null,
        effort_spe_atk: null,
        spe_def: null,
        effort_spe_def: null,
        speed: null,
        effort_speed: null
    };
}

function getGenderPercentagePkm(genderRate)
{
    if(genderRate === -1 || genderRate == null)
    {
        return {
            malePercentage: null,
            femalePercentage: null,
            sinSexo: true
        };
    }

    if(genderRate === 0)
    {
        return {
            malePercentage: 100,
            femalePercentage: null,
            sinSexo: false
        };
    }

    if(genderRate === 8)
    {
        return {
            malePercentage: null,
            femalePercentage: 100,
            sinSexo: false
        };
    }

    const femalePercentage = (genderRate / 8) * 100;
    const malePercentage = 100 - femalePercentage;

    return {
        malePercentage: parseFloat(malePercentage.toFixed(1)),
        femalePercentage: parseFloat(femalePercentage.toFixed(1)),
        sinSexo: false
    };
}

function getPkmEggGroups(arr)
{
  const eggGroups = Array.isArray(arr) ? arr : [];
  if(!eggGroups.length) return [];

  const out = [];

  for(const item of eggGroups)
  {
    const apiKey = safeText(item?.name);
    if(!apiKey) continue;
    out.push(apiKey);
  }

  return out;
}

function getPkmCategory(arr)
{
  const genera = Array.isArray(arr) ? arr : [];
  if(!genera.length) return null;

  const preferredLanguages = ["es", "es-419", "en"];

  for(const lang of preferredLanguages)
  {
    const match = genera.find((item) => String(item?.language?.name || "").trim().toLowerCase() === lang);
    if(match && typeof match.genus === "string")
    {
      const genus = match.genus.trim();
      if(genus) return genus;
    }
  }

  return null;
}

function buildPokemonRecord(raw, speciesRaw)
{
    const genderData = getGenderPercentagePkm(speciesRaw?.gender_rate);
    const apiName = safeText(raw?.name) || "";

    return {
        id: safeNumber(raw?.id),
        types: getRawTypes(raw),
        generation: getPokemonGenByKey(apiName, (safeText(speciesRaw?.generation?.name) || "")),
        abilities: getPokemonAbilitiesFromRaw(raw, apiName),
        weight: formatWeight(raw?.weight),
        height: formatHeight(raw?.height),
        stats: getStats(raw?.stats),
        malePercentage: genderData.malePercentage,
        femalePercentage: genderData.femalePercentage,
        sinSexo: genderData.sinSexo,
        captureRate: safeNumber(speciesRaw?.capture_rate),
        puedeCriar: canPokemonBreed(raw?.name, speciesRaw),
        color: getColorPkmByKey(apiName) || (safeText(speciesRaw?.color?.name) || ""),
        display: toPokemonDisplayName(apiName),
        hasMegaForms: hasPokemonMegaForms(apiName),
        hasGigaForm: hasPokemonGigaForm(apiName),
        eggGroups: getPkmEggGroups(speciesRaw?.egg_groups),
        categoryPkm: getPkmCategory(speciesRaw?.genera),
        isBabyPkm: !!speciesRaw?.is_baby,
        isMythicalPkm: !!speciesRaw?.is_mythical,
        isLegendaryPkm: !!speciesRaw?.is_legendary,
        specieName: safeText(raw?.species?.name)
    };
}

function hasPokemonRecordSchema(record)
{
    return !!record &&
        typeof record === "object" &&
        Object.prototype.hasOwnProperty.call(record, "generation") &&
        Object.prototype.hasOwnProperty.call(record, "abilities") &&
        Object.prototype.hasOwnProperty.call(record, "weight") &&
        Object.prototype.hasOwnProperty.call(record, "height") &&
        Object.prototype.hasOwnProperty.call(record, "stats") &&
        Object.prototype.hasOwnProperty.call(record, "malePercentage") &&
        Object.prototype.hasOwnProperty.call(record, "femalePercentage") &&
        Object.prototype.hasOwnProperty.call(record, "sinSexo") &&
        Object.prototype.hasOwnProperty.call(record, "captureRate") &&
        Object.prototype.hasOwnProperty.call(record, "puedeCriar") &&
        Object.prototype.hasOwnProperty.call(record, "color") &&
        Object.prototype.hasOwnProperty.call(record, "hasMegaForms") &&
        Object.prototype.hasOwnProperty.call(record, "hasGigaForm") &&
        Object.prototype.hasOwnProperty.call(record, "eggGroups") &&
        Object.prototype.hasOwnProperty.call(record, "categoryPkm") &&
        Object.prototype.hasOwnProperty.call(record, "specieName") &&
        Object.prototype.hasOwnProperty.call(record, "display") &&
        Object.prototype.hasOwnProperty.call(record, "isBabyPkm") &&
        Object.prototype.hasOwnProperty.call(record, "isMythicalPkm") &&
        Object.prototype.hasOwnProperty.call(record, "isLegendaryPkm");
}

function needsPokemonRefresh(record)
{
    return !hasPokemonRecordSchema(record) ||
        record === null ||
        typeof record !== "object" ||
        !Number.isFinite(record.id) ||
        !Array.isArray(record.types) ||
        !record.stats ||
        typeof record.stats !== "object" ||
        !Array.isArray(record.abilities) ||
        !Array.isArray(record.eggGroups) ||
        typeof record.specieName !== "string" ||
        typeof record.categoryPkm !== "string" ||
        typeof record.isBabyPkm !== "boolean" ||
        typeof record.isMythicalPkm !== "boolean" ||
        typeof record.isLegendaryPkm !== "boolean";
}

async function main()
{
    const repoRoot = process.cwd();

    const pokemonDir = join(repoRoot, "public", "pokemon");
    const manifestPath = join(pokemonDir, "manifest.json");

    if(!existsSync(manifestPath))
    {
        throw new Error("No existe public/pokemon/manifest.json");
    }

    const manifest = safeObj(readJSON(manifestPath));

    // pokemon_url: "/pokemon/pokemon_map.2026-02-20.json" (puede ser null en bootstrap)
    const pokemonUrlPath = (manifest && manifest.pokemon_url) ? String(manifest.pokemon_url) : null;

    let oldFileName = null;
    let oldMapPath = null;

    let map = {};
    let knownKeys = new Set();

    // BOOTSTRAP: si hay pokemon_url y el archivo existe, lo cargo. Si no, arranco vacío.
    if(pokemonUrlPath)
    {
        oldFileName = pokemonUrlPath.split("/").filter(Boolean).pop();
        oldMapPath = oldFileName ? join(pokemonDir, oldFileName) : null;

        if(oldFileName && oldMapPath && existsSync(oldMapPath))
        {
            map = safeObj(readJSON(oldMapPath));
            knownKeys = new Set(Object.keys(map));
            console.log("[INFO] Archivo actual:", oldFileName);
            console.log("[INFO] Cantidad actual en map:", knownKeys.size);

        }else
        {
            console.log("[INFO] No existe mapa previo (archivo faltante). Bootstrap desde cero.");
        }

    }else
    {
        console.log("[INFO] manifest sin pokemon_url. Bootstrap desde cero.");
    }

    const lastFullRebuildDate = parseISODateUTC(
        manifest && manifest.pokemon_full_rebuild_at ? String(manifest.pokemon_full_rebuild_at) : null
    );
    const todayDate = parseISODateUTC(todayISO());
    const rebuildDue = !lastFullRebuildDate || daysBetweenUTC(lastFullRebuildDate, todayDate) >= POKEMON_FULL_REBUILD_DAYS;
    const forceFullRebuild = String(process.env.FORCE_FULL_POKEMON_REBUILD || "") === "1";

    // 1.A) Chequeo liviano: count
    const head = await getJson(`${API}/pokemon?limit=1`);
    const apiCount = getCountFromListResponse(head);
    const localCount = knownKeys.size;

    console.log("[INFO] Pokemon local:", localCount, "| Pokemon API (count):", apiCount);
    console.log("[INFO] Pokemon full rebuild due:", rebuildDue, "| forced:", forceFullRebuild);

    const isBootstrap = (localCount === 0);
    const schemaRefreshNeeded = Object.keys(map).some((name) => needsPokemonRefresh(map[name]));

    // Si no es bootstrap, no creció el count, no hay schema viejo y no toca rebuild anual => no hacemos nada
    if(!isBootstrap && !rebuildDue && !forceFullRebuild && !schemaRefreshNeeded && apiCount !== null && apiCount <= localCount)
    {
        console.log("[OK] El count no creció. No hay pokemon nuevos ni rebuild pendiente. Nada que actualizar.");
        return;
    }

    // 1.B) Índice completo
    const list = await getJson(`${API}/pokemon?limit=100000`);
    const results = (list && list.results) ? list.results : [];
    console.log("[INFO] Pokemon en API (results):", results.length);

    // 2) Faltantes o registros a refrescar
    const missing = [];
    const toRefresh = [];

    for(let i = 0; i < results.length; i++)
    {
        const name = results[i] && results[i].name ? results[i].name : null;

        if(!name)
        {
            continue;
        }

        if(isBootstrap || rebuildDue || forceFullRebuild)
        {
            toRefresh.push(name);
            continue;
        }

        if(!knownKeys.has(name))
        {
            missing.push(name);
            continue;
        }

        if(needsPokemonRefresh(map[name]))
        {
            toRefresh.push(name);
        }
    }

    const candidates = missing.concat(toRefresh);

    if(!candidates.length)
    {
        if(!schemaRefreshNeeded)
        {
            console.log("[OK] No hay pokemon nuevos ni schema viejo para migrar. Nada que actualizar.");
            return;
        }

        console.log("[INFO] Hay schema viejo, pero no se encontraron candidatos por refrescar. Se reescribe el map igual.");
    }

    console.log("[INFO] Pokemon a agregar:", missing.length, "| a refrescar:", toRefresh.length);

    // 3) Detalles con concurrencia
    const POOL = Number(process.env.POKEMON_POOL || 5);
    console.log("[INFO] Concurrencia pool:", POOL);

    let added = 0;
    let failed = 0;

    await withPool(candidates, POOL, async (name, idx) =>
    {
        try
        {
            const p = await getJson(`${API}/pokemon/${name}`);
            const speciesUrl = p?.species?.url || (p?.id != null ? `${API}/pokemon-species/${p.id}/` : null);
            const speciesRaw = speciesUrl ? await getJson(speciesUrl) : null;

            map[name] = buildPokemonRecord(p, speciesRaw);

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
    const newFileName = `pokemon_map.${version}.json`;
    const newMapPath = join(pokemonDir, newFileName);

    writeJSON(newMapPath, map);

    // 5) Actualizar manifest
    manifest.version = version;
    manifest.pokemon_url = `/pokemon/${newFileName}`;

    const fullRefreshPerformed = isBootstrap || rebuildDue || forceFullRebuild || toRefresh.length === knownKeys.size;
    if(fullRefreshPerformed)
    {
        manifest.pokemon_full_rebuild_at = version;
    }

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