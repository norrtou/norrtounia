/**
 * DATA.JS — The Great Compendium of Norrtounia
 * ─────────────────────────────────────────────────────────────────
 * All static world data: races, classes, items, monsters, scenarios,
 * ambient lines, and end-screen flavour.
 *
 * NOTE: Scenario option.text values do NOT include [1]/[2]/[3]
 * prefixes — those are added by game.js at display time.
 * ─────────────────────────────────────────────────────────────────
 */

const GAME_DATA = {

    /* ══════════════════════════════════════════════════════════
       RACES
       ══════════════════════════════════════════════════════════ */
    races: [
        {
            name: "High Elf", hp: 45, str: 8, int: 18,
            names: [
                "Aelthas","Baelin","Caelum","Dagoron","Elowen","Faelar","Galanis","Hareth","Ielenia","Kaelen",
                "Luthien","Miravel","Naerth","Orophin","Phaedel","Quelen","Rilven","Saelihn","Thalanil","Uialen",
                "Vanyar","Yvraine","Zalthar","Aerith","Eldrin","Loralai","Tauriel","Fingon","Turgon","Finrod",
                "Amroth","Celeborn","Galadriel","Glorfindel","Haldir","Idril","Maeglin","Nimrodel","Olwe","Voronwe",
                "Celebrimbor","Ecthelion","Aredhel","Anaire","Nerdanel","Elenwë","Indis","Earwen","Melian","Lúthien"
            ]
        },
        {
            name: "Wood Elf", hp: 50, str: 11, int: 14,
            names: [
                "Sylvar","Arannis","Briavel","Celorn","Daeris","Elvanna","Ferith","Galadrel","Haeven","Ilphas",
                "Jaroviel","Karith","Lirien","Maevis","Nyreth","Olindel","Pyriel","Quellis","Rhovar","Sethiel",
                "Tarvinh","Ulavar","Verathos","Wylaen","Xylara","Yaraliel","Zarevith","Aravel","Belanis","Caelar",
                "Daevish","Elovar","Farindel","Gavrial","Haevar","Ilyvar","Jenthar","Kaelar","Leothil","Miravar"
            ]
        },
        {
            name: "Mountain Dwarf", hp: 80, str: 17, int: 7,
            names: [
                "Bordin","Dwalin","Eitri","Farin","Gimli","Hadhod","Isen","Jari","Kili","Loni",
                "Morni","Nori","Oin","Pori","Rumni","Stari","Thrain","Ufar","Vili","Ymir",
                "Gloin","Thorin","Balin","Bifur","Bofur","Bombur","Dain","Fundin","Durin","Telchar",
                "Azaghal","Gamil","Narvi","Harbek","Thuradin","Brottor","Bromm","Dagnath","Gromnir","Halvar"
            ]
        },
        {
            name: "Hill Dwarf", hp: 70, str: 15, int: 10,
            names: [
                "Aldrek","Brundir","Corvis","Delvak","Elmar","Foldur","Grundar","Hordar","Ingvar","Jorvak",
                "Kramdur","Longrin","Mordak","Naldrin","Ordak","Peldur","Rudvak","Skordak","Torvik","Ulmar",
                "Vigdar","Woldak","Alvrik","Bekdar","Comdak","Drolvak","Eldvar","Folvak","Goldar","Heldrak"
            ]
        },
        {
            name: "Orc", hp: 95, str: 20, int: 4,
            names: [
                "Azog","Bolg","Dush","Grom","Holg","Ishka","Jugg","Korg","Lugg","Morg",
                "Nug","Ogg","Pug","Rorg","Throk","Ufthak","Vorg","Yug","Gothmog","Ugluk",
                "Shagrat","Gorbag","Mauhur","Lagduf","Muzgash","Radbug","Orgrim","Durotan","Garrosh","Kargath",
                "Kilrogg","Varok","Grommash","Saurfang","Gordul","Kraghur","Mulgrak","Nazdrek","Orgrak","Pushdug"
            ]
        },
        {
            name: "Half-Orc", hp: 75, str: 18, int: 8,
            names: [
                "Gothrak","Halvrek","Jorgak","Keldrath","Largor","Malgrim","Nargor","Olgrak","Peldrath","Quelgrak",
                "Ragnak","Seldrak","Tholgrak","Uglrim","Veldrak","Worgak","Ardrak","Belgor","Cruldak","Drolgak"
            ]
        },
        {
            name: "Human", hp: 65, str: 13, int: 13,
            names: [
                "Alaric","Beorn","Cedric","Dara","Edric","Faramir","Goran","Hilda","Ivar","Jora",
                "Kael","Leif","Marek","Nesta","Oswin","Piers","Quinn","Rowan","Sigrid","Tyra",
                "Aragorn","Boromir","Eomer","Theoden","Elendil","Bard","Brand","Godric","Osric","Wulfric",
                "Aldred","Cuthbert","Dunstan","Eadwig","Hereward","Frideswide","Gisela","Ingrid","Jorunn","Lothar"
            ]
        },
        {
            name: "Halfling", hp: 55, str: 9, int: 15,
            names: [
                "Adalbert","Binbo","Clovis","Drogo","Esme","Falco","Gundabald","Hilda","Isembold","Jago",
                "Kira","Lotho","Mira","Nob","Odo","Pearl","Rufus","Saradas","Tanta","Urco",
                "Andwise","Bandobras","Camellia","Daisy","Estella","Griffo","Hamfast","Largo","Merimas","Rosie"
            ]
        },
        {
            name: "Gnome", hp: 48, str: 7, int: 19,
            names: [
                "Alston","Boddynock","Dimble","Eldon","Frug","Gerbo","Gimble","Glim","Jebeddo","Kellen",
                "Namfoodle","Orryn","Roondar","Seebo","Sindri","Tock","Warryn","Wrenn","Zook","Alvo",
                "Bimpnottin","Chatterfang","Duvamil","Erky","Fonkin","Glinnen","Nissa","Orlan","Quellyn","Solia"
            ]
        },
        {
            name: "Tiefling", hp: 58, str: 12, int: 16,
            names: [
                "Akmenos","Amnon","Barakas","Damakos","Ekemon","Iados","Kairon","Leucis","Melech","Mordai",
                "Morthos","Pelaios","Skamos","Therai","Vivex","Alyma","Brynn","Criella","Damaia","Kallista",
                "Lerissa","Makaria","Nemeia","Orianna","Phelaia","Rieta","Tanis","Ulele","Vena","Zhara"
            ]
        }
    ],

    /* ══════════════════════════════════════════════════════════
       CLASSES
       ══════════════════════════════════════════════════════════ */
    classes: [
        { name: "Knight",      hpB:  25, strB:  6, intB:  0 },
        { name: "Wizard",      hpB: -15, strB:  0, intB: 12 },
        { name: "Rogue",       hpB:   5, strB:  3, intB:  4 },
        { name: "Cleric",      hpB:  15, strB:  1, intB:  7 },
        { name: "Barbarian",   hpB:  40, strB: 10, intB: -6 },
        { name: "Paladin",     hpB:  20, strB:  4, intB:  4 },
        { name: "Druid",       hpB:  10, strB:  2, intB:  8 },
        { name: "Ranger",      hpB:  12, strB:  5, intB:  3 },
        { name: "Bard",        hpB:   0, strB:  2, intB: 10 },
        { name: "Sorcerer",    hpB: -10, strB:  0, intB: 14 },
        { name: "Warlock",     hpB:   5, strB:  1, intB: 11 },
        { name: "Monk",        hpB:  18, strB:  7, intB:  2 },
        { name: "Fighter",     hpB:  22, strB:  8, intB: -2 },
        { name: "Necromancer", hpB:  -5, strB: -1, intB: 15 },
    ],

    /* ══════════════════════════════════════════════════════════
       ITEMS
       ══════════════════════════════════════════════════════════ */
    items: [
        // Strength
        { name: "Ancient Blade",          stat:"str", val:6  },
        { name: "Dragon-bone Axe",        stat:"str", val:14 },
        { name: "Ogre-Slayer Mace",       stat:"str", val:9  },
        { name: "Gauntlets of Might",     stat:"str", val:5  },
        { name: "Iron-Forged Claymore",   stat:"str", val:11 },
        { name: "Rusty War-Pick",         stat:"str", val:3  },
        { name: "Executioner's Sword",    stat:"str", val:15 },
        { name: "Troll-hide Gloves",      stat:"str", val:4  },
        { name: "Berserker's Chain",      stat:"str", val:8  },
        { name: "Blade of the Fallen",    stat:"str", val:12 },
        { name: "Runecarved Axe",         stat:"str", val:10 },
        { name: "Obsidian War-Blade",     stat:"str", val:13 },
        // Intellect
        { name: "Staff of Galdor",        stat:"int", val:7  },
        { name: "Amulet of Kings",        stat:"int", val:9  },
        { name: "Scroll of Infinite Sky", stat:"int", val:4  },
        { name: "Grimoire of Shadows",    stat:"int", val:12 },
        { name: "Sage's Crystal Orb",     stat:"int", val:10 },
        { name: "Monocle of Truth",       stat:"int", val:6  },
        { name: "Crown of the Magi",      stat:"int", val:13 },
        { name: "Tome of the Astral Sea", stat:"int", val:8  },
        { name: "Seer's Circlet",         stat:"int", val:11 },
        { name: "Midnight Codex",         stat:"int", val:14 },
        { name: "Band of the Oracle",     stat:"int", val:10 },
        // Vitality
        { name: "Mithril Vest",           stat:"hp", val:35 },
        { name: "Shield of Aegis",        stat:"hp", val:25 },
        { name: "Cured Leather Tunic",    stat:"hp", val:10 },
        { name: "Enchanted Cloak",        stat:"hp", val:15 },
        { name: "Ring of Regeneration",   stat:"hp", val:20 },
        { name: "Plate of the Fallen",    stat:"hp", val:40 },
        { name: "Belt of Giant Strength", stat:"hp", val:30 },
        { name: "Stone-Skin Salve",       stat:"hp", val:18 },
        { name: "Dragonscale Cape",       stat:"hp", val:32 },
        { name: "Warden's Breastplate",   stat:"hp", val:28 },
        { name: "Helm of the Bulwark",    stat:"hp", val:20 },
        { name: "Blessed Bandages",       stat:"hp", val:12 },
    ],

    /* ══════════════════════════════════════════════════════════
       MONSTERS
       icon   = emoji shown in log line
       taunts = optional battle-cry lines (25% chance to show)
       special= 'honk' triggers the unique encounter handler
       ══════════════════════════════════════════════════════════ */
    monsters: [
        // Common
        { name:"Fell Wolf",          icon:"🐺", hp:40,  str:8,  loot:0.20,
          taunts:["A low growl echoes through the pines.","It circles thee slowly."] },
        { name:"Forest Wraith",      icon:"👻", hp:55,  str:12, loot:0.35,
          taunts:["A cold whisper: 'Join us...'","The air temperature droppeth sharply."] },
        { name:"Cave Bat Swarm",     icon:"🦇", hp:20,  str:5,  loot:0.10 },
        { name:"Shadow Stalker",     icon:"🌑", hp:60,  str:14, loot:0.30,
          taunts:["It moveth without sound.","Thine own shadow betrayeth thee."] },
        { name:"Twisted Ent",        icon:"🌳", hp:85,  str:11, loot:0.45,
          taunts:["Ancient wood creaketh and groaneth.","The trees... move."] },
        { name:"Skeleton Sentry",    icon:"💀", hp:35,  str:9,  loot:0.20,
          taunts:["Bones rattle in the silence.","Empty sockets track thine every step."] },
        { name:"Poisonous Adder",    icon:"🐍", hp:25,  str:15, loot:0.15 },
        { name:"Grave Ghoul",        icon:"💀", hp:55,  str:13, loot:0.40,
          taunts:["It sniffs the air... hungrily.","Fingernails drag against stone."] },
        { name:"Goblin Pack",        icon:"👺", hp:30,  str:7,  loot:0.25,
          taunts:["High-pitched cackles fill the trees.","'Give us your shinies!'"] },
        { name:"Bog Hag",            icon:"🧙", hp:50,  str:16, loot:0.50,
          boon:{int:3},
          taunts:["She smileth, and her teeth are wrong.","'Pretty travellers... come closer.'"] },
        { name:"Stone Gargoyle",     icon:"🗿", hp:70,  str:14, loot:0.35 },
        { name:"Bandit Swordsman",   icon:"⚔️", hp:50,  str:13, loot:0.40,
          taunts:["'Your gold or your life, pilgrim.'","He twirls his blade lazily."] },
        { name:"Cursed Scarecrow",   icon:"🎃", hp:38,  str:11, loot:0.30, boon:{str:2} },
        // Uncommon
        { name:"Hobgoblin Captain",  icon:"👺", hp:90,  str:18, loot:0.60,
          taunts:["'Soldiers! To me!'","A war-horn sounds in the dark."] },
        { name:"Werewolf",           icon:"🐺", hp:100, str:22, loot:0.55,
          taunts:["A howl that turns thy blood cold.","It standeth on two legs... then four."] },
        { name:"Dark Elf Assassin",  icon:"🗡️", hp:80,  str:20, loot:0.65,
          taunts:["Thou seest only the shadow of the blade."] },
        { name:"Basilisk",           icon:"🦎", hp:95,  str:17, loot:0.50,
          taunts:["Do NOT meet its gaze."] },
        { name:"Bone Colossus",      icon:"💀", hp:110, str:24, loot:0.70,
          taunts:["The earth trembles beneath its stride."] },
        { name:"Cursed Paladin",     icon:"⚔️", hp:95,  str:21, loot:0.65, boon:{hp:15},
          taunts:["'Thou art found wanting.'","Holy light... but twisted, wrong."] },
        // Elite
        { name:"Mountain Troll",     icon:"👹", hp:130, str:28, loot:0.80,
          taunts:["It sniffs thee from thirty paces.","'ME SMASH.'"] },
        { name:"Ancient Wyvern",     icon:"🐉", hp:155, str:34, loot:0.90,
          taunts:["The wingbeats extinguish thy torches.","A shadow vast as a house descendeth."] },
        { name:"Necromancer Lord",   icon:"🧙", hp:110, str:38, loot:0.75, boon:{int:6},
          taunts:["'Death is but a door, and I hold the key.'","Bones rise from the earth around thee."] },
        { name:"Chaos Knight",       icon:"⚔️", hp:140, str:30, loot:0.70,
          taunts:["His armour beareth no crest — only ruin."] },
        { name:"Lich of the Void",   icon:"💀", hp:170, str:42, loot:0.85, boon:{int:8},
          taunts:["'I have outlived gods, child.'","Reality bendseth around its form."] },
        { name:"Elder Dragon",       icon:"🐉", hp:200, str:45, loot:0.95,
          taunts:["'Curious. A morsel that walketh upright.'","The heat is felt before it is seen."] },
        // ── LEGENDARY: The Great Honk of Death ──────────────────
        {
            name:    "The Great Honk of Death",
            icon:    "🪿",
            hp:      9999,
            str:     999,
            loot:    1.0,
            special: "honk"   // triggers doHonkEncounter() in game.js
        },
    ],

    /* ══════════════════════════════════════════════════════════
       SCENARIOS
       option.text — plain text, NO [N] prefix (added by JS)
       ══════════════════════════════════════════════════════════ */
    scenarios: [
        {
            text: "Thou findest a shrine o'ergrown with weeping moss. A whisper calleth from within.",
            options: [
                { text:"Enter the ruins",           type:"bad",     effect:"A trap springs! Heavy stones fall upon thee.",          damage:25 },
                { text:"Offer a prayer without",    type:"good",    effect:"The Old Gods grant thee vigour.",                       bonus:{hp:20} },
                { text:"Pass by with haste",        type:"neutral", effect:"Thou choosest safety over curiosity." }
            ]
        },
        {
            text: "A withered peddler by the wayside offereth a blind trade.",
            options: [
                { text:"Give him gold for a relic", type:"good",  effect:"He bestows an ancient relic upon thee.",   item:true, damage:10 },
                { text:"Slay the beggar",           type:"bad",   effect:"He was a sorcerer in disguise! A curse falls!",         damage:30 },
                { text:"Decline and walk on",       type:"neutral",effect:"The peddler vanishes into the mists." }
            ]
        },
        {
            text: "A bridge of brittle bone spans a chasm of roaring fire.",
            options: [
                { text:"Cross with all speed",      type:"bad",     effect:"The bone snaps! Thou art scorched.",          damage:22 },
                { text:"Perform a rite of passage", type:"good",    effect:"Wisdom guides thy steps over safely.",        bonus:{int:5} },
                { text:"Seek a ford downstream",    type:"neutral", effect:"Thou losest time but keep thy skin." }
            ]
        },
        {
            text: "A feast is laid upon a stone table in a moonlit clearing. No soul is in sight.",
            options: [
                { text:"Eat the hearty bread",      type:"good",    effect:"A welcome meal! Strength returneth.",   bonus:{hp:30} },
                { text:"Drink the purple wine",     type:"bad",     effect:"Tainted with nightshade! Poison ravageth thee.",    damage:40 },
                { text:"Inspect the cutlery",       type:"good",    effect:"A silver trinket catches thine eye.",   item:true }
            ]
        },
        {
            text: "A wounded traveller lies across the path, moaning softly.",
            options: [
                { text:"Offer healing herbs",       type:"good",    effect:"The traveller gifts thee a charm in gratitude.",    bonus:{int:4} },
                { text:"Rob the helpless fool",     type:"bad",     effect:"A hidden blade! The traveller was a rogue.",        damage:20, item:true },
                { text:"Step around them",          type:"neutral", effect:"Thou walkest on, unmoved." }
            ]
        },
        {
            text: "A crumbling tower looms above the canopy. Runes of power glow upon its door.",
            options: [
                { text:"Force the door open",       type:"bad",     effect:"A ward explodes! Arcane fire scorcheth thee.",     damage:35 },
                { text:"Read the runes aloud",      type:"good",    effect:"The tower yields its secrets — and a gift.",       item:true, bonus:{int:3} },
                { text:"Leave well alone",          type:"neutral", effect:"Some doors are not meant to be opened." }
            ]
        },
        {
            text: "Twin moons hang low. The forest husheth — an uncanny silence.",
            options: [
                { text:"Stand guard all night",     type:"good",    effect:"Thy vigilance is rewarded; the darkness passeth.", bonus:{str:3} },
                { text:"Light a great fire",        type:"bad",     effect:"Thou art seen! Creatures swarm from the dark.",    damage:18 },
                { text:"Press on through night",    type:"neutral", effect:"Thou stumblest exhausted but reach the dawn." }
            ]
        },
        {
            text: "An ethereal stag of pure white light standeth in the glade.",
            options: [
                { text:"Touch its flank",           type:"good",    effect:"Divine warmth floweth into thee.",    bonus:{hp:35, int:4} },
                { text:"Attempt to hunt it",        type:"bad",     effect:"It vanisheth and thou art cursed.",   damage:28 },
                { text:"Observe in silence",        type:"neutral", effect:"The stag fades like morning frost." }
            ]
        },
        {
            text: "A rusted iron chest lies half-buried in the earth. Faint sounds come from within.",
            options: [
                { text:"Pry the lid open",          type:"good",    effect:"A trapped pixie! She grants thee a boon.",    item:true },
                { text:"Smash it with a weapon",    type:"bad",     effect:"A glyph of warding detonates!",               damage:30 },
                { text:"Leave it buried",           type:"neutral", effect:"Whatever lurks inside shall stay buried." }
            ]
        },
        {
            text: "Voices echo from a cave — familiar voices thou canst not place.",
            options: [
                { text:"Call out and enter",        type:"bad",     effect:"An illusion lured thee! Thou art ambushed.",    damage:25 },
                { text:"Throw a stone in first",    type:"good",    effect:"Startled bats reveal a hidden cache.",          item:true },
                { text:"Seal the cave mouth",       type:"neutral", effect:"Silence returns. The voices cease." }
            ]
        },
        {
            text: "A dying knight clutches a sealed letter marked with royal wax.",
            options: [
                { text:"Read the letter",           type:"good",    effect:"Intelligence of enemy positions!",   bonus:{int:6} },
                { text:"Take the knight's sword",   type:"good",    effect:"A fine blade — well worth carrying.", item:true },
                { text:"Give last rites and move on",type:"neutral",effect:"Thou honourest the fallen." }
            ]
        },
        {
            text: "A mirror stands freestanding in the wood. Thine reflection moveth differently.",
            options: [
                { text:"Smash the mirror",          type:"bad",     effect:"Seven years of misfortune beginth now.",      damage:20 },
                { text:"Speak to the reflection",   type:"good",    effect:"It whispereth forgotten lore into thine ears.", bonus:{int:8} },
                { text:"Drape it with a cloak",     type:"neutral", effect:"Out of sight, out of mind." }
            ]
        },
        {
            text: "Rain begins. Beneath a hollow oak thou findest crude shelter and a fire already lit.",
            options: [
                { text:"Rest by the fire",          type:"good",    effect:"Warmth and sleep restore thy vitality.", bonus:{hp:25} },
                { text:"Search the hollow",         type:"good",    effect:"A hermit's stash — potions and a tool.",  item:true },
                { text:"Sleep in the rain",         type:"bad",     effect:"Hypothermia bites deep into thy bones.",  damage:15 }
            ]
        },
        {
            text: "A vast spider-web blocks the path. Something large shifteth at its centre.",
            options: [
                { text:"Charge through",            type:"bad",     effect:"The spider descends! Thou art bitten.",       damage:32 },
                { text:"Burn the web",              type:"good",    effect:"The spider flees, leaving egg-sac treasure.", item:true },
                { text:"Find a way around",         type:"neutral", effect:"An hour detour keeps thee unbitten." }
            ]
        },
        {
            text: "A child stands alone on a stump, singing a tuneless song.",
            options: [
                { text:"Approach and speak",        type:"bad",     effect:"It is a changeling. Its touch rotteth thy arm.", damage:28 },
                { text:"Leave an offering",         type:"good",    effect:"The fey child gifts thee a blessing.",           bonus:{str:4, int:4} },
                { text:"Ignore the child",          type:"neutral", effect:"The singing fadeth as thou walkest on." }
            ]
        },
    ],

    /* ══════════════════════════════════════════════════════════
       AMBIENT LINES — shown randomly between turns for atmosphere
       ══════════════════════════════════════════════════════════ */
    ambience: [
        "The wind carryeth the scent of old ash and pine.",
        "Somewhere in the dark, an owl calleth twice and falleth silent.",
        "The path narrows. Roots curl across the stones like sleeping serpents.",
        "A distant bell tolls — though there is no church for a hundred leagues.",
        "The canopy closeth above like a cathedral of shadow.",
        "Mud suckleth at thy boots with each step deeper into the wood.",
        "Fireflies pulse in the bracken, cold and silent as dying stars.",
        "One of thy companions murmureth a prayer in their native tongue.",
        "The trees here are old. Very old. They remember things thou dost not.",
        "A cold mist riseth from the ground without cause.",
        "Thou passest a cairn of stones left by some prior traveller — long dead, no doubt.",
        "The bark of the oaks beareth claw marks, high up — very high up.",
        "Thy shadow seemeth slightly longer than it should be this hour.",
        "Something watcheth from the treeline. It doeth not follow. Yet.",
        "The road signs here have been deliberately turned the wrong way.",
        "A coin glints in the mud. Thou leavest it. Something about it feeleth wrong.",
        "The night birds stop singing all at once.",
        "An old boot hangeth from a branch above the path. Just one.",
    ],

    /* ══════════════════════════════════════════════════════════
       END-SCREEN FLAVOUR TEXT
       ══════════════════════════════════════════════════════════ */
    victoryLines: [
        "The far shore receiveth thee. Behind thee, the wood closeth like a wound.",
        "Bards shall sing of this crossing — or wouldst thou prefer they did not?",
        "The Old Gods nod in approval. The Darkwood hath been cheated of its due.",
        "Thou emergeth scarred, diminished, and utterly alive.",
        "The far village sees thy fellowship emerge from the trees and whispers: impossible.",
    ],

    defeatLines: [
        "The Darkwood consumeth all, in time.",
        "Thy bones join the many others that line the ancient roots.",
        "The trees do not mourn thee. They never do.",
        "Another fellowship enters the wood. They do not find what thou hast left behind.",
        "In a hundred years, children shall be warned not to enter the wood. They shall not know thy name.",
    ],
};
