// Datos de ejemplo para poblar la app la primera vez que se usa (sagas y entregas
// principales de franquicias JRPG conocidas, organizadas por arcos/eras). Solo se
// cargan si el usuario no tiene ningún dato guardado todavía.

function infoBlock(id, title, body) {
  return { id, title, body };
}

export const SEED_SAGAS = [
  {
    id: "saga-dragon-quest",
    name: "Dragon Quest",
    description: "La saga que definió el JRPG japonés. Cada entrega numerada es una historia autoconclusiva.",
    orderMode: "release",
    infoBlocks: [
      infoBlock(
        "dq-info-1",
        "¿Por dónde empezar?",
        "Cada entrega es una historia independiente, así que puedes empezar por cualquiera sin perderte nada. Si quieres la experiencia más pulida, la XI es la mejor puerta de entrada. Si prefieres ir en orden, la I es corta y sienta las bases del resto de la saga."
      ),
    ],
  },
  {
    id: "saga-final-fantasy",
    name: "Final Fantasy",
    description: "Antología de historias independientes bajo un mismo nombre, con nuevo mundo y sistema de combate en cada entrega numerada.",
    orderMode: "release",
    infoBlocks: [
      infoBlock(
        "ff-info-1",
        "Cómo elegir tu primera Final Fantasy",
        "Al ser mundos y historias completamente distintos en cada numeración, no hay un orden obligatorio. La VII y la X suelen recomendarse como puerta de entrada moderna por su accesibilidad; la VI es la favorita de quienes buscan la era de 16 bits; la XIV es la única pensada para jugarse online con otros jugadores."
      ),
    ],
  },
  {
    id: "saga-zelda",
    name: "The Legend of Zelda",
    description: "Saga de acción-aventura de Nintendo. La cronología interna difiere del orden de lanzamiento, así que aquí se ordena por lanzamiento.",
    orderMode: "release",
    infoBlocks: [
      infoBlock(
        "zelda-info-1",
        "Sobre el orden cronológico",
        "La cronología interna de Zelda es célebremente enrevesada: tras Ocarina of Time la línea temporal oficial se divide en tres ramas distintas. Aquí se muestra por orden de lanzamiento, la forma más sencilla de explorarla. Si te interesa el lore, Ocarina of Time y Breath of the Wild son buenos puntos de partida."
      ),
    ],
  },
  {
    id: "saga-kingdom-hearts",
    name: "Kingdom Hearts",
    description: "Crossover entre Disney y Final Fantasy con una trama continua entre entregas.",
    orderMode: "release",
    infoBlocks: [
      infoBlock(
        "kh-info-1",
        "El orden de la Dark Seeker Saga",
        "A pesar de los números y subtítulos confusos, todas estas entregas forman una única historia continua conocida como la Dark Seeker Saga. Se recomienda jugarlas en el orden de lanzamiento que aparece aquí para seguir la trama sin spoilers."
      ),
    ],
  },
  {
    id: "saga-fire-emblem",
    name: "Fire Emblem",
    description: "Saga de estrategia táctica por turnos de Nintendo/Intelligent Systems.",
    orderMode: "release",
    infoBlocks: [
      infoBlock(
        "fe-info-1",
        "Historias independientes por entrega",
        "A diferencia de otras sagas, cada Fire Emblem cuenta una guerra y un reparto de personajes distintos, así que puedes empezar por cualquiera. Awakening y Three Houses son las entregas más recomendadas para quien empieza, por accesibilidad y popularidad."
      ),
    ],
  },
];

function makeItem(sagaId, order, title, releaseDate, arc, tag) {
  const ts = Date.now();
  return {
    id: `seed-${sagaId}-${order}`,
    type: "game",
    title,
    cover: "",
    sagaId,
    status: "wishlist",
    score: "",
    tags: tag ? [tag] : [],
    platform: "",
    hours: "",
    currentVolume: "",
    currentChapter: "",
    season: "",
    currentEpisode: "",
    startDate: "",
    endDate: "",
    releaseDate,
    chronoOrder: order,
    releaseOrder: order,
    priority: 9999,
    priorityLevel: "normal",
    arc,
    era: "",
    notes: "",
    createdAt: ts,
    updatedAt: ts,
  };
}

const DRAGON_QUEST = [
  ["Dragon Quest", "1986-05-27", "Trilogía de Loto"],
  ["Dragon Quest II: Luminaries of the Legendary Line", "1987-01-26", "Trilogía de Loto"],
  ["Dragon Quest III: The Seeds of Salvation", "1988-02-10", "Trilogía de Loto"],
  ["Dragon Quest IV: Chapters of the Chosen", "1990-02-11", "Trilogía de Zenithia"],
  ["Dragon Quest V: Hand of the Heavenly Bride", "1992-09-27", "Trilogía de Zenithia"],
  ["Dragon Quest VI: Realms of Revelation", "1995-12-09", "Trilogía de Zenithia"],
  ["Dragon Quest VII: Fragments of the Forgotten Past", "2000-08-26", "Era moderna"],
  ["Dragon Quest VIII: Journey of the Cursed King", "2004-11-27", "Era moderna"],
  ["Dragon Quest IX: Sentinels of the Starry Skies", "2009-07-11", "Era moderna"],
  ["Dragon Quest X", "2012-08-02", "Era moderna"],
  ["Dragon Quest XI: Echoes of an Elusive Age", "2017-07-29", "Era moderna"],
];

