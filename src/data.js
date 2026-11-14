/* ============================================================
   REMEMBER ME - all your content lives in this file.
   Apollo 11 is filled in as the first example. Everything else
   is PLACEHOLDER text. Replace it with your story.
   ============================================================ */

export const TITLE = "Remember Me";

// The logo on the home screen. Replace  public/logo.svg  with your own file.
export const LOGO = "/logo.svg";

/* ------------------------------------------------------------
   1. EXPLORER (how the player is shown in the story)
   In any dialogue you can write {name}, {id} and {rank}.
   ------------------------------------------------------------ */
export const EXPLORER = {
  rank: "Recruit",                 // shown on the ID card
  idPrefix: "EX",                  // the explorer ID looks like EX-4821
  registerEyebrow: "Explorer registration",
  registerHint: "Enter your name to receive your explorer ID.",
};

/* ------------------------------------------------------------
   2. SCENES (one .glb per scene)
   Put your .glb files in the  public/models/  folder, then set the path.
   glb: null  = black screen with a "placeholder" tag (what you see now)
   Optional settings:
     camera: [x, y, z]  where the camera sits (default [0, 0, 5])
     lookAt: [x, y, z]  what the camera looks at (default [0, 0, 0])
     fit:    false      do NOT auto-center/auto-scale (use for interiors)
     size:   3          size the model is scaled to when fit is on
     spin:   0.002      slow rotation speed (nice for the moon / mars)
   ------------------------------------------------------------ */
export const SCENES = {
  home:      { glb: null, label: "Spaceship interior" },
  register:  { glb: null, label: "Spaceship interior (registration)" },
  launch:    { glb: null, label: "Spaceship launch" },
  commander: { glb: null, label: "Space / commander briefing" },
  moon:      { glb: null, label: "Moon surface" },
  mars:      { glb: null, label: "Mars surface" },
  ending:    { glb: null, label: "Ending" },
  // Example once your model is ready:
  // moon: { glb: "/models/moon.glb", spin: 0.002 },
  // register can reuse the same file as home: { glb: "/models/ship.glb" }
};

/* ------------------------------------------------------------
   3. LAUNCH SCENE
   The number counts down from "from" to "to" while the text shows.
   {n} is replaced by the current number.
   ------------------------------------------------------------ */
export const LAUNCH = {
  text: "{n} left to reach destination...",
  from: 122999,
  to: 122900,
  seconds: 7,              // how long the countdown takes
};

/* ------------------------------------------------------------
   4. COMMANDER (dialogue before the task pop-up)
   ------------------------------------------------------------ */
export const COMMANDER = {
  speaker: "Commander",
  lines: [
    "Explorer {name}, we have left the atmosphere. You are in space now.",
    "Your registration is complete: Explorer ID {id}, rank {rank}.",
    "Equipment was left behind on the Moon and on Mars. Each piece carries a story.",
    "Your task is to find them and learn what they were made for.",
  ],
};

/* ------------------------------------------------------------
   5. HOW TO WRITE A DIALOGUE (used for every equipment story)

   A dialogue is a list of lines. Each line looks like this:

     { speaker: "Commander", text: "What the character says." }

   - {name}, {id} and {rank} inside speaker or text are filled in automatically.
   - Lines play in order, one after another.
   - To give the player CHOICES, add a "choices" list to a line:

     { speaker: "Rover", text: "Do you want to hear more?",
       choices: [
         { text: "Yes, tell me.",  goto: 2 },   // jumps to line number 2
         { text: "That is enough.", goto: 4 },  // jumps to line number 4
       ] },

   Line numbers start at 0 (the first line is 0, the second is 1, ...).
   A line can also have its own  goto: 5  to jump somewhere after it plays.
   ------------------------------------------------------------ */

// Placeholder dialogue so you can test. Replace it with your own lines.
function draftDialogue(equipmentName) {
  return [
    { speaker: "{name}", text: "Placeholder: what the explorer says after finding this." },
    {
      speaker: equipmentName,
      text: "Placeholder: the equipment introduces itself.",
      choices: [
        { text: "Placeholder choice A", goto: 2 },
        { text: "Placeholder choice B", goto: 3 },
      ],
    },
    { speaker: equipmentName, text: "Placeholder: the answer to choice A." },
    { speaker: equipmentName, text: "Placeholder: the last line of this story." },
  ];
}

/* ------------------------------------------------------------
   6. THE DATA FORMAT
   Every equipment shows its data in this order:

     Equipment Name            (filled in automatically from "name")
     Creator / Manufacturer
     Launch Date & Vehicle
     Moon (or Mars) Arrival & Landing
     Ascent & Departure
     Mission Conclusion
     Target Surface Location

   "details" holds the 6 rows after Equipment Name.
   ------------------------------------------------------------ */
const placeholderDetails = (body) => [
  ["Creator / Manufacturer", "—"],
  ["Launch Date & Vehicle", "—"],
  [`${body} Arrival & Landing`, "—"],
  ["Ascent & Departure", "—"],
  ["Mission Conclusion", "—"],
  ["Target Surface Location", "—"],
];

// The second tab in the info panel
const placeholderSpecs = () => [
  ["Coordinates", "—"], ["Size", "—"], ["Mass", "—"], ["Power source", "—"], ["Materials", "—"],
];

