/**
 * DATA.JS — The Great Compendium of Norrtounia  v0.3
 * ─────────────────────────────────────────────────────────────────
 * All static world data. Edit here to expand the world.
 * Classes now carry: primaryStat, damageType, attackNames, dexB.
 * Monsters carry xpValue for the levelling system.
 * DAMAGE_TYPES maps type → display colour for inline combat spans.
 * ─────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════
   DAMAGE TYPES — used for coloured inline spans in combat
   ═══════════════════════════════════════════════════════ */
const DAMAGE_TYPES = {
    physical: { color:'#c8c0b0', label:'physical' },
    slashing: { color:'#c8c0b0', label:'slashing' },
    piercing: { color:'#d4c890', label:'piercing' },
    fire:     { color:'#ff7733', label:'fire'     },
    lightning:{ color:'#ffe033', label:'lightning' },
    frost:    { color:'#88eeff', label:'frost'    },
    poison:   { color:'#6abf45', label:'poison'   },
    nature:   { color:'#5caa30', label:'nature'   },
    shadow:   { color:'#b47afe', label:'shadow'   },
    necrotic: { color:'#cc44ff', label:'necrotic' },
    void:     { color:'#7755dd', label:'void'     },
    holy:     { color:'#ffd700', label:'holy'     },
    arcane:   { color:'#5bc8fa', label:'arcane'   },
    psychic:  { color:'#e879f9', label:'psychic'  },
    blood:    { color:'#cc2222', label:'blood'    },
};

