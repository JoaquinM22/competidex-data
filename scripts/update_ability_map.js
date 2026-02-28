"use strict";

/*
  Versionado con limpieza (Ability map) + BOOTSTRAP:
  - Lee public/abilities/manifest.json -> ability_url actual (puede ser null en 1ra vez)
  - Si hay archivo actual: lo carga. Si no hay: arranca con map vacío (bootstrap)
  - Chequeo liviano: GET /ability?limit=1 (count)
    - Si hay mapa previo y count <= localCount => no hace nada
    - Si no hay mapa previo (bootstrap) => siempre continúa
  - Trae índice completo /ability?limit=100000
  - Agrega faltantes con pool (GET /ability/{name} para id+generation+nombre ES)
  - Escribe NUEVO ability_map.YYYY-MM-DD.json
  - Actualiza manifest.json a ese nuevo archivo
  - Borra el archivo viejo (si existía y es distinto)
*/

const { readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs");
const { join } = require("path");

const API = "https://pokeapi.co/api/v2";

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
    return (c !== null && isFinite(c)) ? c : null;
}

async function getJson(url)
{
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} GET ${url}`);
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
        if (filePath && existsSync(filePath)) unlinkSync(filePath);
    
    }catch(e)
    {
        console.warn("[WARN] No pude borrar:", filePath, e && e.message ? e.message : e);
    }
}

function safeObj(x)
{
    return (x && typeof x === "object") ? x : {};
}

function pickNameEsOrEn(json)
{
    const names = (json && Array.isArray(json.names)) ? json.names : [];
    // ES primero
    for(let i = 0; i < names.length; i++)
    {
        const n = names[i];
        if (n && n.language && n.language.name === "es" && n.name) return String(n.name);
    }

    // EN fallback
    for(let j = 0; j < names.length; j++)
    {
        const n2 = names[j];
        if (n2 && n2.language && n2.language.name === "en" && n2.name) return String(n2.name);
    }

    // último fallback
    return (json && json.name) ? String(json.name) : "";
}

async function main()
{
    const repoRoot = process.cwd();

    const abilitiesDir = join(repoRoot, "public", "abilities");
    const manifestPath = join(abilitiesDir, "manifest.json");

    if(!existsSync(manifestPath))
    {
        throw new Error("No existe public/abilities/manifest.json");
    }

    const manifest = safeObj(readJSON(manifestPath));

    // ability_url: "/abilities/ability_map.2026-02-21.json" (puede ser null)
    const abilityUrlPath = (manifest && manifest.ability_url) ? String(manifest.ability_url) : null;

    let oldFileName = null;
    let oldMapPath = null;

    let map = {};
    let knownKeys = new Set();

    // BOOTSTRAP
    if(abilityUrlPath)
    {
        oldFileName = abilityUrlPath.split("/").filter(Boolean).pop();
        oldMapPath = oldFileName ? join(abilitiesDir, oldFileName) : null;

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
        console.log("[INFO] manifest sin ability_url. Bootstrap desde cero.");
    }

    // 1.A) Chequeo liviano: count
    const head = await getJson(`${API}/ability?limit=1`);
    const apiCount = getCountFromListResponse(head);
    const localCount = knownKeys.size;

    console.log("[INFO] Abilities local:", localCount, "| Abilities API (count):", apiCount);

    const isBootstrap = (localCount === 0);
    if(!isBootstrap && apiCount !== null && apiCount <= localCount)
    {
        console.log("[OK] El count no creció. No hay habilidades nuevas. Nada que actualizar.");
        return;
    }

    // 1.B) Índice completo
    const list = await getJson(`${API}/ability?limit=100000`);
    const results = (list && list.results) ? list.results : [];
    console.log("[INFO] Abilities en API (results):", results.length);

    // 2) Faltantes
    const missing = [];
    for(let i = 0; i < results.length; i++)
    {
        const name = results[i] && results[i].name ? results[i].name : null;
        if (name && !knownKeys.has(name)) missing.push(name);
    }

    if(!missing.length)
    {
        console.log("[OK] No hay habilidades nuevas (missing=0). Nada que actualizar.");
        return;
    }

    console.log("[INFO] Habilidades a agregar:", missing.length);

    // 3) Detalles con concurrencia
    const POOL = Number(process.env.ABILITIES_POOL || 5);
    console.log("[INFO] Concurrencia pool:", POOL);

    let added = 0;
    let failed = 0;

    await withPool(missing, POOL, async (name, idx) =>
    {
        try
        {
            const a = await getJson(`${API}/ability/${name}`);

            const gen = (a && a.generation && a.generation.name) ? String(a.generation.name) : null;
            const id = (a && a.id) ? a.id : null;

            const display = pickNameEsOrEn(a) || name;

            map[name] = {
                id: id,
                gen: gen,
                display: display
            };

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
    const newFileName = `ability_map.${version}.json`;
    const newMapPath = join(abilitiesDir, newFileName);

    writeJSON(newMapPath, map);

    // 5) Actualizar manifest
    manifest.version = version;
    manifest.ability_url = `/abilities/${newFileName}`;
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