const FINAL_FANTASY = [
  ["Final Fantasy", "1987-12-18", "Era NES"],
  ["Final Fantasy II", "1988-12-17", "Era NES"],
  ["Final Fantasy III", "1990-04-27", "Era NES"],
  ["Final Fantasy IV", "1991-07-19", "Era Super Nintendo"],
  ["Final Fantasy V", "1992-12-06", "Era Super Nintendo"],
  ["Final Fantasy VI", "1994-04-02", "Era Super Nintendo"],
  ["Final Fantasy VII", "1997-01-31", "Era PlayStation"],
  ["Final Fantasy VIII", "1999-02-11", "Era PlayStation"],
  ["Final Fantasy IX", "2000-07-07", "Era PlayStation"],
  ["Final Fantasy X", "2001-07-19", "Era PlayStation 2 y MMO"],
  ["Final Fantasy XI", "2002-05-16", "Era PlayStation 2 y MMO"],
  ["Final Fantasy XII", "2006-03-16", "Era moderna"],
  ["Final Fantasy XIII", "2009-12-17", "Era moderna"],
  ["Final Fantasy XIV", "2010-09-30", "Era moderna"],
  ["Final Fantasy XV", "2016-11-29", "Era moderna"],
  ["Final Fantasy XVI", "2023-06-22", "Era moderna"],
];

const ZELDA = [
  ["The Legend of Zelda", "1986-02-21", "Era 8 y 16 bits"],
  ["Zelda II: The Adventure of Link", "1987-01-14", "Era 8 y 16 bits"],
  ["The Legend of Zelda: A Link to the Past", "1991-11-21", "Era 8 y 16 bits"],
  ["The Legend of Zelda: Ocarina of Time", "1998-11-21", "Era 3D clásica (N64)"],
  ["The Legend of Zelda: Majora's Mask", "2000-04-27", "Era 3D clásica (N64)"],
  ["The Legend of Zelda: The Wind Waker", "2002-12-13", "Era GameCube y Wii"],
  ["The Legend of Zelda: Twilight Princess", "2006-11-19", "Era GameCube y Wii"],
  ["The Legend of Zelda: Skyward Sword", "2011-11-20", "Era GameCube y Wii"],
  ["The Legend of Zelda: Breath of the Wild", "2017-03-03", "Era mundo abierto"],
  ["The Legend of Zelda: Tears of the Kingdom", "2023-05-12", "Era mundo abierto"],
];

const KINGDOM_HEARTS = [
  ["Kingdom Hearts", "2002-03-28", "Los inicios"],
  ["Kingdom Hearts: Chain of Memories", "2004-12-30", "Los inicios"],
  ["Kingdom Hearts II", "2005-12-22", "Segunda generación"],
  ["Kingdom Hearts: Birth by Sleep", "2010-01-09", "Antes de la tormenta"],
  ["Kingdom Hearts 3D: Dream Drop Distance", "2012-03-29", "Antes de la tormenta"],
  ["Kingdom Hearts III", "2019-01-25", "El cierre de la Dark Seeker Saga"],
];

const FIRE_EMBLEM = [
  ["Fire Emblem: Shadow Dragon and the Blade of Light", "1990-04-20", "Era Famicom y Super Famicom"],
  ["Fire Emblem: Genealogy of the Holy War", "1996-05-14", "Era Famicom y Super Famicom"],
  ["Fire Emblem: The Blazing Blade", "2003-04-25", "Era Game Boy Advance"],
  ["Fire Emblem: The Sacred Stones", "2004-10-07", "Era Game Boy Advance"],
  ["Fire Emblem: Path of Radiance", "2005-04-20", "Era GameCube y Wii"],
  ["Fire Emblem: Radiant Dawn", "2007-02-22", "Era GameCube y Wii"],
  ["Fire Emblem: Awakening", "2012-04-19", "Era Nintendo 3DS"],
  ["Fire Emblem: Fates", "2015-06-25", "Era Nintendo 3DS"],
  ["Fire Emblem: Three Houses", "2019-07-26", "Era Nintendo Switch"],
  ["Fire Emblem: Engage", "2023-01-20", "Era Nintendo Switch"],
];

function buildSagaItems(sagaId, list, tag) {
  return list.map(([title, releaseDate, arc], i) => makeItem(sagaId, i + 1, title, releaseDate, arc, tag));
}

export const SEED_ITEMS = [
  ...buildSagaItems("saga-dragon-quest", DRAGON_QUEST, "jrpg"),
  ...buildSagaItems("saga-final-fantasy", FINAL_FANTASY, "jrpg"),
  ...buildSagaItems("saga-zelda", ZELDA, "aventura"),
  ...buildSagaItems("saga-kingdom-hearts", KINGDOM_HEARTS, "accion-rpg"),
  ...buildSagaItems("saga-fire-emblem", FIRE_EMBLEM, "tactico"),
];