/* ------------------------------------------------------------
   7. PLANETS + EQUIPMENT
   Each planet has 4 pieces of equipment. For each one:
     name      full name (shown as "Equipment Name" and in the archive)
     subtitle  short line shown on the planet screen after discovery
     x / y     where the equipment sits on the planet screen (in %).
               0,0 = top-left and 100,100 = bottom-right.
               The camera zooms toward this point, so make it match
               where the equipment really is in your scene.
     zoom      how far the camera zooms in (default 2)
     node      OPTIONAL. The name of this equipment’s object inside your .glb.
               If you set it, the Rotation sliders turn just that object.
               If it is null, the sliders turn the whole scene.
     details   the data rows (see section 6)
     specs     the second tab: Coordinates, Size, Mass, Power source, Materials
     dialogue  the story told as a conversation (opens with "Read story")
   ------------------------------------------------------------ */
export const PLANETS = {
  moon: {
    title: "The Moon",
    code: "LUN",              // short code shown on cards, like LUN-01
    short: "the Moon",
    intro: "Landing site placeholder. Investigate the signals to find equipment.",
    next: "mars",
    nextLabel: "Travel to Mars",
    equipment: [
      {
        id: "moon-1",
        name: "Apollo 11 Lunar Module (Eagle) Descent Stage",
        subtitle: "Apollo 11 · Sea of Tranquility",
        x: 24, y: 38, zoom: 2, node: null,
        details: [
          ["Creator / Manufacturer", "Built by Grumman Aircraft Engineering Corporation for NASA"],
          ["Launch Date & Vehicle", "July 16, 1969 aboard a Saturn V rocket"],
          ["Moon Arrival & Landing", "July 20, 1969"],
          ["Ascent & Departure", "July 21, 1969 (Astronauts Neil Armstrong and Buzz Aldrin launched back to orbit using the Ascent Stage, leaving the Descent Stage behind)"],
          ["Mission Conclusion", "July 24, 1969 (Crew returned safely to Earth; Descent Stage remains permanently on the Moon)"],
          ["Target Surface Location", "Sea of Tranquility, Moon"],
        ],
        specs: placeholderSpecs(),
        dialogue: draftDialogue("Apollo 11 Lunar Module"),
      },
      {
        id: "moon-2", name: "Moon Equipment 2", subtitle: "Short description",
        x: 46, y: 62, zoom: 2, node: null,
        details: placeholderDetails("Moon"), specs: placeholderSpecs(),
        dialogue: draftDialogue("Moon Equipment 2"),
      },
      {
        id: "moon-3", name: "Moon Equipment 3", subtitle: "Short description",
        x: 62, y: 34, zoom: 2, node: null,
        details: placeholderDetails("Moon"), specs: placeholderSpecs(),
        dialogue: draftDialogue("Moon Equipment 3"),
      },
      {
        id: "moon-4", name: "Moon Equipment 4", subtitle: "Short description",
        x: 30, y: 72, zoom: 2, node: null,
        details: placeholderDetails("Moon"), specs: placeholderSpecs(),
        dialogue: draftDialogue("Moon Equipment 4"),
      },
    ],
  },

  mars: {
    title: "Mars",
    code: "MAR",
    short: "Mars",
    intro: "Landing site placeholder. Investigate the signals to find equipment.",
    next: "ending",
    nextLabel: "Finish mission",
    equipment: [
      {
        id: "mars-1", name: "Mars Equipment 1", subtitle: "Short description",
        x: 24, y: 38, zoom: 2, node: null,
        details: placeholderDetails("Mars"), specs: placeholderSpecs(),
        dialogue: draftDialogue("Mars Equipment 1"),
      },
      {
        id: "mars-2", name: "Mars Equipment 2", subtitle: "Short description",
        x: 46, y: 62, zoom: 2, node: null,
        details: placeholderDetails("Mars"), specs: placeholderSpecs(),
        dialogue: draftDialogue("Mars Equipment 2"),
      },
      {
        id: "mars-3", name: "Mars Equipment 3", subtitle: "Short description",
        x: 62, y: 34, zoom: 2, node: null,
        details: placeholderDetails("Mars"), specs: placeholderSpecs(),
        dialogue: draftDialogue("Mars Equipment 3"),
      },
      {
        id: "mars-4", name: "Mars Equipment 4", subtitle: "Short description",
        x: 30, y: 72, zoom: 2, node: null,
        details: placeholderDetails("Mars"), specs: placeholderSpecs(),
        dialogue: draftDialogue("Mars Equipment 4"),
      },
    ],
  },
};

/* ------------------------------------------------------------
   8. ENDING SCREEN ({name}, {id} and {rank} work here too)
   ------------------------------------------------------------ */
export const ENDING = {
  eyebrow: "Mission complete",
  text: "{name}, you found every piece of equipment. Each one is saved in your archive.",
};

/* ------------------------------------------------------------
   (Do not edit below) helpers used by the rest of the site
   ------------------------------------------------------------ */
for (const [key, planet] of Object.entries(PLANETS)) {
  planet.equipment.forEach((e) => {
    e.planet = key;
    e.planetTitle = planet.title;
  });
}
export const ALL_EQUIPMENT = Object.values(PLANETS).flatMap((p) => p.equipment);