const GAME_DATA = {

    /* ═══════════════════════════════════════════════════
       RACES  — hp/str/int/dex are base stats
       icon   = emoji shown on setup card
       ═══════════════════════════════════════════════════ */
    races: [
        {
            name:"High Elf", icon:"🧝", hp:45, str:8, int:18, dex:14,
            names:["Aelthas","Baelin","Caelum","Dagoron","Elowen","Faelar","Galanis","Hareth","Ielenia","Kaelen",
                   "Luthien","Miravel","Naerth","Orophin","Phaedel","Quelen","Rilven","Saelihn","Thalanil","Uialen",
                   "Vanyar","Yvraine","Zalthar","Aerith","Eldrin","Loralai","Tauriel","Fingon","Turgon","Finrod",
                   "Amroth","Celeborn","Galadriel","Glorfindel","Haldir","Idril","Maeglin","Nimrodel","Olwe","Voronwe",
                   "Celebrimbor","Ecthelion","Aredhel","Anaire","Nerdanel","Elenwë","Indis","Earwen","Melian","Lúthien"]
        },
        {
            name:"Wood Elf", icon:"🏹", hp:50, str:11, int:14, dex:16,
            names:["Sylvar","Arannis","Briavel","Celorn","Daeris","Elvanna","Ferith","Galadrel","Haeven","Ilphas",
                   "Jaroviel","Karith","Lirien","Maevis","Nyreth","Olindel","Pyriel","Quellis","Rhovar","Sethiel",
                   "Tarvinh","Ulavar","Verathos","Wylaen","Xylara","Yaraliel","Zarevith","Aravel","Belanis","Caelar",
                   "Daevish","Elovar","Farindel","Gavrial","Haevar","Ilyvar","Jenthar","Kaelar","Leothil","Miravar"]
        },
        {
            name:"Mountain Dwarf", icon:"⛏️", hp:80, str:17, int:7, dex:5,
            names:["Bordin","Dwalin","Eitri","Farin","Gimli","Hadhod","Isen","Jari","Kili","Loni",
                   "Morni","Nori","Oin","Pori","Rumni","Stari","Thrain","Ufar","Vili","Ymir",
                   "Gloin","Thorin","Balin","Bifur","Bofur","Bombur","Dain","Fundin","Durin","Telchar",
                   "Azaghal","Gamil","Narvi","Harbek","Thuradin","Brottor","Bromm","Dagnath","Gromnir","Halvar"]
        },
        {
            name:"Hill Dwarf", icon:"🛡️", hp:70, str:15, int:10, dex:7,
            names:["Aldrek","Brundir","Corvis","Delvak","Elmar","Foldur","Grundar","Hordar","Ingvar","Jorvak",
                   "Kramdur","Longrin","Mordak","Naldrin","Ordak","Peldur","Rudvak","Skordak","Torvik","Ulmar",
                   "Vigdar","Woldak","Alvrik","Bekdar","Comdak","Drolvak","Eldvar","Folvak","Goldar","Heldrak"]
        },
        {
            name:"Orc", icon:"💢", hp:95, str:20, int:4, dex:6,
            names:["Azog","Bolg","Dush","Grom","Holg","Ishka","Jugg","Korg","Lugg","Morg",
                   "Nug","Ogg","Pug","Rorg","Throk","Ufthak","Vorg","Yug","Gothmog","Ugluk",
                   "Shagrat","Gorbag","Mauhur","Lagduf","Muzgash","Radbug","Orgrim","Durotan","Garrosh","Kargath",
                   "Kilrogg","Varok","Grommash","Saurfang","Gordul","Kraghur","Mulgrak","Nazdrek","Orgrak","Pushdug"]
        },
        {
            name:"Half-Orc", icon:"⚔️", hp:75, str:18, int:8, dex:8,
            names:["Gothrak","Halvrek","Jorgak","Keldrath","Largor","Malgrim","Nargor","Olgrak","Peldrath","Quelgrak",
                   "Ragnak","Seldrak","Tholgrak","Uglrim","Veldrak","Worgak","Ardrak","Belgor","Cruldak","Drolgak"]
        },
        {
            name:"Human", icon:"🗡️", hp:65, str:13, int:13, dex:11,
            names:["Alaric","Beorn","Cedric","Dara","Edric","Faramir","Goran","Hilda","Ivar","Jora",
                   "Kael","Leif","Marek","Nesta","Oswin","Piers","Quinn","Rowan","Sigrid","Tyra",
                   "Aragorn","Boromir","Eomer","Theoden","Elendil","Bard","Brand","Godric","Osric","Wulfric",
                   "Aldred","Cuthbert","Dunstan","Eadwig","Hereward","Frideswide","Gisela","Ingrid","Jorunn","Lothar"]
        },
        {
            name:"Halfling", icon:"🍀", hp:55, str:9, int:15, dex:15,
            names:["Adalbert","Binbo","Clovis","Drogo","Esme","Falco","Gundabald","Hilda","Isembold","Jago",
                   "Kira","Lotho","Mira","Nob","Odo","Pearl","Rufus","Saradas","Tanta","Urco",
                   "Andwise","Bandobras","Camellia","Daisy","Estella","Griffo","Hamfast","Largo","Merimas","Rosie"]
        },
        {
            name:"Gnome", icon:"🔮", hp:48, str:7, int:19, dex:13,
            names:["Alston","Boddynock","Dimble","Eldon","Frug","Gerbo","Gimble","Glim","Jebeddo","Kellen",
                   "Namfoodle","Orryn","Roondar","Seebo","Sindri","Tock","Warryn","Wrenn","Zook","Alvo",
                   "Bimpnottin","Chatterfang","Duvamil","Erky","Fonkin","Glinnen","Nissa","Orlan","Quellyn","Solia"]
        },
        {
            name:"Tiefling", icon:"😈", hp:58, str:12, int:16, dex:12,
            names:["Akmenos","Amnon","Barakas","Damakos","Ekemon","Iados","Kairon","Leucis","Melech","Mordai",
                   "Morthos","Pelaios","Skamos","Therai","Vivex","Alyma","Brynn","Criella","Damaia","Kallista",
                   "Lerissa","Makaria","Nemeia","Orianna","Phelaia","Rieta","Tanis","Ulele","Vena","Zhara"]
        },
    ],

    /* ═══════════════════════════════════════════════════
       CLASSES
       primaryStat: which stat drives damage ('str'|'int'|'dex')
       damageType:  key into DAMAGE_TYPES
       attackNames: pool of named attacks (picked randomly in combat)
       hpB/strB/intB/dexB: bonus applied on hero creation
       ═══════════════════════════════════════════════════ */
    classes: [
        {
            name:"Knight",       hpB:25,  strB:6,  intB:0,   dexB:-2,
            primaryStat:'str',   damageType:'slashing',
            attackNames:["Blade Strike","Shield Bash","Charging Cleave","Valiant Blow","Knight's Judgment"]
        },
        {
            name:"Wizard",       hpB:-15, strB:0,  intB:12,  dexB:0,
            primaryStat:'int',   damageType:'frost',
            attackNames:["Frost Bolt","Ice Lance","Glacial Ray","Winter's Grasp","Arcane Freeze"]
        },
        {
            name:"Rogue",        hpB:5,   strB:3,  intB:4,   dexB:6,
            primaryStat:'dex',   damageType:'piercing',
            attackNames:["Backstab","Venomous Strike","Shadow Jab","Evasive Lunge","Crippling Slash"]
        },
        {
            name:"Cleric",       hpB:15,  strB:1,  intB:7,   dexB:0,
            primaryStat:'int',   damageType:'holy',
            attackNames:["Sacred Flame","Divine Smite","Radiant Strike","Blessed Blow","Holy Rebuke"]
        },
        {
            name:"Barbarian",    hpB:40,  strB:10, intB:-6,  dexB:-1,
            primaryStat:'str',   damageType:'physical',
            attackNames:["Reckless Strike","Frenzy","Cleave","Blood Rage","Primal Roar"]
        },
        {
            name:"Paladin",      hpB:20,  strB:4,  intB:4,   dexB:1,
            primaryStat:'str',   damageType:'holy',
            attackNames:["Smite Evil","Holy Strike","Aura of Justice","Crusader's Blow","Lay on Smite"]
        },
        {
            name:"Druid",        hpB:10,  strB:2,  intB:8,   dexB:2,
            primaryStat:'int',   damageType:'nature',
            attackNames:["Thorn Whip","Entangle","Nature's Wrath","Wild Strike","Barkskin Lash"]
        },
        {
            name:"Ranger",       hpB:12,  strB:5,  intB:3,   dexB:5,
            primaryStat:'dex',   damageType:'piercing',
            attackNames:["Precise Shot","Hunter's Mark","Arrow Volley","Pinning Strike","Quivering Palm"]
        },
        {
            name:"Bard",         hpB:0,   strB:2,  intB:10,  dexB:3,
            primaryStat:'int',   damageType:'psychic',
            attackNames:["Vicious Mockery","Dissonant Whispers","Psychic Lash","Cacophony","Word of Ruin"]
        },
        {
            name:"Sorcerer",     hpB:-10, strB:0,  intB:14,  dexB:1,
            primaryStat:'int',   damageType:'lightning',
            attackNames:["Lightning Bolt","Chain Lightning","Arc Flash","Thunder Clap","Surge Strike"]
        },
        {
            name:"Warlock",      hpB:5,   strB:1,  intB:11,  dexB:2,
            primaryStat:'int',   damageType:'shadow',
            attackNames:["Eldritch Blast","Hex","Shadow Bolt","Void Curse","Dark Pact Strike"]
        },
        {
            name:"Monk",         hpB:18,  strB:7,  intB:2,   dexB:5,
            primaryStat:'dex',   damageType:'physical',
            attackNames:["Flurry of Blows","Ki Strike","Stunning Strike","Iron Fist","Open Hand Blow"]
        },
        {
            name:"Fighter",      hpB:22,  strB:8,  intB:-2,  dexB:1,
            primaryStat:'str',   damageType:'slashing',
            attackNames:["Precise Strike","Whirlwind","Battle Cry Slash","Riposte","Second Wind Blow"]
        },
        {
            name:"Necromancer",  hpB:-5,  strB:-1, intB:15,  dexB:0,
            primaryStat:'int',   damageType:'necrotic',
            attackNames:["Death Bolt","Soul Drain","Bone Spear","Wither","Grave Chill"]
        },
        // ── 10 NEW CLASSES ──────────────────────────────────────
        {
            name:"Pyromancer",   hpB:-5,  strB:0,  intB:10,  dexB:0,
            primaryStat:'int',   damageType:'fire',
            attackNames:["Fireball","Flame Strike","Inferno Burst","Scorch","Magma Wave"]
        },
        {
            name:"Dark Rogue",   hpB:3,   strB:2,  intB:2,   dexB:7,
            primaryStat:'dex',   damageType:'poison',
            attackNames:["Poisoned Blade","Shadow Mark","Venom Slash","Toxic Jab","Lethal Mist"]
        },
        {
            name:"Blood Knight", hpB:30,  strB:7,  intB:-3,  dexB:-1,
            primaryStat:'str',   damageType:'blood',
            attackNames:["Blood Slash","Crimson Cleave","Hemorrhage","Life Drain","Sanguine Fury"]
        },
        {
            name:"Arcane Archer",hpB:8,   strB:2,  intB:5,   dexB:5,
            primaryStat:'dex',   damageType:'arcane',
            attackNames:["Magic Arrow","Arcane Shot","Seeking Bolt","Phase Pierce","Runic Arrow"]
        },
        {
            name:"Shaman",       hpB:5,   strB:2,  intB:9,   dexB:2,
            primaryStat:'int',   damageType:'lightning',
            attackNames:["Spirit Strike","Lightning Totem","Storm Call","Thunder Axe","Ancestor's Wrath"]
        },
        {
            name:"Templar",      hpB:22,  strB:5,  intB:4,   dexB:1,
            primaryStat:'str',   damageType:'holy',
            attackNames:["Holy Wrath","Sacred Blade","Divine Judgment","Righteous Fury","Inquisitor's Strike"]
        },
        {
            name:"Shadow Dancer",hpB:2,   strB:1,  intB:3,   dexB:8,
            primaryStat:'dex',   damageType:'shadow',
            attackNames:["Shadow Step","Umbral Slash","Phantom Strike","Darkness Waltz","Eclipse Blade"]
        },
        {
            name:"Void Walker",  hpB:-8,  strB:0,  intB:13,  dexB:2,
            primaryStat:'int',   damageType:'void',
            attackNames:["Void Rend","Reality Tear","Annihilate","Entropy Blast","Null Strike"]
        },
        {
            name:"Battle Mage",  hpB:15,  strB:5,  intB:7,   dexB:2,
            primaryStat:'str',   damageType:'fire',
            attackNames:["Flaming Blade","Fire Slash","Burning Strike","Magma Fist","Ember Cleave"]
        },
        {
            name:"Warden",       hpB:10,  strB:3,  intB:6,   dexB:4,
            primaryStat:'dex',   damageType:'nature',
            attackNames:["Thornbind","Barkskin Slash","Vine Whip","Nature's Fury","Root Strike"]
        },
    ],

    /* ═══════════════════════════════════════════════════
       ITEMS — added DEX items; stat drives recipient selection
       ═══════════════════════════════════════════════════ */
    items: [
        // Strength
        { name:"Ancient Blade",          stat:"str", val:6  },
        { name:"Dragon-bone Axe",        stat:"str", val:14 },
        { name:"Ogre-Slayer Mace",       stat:"str", val:9  },
        { name:"Gauntlets of Might",     stat:"str", val:5  },
        { name:"Iron-Forged Claymore",   stat:"str", val:11 },
        { name:"Rusty War-Pick",         stat:"str", val:3  },
        { name:"Executioner's Sword",    stat:"str", val:15 },
        { name:"Troll-hide Gloves",      stat:"str", val:4  },
        { name:"Berserker's Chain",      stat:"str", val:8  },
        { name:"Blade of the Fallen",    stat:"str", val:12 },
        { name:"Runecarved Axe",         stat:"str", val:10 },
        { name:"Obsidian War-Blade",     stat:"str", val:13 },
        // Intellect
        { name:"Staff of Galdor",        stat:"int", val:7  },
        { name:"Amulet of Kings",        stat:"int", val:9  },
        { name:"Scroll of Infinite Sky", stat:"int", val:4  },
        { name:"Grimoire of Shadows",    stat:"int", val:12 },
        { name:"Sage's Crystal Orb",     stat:"int", val:10 },
        { name:"Monocle of Truth",       stat:"int", val:6  },
        { name:"Crown of the Magi",      stat:"int", val:13 },
        { name:"Tome of the Astral Sea", stat:"int", val:8  },
        { name:"Seer's Circlet",         stat:"int", val:11 },
        { name:"Midnight Codex",         stat:"int", val:14 },
        { name:"Band of the Oracle",     stat:"int", val:10 },
        // Dexterity
        { name:"Swift Boots",            stat:"dex", val:7  },
        { name:"Shadow Gloves",          stat:"dex", val:5  },
        { name:"Elven Quiver",           stat:"dex", val:9  },
        { name:"Shadowstep Ring",        stat:"dex", val:6  },
        { name:"Thief's Bandana",        stat:"dex", val:4  },
        { name:"Acrobat's Sash",         stat:"dex", val:8  },
        { name:"Phantom Blade",          stat:"dex", val:11 },
        { name:"Viper Fang Shiv",        stat:"dex", val:10 },
        { name:"Cat's Grace Talisman",   stat:"dex", val:7  },
        // Vitality
        { name:"Mithril Vest",           stat:"hp",  val:35 },
        { name:"Shield of Aegis",        stat:"hp",  val:25 },
        { name:"Cured Leather Tunic",    stat:"hp",  val:10 },
        { name:"Enchanted Cloak",        stat:"hp",  val:15 },
        { name:"Ring of Regeneration",   stat:"hp",  val:20 },
        { name:"Plate of the Fallen",    stat:"hp",  val:40 },
        { name:"Belt of Giant Strength", stat:"hp",  val:30 },
        { name:"Stone-Skin Salve",       stat:"hp",  val:18 },
        { name:"Dragonscale Cape",       stat:"hp",  val:32 },
        { name:"Warden's Breastplate",   stat:"hp",  val:28 },
        { name:"Helm of the Bulwark",    stat:"hp",  val:20 },
        { name:"Blessed Bandages",       stat:"hp",  val:12 },
    ],

    /* ═══════════════════════════════════════════════════
       MONSTERS
       xpValue : base XP awarded to heroes after combat
       loot    : 0–1 probability of dropping an item
       boon    : optional positive stat enchantment
       special : 'honk' = triggers unique encounter
       ═══════════════════════════════════════════════════ */
    monsters: [
        // ── Common (xp 30–60) ──────────────────────────────────
        { name:"Fell Wolf",         icon:"🐺", hp:40,  str:8,  loot:0.20, xpValue:35,
          taunts:["A low growl echoes through the pines.","It circles thee slowly."] },
        { name:"Forest Wraith",     icon:"👻", hp:55,  str:12, loot:0.35, xpValue:50,
          taunts:["A cold whisper: 'Join us...'","The air temperature droppeth sharply."] },
        { name:"Cave Bat Swarm",    icon:"🦇", hp:20,  str:5,  loot:0.10, xpValue:25 },
        { name:"Shadow Stalker",    icon:"🌑", hp:60,  str:14, loot:0.30, xpValue:55,
          taunts:["It moveth without sound.","Thine own shadow betrayeth thee."] },
        { name:"Twisted Ent",       icon:"🌳", hp:85,  str:11, loot:0.45, xpValue:50,
          taunts:["Ancient wood creaketh and groaneth.","The trees... move."] },
        { name:"Skeleton Sentry",   icon:"💀", hp:35,  str:9,  loot:0.20, xpValue:35,
          taunts:["Bones rattle in the silence.","Empty sockets track thine every step."] },
        { name:"Poisonous Adder",   icon:"🐍", hp:25,  str:15, loot:0.15, xpValue:45 },
        { name:"Grave Ghoul",       icon:"💀", hp:55,  str:13, loot:0.40, xpValue:50,
          taunts:["It sniffs the air... hungrily.","Fingernails drag against stone."] },
        { name:"Goblin Pack",       icon:"👺", hp:30,  str:7,  loot:0.25, xpValue:30,
          taunts:["High-pitched cackles fill the trees.","'Give us your shinies!'"] },
        { name:"Bog Hag",           icon:"🧙", hp:50,  str:16, loot:0.50, xpValue:60, boon:{int:3},
          taunts:["She smileth, and her teeth are wrong.","'Pretty travellers... come closer.'"] },
        { name:"Stone Gargoyle",    icon:"🗿", hp:70,  str:14, loot:0.35, xpValue:55 },
        { name:"Bandit Swordsman",  icon:"🗡️", hp:50,  str:13, loot:0.40, xpValue:50,
          taunts:["'Your gold or your life, pilgrim.'","He twirls his blade lazily."] },
        { name:"Cursed Scarecrow",  icon:"🎃", hp:38,  str:11, loot:0.30, xpValue:45, boon:{str:2} },
        { name:"Marsh Leech",       icon:"🪱", hp:22,  str:6,  loot:0.10, xpValue:25 },
        // ── Uncommon (xp 70–110) ───────────────────────────────
        { name:"Hobgoblin Captain", icon:"👺", hp:90,  str:18, loot:0.60, xpValue:85,
          taunts:["'Soldiers! To me!'","A war-horn sounds in the dark."] },
        { name:"Werewolf",          icon:"🐺", hp:100, str:22, loot:0.55, xpValue:95,
          taunts:["A howl that turns thy blood cold.","It standeth on two legs... then four."] },
        { name:"Dark Elf Assassin", icon:"🗡️", hp:80,  str:20, loot:0.65, xpValue:90,
          taunts:["Thou seest only the shadow of the blade."] },
        { name:"Basilisk",          icon:"🦎", hp:95,  str:17, loot:0.50, xpValue:80,
          taunts:["Do NOT meet its gaze."] },
        { name:"Bone Colossus",     icon:"💀", hp:110, str:24, loot:0.70, xpValue:105,
          taunts:["The earth trembles beneath its stride."] },
        { name:"Cursed Paladin",    icon:"⚔️", hp:95,  str:21, loot:0.65, xpValue:95, boon:{hp:15},
          taunts:["'Thou art found wanting.'","Holy light... but twisted, wrong."] },
        { name:"Forest Troll",      icon:"👹", hp:90,  str:19, loot:0.55, xpValue:88,
          taunts:["It regenerateth before thine eyes!","'TROLL HUNGRY.'"] },
        // ── Elite (xp 120–200) ─────────────────────────────────
        { name:"Mountain Troll",    icon:"👹", hp:130, str:28, loot:0.80, xpValue:135,
          taunts:["It sniffs thee from thirty paces.","'ME SMASH.'"] },
        { name:"Ancient Wyvern",    icon:"🐉", hp:155, str:34, loot:0.90, xpValue:160,
          taunts:["The wingbeats extinguish thy torches.","A shadow vast as a house descendeth."] },
        { name:"Necromancer Lord",  icon:"🧙", hp:110, str:38, loot:0.75, xpValue:150, boon:{int:6},
          taunts:["'Death is but a door, and I hold the key.'","Bones rise from the earth."] },
        { name:"Chaos Knight",      icon:"⚔️", hp:140, str:30, loot:0.70, xpValue:140,
          taunts:["His armour beareth no crest — only ruin."] },
        { name:"Lich of the Void",  icon:"💀", hp:170, str:42, loot:0.85, xpValue:190, boon:{int:8},
          taunts:["'I have outlived gods, child.'","Reality bendseth around its form."] },
        { name:"Elder Dragon",      icon:"🐉", hp:200, str:45, loot:0.95, xpValue:200,
          taunts:["'Curious. A morsel that walketh upright.'","The heat is felt before it is seen."] },
        // ── LEGENDARY ──────────────────────────────────────────
        {
            name:"The Great Honk of Death", icon:"🪿",
            hp:9999, str:999, loot:1.0, xpValue:500,
            special:"honk"
        },
    ],

    /* ═══════════════════════════════════════════════════
       SCENARIOS — option.text has no [N] prefix (JS adds it)
       ═══════════════════════════════════════════════════ */
    scenarios: [
        {
            text:"Thou findest a shrine o'ergrown with weeping moss. A whisper calleth from within.",
            options:[
                { text:"Enter the ruins",         type:"bad",     effect:"A trap springs! Heavy stones fall upon thee.",        damage:25, xp:20 },
                { text:"Offer a prayer without",  type:"good",    effect:"The Old Gods grant thee vigour.",                     bonus:{hp:20}, xp:30 },
                { text:"Pass by with haste",      type:"neutral", effect:"Thou choosest safety over curiosity.",                xp:10 }
            ]
        },
        {
            text:"A withered peddler by the wayside offereth a blind trade.",
            options:[
                { text:"Give him gold for a relic",type:"good",   effect:"He bestows an ancient relic upon thee.", item:true, damage:10, xp:30 },
                { text:"Slay the beggar",          type:"bad",    effect:"He was a sorcerer in disguise! A curse falls!",      damage:30, xp:15 },
                { text:"Decline and walk on",      type:"neutral",effect:"The peddler vanishes into the mists.",               xp:8 }
            ]
        },
        {
            text:"A bridge of brittle bone spans a chasm of roaring fire.",
            options:[
                { text:"Cross with all speed",      type:"bad",    effect:"The bone snaps! Thou art scorched.",        damage:22, xp:18 },
                { text:"Perform a rite of passage", type:"good",   effect:"Wisdom guides thy steps over safely.",      bonus:{int:5}, xp:35 },
                { text:"Seek a ford downstream",    type:"neutral",effect:"Thou losest time but keep thy skin.",                  xp:10 }
            ]
        },
        {
            text:"A feast is laid upon a stone table in a moonlit clearing. No soul is in sight.",
            options:[
                { text:"Eat the hearty bread",  type:"good",    effect:"A welcome meal! Strength returneth.",         bonus:{hp:30}, xp:25 },
                { text:"Drink the purple wine", type:"bad",     effect:"Tainted with nightshade! Poison ravageth thee.", damage:40, xp:10 },
                { text:"Inspect the cutlery",   type:"good",    effect:"A silver trinket catches thine eye.",         item:true, xp:30 }
            ]
        },
        {
            text:"A wounded traveller lies across the path, moaning softly.",
            options:[
                { text:"Offer healing herbs",   type:"good",    effect:"The traveller gifts thee a charm.",          bonus:{int:4}, xp:30 },
                { text:"Rob the helpless fool", type:"bad",     effect:"A hidden blade! The traveller was a rogue.", damage:20, item:true, xp:15 },
                { text:"Step around them",      type:"neutral", effect:"Thou walkest on, unmoved.",                              xp:8 }
            ]
        },
        {
            text:"A crumbling tower looms above the canopy. Runes of power glow upon its door.",
            options:[
                { text:"Force the door open",    type:"bad",    effect:"A ward explodes! Arcane fire scorcheth thee.", damage:35, xp:15 },
                { text:"Read the runes aloud",   type:"good",   effect:"The tower yields its secrets.",              item:true, bonus:{int:3}, xp:40 },
                { text:"Leave well alone",       type:"neutral",effect:"Some doors are not meant to be opened.",                xp:8 }
            ]
        },
        {
            text:"Twin moons hang low. The forest husheth — an uncanny silence.",
            options:[
                { text:"Stand guard all night", type:"good",    effect:"Thy vigilance is rewarded.",                 bonus:{str:3}, xp:28 },
                { text:"Light a great fire",    type:"bad",     effect:"Thou art seen! Creatures swarm.",            damage:18, xp:12 },
                { text:"Press on through night",type:"neutral", effect:"Thou stumblest exhausted but reach the dawn.", xp:10 }
            ]
        },
        {
            text:"An ethereal stag of pure white light standeth in the glade.",
            options:[
                { text:"Touch its flank",       type:"good",    effect:"Divine warmth floweth into thee.",           bonus:{hp:35,int:4}, xp:45 },
                { text:"Attempt to hunt it",    type:"bad",     effect:"It vanisheth and thou art cursed.",          damage:28, xp:8 },
                { text:"Observe in silence",    type:"neutral", effect:"The stag fades like morning frost.",                     xp:12 }
            ]
        },
        {
            text:"A rusted iron chest lies half-buried in the earth. Faint sounds come from within.",
            options:[
                { text:"Pry the lid open",      type:"good",    effect:"A trapped pixie! She grants thee a boon.",  item:true, xp:35 },
                { text:"Smash it with a weapon",type:"bad",     effect:"A glyph of warding detonates!",             damage:30, xp:12 },
                { text:"Leave it buried",       type:"neutral", effect:"Whatever lurks inside shall stay buried.",              xp:8 }
            ]
        },
        {
            text:"Voices echo from a cave — familiar voices thou canst not place.",
            options:[
                { text:"Call out and enter",    type:"bad",     effect:"An illusion lured thee! Thou art ambushed.", damage:25, xp:12 },
                { text:"Throw a stone in first",type:"good",    effect:"Startled bats reveal a hidden cache.",       item:true, xp:32 },
                { text:"Seal the cave mouth",   type:"neutral", effect:"Silence returns. The voices cease.",                    xp:8 }
            ]
        },
        {
            text:"A dying knight clutches a sealed letter marked with royal wax.",
            options:[
                { text:"Read the letter",             type:"good",    effect:"Intelligence of enemy positions!", bonus:{int:6}, xp:38 },
                { text:"Take the knight's sword",     type:"good",    effect:"A fine blade — well worth carrying.", item:true, xp:32 },
                { text:"Give last rites and move on", type:"neutral", effect:"Thou honourest the fallen.",                  xp:15 }
            ]
        },
        {
            text:"A mirror stands freestanding in the wood. Thine reflection moveth differently.",
            options:[
                { text:"Smash the mirror",         type:"bad",    effect:"Seven years of misfortune beginth.", damage:20, xp:10 },
                { text:"Speak to the reflection",  type:"good",   effect:"It whispereth forgotten lore.",     bonus:{int:8}, xp:42 },
                { text:"Drape it with a cloak",    type:"neutral",effect:"Out of sight, out of mind.",                    xp:8 }
            ]
        },
        {
            text:"Rain begins. Beneath a hollow oak thou findest crude shelter and a fire already lit.",
            options:[
                { text:"Rest by the fire",    type:"good",    effect:"Warmth restores thy vitality.",    bonus:{hp:25}, xp:28 },
                { text:"Search the hollow",   type:"good",    effect:"A hermit's stash — potions!",      item:true, xp:32 },
                { text:"Sleep in the rain",   type:"bad",     effect:"Hypothermia bites deep.",          damage:15, xp:10 }
            ]
        },
        {
            text:"A vast spider-web blocks the path. Something large shifteth at its centre.",
            options:[
                { text:"Charge through",     type:"bad",    effect:"The spider descends! Thou art bitten.", damage:32, xp:12 },
                { text:"Burn the web",        type:"good",   effect:"The spider flees, leaving treasure.",  item:true, xp:35 },
                { text:"Find a way around",   type:"neutral",effect:"An hour detour keeps thee unbitten.",             xp:10 }
            ]
        },
        {
            text:"A child stands alone on a stump, singing a tuneless song.",
            options:[
                { text:"Approach and speak",    type:"bad",    effect:"It is a changeling. Its touch rotteth.", damage:28, xp:8 },
                { text:"Leave an offering",     type:"good",   effect:"The fey child gifts thee a blessing.",   bonus:{str:4,int:4}, xp:40 },
                { text:"Ignore the child",      type:"neutral",effect:"The singing fadeth as thou walkest on.",             xp:8 }
            ]
        },
    ],

    /* ═══════════════════════════════════════════════════
       AMBIENT LINES — shown randomly between turns
       ═══════════════════════════════════════════════════ */
    ambience:[
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
        "Thy breath maketh no mist tonight, despite the cold.",
        "A faint sobbing cometh from somewhere below the roots.",
    ],

    /* Passive healing flavour (token {name} and {hp} replaced in game.js) */
    healFlavors:[
        "{name} applies a poultice of moonwort and breathes easier.",
        "{name} murmurs a minor healing cantrip beneath their breath.",
        "{name} binds wounds with herbs gathered from the roadside.",
        "A warm forest breeze carries gentle healing magic to {name}.",
        "{name} drinks from an old vial of green tincture found earlier.",
        "{name} tears strips from their cloak and tends to a wound.",
        "The Old Gods see fit to mend {name}'s wounds.",
        "{name} splashes cold stream water over a gash — it cleans it well enough.",
    ],

    /* Treasury flavour (shown on find) */
    treasuryFlavors:[
        "Amidst the mud thou discoverest a leather pouch — heavy with coin.",
        "A dead bandit nearby yieldeth a coin purse worth looting.",
        "Half-buried under a root: a small casket of silver and gems.",
        "A dislodged flagstone revealeth a hoard left by some long-dead traveller.",
        "The shattered remains of a merchant's cart contain scattered valuables.",
        "A hollow tree yields a secret cache of gold dust and uncut gemstones.",
        "Thou dost stumble upon the remnants of an old shrine — offerings still gleam.",
    ],

    /* ═══════════════════════════════════════════════════
       END SCREEN FLAVOUR
       ═══════════════════════════════════════════════════ */
    victoryLines:[
        "The far shore receiveth thee. Behind thee, the wood closeth like a wound.",
        "Bards shall sing of this crossing — or wouldst thou prefer they did not?",
        "The Old Gods nod in approval. The Darkwood hath been cheated of its due.",
        "Thou emergeth scarred, diminished, and utterly alive.",
        "The far village sees thy fellowship emerge and whispers: impossible.",
    ],
    defeatLines:[
        "The Darkwood consumeth all, in time.",
        "Thy bones join the many others that line the ancient roots.",
        "The trees do not mourn thee. They never do.",
        "Another fellowship enters the wood. They do not find what thou hast left behind.",
        "In a hundred years, children shall be warned not to enter the wood. They shall not know thy name.",
    ],
};
