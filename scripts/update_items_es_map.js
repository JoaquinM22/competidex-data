"use strict";

/*
  Versionado con limpieza (Items ES map) + BOOTSTRAP:
  - Lee public/items/manifest.json -> items_url actual (puede ser null / faltar / archivo faltante)
  - Si hay archivo actual: lo carga. Si no hay: arranca con map vacío (bootstrap)
  - Chequeo liviano: GET /item?limit=1 (count)
    - Si hay mapa previo y count <= localCount => no hace nada
    - Si no hay mapa previo (bootstrap) => siempre continúa
  - Trae índice completo /item?limit=100000
  - Agrega faltantes con pool (GET /item/{name} para id + nombre ES/EN + category)
  - Escribe NUEVO item_es_map.YYYY-MM-DD.json
  - Actualiza manifest.json a ese nuevo archivo
  - Borra el archivo viejo (si existía y es distinto)
*/

const { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } = require("fs");
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
    return yyyy + "-" + mm + "-" + dd;
}

function getCountFromListResponse(listJson)
{
    const c = listJson && typeof listJson.count === "number" ? listJson.count : null;
    return c !== null && isFinite(c) ? c : null;
}

async function getJson(url)
{
    const res = await fetch(url, {
        headers: { accept: "application/json" }
    });

    if(!res.ok)
    {
        throw new Error("HTTP " + res.status + " GET " + url);
    }

    return res.json();
}

function pickLocalizedName(itemJson)
{
    const arr = itemJson && itemJson.names ? itemJson.names : [];
    let en = null;

    for(let i = 0; i < arr.length; i++)
    {
        const n = arr[i];
        if(!n || !n.language || !n.language.name || !n.name) continue;

        if(n.language.name === "es")
        {
            return n.name;
        }

        if(n.language.name === "en")
        {
            en = n.name;
        }
    }

    return en || (itemJson && itemJson.name ? itemJson.name : null);
}

function pickCategoryName(itemJson)
{
    return itemJson &&
        itemJson.category &&
        itemJson.category.name
        ? itemJson.category.name
        : null;
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

async function main()
{
    const repoRoot = process.cwd();

    const itemsDir = join(repoRoot, "public", "items");
    const manifestPath = join(itemsDir, "manifest.json");

    if(!existsSync(itemsDir))
    {
        mkdirSync(itemsDir, { recursive: true });
    }

    if(!existsSync(manifestPath))
    {
        writeJSON(manifestPath, {
            version: null,
            items_url: null
        });
    }

    const manifest = safeObj(readJSON(manifestPath));

    // items_url: "/items/item_es_map.2026-03-16.json" (puede ser null/faltar)
    const itemsUrlPath = manifest && manifest.items_url ? String(manifest.items_url) : null;

    let oldFileName = null;
    let oldMapPath = null;

    let esMap = {};
    let knownKeys = new Set();

    // BOOTSTRAP
    if(itemsUrlPath)
    {
        oldFileName = itemsUrlPath.split("/").filter(Boolean).pop();
        oldMapPath = oldFileName ? join(itemsDir, oldFileName) : null;

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
        console.log("[INFO] manifest sin items_url. Bootstrap desde cero.");
    }

    const head = await getJson(API + "/item?limit=1");
    const apiCount = getCountFromListResponse(head);
    const localCount = knownKeys.size;

    console.log("[INFO] Items local:", localCount, "| Items API (count):", apiCount);

    const isBootstrap = localCount === 0;

    if(!isBootstrap && apiCount !== null && apiCount <= localCount)
    {
        console.log("[OK] El count no creció. No hay items nuevos. Nada que actualizar.");
        return;
    }

    // 1.B) Índice completo
    const list = await getJson(API + "/item?limit=100000");
    const results = list && list.results ? list.results : [];
    console.log("[INFO] Items en API (results):", results.length);

    // 2) Faltantes
    const missing = [];
    for(let i = 0; i < results.length; i++)
    {
        const name = results[i] && results[i].name ? results[i].name : null;
        if(name && !knownKeys.has(name))
        {
            missing.push(name);
        }
    }

    if(!missing.length)
    {
        console.log("[OK] No hay items nuevos (missing=0). Nada que actualizar.");
        return;
    }

    console.log("[INFO] Items a agregar:", missing.length);

    // 3) Detalles con concurrencia
    const POOL = Number(process.env.ITEMS_POOL || 5);
    console.log("[INFO] Concurrencia pool:", POOL);

    let added = 0;
    let failed = 0;

    await withPool(missing, POOL, async function(name, idx)
    {
        try
        {
            const item = await getJson(API + "/item/" + name);

            esMap[name] = {
                id: item && typeof item.id === "number" ? item.id : null,
                display: pickLocalizedName(item),
                category: pickCategoryName(item)
            };

            added++;

            if((idx + 1) % 50 === 0)
            {
                console.log("[INFO] Procesados " + (idx + 1) + "/" + missing.length + " | agregados=" + added + " | fallidos=" + failed);
            }

        }catch(e)
        {
            failed++;
            console.warn("[WARN] No pude agregar:", name, e && e.message ? e.message : e);
        }
    });

    // 4) Ordenar por id para mantener el JSON prolijo
    const orderedKeys = Object.keys(esMap).sort(function(a, b)
    {
        const ia = esMap[a] && typeof esMap[a].id === "number" ? esMap[a].id : Number.MAX_SAFE_INTEGER;
        const ib = esMap[b] && typeof esMap[b].id === "number" ? esMap[b].id : Number.MAX_SAFE_INTEGER;

        if(ia !== ib) return ia - ib;
        return a.localeCompare(b);
    });

    const orderedMap = {};
    for(let i = 0; i < orderedKeys.length; i++)
    {
        orderedMap[orderedKeys[i]] = esMap[orderedKeys[i]];
    }

    // 5) Escribir NUEVO archivo versionado
    const version = todayISO();
    const newFileName = "item_es_map." + version + ".json";
    const newMapPath = join(itemsDir, newFileName);

    writeJSON(newMapPath, orderedMap);

    // 6) Actualizar manifest
    manifest.version = version;
    manifest.items_url = "/items/" + newFileName;
    writeJSON(manifestPath, manifest);

    // 7) Borrar el viejo si corresponde
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

main().catch(function(e) {
    console.error("[FATAL]", e);
    process.exit(1);
});