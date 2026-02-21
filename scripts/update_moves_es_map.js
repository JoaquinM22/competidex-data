"use strict";

/*
  Versionado con limpieza:
  - Lee public/moves/manifest.json -> moves_url actual
  - Carga el JSON actual
  - Trae /move?limit=10000
  - Agrega faltantes (pool concurrencia)
  - Escribe NUEVO move_es_map.YYYY-MM-DD.json
  - Actualiza manifest.json a ese nuevo archivo
  - Borra el archivo viejo (el que apuntaba el manifest)
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
    // PokeAPI: { count: N, results: [...] }
    const c = listJson && typeof listJson.count === "number" ? listJson.count : null;
    return (c !== null && isFinite(c)) ? c : null;
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
        if (existsSync(filePath)) unlinkSync(filePath);

    }catch(e)
    {
        console.warn("[WARN] No pude borrar:", filePath, e && e.message ? e.message : e);
    }
}

async function main()
{
    const repoRoot = process.cwd();

    const movesDir = join(repoRoot, "public", "moves");
    const manifestPath = join(movesDir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error("No existe public/moves/manifest.json");

    const manifest = readJSON(manifestPath);

    // moves_url: "/moves/move_es_map.2026-02-20.json"
    const movesUrlPath = manifest && manifest.moves_url ? String(manifest.moves_url) : null;
    if (!movesUrlPath) throw new Error("manifest.json no tiene moves_url");

    const oldFileName = movesUrlPath.split("/").filter(Boolean).pop();
    if (!oldFileName) throw new Error("No pude deducir el nombre del JSON actual desde moves_url");

    const oldMapPath = join(movesDir, oldFileName);
    if (!existsSync(oldMapPath)) throw new Error(`No existe el archivo actual: ${oldMapPath}`);

    const esMap = readJSON(oldMapPath) || {};
    const knownKeys = new Set(Object.keys(esMap));

    console.log("[INFO] Archivo actual:", oldFileName);
    console.log("[INFO] Cantidad actual en map:", knownKeys.size);
    
    // 1.A) Chequeo liviano: solo count (limit=1)
    const head = await getJson(`${API}/move?limit=1`);
    const apiCount = getCountFromListResponse(head);
    const localCount = knownKeys.size;

    console.log("[INFO] Moves local:", localCount, "| Moves API (count):", apiCount);

    // Si no pude leer count, caigo al método viejo (por las dudas)
    if(apiCount !== null && apiCount <= localCount)
    {
        console.log("[OK] El count no creció. No hay moves nuevos. Nada que actualizar.");
        return;
    }

    // 1.B) Ahora sí: índice completo (solo si creció o count desconocido)
    const list = await getJson(`${API}/move?limit=10000`);
    const results = (list && list.results) ? list.results : [];
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
        console.log("[OK] No hay moves nuevos. Nada que actualizar.");
        return;
    }

    console.log("[INFO] Moves nuevos a agregar:", missing.length);

    // 3) Traer detalles con concurrencia
    const POOL = Number(process.env.MOVES_POOL || 5);
    console.log("[INFO] Concurrencia pool:", POOL);

    let added = 0;

    await withPool(missing, POOL, async (name, idx) =>
    {
        try
        {
            const mv = await getJson(`${API}/move/${name}`);

            esMap[name] =
            {
                display: pickSpanishName(mv) || null,
                type: mv && mv.type ? mv.type.name : null,
                damage_class: mv && mv.damage_class ? mv.damage_class.name : null
            };

            added++;

            if((idx + 1) % 25 === 0)
            {
                console.log(`[INFO] Procesados ${idx + 1}/${missing.length} | agregados=${added}`);
            }

        }catch(e)
        {
            console.warn("[WARN] No pude agregar:", name, e && e.message ? e.message : e);
        }
    });

    // 4) Escribir NUEVO archivo versionado
    const version = todayISO();
    const newFileName = `move_es_map.${version}.json`;
    const newMapPath = join(movesDir, newFileName);

    // Si por algún motivo ya existe, lo pisamos
    writeJSON(newMapPath, esMap);

    // 5) Actualizar manifest para apuntar al nuevo
    manifest.version = version;
    manifest.moves_url = `/moves/${newFileName}`;
    writeJSON(manifestPath, manifest);

    // 6) Borrar el viejo (solo si es distinto al nuevo)
    if(oldFileName !== newFileName)
    {
        safeUnlink(oldMapPath);
        console.log("[OK] Borrado viejo:", oldFileName);
    }else
    {
        console.log("[INFO] Viejo y nuevo coinciden (mismo día). No se borra.");
    }

    console.log("[OK] Generado:", newFileName);
    console.log("[OK] Manifest actualizado a version:", version);
    console.log("[OK] Total agregados:", added);
}

main().catch((e) => {
    console.error("[FATAL]", e);
    process.exit(1);
});