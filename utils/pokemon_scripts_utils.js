"use strict";


// ---------------- DATOS META DE POKÉMON QUE NO PUEDEN CRIAR - INICIO ----------------
//#region CRIANZA PKM

const NO_PUEDEN_CRIAR =
[
    // Paradojas de Escarlata
    "roaring-moon", "walking-wake", "sandy-shocks", "flutter-mane",
    "brute-bonnet", "scream-tail", "slither-wing", "great-tusk",
    // Indigo Disk / DLC
    "raging-bolt", "gouging-fire",

    // Paradojas de Púrpura
    "iron-treads", "iron-hands", "iron-thorns", "iron-jugulis",
    "iron-moth", "iron-bundle", "iron-valiant", "iron-leaves",
    // Indigo Disk / DLC
    "iron-crown", "iron-boulder"
];

const PUEDEN_CRIAR =
[
    "phione",
    "manaphy"
];

function normalizePkmBreedKey(input)
{
    const raw = String(input || "").trim().toLowerCase();
    if(!raw) return null;

    return raw;
}

function pokemonCanBreedByList(apiKey)
{
    const key = normalizePkmBreedKey(apiKey);
    if(!key) return false;

    return PUEDEN_CRIAR.includes(key);
}

function pokemonCannotBreedByList(apiKey)
{
    const key = normalizePkmBreedKey(apiKey);
    if(!key) return false;

    return NO_PUEDEN_CRIAR.includes(key);
}

function canPokemonBreed(apiKey, speciesData = null)
{
    const key = normalizePkmBreedKey(apiKey);
    if(!key) return false;

    // Casos especiales con prioridad
    if(pokemonCanBreedByList(key)) return true;
    if(pokemonCannotBreedByList(key)) return false;

    // Regla general
    if(speciesData?.is_legendary) return false;
    if(speciesData?.is_mythical) return false;

    return true;
}

// ---------------- DATOS META DE POKÉMON QUE NO PUEDEN CRIAR - FIN ----------------


// ---------------- DATOS META DE NOMBRES POKÉMON - INICIO ----------------
//#region NAME PKM

const REGION_DISPLAY_META =
{
    "galar": "Galar",
    "alola": "Alola",
    "hisui": "Hisui",
    "paldea": "Paldea",
};

