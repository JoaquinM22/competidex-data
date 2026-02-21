"use strict";

/*
  Versionado con limpieza (Pokemon map) + BOOTSTRAP:
  - Lee public/pokemon/manifest.json -> pokemon_url actual (puede ser null en 1ra vez)
  - Si hay archivo actual: lo carga. Si no hay: arranca con map vacío (bootstrap)
  - Chequeo liviano: GET /pokemon?limit=1 (count)
    - Si hay mapa previo y count <= localCount => no hace nada
    - Si no hay mapa previo (bootstrap) => siempre continúa
  - Trae índice completo /pokemon?limit=100000
  - Agrega faltantes con pool (GET /pokemon/{name} para id+types)
  - Escribe NUEVO pokemon_map.YYYY-MM-DD.json
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
        while (p < items.length)
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
    } catch(e)
    {
        console.warn("[WARN] No pude borrar:", filePath, e && e.message ? e.message : e);
    }
}

function safeObj(x)
{
    return (x && typeof x === "object") ? x : {};
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

    // BOOTSTRAP: si no hay pokemon_url o el archivo no existe, arrancamos vacío
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

    // 1.A) Chequeo liviano: count
    const head = await getJson(`${API}/pokemon?limit=1`);
    const apiCount = getCountFromListResponse(head);
    const localCount = knownKeys.size;

    console.log("[INFO] Pokemon local:", localCount, "| Pokemon API (count):", apiCount);

    // Si NO es bootstrap y count no creció => no hacemos nada
    const isBootstrap = (localCount === 0);
    if(!isBootstrap && apiCount !== null && apiCount <= localCount)
    {
        console.log("[OK] El count no creció. No hay pokemon nuevos. Nada que actualizar.");
        return;
    }

    // 1.B) Índice completo
    const list = await getJson(`${API}/pokemon?limit=100000`);
    const results = (list && list.results) ? list.results : [];
    console.log("[INFO] Pokemon en API (results):", results.length);

    // 2) Faltantes
    const missing = [];
    for(let i = 0; i < results.length; i++)
    {
        const name = results[i] && results[i].name ? results[i].name : null;
        if (name && !knownKeys.has(name)) missing.push(name);
    }

    if(!missing.length)
    {
        console.log("[OK] No hay pokemon nuevos (missing=0). Nada que actualizar.");
        return;
    }

    console.log("[INFO] Pokemon a agregar:", missing.length);

    // 3) Detalles con concurrencia
    const POOL = Number(process.env.POKEMON_POOL || 5);
    console.log("[INFO] Concurrencia pool:", POOL);

    let added = 0;
    let failed = 0;

    await withPool(missing, POOL, async (name, idx) => {
        try {
        const p = await getJson(`${API}/pokemon/${name}`);

        const types = (p && p.types ? p.types : [])
            .map(t => (t && t.type ? t.type.name : null))
            .filter(Boolean);

        map[name] = {
            id: (p && p.id) ? p.id : null,
            types: types
        };

        added++;

        if ((idx + 1) % 50 === 0) {
            console.log(`[INFO] Procesados ${idx + 1}/${missing.length} | agregados=${added} | fallidos=${failed}`);
        }
        } catch (e) {
        failed++;
        console.warn("[WARN] No pude agregar:", name, e && e.message ? e.message : e);
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