const DISPLAY_ES_NAME_SPECIAL_PKM_BY_KEY =
{
  // Formas Paradoja
  "iron-boulder": "Ferromole",
  "iron-bundle": "Ferrosaco",
  "iron-crown": "Ferrotesta",
  "iron-hands": "Ferropalmas",
  "iron-jugulis": "Ferrocuello",
  "iron-leaves": "Ferroverdor",
  "iron-moth": "Ferropolilla",
  "iron-thorns": "Ferropúas",
  "iron-treads": "Ferrodada",
  "iron-valiant": "Ferropaladín",
  "roaring-moon": "Bramaluna",
  "walking-wake": "Ondulagua",
  "sandy-shocks": "Pelarena",
  "flutter-mane": "Melenaleteo",
  "brute-bonnet": "Furioseta",
  "scream-tail": "Colagrito",
  "slither-wing": "Reptalada",
  "great-tusk": "Colmilargo",
  "raging-bolt": "Electrofuria",
  "gouging-fire": "Flamariete",

  // Greninga Ash
  "greninja-ash": "Greninja Ash",

  // Formas Darmanitan
  "darmanitan-galar-standard": "Darmanitan de Galar",
  "darmanitan-galar-zen": "Darmanitan de Galar Modo Daruma",
  "darmanitan-standard": "Darmanitan",
  "darmanitan-zen": "Darmanitan Modo Daruma",

  // Formas Terapagos
  "terapagos": "Terapagos",
  "terapagos-terastal": "Terapagos Forma Teracristal",
  "terapagos-stellar": "Terapagos Forma Astral",

  // Formas Floette
  "floette-eternal": "Floette Flor eterna",
  "flabebe": "Flabebé",

  // Formas Tauros
  "tauros-paldea-aqua-breed": "Tauros de Paldea variedad acuática",
  "tauros-paldea-blaze-breed": "Tauros de Paldea variedad ardiente",
  "tauros-paldea-combat-breed": "Tauros de Paldea variedad combatiente",

  // Formas Ursaluna
  "ursaluna": "Ursaluna",
  "ursaluna-bloodmoon": "Ursaluna Luna Carmesí",

  // Formas Gimmighoul
  "gimmighoul": "Gimmighoul Forma Cofre",
  "gimmighoul-roaming": "Gimmighoul Forma Andante",

  // Formas Maushold
  "maushold-family-of-four": "Maushold",
  "maushold-family-of-three": "Maushold Familia de Tres",

  // Formas Zarude
  "zarude": "Zarude",
  "zarude-dada": "Zarude Papá/Dada",

  // Formas Toxtricity
  "toxtricity-amped": "Toxtricity Forma Aguda",
  "toxtricity-low-key": "Toxtricity Forma Grave",

  // Formas Ogerpon
  "ogerpon": "Ogerpon Máscara Turquesa",
  "ogerpon-wellspring-mask": "Ogerpon Máscara Fuente",
  "ogerpon-hearthflame-mask": "Ogerpon Máscara Horno",
  "ogerpon-cornerstone-mask": "Ogerpon Máscara Cimiento",

  // Formas Urshifu
  "urshifu-single-strike": "Urshifu Estilo Brusco",
  "urshifu-rapid-strike": "Urshifu Estilo Fluido",

  // Formas Calyrex
  "calyrex-ice": "Calyrex Jinete Glacial",
  "calyrex-shadow": "Calyrex Jinete Espectral",

  // Formas Oricorio
  "oricorio-baile": "Oricorio Estilo Apasionado",
  "oricorio-pom-pom": "Oricorio Estilo Animado",
  "oricorio-pau": "Oricorio Estilo Plácido",
  "oricorio-sensu": "Oricorio Estilo Refinado",
  
  // Formas Castform
  "castform": "Castform",
  "castform-rainy": "Castform Forma Lluvia",
  "castform-snowy": "Castform Forma Nieve",
  "castform-sunny": "Castform Forma Sol",

  // Formas Hoopa
  "hoopa": "Hoopa contenido",
  "hoopa-unbound": "Hoopa desatado",

  // Nombre Keldeo
  "keldeo-ordinary": "Keldeo",

  // Nombres de Frillish y Evos
  "frillish-male": "Frillish",
  "jellicent-male": "Jellicent",

  "pyroar-male": "Pyroar",

  // Formas Kyurem
  "kyurem-white": "Kyurem Blanco",
  "kyurem-black": "Kyurem Negro",

  // Formas Shaymin
  "shaymin-land": "Shaymin Forma Tierra",
  "shaymin-sky": "Shaymin Forma Cielo",

  // Formas Dialga, Palkia y Giratina
  "dialga-origin": "Dialga Forma Origen",
  "palkia-origin": "Palkia Forma Origen",
  "giratina-altered": "Giratina",
  "giratina-origin": "Giratina Forma Origen",

  // Formas Rotom
  "rotom-heat": "Rotom Forma Calor",
  "rotom-wash": "Rotom Forma Lavado",
  "rotom-frost": "Rotom Forma Frío",
  "rotom-fan": "Rotom Forma Ventilador",
  "rotom-mow": "Rotom Forma Corte",

  // Formas Zacian y Zamazenta
  "zacian-crowned": "Zacian Espada Suprema",
  "zamazenta-crowned": "Zamazenta Escudo Supremo",

  // Formas Necrozma
  "necrozma-dusk": "Necrozma melena crepuscular",
  "necrozma-dawn": "Necrozma alas del alba",
  "necrozma-ultra": "Ultra-Necrozma",

  // Formas Zygarde
  "zygarde-10": "Zygarde al 10%",
  "zygarde-50": "Zygarde al 50%",
  "zygarde-complete": "Zygarde Completo",

  // Formas Eiscue
  "eiscue-ice": "Eiscue Cara de Hielo",
  "eiscue-noice": "Eiscue Cara Deshielo",

  // Formas Wishiwashi
  "wishiwashi-solo": "Wishiwashi Forma individual",
  "wishiwashi-school": "Wishiwashi Forma Banco",

  // Formas Aegislash
  "aegislash-shield": "Aegislash Forma Escudo",
  "aegislash-blade": "Aegislash Forma Filo",

  // Formas Meloetta
  "meloetta-aria": "Meloetta Forma Lírica",
  "meloetta-pirouette": "Meloetta Forma Danza",

  // Formas Kyogre y Groudon
  "kyogre-primal": "Kyogre Primigenio",
  "groudon-primal": "Groudon Primigenio",

  // Formas Wormadam
  "wormadam-plant": "Wormadam Tronco Planta",
  "wormadam-sandy": "Wormadam Tronco Arena",
  "wormadam-trash": "Wormadam Tronco Basura",

  // Formas Basculin
  "basculin-red-striped": "Basculin Raya Roja",
  "basculin-blue-striped": "Basculin Raya Azul",
  "basculin-white-striped": "Basculin Raya Blanca",

  // Formas Basculegion
  "basculegion-male": "Basculegion ♂",
  "basculegion-female": "Basculegion ♀",

  // Forma Dudunsparce
  "dudunsparce-two-segment": "Dudunsparce",

  // Formas Tatsugiri
  "tatsugiri-curly": "Tatsugiri",
  "tatsugiri-droopy": "Tatsugiri Forma Lánguida",
  "tatsugiri-stretchy": "Tatsugiri Forma Recta",

  // Formas Squawkabilly
  "squawkabilly-green-plumage": "Squawkabilly Plumaje Verde",
  "squawkabilly-blue-plumage": "Squawkabilly Plumaje Azul",
  "squawkabilly-yellow-plumage": "Squawkabilly Plumaje Amarillo",
  "squawkabilly-white-plumage": "Squawkabilly Plumaje Blanco",

  // Formas Meowstic
  "meowstic-male": "Meowstic ♂",
  "meowstic-female": "Meowstic ♀",

  // Formas Pumpkaboo
  "pumpkaboo-average": "Pumpkaboo Tamaño Normal",
  "pumpkaboo-small": "Pumpkaboo Tamaño Pequeño",
  "pumpkaboo-large": "Pumpkaboo Tamaño Grande",
  "pumpkaboo-super": "Pumpkaboo Tamaño Extragrande",

  // Formas Gourgeist
  "gourgeist-average": "Gourgeist Tamaño Normal",
  "gourgeist-small": "Gourgeist Tamaño Pequeño",
  "gourgeist-large": "Gourgeist Tamaño Grande",
  "gourgeist-super": "Gourgeist Tamaño Extragrande",

  // Formas Mimikyu
  "mimikyu-disguised": "Mimikyu",

  // Formas Minior
  "minior-red-meteor": "Minior Forma Meteorito",
  "minior-red": "Minior Núcleo Rojo",
  "minior-orange": "Minior Núcleo Naranja",
  "minior-yellow": "Minior Núcleo Amarillo",
  "minior-green": "Minior Núcleo Verde",
  "minior-blue": "Minior Núcleo Azul",
  "minior-indigo": "Minior Núcleo Añil",
  "minior-violet": "Minior Núcleo Violeta",

  // Formas Morpeko
  "morpeko-full-belly": "Morpeko",

  // Formas Palafin
  "palafin-zero": "Palafin Forma ingenua",
  "palafin-hero": "Palafin Forma Heroica",
  
  // Formas Magearna
  "magearna": "Magearna",
  "magearna-original": "Magearna Color Vetusto",

  "rockruff-own-tempo": "Rockruff",

  // Formas Lycanroc
  "lycanroc-midday": "Lycanroc Forma Diurna",
  "lycanroc-midnight": "Lycanroc Forma Nocturna",
  "lycanroc-dusk": "Lycanroc Forma Crepuscular",

  // Formas Genios
  "tornadus-incarnate": "Tornadus Forma Avatar",
  "tornadus-therian": "Tornadus Forma Tótem",

  "thundurus-incarnate": "Thundurus Forma Avatar",
  "thundurus-therian": "Thundurus Forma Tótem",

  "landorus-incarnate": "Landorus Forma Avatar",
  "landorus-therian": "Landorus Forma Tótem",

  "enamorus-incarnate": "Enamorus Forma Avatar",
  "enamorus-therian": "Enamorus Forma Tótem",

  // Codigo Cero
  "type-null": "Código Cero",

  // Formas Deoxys
  "deoxys-normal": "Deoxys Forma Normal",
  "deoxys-attack": "Deoxys Forma Ataque",
  "deoxys-defense": "Deoxys Forma Defensa",
  "deoxys-speed": "Deoxys Forma Velocidad",

  // Formas Indeedee
  "indeedee-male": "Indeedee ♂",
  "indeedee-female": "Indeedee ♀",

  // Nombres farfetchd y evos
  "farfetchd-galar": "Farfetch'd de Galar",
  "sirfetchd": "Sirfetch'd",
  "farfetchd": "Farfetch'd",

  // Formas Mr Mime y cadena evo
  "mime-jr": "Mime Jr.",
  "mr-mime": "Mr. Mime",
  "mr-mime-galar": "Mr. Mime de Galar",
  "mr-rime": "Mr. Rime",

  // Nombres Pokemon con guiones
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "jangmo-o": "Jangmo-O",
  "hakamo-o": "Hakamo-O",
  "kommo-o": "Kommo-O",

  // Formas Oinkologne
  "oinkologne-male": "Oinkologne ♂",
  "oinkologne-female": "Oinkologne ♀",

  // Nombres de las Calamidades Paldea
  "ting-lu": "Ting-Lu",
  "chi-yu": "Chi-Yu",
  "wo-chien": "Wo-Chien",
  "chien-pao": "Chien-Pao",

  // Nombres Nidoran macho y hembra
  "nidoran-m": "Nidoran ♂",
  "nidoran-f": "Nidoran ♀"

};

const MEGA_DISPLAY_BY_KEY =
{
  "venusaur-mega": "Mega-Venusaur",

  "charizard-mega-x": "Mega-Charizard X",
  "charizard-mega-y": "Mega-Charizard Y",

  "blastoise-mega": "Mega-Blastoise",
  "alakazam-mega": "Mega-Alakazam",
  "gengar-mega": "Mega-Gengar",
  "kangaskhan-mega": "Mega-Kangaskhan",
  "pinsir-mega": "Mega-Pinsir",
  "gyarados-mega": "Mega-Gyarados",
  "aerodactyl-mega": "Mega-Aerodactyl",

  "mewtwo-mega-x": "Mega-Mewtwo X",
  "mewtwo-mega-y": "Mega-Mewtwo Y",

  "ampharos-mega": "Mega-Ampharos",
  "scizor-mega": "Mega-Scizor",
  "heracross-mega": "Mega-Heracross",
  "houndoom-mega": "Mega-Houndoom",
  "tyranitar-mega": "Mega-Tyranitar",
  "blaziken-mega": "Mega-Blaziken",
  "gardevoir-mega": "Mega-Gardevoir",
  "mawile-mega": "Mega-Mawile",
  "aggron-mega": "Mega-Aggron",
  "medicham-mega": "Mega-Medicham",
  "manectric-mega": "Mega-Manectric",
  "banette-mega": "Mega-Banette",
  "abomasnow-mega": "Mega-Abomasnow",
  "beedrill-mega": "Mega-Beedrill",
  "pidgeot-mega": "Mega-Pidgeot",
  "slowbro-mega": "Mega-Slowbro",
  "steelix-mega": "Mega-Steelix",
  "sceptile-mega": "Mega-Sceptile",
  "swampert-mega": "Mega-Swampert",
  "sableye-mega": "Mega-Sableye",
  "sharpedo-mega": "Mega-Sharpedo",
  "camerupt-mega": "Mega-Camerupt",
  "altaria-mega": "Mega-Altaria",
  "glalie-mega": "Mega-Glalie",
  "salamence-mega": "Mega-Salamence",
  "metagross-mega": "Mega-Metagross",
  "latias-mega": "Mega-Latias",
  "latios-mega": "Mega-Latios",
  "rayquaza-mega": "Mega-Rayquaza",
  "lopunny-mega": "Mega-Lopunny",
  "gallade-mega": "Mega-Gallade",
  "audino-mega": "Mega-Audino",
  "diancie-mega": "Mega-Diancie",
  "dragonite-mega": "Mega-Dragonite",
  "victreebel-mega": "Mega-Victreebel",
  "hawlucha-mega": "Mega-Hawlucha",
  "malamar-mega": "Mega-Malamar",
  "greninja-mega": "Mega-Greninja",
  "delphox-mega": "Mega-Delphox",
  "chesnaught-mega": "Mega-Chesnaught",
  "drampa-mega": "Mega-Drampa",
  "excadrill-mega": "Mega-Excadrill",
  "eelektross-mega": "Mega-Eelektross",
  "chandelure-mega": "Mega-Chandelure",
  "falinks-mega": "Mega-Falinks",
  "barbaracle-mega": "Mega-Barbaracle",
  "skarmory-mega": "Mega-Skarmory",
  "scolipede-mega": "Mega-Scolipede",
  "froslass-mega": "Mega-Froslass",
  "dragalge-mega": "Mega-Dragalge",
  "clefable-mega": "Mega-Clefable",
  "scrafty-mega": "Mega-Scrafty",
  "starmie-mega": "Mega-Starmie",

  "pyroar-male-mega": "Mega-Pyroar",

  "meganium-mega": "Mega-Meganium",
  "feraligatr-mega": "Mega-Feraligatr",
  "emboar-mega": "Mega-Emboar",

  "floette-mega": "Mega-Floette Flor Eterna",

  "zygarde-mega": "Mega-Zygarde Forma Completa",

  "zeraora-mega": "Mega-Zeraora",
  "golisopod-mega": "Mega-Golisopod",

  "magearna-mega": "Mega-Magearna",
  "magearna-original-mega": "Mega-Magearna Color Vetusto",

  "chimecho-mega": "Mega-Chimecho",
  "staraptor-mega": "Mega-Staraptor",
  "heatran-mega": "Mega-Heatran",
  "darkrai-mega": "Mega-Darkrai",
  "golurk-mega": "Mega-Golurk",

  "meowstic-male-mega": "Mega-Meowstic ♂",
  "meowstic-female-mega": "Mega-Meowstic ♀",

  "crabominable-mega": "Mega-Crabominable",
  "scovillain-mega": "Mega-Scovillain",
  "glimmora-mega": "Mega-Glimmora",

  "tatsugiri-curly-mega": "Mega-Tatsugiri Forma Curvada",
  "tatsugiri-droopy-mega": "Mega-Tatsugiri Forma Lánguida",
  "tatsugiri-stretchy-mega": "Mega-Tatsugiri Forma Recta",

  "baxcalibur-mega": "Mega-Baxcalibur",

  "lucario-mega": "Mega-Lucario",
  "lucario-mega-z": "Mega-Lucario Z",

  "garchomp-mega": "Mega-Garchomp",
  "garchomp-mega-z": "Mega-Garchomp Z",

  "absol-mega": "Mega-Absol",
  "absol-mega-z": "Mega-Absol Z",

  "raichu-mega-x": "Mega-Raichu X",
  "raichu-mega-y": "Mega-Raichu Y"
};

function escapePokemonRegExp(text)
{
    return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleFromPokemonKey(key)
{
    return String(key || "")
        .split("-")
        .map(function(word)
        {
            return word ? word[0].toUpperCase() + word.slice(1) : word;
        })
        .join(" ");
}

function fallbackPokemonDisplayForKey(key)
{
    const rawKey = String(key || "").toLowerCase().trim();

    const megaDisplay = MEGA_DISPLAY_BY_KEY[rawKey];
    if(megaDisplay)
    {
        return megaDisplay;
    }

    const regionKeys = Object.keys(REGION_DISPLAY_META || {});
    const regionPattern = regionKeys.length ? regionKeys.map(escapePokemonRegExp).join("|") : "";

    if(!regionPattern)
    {
        return titleFromPokemonKey(key);
    }

    const m = String(key || "").match(new RegExp(`^(.*?)-(${regionPattern})$`));
    if(m)
    {
        const base = titleFromPokemonKey(m[1]);
        const regionDisplay = REGION_DISPLAY_META[m[2]];
        if(regionDisplay)
        {
            return `${base} de ${regionDisplay}`;
        }
    }

    return titleFromPokemonKey(key);
}

function toPokemonDisplayName(key)
{
    const normalizedKey = String(key || "").toLowerCase().trim();
    return DISPLAY_ES_NAME_SPECIAL_PKM_BY_KEY[normalizedKey] || fallbackPokemonDisplayForKey(normalizedKey);
}
// ---------------- DATOS META DE NOMBRES POKÉMON - FIN ----------------


// ---------------- DATOS META DE COLORES POKÉMON - INICIO ---------------- 
//#region COLOR PKM

const COLOR_BY_KEY_PKM =
{
  "raichu": "yellow",
  "raichu-alola": "brown",

  "rattata": "purple",
  "rattata-alola": "black",

  "raticate": "brown",
  "raticate-alola": "black",

  "sandshrew": "yellow",
  "sandshrew-alola": "white",

  "sandslash": "yellow",
  "sandslash-alola": "blue",

  "vulpix": "brown",
  "vulpix-alola": "white",

  "ninetales": "yellow",
  "ninetales-alola": "blue",

  "grimer": "purple",
  "grimer-alola": "green",

  "muk": "purple",
  "muk-alola": "green",

  "marowak": "brown",
  "marowak-alola": "purple",

  "geodude": "brown",
  "geodude-alola": "gray",

  "graveler": "brown",
  "graveler-alola": "gray",

  "golem": "brown",
  "golem-alola": "gray",

  "meowth": "yellow",
  "persian": "yellow",

  "meowth-alola": "blue",
  "persian-alola": "blue",

  "meowth-galar": "brown",
  "perrserker": "brown",

  "mime-jr": "pink",
  "mr-mime": "pink",
  "mr-mime-galar": "white",
  "mr-rime": "purple",

  "darumaka": "red",
  "darumaka-galar": "white",

  "darmanitan-standard": "red",
  "darmanitan-zen": "blue",

  "darmanitan-galar-standard": "white",
  "darmanitan-galar-zen": "white",

  "charizard-mega-x": "black",

  "tatsugiri-curly": "red",
  "tatsugiri-curly-mega": "red",

  "tatsugiri-droopy": "pink",
  "tatsugiri-droopy-mega": "pink",

  "tatsugiri-stretchy": "yellow",
  "tatsugiri-stretchy-mega": "yellow",

  "articuno": "blue",
  "articuno-galar": "purple",

  "moltres": "yellow",
  "moltres-galar": "red",

  "stunfisk": "brown",
  "stunfisk-galar": "green",

  "ponyta": "yellow",
  "ponyta-galar": "white",

  "rapidash": "yellow",
  "rapidash-galar": "white",

  "weezing": "purple",
  "weezing-galar": "gray",

  "corsola": "pink",
  "corsola-galar": "white",

  "zigzagoon": "brown",
  "zigzagoon-galar": "white",

  "braviary": "red",
  "braviary-hisui": "white",

  "wooper": "blue",
  "wooper-paldea": "brown",

  "tauros": "brown",
  "tauros-paldea-aqua-breed": "black",
  "tauros-paldea-blaze-breed": "black",
  "tauros-paldea-combat-breed": "black",

  "castform": "gray",
  "castform-sunny": "red",
  "castform-rainy": "blue",
  "castform-snowy": "white",

  "wormadam-plant": "green",
  "wormadam-sandy": "brown",
  "wormadam-trash": "red",

  "burmy-plant": "green",
  "burmy-sandy": "brown", // esta api key no existe, pero la uso solo para mostrar color de forma
  "burmy-trash": "red", // esta api key no existe, pero la uso solo para mostrar color de forma

  "cherrim": "purple",
  "cherrim-sunshine": "pink", // esta api key no existe, pero la uso solo para mostrar color de forma

  "zygarde-10": "black",
  "zygarde-50": "green",
  "zygarde-complete": "green",
  "zygarde-mega": "green",

  "minior-red": "red",
  "minior-orange": "red",
  "minior-yellow": "yellow",
  "minior-green": "green",
  "minior-blue": "blue",
  "minior-indigo": "blue",
  "minior-violet": "purple",
  "minior-red-meteor": "brown",

  "necrozma": "black",
  "necrozma-dusk": "yellow",
  "necrozma-dawn": "blue",
  "necrozma-ultra": "yellow",

  "oricorio-baile": "red",
  "oricorio-pom-pom": "yellow",
  "oricorio-pau": "pink",
  "oricorio-sensu": "purple",

  "calyrex": "green",
  "calyrex-ice": "white",
  "calyrex-shadow": "black",

  "ogerpon": "green",
  "ogerpon-wellspring-mask": "blue",
  "ogerpon-hearthflame-mask": "red",
  "ogerpon-cornerstone-mask": "gray",

  "lycanroc-midday": "brown",
  "lycanroc-midnight": "red",
  "lycanroc-dusk": "brown",

  "magearna": "gray",
  "magearna-original": "red",

  "squawkabilly-green-plumage": "green",
  "squawkabilly-blue-plumage": "blue",
  "squawkabilly-yellow-plumage": "yellow",
  "squawkabilly-white-plumage": "white",

  "gimmighoul": "red",
  "gimmighoul-roaming": "gray",

  "meowstic-male": "blue",
  "meowstic-female": "white",

  "shellos": "purple",
  "shellos_este": "blue",

  "gastrodon": "purple",
  "gastrodon_este": "blue",

  "oinkologne-male": "gray",
  "oinkologne-female": "brown"
};

function normalizeColorKey(input)
{
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  return raw;
}

function getColorPkmByKey(input)
{
  const key = normalizeColorKey(input);
  if (!key) return "";

  return COLOR_BY_KEY_PKM[key] || "";
}
// ---------------- DATOS META DE COLORES POKÉMON - FIN ---------------- 


// -------------- DATOS META DE GENERACIONES POKÉMON - INICIO -------------- 
//#region GEN PKM

const PKM_GEN_BY_KEY =
{
  // Alola (7ma Gen)
  "raichu-alola": "generation-vii",

  "rattata-alola": "generation-vii",
  "raticate-alola": "generation-vii",

  "sandshrew-alola": "generation-vii",
  "sandslash-alola": "generation-vii",

  "vulpix-alola": "generation-vii",
  "ninetales-alola": "generation-vii",

  "diglett-alola": "generation-vii",
  "dugtrio-alola": "generation-vii",

  "geodude-alola": "generation-vii",
  "graveler-alola": "generation-vii",
  "golem-alola": "generation-vii",

  "grimer-alola": "generation-vii",
  "muk-alola": "generation-vii",

  "exeggutor-alola": "generation-vii",

  "marowak-alola": "generation-vii",

  "meowth-alola": "generation-vii",
  "persian-alola": "generation-vii",

  // Galar (8va Gen)
  "meowth-galar": "generation-viii",

  "weezing-galar": "generation-viii",

  "corsola-galar": "generation-viii",

  "zigzagoon-galar": "generation-viii",
  "linoone-galar": "generation-viii",

  "yamask-galar": "generation-viii",

  "farfetchd-galar": "generation-viii",

  "slowpoke-galar": "generation-viii",
  "slowbro-galar": "generation-viii",
  "slowking-galar": "generation-viii",

  "articuno-galar": "generation-viii",
  "zapdos-galar": "generation-viii",
  "moltres-galar": "generation-viii",

  "stunfisk-galar": "generation-viii",

  "ponyta-galar": "generation-viii",
  "rapidash-galar": "generation-viii",

  "darumaka-galar": "generation-viii",
  "darmanitan-galar-standard": "generation-viii",
  "darmanitan-galar-zen": "generation-viii",

  "mr-mime-galar": "generation-viii",

  // Hisui (8va Gen)
  "lilligant-hisui": "generation-viii",

  "braviary-hisui": "generation-viii",

  "sliggoo-hisui": "generation-viii",
  "goodra-hisui": "generation-viii",

  "avalugg-hisui": "generation-viii",

  "typhlosion-hisui": "generation-viii",
  "decidueye-hisui": "generation-viii",
  "samurott-hisui": "generation-viii",

  "basculin-white-striped": "generation-viii",

  "growlithe-hisui": "generation-viii",
  "arcanine-hisui": "generation-viii",

  "voltorb-hisui": "generation-viii",
  "electrode-hisui": "generation-viii",

  "qwilfish-hisui": "generation-viii",

  "sneasel-hisui": "generation-viii",

  "zorua-hisui": "generation-viii",
  "zoroark-hisui": "generation-viii",

  // Paldea (9na Gen)
  "wooper-paldea": "generation-ix",

  "tauros-paldea-aqua-breed": "generation-ix",
  "tauros-paldea-blaze-breed": "generation-ix",
  "tauros-paldea-combat-breed": "generation-ix"
};

function normalizePokemonKey(input)
{
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  return raw;
}

function getPokemonGenByKey(apiKey, fallback = "")
{
  const key = normalizePokemonKey(apiKey);
  if (!key) return "";

  return PKM_GEN_BY_KEY[key] || fallback;
}
// -------------- DATOS META DE GENERACIONES POKÉMON - FIN -------------- 



// ---------------- DATOS META DE GIGAMAX POKÉMON - INICIO ---------------- 
//#region GIGAMAX PKM

// Map de los Pokemon con Gigamax, con el apiKey, Display, etc.
const GIGAS_PKM_META =
{
  "charizard":
  {
    "apiKey": "charizard-gmax",
    "display": "Charizard Gigamax",
    "displayMov": "Gigallamarada",
    "descMov": "Causa daño al objetivo y, al final de cada turno, inflige daño a todos los Pokémon rivales que no sean de tipo fuego durante 4 turnos, restándoles 1/6 de sus PS máximos."
  },
  "butterfree":
  {
    "apiKey": "butterfree-gmax",
    "display": "Butterfree Gigamax",
    "displayMov": "Gigaestupor",
    "descMov": "Causa daño al objetivo y siempre inflige un estado aleatorio a los oponentes adyacentes entre paralizado, dormido o envenenado."
  },
  "pikachu":
  {
    "apiKey": "pikachu-gmax",
    "display": "Pikachu Gigamax",
    "displayMov": "Gigatronada",
    "descMov": "Causa daño al objetivo y paraliza a todos los Pokémon del bando rival."
  },
  "meowth":
  {
    "apiKey": "meowth-gmax",
    "display": "Meowth Gigamax",
    "displayMov": "Gigamonedas",
    "descMov": "Causa daño al objetivo y siempre deja confundidos a todos los Pokémon rivales. Además, esparce monedas por el campo de batalla que pueden recogerse al final del combate."
  },
  "machamp":
  {
    "apiKey": "machamp-gmax",
    "display": "Machamp Gigamax",
    "displayMov": "Gigapuñición",
    "descMov": "Causa daño al objetivo y aumenta en un nivel el índice de golpe crítico tanto del usuario como de los Pokémon aliados en combate."
  },
  "gengar":
  {
    "apiKey": "gengar-gmax",
    "display": "Gengar Gigamax",
    "displayMov": "Gigaaparición",
    "descMov": "Causa daño al objetivo e impide que este sea cambiado por otro Pokémon mientras el usuario siga en combate."
  },
  "kingler":
  {
    "apiKey": "kingler-gmax",
    "display": "Kingler Gigamax",
    "displayMov": "Gigaespuma",
    "descMov": "Causa daño al objetivo y reduce en dos niveles la velocidad de los oponentes adyacentes."
  },
  "lapras":
  {
    "apiKey": "lapras-gmax",
    "display": "Lapras Gigamax",
    "displayMov": "Gigamelodía",
    "descMov": "Causa daño al objetivo y establece una barrera de velo aurora en el equipo aliado sin necesidad de que esté granizando."
  },
  "eevee":
  {
    "apiKey": "eevee-gmax",
    "display": "Eevee Gigamax",
    "displayMov": "Gigaternura",
    "descMov": "Causa daño al objetivo y siempre deja enamorados a todos los Pokémon rivales que sean del sexo opuesto al del usuario."
  },
  "snorlax":
  {
    "apiKey": "snorlax-gmax",
    "display": "Snorlax Gigamax",
    "displayMov": "Gigarreciclaje",
    "descMov": "Causa daño al objetivo y tiene una probabilidad del 50% de restaurar las bayas del equipo aliado que han sido consumidas de forma natural o lanzadas mediante lanzamiento."
  },
  "garbodor":
  {
    "apiKey": "garbodor-gmax",
    "display": "Garbodor Gigamax",
    "displayMov": "Gigapestilencia",
    "descMov": "Causa daño al objetivo y envenena a todos los Pokémon del bando rival."
  },
  "melmetal":
  {
    "apiKey": "melmetal-gmax",
    "display": "Melmetal Gigamax",
    "displayMov": "Gigafundido",
    "descMov": "Causa daño al objetivo e impide a los oponentes usar un mismo movimiento 2 veces seguidas."
  },
  "corviknight":
  {
    "apiKey": "corviknight-gmax",
    "display": "Corviknight Gigamax",
    "displayMov": "Gigahuracán",
    "descMov": "Causa daño al objetivo y elimina los efectos de barreras del campo del oponente, las trampas de ambos campos, así como los campos que haya activos."
  },
  "orbeetle":
  {
    "apiKey": "orbeetle-gmax",
    "display": "Orbeetle Gigamax",
    "displayMov": "Gigabóveda",
    "descMov": "Causa daño al objetivo y causa los efectos de gravedad durante 5 turnos."
  },
  "drednaw":
  {
    "apiKey": "drednaw-gmax",
    "display": "Drednaw Gigamax",
    "displayMov": "Gigatrampa Rocas",
    "descMov": "Causa daño al objetivo y coloca trampa rocas en el campo del oponente."
  },
  "coalossal":
  {
    "apiKey": "coalossal-gmax",
    "display": "Coalossal Gigamax",
    "displayMov": "Gigarroca Ígnea",
    "descMov": "Causa daño al objetivo y, al final de cada turno, inflige daño a todos los Pokémon rivales que no sean de tipo roca durante 4 turnos, restándoles 1/6 de sus PS máximos."
  },
  "flapple":
  {
    "apiKey": "flapple-gmax",
    "display": "Flapple Gigamax",
    "displayMov": "Gigacorrosión",
    "descMov": "Causa daño al objetivo y reduce en un nivel la evasión de todos los Pokémon rivales."
  },
  "appletun":
  {
    "apiKey": "appletun-gmax",
    "display": "Appletun Gigamax",
    "displayMov": "Giganéctar",
    "descMov": "Causa daño al objetivo y cura los problemas de estado del usuario y los Pokémon aliados."
  },
  "sandaconda":
  {
    "apiKey": "sandaconda-gmax",
    "display": "Sandaconda Gigamax",
    "displayMov": "Gigapolvareda",
    "descMov": "Causa daño y deja a los oponentes apresados en bucle arena durante 4 o 5 turnos, restándoles 1/16 de los PS máximos durante cada turno e impidiendo su cambio."
  },
  "toxtricity-amped":
  {
    "apiKey": "toxtricity-amped-gmax",
    "display": "Toxtricity Gigamax",
    "displayMov": "Gigadescarga",
    "descMov": "Causa daño al objetivo y siempre inflige un estado aleatorio a los oponentes adyacentes entre paralizado o envenenado."
  },
  "toxtricity-low-key":
  {
    "apiKey": "toxtricity-low-key-gmax",
    "display": "Toxtricity Gigamax",
    "displayMov": "Gigadescarga",
    "descMov": "Causa daño al objetivo y siempre inflige un estado aleatorio a los oponentes adyacentes entre paralizado o envenenado."
  },
  "centiskorch":
  {
    "apiKey": "centiskorch-gmax",
    "display": "Centiskorch Gigamax",
    "displayMov": "Gigacienfuegos",
    "descMov": "Causa daño al objetivo y deja a los oponentes apresados en giro fuego. Los oponentes quedan apresados durante 4 o 5 turnos y les resta 1/8 de los PS máximos al final de cada turno hasta ser liberados."
  },
  "hatterene":
  {
    "apiKey": "hatterene-gmax",
    "display": "Hatterene Gigamax",
    "displayMov": "Gigacastigo",
    "descMov": "Causa daño al objetivo y siempre deja confundidos a todos los Pokémon rivales."
  },
  "grimmsnarl":
  {
    "apiKey": "grimmsnarl-gmax",
    "display": "Grimmsnarl Gigamax",
    "displayMov": "Gigasopor",
    "descMov": "Causa daño al objetivo y tiene una probabilidad del 50% de adormecer al oponente en el primer turno, haciendo que se duerma al final del siguiente turno."
  },
  "alcremie":
  {
    "apiKey": "alcremie-gmax",
    "display": "Alcremie Gigamax",
    "displayMov": "Gigacolofón",
    "descMov": "Causa daño al objetivo y restaura al usuario y los Pokémon aliados en combate 1/6 de sus respectivos PS máximos."
  },
  "copperajah":
  {
    "apiKey": "copperajah-gmax",
    "display": "Copperajah Gigamax",
    "displayMov": "Gigatrampa Acero",
    "descMov": "Causa daño al objetivo y coloca piezas de acero en el campo del oponente."
  },
  "duraludon":
  {
    "apiKey": "duraludon-gmax",
    "display": "Duraludon Gigamax",
    "displayMov": "Gigadesgaste",
    "descMov": "Causa daño al objetivo y reduce 4 PP del último movimiento usado por el oponente."
  },
  "venusaur":
  {
    "apiKey": "venusaur-gmax",
    "display": "Venusaur Gigamax",
    "displayMov": "Gigalianas",
    "descMov": "Causa daño al objetivo y, al final de cada turno, inflige daño a todos los Pokémon rivales que no sean de tipo planta durante 4 turnos, restándoles 1/6 de sus PS máximos."
  },
  "blastoise":
  {
    "apiKey": "blastoise-gmax",
    "display": "Blastoise Gigamax",
    "displayMov": "Gigacañonazo",
    "descMov": "Causa daño al objetivo y, al final de cada turno, inflige daño a todos los Pokémon rivales que no sean de tipo agua durante 4 turnos, restándoles 1/6 de sus PS máximos."
  },
  "rillaboom":
  {
    "apiKey": "rillaboom-gmax",
    "display": "Rillaboom Gigamax",
    "displayMov": "Gigarredoble",
    "descMov": "Causa daño al objetivo ignorando los efectos de la habilidad del mismo."
  },
  "cinderace":
  {
    "apiKey": "cinderace-gmax",
    "display": "Cinderace Gigamax",
    "displayMov": "Gigaesfera Ígnea",
    "descMov": "Causa daño al objetivo ignorando los efectos de la habilidad del mismo."
  },
  "inteleon":
  {
    "apiKey": "inteleon-gmax",
    "display": "Inteleon Gigamax",
    "displayMov": "Gigadisparo",
    "descMov": "Causa daño al objetivo ignorando los efectos de la habilidad del mismo."
  },
  "urshifu-single-strike":
  {
    "apiKey": "urshifu-single-strike-gmax",
    "display": "Urshifu Gigamax Estilo Brusco",
    "displayMov": "Gigagolpe Brusco",
    "descMov": "Causa daño al objetivo, incluso aunque este se esté protegiendo. El movimiento es incluso capaz de atravesar el movimiento maxibarrera."
  },
  "urshifu-rapid-strike":
  {
    "apiKey": "urshifu-rapid-strike-gmax",
    "display": "Urshifu Gigamax Estilo Fluido",
    "displayMov": "Gigagolpe Fluido",
    "descMov": "Causa daño al objetivo, incluso aunque este se esté protegiendo. El movimiento es incluso capaz de atravesar el movimiento maxibarrera."
  },
  "eternatus":
  {
    "apiKey": "eternatus-eternamax",
    "display": "Eternatus Eternamax",
    "desc": "Esta es la forma Gigamax que posee Eternatus. No es posible obtenerla en el juego; únicamente aparece durante la batalla final en Pokémon Espada y Escudo."
  }
};

function normalizePkmBaseGigaKey(input)
{
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  return raw;
}

function getPokemonGigaMeta(input)
{
  const key = normalizePkmBaseGigaKey(input);
  return key ? (GIGAS_PKM_META[key] || null) : null;
}

function getPokemonGigaForm(input)
{
  const meta = getPokemonGigaMeta(input);
  return meta || null;
}

function hasPokemonGigaForm(apiKey)
{
  return getPokemonGigaForm(apiKey) !== null;
}
// ---------------- DATOS META DE GIGAMAX POKÉMON - FIN ---------------- 


// ---------------- DATOS META DE MEGA EVOLUCIONES POKÉMON - FIN ---------------- 
//#region MEGAS PKM

const MEGAS_PKM_META =
{
  "venusaur":
  {
    "megaForms": [ { "apiKey": "venusaur-mega", "display": "Mega-Venusaur" } ]
  },
  "charizard":
  {
    "megaForms": [
      { "apiKey": "charizard-mega-x", "display": "Mega-Charizard X", "color": getColorPkmByKey("charizard-mega-x") },
      { "apiKey": "charizard-mega-y", "display": "Mega-Charizard Y" }
    ]
  },
  "blastoise":
  {
    "megaForms": [ { "apiKey": "blastoise-mega", "display": "Mega-Blastoise" } ]
  },
  "alakazam":
  {
    "megaForms": [
      { "apiKey": "alakazam-mega", "display": "Mega-Alakazam" }
    ]
  },
  "gengar":
  {
    "megaForms": [
      { "apiKey": "gengar-mega", "display": "Mega-Gengar" }
    ]
  },
  "kangaskhan":
  {
    "megaForms": [
      { "apiKey": "kangaskhan-mega", "display": "Mega-Kangaskhan" }
    ]
  },
  "pinsir":
  {
    "megaForms": [
      { "apiKey": "pinsir-mega", "display": "Mega-Pinsir" }
    ]
  },
  "gyarados":
  {
    "megaForms": [
      { "apiKey": "gyarados-mega", "display": "Mega-Gyarados" }
    ]
  },
  "aerodactyl":
  {
    "megaForms": [
      { "apiKey": "aerodactyl-mega", "display": "Mega-Aerodactyl" }
    ]
  },
  "mewtwo":
  {
    "megaForms": [
      { "apiKey": "mewtwo-mega-x", "display": "Mega-Mewtwo X" },
      { "apiKey": "mewtwo-mega-y", "display": "Mega-Mewtwo Y" }
    ]
  },
  "ampharos":
  {
    "megaForms": [
      { "apiKey": "ampharos-mega", "display": "Mega-Ampharos" }
    ]
  },
  "scizor":
  {
    "megaForms": [
      { "apiKey": "scizor-mega", "display": "Mega-Scizor" }
    ]
  },
  "heracross":
  {
    "megaForms": [
      { "apiKey": "heracross-mega", "display": "Mega-Heracross" }
    ]
  },
  "houndoom":
  {
    "megaForms": [
      { "apiKey": "houndoom-mega", "display": "Mega-Houndoom" }
    ]
  },
  "tyranitar":
  {
    "megaForms": [
      { "apiKey": "tyranitar-mega", "display": "Mega-Tyranitar" }
    ]
  },
  "blaziken":
  {
    "megaForms": [
      { "apiKey": "blaziken-mega", "display": "Mega-Blaziken" }
    ]
  },
  "gardevoir":
  {
    "megaForms": [
      { "apiKey": "gardevoir-mega", "display": "Mega-Gardevoir" }
    ]
  },
  "mawile":
  {
    "megaForms": [
      { "apiKey": "mawile-mega", "display": "Mega-Mawile" }
    ]
  },
  "aggron":
  {
    "megaForms": [
      { "apiKey": "aggron-mega", "display": "Mega-Aggron" }
    ]
  },
  "medicham":
  {
    "megaForms": [
      { "apiKey": "medicham-mega", "display": "Mega-Medicham" }
    ]
  },
  "manectric":
  {
    "megaForms": [
      { "apiKey": "manectric-mega", "display": "Mega-Manectric" }
    ]
  },
  "banette":
  {
    "megaForms": [
      { "apiKey": "banette-mega", "display": "Mega-Banette" }
    ]
  },
  "abomasnow":
  {
    "megaForms": [
      { "apiKey": "abomasnow-mega", "display": "Mega-Abomasnow" }
    ]
  },
  "beedrill":
  {
    "megaForms": [
      { "apiKey": "beedrill-mega", "display": "Mega-Beedrill" }
    ]
  },
  "pidgeot":
  {
    "megaForms": [
      { "apiKey": "pidgeot-mega", "display": "Mega-Pidgeot" }
    ]
  },
  "slowbro":
  {
    "megaForms": [
      { "apiKey": "slowbro-mega", "display": "Mega-Slowbro" }
    ]
  },
  "steelix":
  {
    "megaForms": [
      { "apiKey": "steelix-mega", "display": "Mega-Steelix" }
    ]
  },
  "sceptile":
  {
    "megaForms": [
      { "apiKey": "sceptile-mega", "display": "Mega-Sceptile" }
    ]
  },
  "swampert":
  {
    "megaForms": [
      { "apiKey": "swampert-mega", "display": "Mega-Swampert" }
    ]
  },
  "sableye":
  {
    "megaForms": [
      { "apiKey": "sableye-mega", "display": "Mega-Sableye" }
    ]
  },
  "sharpedo":
  {
    "megaForms": [
      { "apiKey": "sharpedo-mega", "display": "Mega-Sharpedo" }
    ]
  },
  "camerupt":
  {
    "megaForms": [
      { "apiKey": "camerupt-mega", "display": "Mega-Camerupt" }
    ]
  },
  "altaria":
  {
    "megaForms": [
      { "apiKey": "altaria-mega", "display": "Mega-Altaria" }
    ]
  },
  "glalie":
  {
    "megaForms": [
      { "apiKey": "glalie-mega", "display": "Mega-Glalie" }
    ]
  },
  "salamence":
  {
    "megaForms": [
      { "apiKey": "salamence-mega", "display": "Mega-Salamence" }
    ]
  },
  "metagross":
  {
    "megaForms": [
      { "apiKey": "metagross-mega", "display": "Mega-Metagross" }
    ]
  },
  "latias":
  {
    "megaForms": [
      { "apiKey": "latias-mega", "display": "Mega-Latias", "color": "purple" }
    ]
  },
  "latios":
  {
    "megaForms": [
      { "apiKey": "latios-mega", "display": "Mega-Latios", "color": "purple" }
    ]
  },
  "rayquaza":
  {
    "megaForms": [
      { "apiKey": "rayquaza-mega", "display": "Mega-Rayquaza", "desc": "Megaevoluciona conociendo el movimiento Ascenso Draco, sin necesitar una megapiedra." }
    ]
  },
  "lopunny":
  {
    "megaForms": [
      { "apiKey": "lopunny-mega", "display": "Mega-Lopunny" }
    ]
  },
  "gallade":
  {
    "megaForms": [
      { "apiKey": "gallade-mega", "display": "Mega-Gallade" }
    ]
  },
  "audino":
  {
    "megaForms": [
      { "apiKey": "audino-mega", "display": "Mega-Audino" }
    ]
  },
  "diancie":
  {
    "megaForms": [
      { "apiKey": "diancie-mega", "display": "Mega-Diancie" }
    ]
  },
  "dragonite":
  {
    "megaForms": [
      { "apiKey": "dragonite-mega", "display": "Mega-Dragonite" }
    ]
  },
  "victreebel":
  {
    "megaForms": [
      { "apiKey": "victreebel-mega", "display": "Mega-Victreebel" }
    ]
  },
  "hawlucha":
  {
    "megaForms": [
      { "apiKey": "hawlucha-mega", "display": "Mega-Hawlucha" }
    ]
  },
  "malamar":
  {
    "megaForms": [
      { "apiKey": "malamar-mega", "display": "Mega-Malamar" }
    ]
  },
  "greninja":
  {
    "megaForms": [
      { "apiKey": "greninja-mega", "display": "Mega-Greninja" }
    ]
  },
  "delphox":
  {
    "megaForms": [
      { "apiKey": "delphox-mega", "display": "Mega-Delphox" }
    ]
  },
  "chesnaught":
  {
    "megaForms": [
      { "apiKey": "chesnaught-mega", "display": "Mega-Chesnaught" }
    ]
  },
  "drampa":
  {
    "megaForms": [
      { "apiKey": "drampa-mega", "display": "Mega-Drampa" }
    ]
  },
  "excadrill":
  {
    "megaForms": [
      { "apiKey": "excadrill-mega", "display": "Mega-Excadrill" }
    ]
  },
  "eelektross":
  {
    "megaForms": [
      { "apiKey": "eelektross-mega", "display": "Mega-Eelektross" }
    ]
  },
  "chandelure":
  {
    "megaForms": [
      { "apiKey": "chandelure-mega", "display": "Mega-Chandelure" }
    ]
  },
  "falinks":
  {
    "megaForms": [
      { "apiKey": "falinks-mega", "display": "Mega-Falinks" }
    ]
  },
  "barbaracle":
  {
    "megaForms": [
      { "apiKey": "barbaracle-mega", "display": "Mega-Barbaracle" }
    ]
  },
  "skarmory":
  {
    "megaForms": [
      { "apiKey": "skarmory-mega", "display": "Mega-Skarmory" }
    ]
  },
  "scolipede":
  {
    "megaForms": [
      { "apiKey": "scolipede-mega", "display": "Mega-Scolipede" }
    ]
  },
  "froslass":
  {
    "megaForms": [
      { "apiKey": "froslass-mega", "display": "Mega-Froslass" }
    ]
  },
  "dragalge":
  {
    "megaForms": [
      { "apiKey": "dragalge-mega", "display": "Mega-Dragalge" }
    ]
  },
  "clefable":
  {
    "megaForms": [
      { "apiKey": "clefable-mega", "display": "Mega-Clefable" }
    ]
  },
  "scrafty":
  {
    "megaForms": [
      { "apiKey": "scrafty-mega", "display": "Mega-Scrafty" }
    ]
  },
  "starmie":
  {
    "megaForms": [
      { "apiKey": "starmie-mega", "display": "Mega-Starmie" }
    ]
  },
  "pyroar-male":
  {
    "megaForms": [
      { "apiKey": "pyroar-mega", "display": "Mega-Pyroar", "desc": "Megaevoluciona con Pyroarita equipada en combate." }
    ]
  },
  "meganium":
  {
    "megaForms": [
      { "apiKey": "meganium-mega", "display": "Mega-Meganium" }
    ]
  },
  "feraligatr":
  {
    "megaForms": [
      { "apiKey": "feraligatr-mega", "display": "Mega-Feraligatr" }
    ]
  },
  "emboar":
  {
    "megaForms": [
      { "apiKey": "emboar-mega", "display": "Mega-Emboar" }
    ]
  },
  "floette-eternal":
  {
    "megaForms": [
      { "apiKey": "floette-mega", "display": "Mega-Floette Flor Eterna", "desc": "Megaevoluciona con Floetteita equipada en combate." }
    ]
  },
  "zygarde-complete":
  {
    "megaForms": [
      { "apiKey": "zygarde-mega", "display": "Mega-Zygarde Forma Completa", "color": getColorPkmByKey("zygarde-complete"), "desc": "Megaevoluciona con Zygardeita equipada en combate." }
    ]
  },
  "zeraora":
  {
    "megaForms": [
      { "apiKey": "zeraora-mega", "display": "Mega-Zeraora" }
    ]
  },
  "golisopod":
  {
    "megaForms": [
      { "apiKey": "golisopod-mega", "display": "Mega-Golisopod" }
    ]
  },
  "magearna":
  {
    "megaForms": [
      { "apiKey": "magearna-mega", "display": "Mega-Magearna", "color": getColorPkmByKey("magearna"), "desc": "Megaevoluciona con Magearnaita equipada en combate." },
      { "apiKey": "magearna-original-mega", "display": "Mega-Magearna Color Vetusto", "color": getColorPkmByKey("magearna-original"), "desc": "Megaevoluciona con Magearnaita equipada en combate." }
    ]
  },
  "magearna-original":
  {
    "megaForms": [
      { "apiKey": "magearna-mega", "display": "Mega-Magearna", "color": getColorPkmByKey("magearna"), "desc": "Megaevoluciona con Magearnaita equipada en combate." },
      { "apiKey": "magearna-original-mega", "display": "Mega-Magearna Color Vetusto", "color": getColorPkmByKey("magearna-original"), "desc": "Megaevoluciona con Magearnaita equipada en combate." }
    ]
  },
  "chimecho":
  {
    "megaForms": [
      { "apiKey": "chimecho-mega", "display": "Mega-Chimecho" }
    ]
  },
  "staraptor":
  {
    "megaForms": [
      { "apiKey": "staraptor-mega", "display": "Mega-Staraptor" }
    ]
  },
  "heatran":
  {
    "megaForms": [
      { "apiKey": "heatran-mega", "display": "Mega-Heatran" }
    ]
  },
  "darkrai":
  {
    "megaForms": [
      { "apiKey": "darkrai-mega", "display": "Mega-Darkrai" }
    ]
  },
  "golurk":
  {
    "megaForms": [
      { "apiKey": "golurk-mega", "display": "Mega-Golurk" }
    ]
  },
  "meowstic-male":
  {
    "megaForms": [
      { "apiKey": "meowstic-male-mega", "display": "Mega-Meowstic ♂", "desc": "Megaevoluciona con Meowsticita equipada en combate." }
    ]
  },
  "meowstic-female":
  {
    "megaForms": [
      { "apiKey": "meowstic-female-mega", "display": "Mega-Meowstic ♀", "desc": "Megaevoluciona con Meowsticita equipada en combate." }
    ]
  },
  "crabominable":
  {
    "megaForms": [
      { "apiKey": "crabominable-mega", "display": "Mega-Crabominable" }
    ]
  },
  "scovillain":
  {
    "megaForms": [
      { "apiKey": "scovillain-mega", "display": "Mega-Scovillain" }
    ]
  },
  "glimmora":
  {
    "megaForms": [
      { "apiKey": "glimmora-mega", "display": "Mega-Glimmora" }
    ]
  },
  "tatsugiri-curly":
  {
    "megaForms": [
      { "apiKey": "tatsugiri-curly-mega", "display": "Mega-Tatsugiri Forma Curvada", "color": getColorPkmByKey("tatsugiri-curly-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." },
      { "apiKey": "tatsugiri-droopy-mega", "display": "Mega-Tatsugiri Forma Lánguida", "color": getColorPkmByKey("tatsugiri-droopy-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." },
      { "apiKey": "tatsugiri-stretchy-mega", "display": "Mega-Tatsugiri Forma Recta", "color": getColorPkmByKey("tatsugiri-stretchy-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." }
    ]
  },
  "tatsugiri-droopy":
  {
    "megaForms": [
      { "apiKey": "tatsugiri-curly-mega", "display": "Mega-Tatsugiri Forma Curvada", "color": getColorPkmByKey("tatsugiri-curly-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." },
      { "apiKey": "tatsugiri-droopy-mega", "display": "Mega-Tatsugiri Forma Lánguida", "color": getColorPkmByKey("tatsugiri-droopy-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." },
      { "apiKey": "tatsugiri-stretchy-mega", "display": "Mega-Tatsugiri Forma Recta", "color": getColorPkmByKey("tatsugiri-stretchy-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." }
    ]
  },
  "tatsugiri-stretchy":
  {
    "megaForms": [
      { "apiKey": "tatsugiri-curly-mega", "display": "Mega-Tatsugiri Forma Curvada", "color": getColorPkmByKey("tatsugiri-curly-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." },
      { "apiKey": "tatsugiri-droopy-mega", "display": "Mega-Tatsugiri Forma Lánguida", "color": getColorPkmByKey("tatsugiri-droopy-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." },
      { "apiKey": "tatsugiri-stretchy-mega", "display": "Mega-Tatsugiri Forma Recta", "color": getColorPkmByKey("tatsugiri-stretchy-mega"), "desc": "Megaevoluciona con Tatsugirita equipada en combate." }
    ]
  },
  "baxcalibur":
  {
    "megaForms": [
      { "apiKey": "baxcalibur-mega", "display": "Mega-Baxcalibur" }
    ]
  },
  "lucario":
  {
    "megaForms": [
      { "apiKey": "lucario-mega", "display": "Mega-Lucario" },
      { "apiKey": "lucario-mega-z", "display": "Mega-Lucario Z" }
    ]
  },
  "garchomp":
  {
    "megaForms": [
      { "apiKey": "garchomp-mega", "display": "Mega-Garchomp" },
      { "apiKey": "garchomp-mega-z", "display": "Mega-Garchomp Z" }
    ]
  },
  "absol":
  {
    "megaForms": [
      { "apiKey": "absol-mega", "display": "Mega-Absol" },
      { "apiKey": "absol-mega-z", "display": "Mega-Absol Z" }
    ]
  },
  "raichu":
  {
    "megaForms": [
      { "apiKey": "raichu-mega-x", "display": "Mega-Raichu X" },
      { "apiKey": "raichu-mega-y", "display": "Mega-Raichu Y" }
    ]
  }
};

function normalizePkmBaseMegaKey(input)
{
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  return raw;
}

function getPokemonMegaMeta(input)
{
  const key = normalizePkmBaseMegaKey(input);
  return key ? (MEGAS_PKM_META[key] || null) : null;
}

function getPokemonMegaForms(input)
{
  const forms = getPokemonMegaMeta(input)?.megaForms;
  return Array.isArray(forms) ? forms : [];
}

function hasPokemonMegaForms(apiKey)
{
  return getPokemonMegaForms(apiKey).length > 0;
}
// ---------------- DATOS META DE MEGA EVOLUCIONES POKÉMON - FIN ---------------- 


module.exports =
{
    canPokemonBreed,
    toPokemonDisplayName,
    getColorPkmByKey,
    getPokemonGenByKey,
    hasPokemonGigaForm,
    hasPokemonMegaForms
};
