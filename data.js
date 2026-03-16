/**
 * DATA.JS — The Great Compendium of Norrtounia  v0.7
 * ─────────────────────────────────────────────────────────────────
 * New in v0.7:
 *  • CHA (Charisma), STA (Stamina), LCK (Luck) on all races & classes
 *  • Damage type alignment (good / neutral / evil)
 *  • Race resistances (DnD-lore-friendly), negative = weakness
 *  • Class leadership & moralityStart
 *  • Gender stat modifiers (applied in makeHero)
 *  • 30 scenarios (doubled from 15)
 *  • Uneventful turn events (walking / resting / foraging)
 * ─────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════
   DAMAGE TYPES
   alignment: 'good' | 'neutral' | 'evil'
   Good-aligned damage deals +10% bonus vs evil-aligned resistances
   and vice-versa (handled in game.js).
   ═══════════════════════════════════════════════════════════════ */
const DAMAGE_TYPES = {
    physical: { color:'#c8c0b0', label:'physical',  alignment:'neutral' },
    slashing: { color:'#c8c0b0', label:'slashing',  alignment:'neutral' },
    piercing: { color:'#d4c890', label:'piercing',  alignment:'neutral' },
    fire:     { color:'#ff7733', label:'fire',       alignment:'neutral' },
    lightning:{ color:'#ffe033', label:'lightning',  alignment:'neutral' },
    frost:    { color:'#88eeff', label:'frost',      alignment:'neutral' },
    poison:   { color:'#6abf45', label:'poison',     alignment:'evil'    }, // life-draining
    nature:   { color:'#5caa30', label:'nature',     alignment:'neutral' }, // neutral-good but not strictly good
    shadow:   { color:'#b47afe', label:'shadow',     alignment:'evil'    },
    necrotic: { color:'#cc44ff', label:'necrotic',   alignment:'evil'    },
    void:     { color:'#7755dd', label:'void',       alignment:'evil'    },
    holy:     { color:'#ffd700', label:'holy',       alignment:'good'    },
    arcane:   { color:'#5bc8fa', label:'arcane',     alignment:'neutral' },
    psychic:  { color:'#e879f9', label:'psychic',    alignment:'neutral' },
    blood:    { color:'#cc2222', label:'blood',      alignment:'evil'    },
};

/* ═══════════════════════════════════════════════════════════════
   GENDER MODIFIERS — applied on hero creation in makeHero()
   Subtle, lore-inspired; designed to not overpower any archetype.
   ═══════════════════════════════════════════════════════════════ */
const GENDER_MOD = {
    male:   { str: +1, cha: -1, sta: +1, lck:  0 },
    female: { str: -1, cha: +1, sta:  0, lck: +1 },
};

const GAME_DATA = {

    /* ═══════════════════════════════════════════════════════════
       RACES
       New fields:
         cha / sta / lck  — base values (before class bonuses)
         resistances      — { damageType: pct } only non-zero values;
                            positive = % reduction, negative = weakness
       ═══════════════════════════════════════════════════════════ */
    races: [
        {
            name:'High Elf', icon:'🧝', hp:45, str:8, int:18, dex:14,
            cha:14, sta:10, lck:10,
            resistances:{ psychic:15, nature:10, shadow:-5 },
            names:['Aelthas','Baelin','Caelum','Dagoron','Elowen','Faelar','Galanis','Hareth','Ielenia','Kaelen',
                   'Luthien','Miravel','Naerth','Orophin','Phaedel','Quelen','Rilven','Saelihn','Thalanil','Uialen',
                   'Vanyar','Yvraine','Zalthar','Aerith','Eldrin','Loralai','Tauriel','Fingon','Turgon','Finrod',
                   'Amroth','Celeborn','Galadriel','Glorfindel','Haldir','Idril','Maeglin','Nimrodel','Olwe','Voronwe',
                   'Celebrimbor','Ecthelion','Aredhel','Anaire','Nerdanel','Elenwë','Indis','Earwen','Melian','Lúthien']
        },
        {
            name:'Wood Elf', icon:'🏹', hp:50, str:11, int:14, dex:16,
            cha:12, sta:11, lck:11,
            resistances:{ nature:20, poison:10, fire:-5 },
            names:['Sylvar','Arannis','Briavel','Celorn','Daeris','Elvanna','Ferith','Galadrel','Haeven','Ilphas',
                   'Jaroviel','Karith','Lirien','Maevis','Nyreth','Olindel','Pyriel','Quellis','Rhovar','Sethiel',
                   'Tarvinh','Ulavar','Verathos','Wylaen','Xylara','Yaraliel','Zarevith','Aravel','Belanis','Caelar',
                   'Daevish','Elovar','Farindel','Gavrial','Haevar','Ilyvar','Jenthar','Kaelar','Leothil','Miravar']
        },
        {
            name:'Mountain Dwarf', icon:'⛏️', hp:80, str:17, int:7, dex:5,
            cha:7, sta:17, lck:8,
            resistances:{ poison:20, physical:10, fire:5, frost:10, psychic:-5 },
            names:['Bordin','Dwalin','Eitri','Farin','Gimli','Hadhod','Isen','Jari','Kili','Loni',
                   'Morni','Nori','Oin','Pori','Rumni','Stari','Thrain','Ufar','Vili','Ymir',
                   'Gloin','Thorin','Balin','Bifur','Bofur','Bombur','Dain','Fundin','Durin','Telchar',
                   'Azaghal','Gamil','Narvi','Harbek','Thuradin','Brottor','Bromm','Dagnath','Gromnir','Halvar']
        },
        {
            name:'Hill Dwarf', icon:'🛡️', hp:70, str:15, int:10, dex:7,
            cha:8, sta:15, lck:9,
            resistances:{ poison:15, physical:5, frost:5 },
            names:['Aldrek','Brundir','Corvis','Delvak','Elmar','Foldur','Grundar','Hordar','Ingvar','Jorvak',
                   'Kramdur','Longrin','Mordak','Naldrin','Ordak','Peldur','Rudvak','Skordak','Torvik','Ulmar',
                   'Vigdar','Woldak','Alvrik','Bekdar','Comdak','Drolvak','Eldvar','Folvak','Goldar','Heldrak']
        },
        {
            name:'Orc', icon:'💢', hp:95, str:20, int:4, dex:6,
            cha:5, sta:16, lck:7,
            resistances:{ physical:15, poison:10, holy:-15, psychic:-10 },
            names:['Azog','Bolg','Dush','Grom','Holg','Ishka','Jugg','Korg','Lugg','Morg',
                   'Nug','Ogg','Pug','Rorg','Throk','Ufthak','Vorg','Yug','Gothmog','Ugluk',
                   'Shagrat','Gorbag','Mauhur','Lagduf','Muzgash','Radbug','Orgrim','Durotan','Garrosh','Kargath',
                   'Kilrogg','Varok','Grommash','Saurfang','Gordul','Kraghur','Mulgrak','Nazdrek','Orgrak','Pushdug']
        },
        {
            name:'Half-Orc', icon:'⚔️', hp:75, str:18, int:8, dex:8,
            cha:7, sta:14, lck:8,
            resistances:{ physical:10, poison:5 },
            names:['Gothrak','Halvrek','Jorgak','Keldrath','Largor','Malgrim','Nargor','Olgrak','Peldrath','Quelgrak',
                   'Ragnak','Seldrak','Tholgrak','Uglrim','Veldrak','Worgak','Ardrak','Belgor','Cruldak','Drolgak']
        },
        {
            name:'Human', icon:'🗡️', hp:65, str:13, int:13, dex:11,
            cha:12, sta:12, lck:11,
            resistances:{},   // humans: no innate resistances — adaptable and balanced
            names:['Alaric','Beorn','Cedric','Dara','Edric','Faramir','Goran','Hilda','Ivar','Jora',
                   'Kael','Leif','Marek','Nesta','Oswin','Piers','Quinn','Rowan','Sigrid','Tyra',
                   'Aragorn','Boromir','Eomer','Theoden','Elendil','Bard','Brand','Godric','Osric','Wulfric',
                   'Aldred','Cuthbert','Dunstan','Eadwig','Hereward','Frideswide','Gisela','Ingrid','Jorunn','Lothar']
        },
        {
            name:'Halfling', icon:'🍀', hp:55, str:9, int:15, dex:15,
            cha:14, sta:10, lck:16,  // famous luck
            resistances:{ psychic:10, shadow:5, fear:15 },
            names:['Adalbert','Binbo','Clovis','Drogo','Esme','Falco','Gundabald','Hilda','Isembold','Jago',
                   'Kira','Lotho','Mira','Nob','Odo','Pearl','Rufus','Saradas','Tanta','Urco',
                   'Andwise','Bandobras','Camellia','Daisy','Estella','Griffo','Hamfast','Largo','Merimas','Rosie']
        },
        {
            name:'Gnome', icon:'🔮', hp:48, str:7, int:19, dex:13,
            cha:12, sta:9, lck:13,
            resistances:{ arcane:15, lightning:10, poison:5, psychic:5 },
            names:['Alston','Boddynock','Dimble','Eldon','Frug','Gerbo','Gimble','Glim','Jebeddo','Kellen',
                   'Namfoodle','Orryn','Roondar','Seebo','Sindri','Tock','Warryn','Wrenn','Zook','Alvo',
                   'Bimpnottin','Chatterfang','Duvamil','Erky','Fonkin','Glinnen','Nissa','Orlan','Quellyn','Solia']
        },
        {
            name:'Tiefling', icon:'😈', hp:58, str:12, int:16, dex:12,
            cha:13, sta:12, lck:9,
            resistances:{ fire:20, shadow:10, frost:-10, holy:-5 },
            names:['Akmenos','Amnon','Barakas','Damakos','Ekemon','Iados','Kairon','Leucis','Melech','Mordai',
                   'Morthos','Pelaios','Skamos','Therai','Vivex','Alyma','Brynn','Criella','Damaia','Kallista',
                   'Lerissa','Makaria','Nemeia','Orianna','Phelaia','Rieta','Tanis','Ulele','Vena','Zhara']
        },
    ],

    /* ═══════════════════════════════════════════════════════════
       CLASSES
       New fields:
         chaB / staB / lckB   — bonuses applied to hero stat
         leadership           — 1–20; who leads the party
         moralityStart        — starting morality −50 to +50
       ═══════════════════════════════════════════════════════════ */
    classes: [
        { name:'Knight',       hpB: 25, strB: 6, intB: 0,  dexB:-2, chaB: 2, staB: 4, lckB: 0, leadership:15, moralityStart: 10,
          primaryStat:'str', damageType:'slashing',  attackNames:['Blade Strike','Shield Bash','Charging Cleave','Valiant Blow','Knight\'s Judgment'] },
        { name:'Wizard',       hpB:-15, strB: 0, intB:12,  dexB: 0, chaB: 0, staB:-2, lckB: 2, leadership:10, moralityStart:  0,
          primaryStat:'int', damageType:'frost',     attackNames:['Frost Bolt','Ice Lance','Glacial Ray','Winter\'s Grasp','Arcane Freeze'] },
        { name:'Rogue',        hpB:  5, strB: 3, intB: 4,  dexB: 6, chaB: 1, staB: 0, lckB: 5, leadership: 7, moralityStart: -5,
          primaryStat:'dex', damageType:'piercing',  attackNames:['Backstab','Venomous Strike','Shadow Jab','Evasive Lunge','Crippling Slash'] },
        { name:'Cleric',       hpB: 15, strB: 1, intB: 7,  dexB: 0, chaB: 4, staB: 3, lckB: 1, leadership:13, moralityStart: 20,
          primaryStat:'int', damageType:'holy',      attackNames:['Sacred Flame','Divine Smite','Radiant Strike','Blessed Blow','Holy Rebuke'] },
        { name:'Barbarian',    hpB: 40, strB:10, intB:-6,  dexB:-1, chaB:-2, staB: 6, lckB: 0, leadership: 9, moralityStart: -5,
          primaryStat:'str', damageType:'physical',  attackNames:['Reckless Strike','Frenzy','Cleave','Blood Rage','Primal Roar'] },
        { name:'Paladin',      hpB: 20, strB: 4, intB: 4,  dexB: 1, chaB: 6, staB: 4, lckB: 2, leadership:18, moralityStart: 25,
          primaryStat:'str', damageType:'holy',      attackNames:['Smite Evil','Holy Strike','Aura of Justice','Crusader\'s Blow','Lay on Smite'] },
        { name:'Druid',        hpB: 10, strB: 2, intB: 8,  dexB: 2, chaB: 2, staB: 3, lckB: 3, leadership:12, moralityStart: 15,
          primaryStat:'int', damageType:'nature',    attackNames:['Thorn Whip','Entangle','Nature\'s Wrath','Wild Strike','Barkskin Lash'] },
        { name:'Ranger',       hpB: 12, strB: 5, intB: 3,  dexB: 5, chaB: 1, staB: 2, lckB: 4, leadership:11, moralityStart:  5,
          primaryStat:'dex', damageType:'piercing',  attackNames:['Precise Shot','Hunter\'s Mark','Arrow Volley','Pinning Strike','Quivering Palm'] },
        { name:'Bard',         hpB:  0, strB: 2, intB:10,  dexB: 3, chaB: 7, staB: 0, lckB: 4, leadership:14, moralityStart:  5,
          primaryStat:'int', damageType:'psychic',   attackNames:['Vicious Mockery','Dissonant Whispers','Psychic Lash','Cacophony','Word of Ruin'] },
        { name:'Sorcerer',     hpB:-10, strB: 0, intB:14,  dexB: 1, chaB: 2, staB:-1, lckB: 2, leadership: 9, moralityStart:  0,
          primaryStat:'int', damageType:'lightning', attackNames:['Lightning Bolt','Chain Lightning','Arc Flash','Thunder Clap','Surge Strike'] },
        { name:'Warlock',      hpB:  5, strB: 1, intB:11,  dexB: 2, chaB: 3, staB: 1, lckB: 1, leadership: 8, moralityStart:-10,
          primaryStat:'int', damageType:'shadow',    attackNames:['Eldritch Blast','Hex','Shadow Bolt','Void Curse','Dark Pact Strike'] },
        { name:'Monk',         hpB: 18, strB: 7, intB: 2,  dexB: 5, chaB: 2, staB: 4, lckB: 2, leadership:10, moralityStart: 15,
          primaryStat:'dex', damageType:'physical',  attackNames:['Flurry of Blows','Ki Strike','Stunning Strike','Iron Fist','Open Hand Blow'] },
        { name:'Fighter',      hpB: 22, strB: 8, intB:-2,  dexB: 1, chaB: 0, staB: 5, lckB: 0, leadership:12, moralityStart:  0,
          primaryStat:'str', damageType:'slashing',  attackNames:['Precise Strike','Whirlwind','Battle Cry Slash','Riposte','Second Wind Blow'] },
        { name:'Necromancer',  hpB: -5, strB:-1, intB:15,  dexB: 0, chaB:-1, staB: 0, lckB: 0, leadership: 7, moralityStart:-20,
          primaryStat:'int', damageType:'necrotic',  attackNames:['Death Bolt','Soul Drain','Bone Spear','Wither','Grave Chill'] },
        { name:'Pyromancer',   hpB: -5, strB: 0, intB:10,  dexB: 0, chaB: 0, staB: 0, lckB: 1, leadership: 8, moralityStart: -5,
          primaryStat:'int', damageType:'fire',      attackNames:['Fireball','Flame Strike','Inferno Burst','Scorch','Magma Wave'] },
        { name:'Dark Rogue',   hpB:  3, strB: 2, intB: 2,  dexB: 7, chaB: 1, staB:-1, lckB: 6, leadership: 6, moralityStart:-15,
          primaryStat:'dex', damageType:'poison',    attackNames:['Poisoned Blade','Shadow Mark','Venom Slash','Toxic Jab','Lethal Mist'] },
        { name:'Blood Knight', hpB: 30, strB: 7, intB:-3,  dexB:-1, chaB:-1, staB: 5, lckB: 0, leadership: 9, moralityStart:-15,
          primaryStat:'str', damageType:'blood',     attackNames:['Blood Slash','Crimson Cleave','Hemorrhage','Life Drain','Sanguine Fury'] },
        { name:'Arcane Archer',hpB:  8, strB: 2, intB: 5,  dexB: 5, chaB: 1, staB: 1, lckB: 4, leadership:10, moralityStart:  0,
          primaryStat:'dex', damageType:'arcane',    attackNames:['Magic Arrow','Arcane Shot','Seeking Bolt','Phase Pierce','Runic Arrow'] },
        { name:'Shaman',       hpB:  5, strB: 2, intB: 9,  dexB: 2, chaB: 3, staB: 2, lckB: 3, leadership:13, moralityStart: 10,
          primaryStat:'int', damageType:'lightning', attackNames:['Spirit Strike','Lightning Totem','Storm Call','Thunder Axe','Ancestor\'s Wrath'] },
        { name:'Templar',      hpB: 22, strB: 5, intB: 4,  dexB: 1, chaB: 5, staB: 4, lckB: 1, leadership:16, moralityStart: 20,
          primaryStat:'str', damageType:'holy',      attackNames:['Holy Wrath','Sacred Blade','Divine Judgment','Righteous Fury','Inquisitor\'s Strike'] },
        { name:'Shadow Dancer',hpB:  2, strB: 1, intB: 3,  dexB: 8, chaB: 2, staB: 0, lckB: 5, leadership: 7, moralityStart:-10,
          primaryStat:'dex', damageType:'shadow',    attackNames:['Shadow Step','Umbral Slash','Phantom Strike','Darkness Waltz','Eclipse Blade'] },
        { name:'Void Walker',  hpB: -8, strB: 0, intB:13,  dexB: 2, chaB:-2, staB: 0, lckB: 1, leadership: 6, moralityStart:-15,
          primaryStat:'int', damageType:'void',      attackNames:['Void Rend','Reality Tear','Annihilate','Entropy Blast','Null Strike'] },
        { name:'Battle Mage',  hpB: 15, strB: 5, intB: 7,  dexB: 2, chaB: 0, staB: 2, lckB: 1, leadership:11, moralityStart:  0,
          primaryStat:'str', damageType:'fire',      attackNames:['Flaming Blade','Fire Slash','Burning Strike','Magma Fist','Ember Cleave'] },
        { name:'Warden',       hpB: 10, strB: 3, intB: 6,  dexB: 4, chaB: 2, staB: 3, lckB: 3, leadership:13, moralityStart: 15,
          primaryStat:'dex', damageType:'nature',    attackNames:['Thornbind','Barkskin Slash','Vine Whip','Nature\'s Fury','Root Strike'] },
    ],

    /* ═══════════════════════════════════════════════════════════
       ITEMS — unchanged from v0.6
       ═══════════════════════════════════════════════════════════ */
    items: [
        { name:'Ancient Blade',          stat:'str', val:6  },
        { name:'Dragon-bone Axe',        stat:'str', val:14 },
        { name:'Ogre-Slayer Mace',       stat:'str', val:9  },
        { name:'Gauntlets of Might',     stat:'str', val:5  },
        { name:'Iron-Forged Claymore',   stat:'str', val:11 },
        { name:'Rusty War-Pick',         stat:'str', val:3  },
        { name:'Executioner\'s Sword',   stat:'str', val:15 },
        { name:'Troll-hide Gloves',      stat:'str', val:4  },
        { name:'Berserker\'s Chain',     stat:'str', val:8  },
        { name:'Blade of the Fallen',    stat:'str', val:12 },
        { name:'Runecarved Axe',         stat:'str', val:10 },
        { name:'Obsidian War-Blade',     stat:'str', val:13 },
        { name:'Staff of Galdor',        stat:'int', val:7  },
        { name:'Amulet of Kings',        stat:'int', val:9  },
        { name:'Scroll of Infinite Sky', stat:'int', val:4  },
        { name:'Grimoire of Shadows',    stat:'int', val:12 },
        { name:'Sage\'s Crystal Orb',    stat:'int', val:10 },
        { name:'Monocle of Truth',       stat:'int', val:6  },
        { name:'Crown of the Magi',      stat:'int', val:13 },
        { name:'Tome of the Astral Sea', stat:'int', val:8  },
        { name:'Seer\'s Circlet',        stat:'int', val:11 },
        { name:'Midnight Codex',         stat:'int', val:14 },
        { name:'Band of the Oracle',     stat:'int', val:10 },
        { name:'Swift Boots',            stat:'dex', val:7  },
        { name:'Shadow Gloves',          stat:'dex', val:5  },
        { name:'Elven Quiver',           stat:'dex', val:9  },
        { name:'Shadowstep Ring',        stat:'dex', val:6  },
        { name:'Thief\'s Bandana',       stat:'dex', val:4  },
        { name:'Acrobat\'s Sash',        stat:'dex', val:8  },
        { name:'Phantom Blade',          stat:'dex', val:11 },
        { name:'Viper Fang Shiv',        stat:'dex', val:10 },
        { name:'Cat\'s Grace Talisman',  stat:'dex', val:7  },
        { name:'Mithril Vest',           stat:'hp',  val:35 },
        { name:'Shield of Aegis',        stat:'hp',  val:25 },
        { name:'Cured Leather Tunic',    stat:'hp',  val:10 },
        { name:'Enchanted Cloak',        stat:'hp',  val:15 },
        { name:'Ring of Regeneration',   stat:'hp',  val:20 },
        { name:'Plate of the Fallen',    stat:'hp',  val:40 },
        { name:'Belt of Giant Strength', stat:'hp',  val:30 },
        { name:'Stone-Skin Salve',       stat:'hp',  val:18 },
        { name:'Dragonscale Cape',       stat:'hp',  val:32 },
        { name:'Warden\'s Breastplate',  stat:'hp',  val:28 },
        { name:'Helm of the Bulwark',    stat:'hp',  val:20 },
        { name:'Blessed Bandages',       stat:'hp',  val:12 },
    ],

    /* ═══════════════════════════════════════════════════════════
       MONSTERS — added xpValue to all
       ═══════════════════════════════════════════════════════════ */
    monsters: [
        { name:'Fell Wolf',         icon:'🐺', hp: 40, str: 8,  loot:0.20, xpValue: 35, taunts:['A low growl echoes through the pines.','It circles thee slowly.'] },
        { name:'Forest Wraith',     icon:'👻', hp: 55, str:12,  loot:0.35, xpValue: 50, taunts:['A cold whisper: "Join us..."','The air temperature droppeth sharply.'] },
        { name:'Cave Bat Swarm',    icon:'🦇', hp: 20, str: 5,  loot:0.10, xpValue: 25 },
        { name:'Shadow Stalker',    icon:'🌑', hp: 60, str:14,  loot:0.30, xpValue: 55, taunts:['It moveth without sound.','Thine own shadow betrayeth thee.'] },
        { name:'Twisted Ent',       icon:'🌳', hp: 85, str:11,  loot:0.45, xpValue: 50, taunts:['Ancient wood creaketh and groaneth.','The trees... move.'] },
        { name:'Skeleton Sentry',   icon:'💀', hp: 35, str: 9,  loot:0.20, xpValue: 35, taunts:['Bones rattle in the silence.','Empty sockets track thine every step.'] },
        { name:'Poisonous Adder',   icon:'🐍', hp: 25, str:15,  loot:0.15, xpValue: 45 },
        { name:'Grave Ghoul',       icon:'💀', hp: 55, str:13,  loot:0.40, xpValue: 50, taunts:['It sniffs the air... hungrily.','Fingernails drag against stone.'] },
        { name:'Goblin Pack',       icon:'👺', hp: 30, str: 7,  loot:0.25, xpValue: 30, taunts:['High-pitched cackles fill the trees.','\'Give us your shinies!\''] },
        { name:'Bog Hag',           icon:'🧙', hp: 50, str:16,  loot:0.50, xpValue: 60, boon:{int:3}, taunts:['She smileth, and her teeth are wrong.','\'Pretty travellers... come closer.\''] },
        { name:'Stone Gargoyle',    icon:'🗿', hp: 70, str:14,  loot:0.35, xpValue: 55 },
        { name:'Bandit Swordsman',  icon:'🗡️', hp: 50, str:13,  loot:0.40, xpValue: 50, taunts:['\'Your gold or your life, pilgrim.\'','He twirls his blade lazily.'] },
        { name:'Cursed Scarecrow',  icon:'🎃', hp: 38, str:11,  loot:0.30, xpValue: 45, boon:{str:2} },
        { name:'Marsh Leech',       icon:'🪱', hp: 22, str: 6,  loot:0.10, xpValue: 25 },
        { name:'Hobgoblin Captain', icon:'👺', hp: 90, str:18,  loot:0.60, xpValue: 85, taunts:['\'Soldiers! To me!\'','A war-horn sounds in the dark.'] },
        { name:'Werewolf',          icon:'🐺', hp:100, str:22,  loot:0.55, xpValue: 95, taunts:['A howl that turns thy blood cold.','It standeth on two legs... then four.'] },
        { name:'Dark Elf Assassin', icon:'🗡️', hp: 80, str:20,  loot:0.65, xpValue: 90, taunts:['Thou seest only the shadow of the blade.'] },
        { name:'Basilisk',          icon:'🦎', hp: 95, str:17,  loot:0.50, xpValue: 80, taunts:['Do NOT meet its gaze.'] },
        { name:'Bone Colossus',     icon:'💀', hp:110, str:24,  loot:0.70, xpValue:105, taunts:['The earth trembles beneath its stride.'] },
        { name:'Cursed Paladin',    icon:'⚔️', hp: 95, str:21,  loot:0.65, xpValue: 95, boon:{hp:15}, taunts:['\'Thou art found wanting.\'','Holy light... but twisted, wrong.'] },
        { name:'Forest Troll',      icon:'👹', hp: 90, str:19,  loot:0.55, xpValue: 88, taunts:['It regenerateth before thine eyes!','\'TROLL HUNGRY.\''] },
        { name:'Mountain Troll',    icon:'👹', hp:130, str:28,  loot:0.80, xpValue:135, taunts:['It sniffs thee from thirty paces.','\'ME SMASH.\''] },
        { name:'Ancient Wyvern',    icon:'🐉', hp:155, str:34,  loot:0.90, xpValue:160, taunts:['The wingbeats extinguish thy torches.','A shadow vast as a house descendeth.'] },
        { name:'Necromancer Lord',  icon:'🧙', hp:110, str:38,  loot:0.75, xpValue:150, boon:{int:6}, taunts:['\'Death is but a door, and I hold the key.\'','Bones rise from the earth.'] },
        { name:'Chaos Knight',      icon:'⚔️', hp:140, str:30,  loot:0.70, xpValue:140, taunts:['His armour beareth no crest — only ruin.'] },
        { name:'Lich of the Void',  icon:'💀', hp:170, str:42,  loot:0.85, xpValue:190, boon:{int:8}, taunts:['\'I have outlived gods, child.\'','Reality bendseth around its form.'] },
        { name:'Elder Dragon',      icon:'🐉', hp:200, str:45,  loot:0.95, xpValue:200, taunts:['\'Curious. A morsel that walketh upright.\'','The heat is felt before it is seen.'] },
        { name:'The Great Honk of Death', icon:'🪿', hp:9999, str:999, loot:1.0, xpValue:500, special:'honk' },
    ],

    /* ═══════════════════════════════════════════════════════════
       SCENARIOS — 30 total (doubled from v0.6)
       Fields: xp added to all options; morality added where fitting
       morality: positive shifts hero toward good, negative toward evil
       ═══════════════════════════════════════════════════════════ */
    scenarios: [
        // ── Original 15 ────────────────────────────────────────
        {
            text:'Thou findest a shrine o\'ergrown with weeping moss. A whisper calleth from within.',
            options:[
                { text:'Enter the ruins',         type:'bad',     effect:'A trap springs! Heavy stones fall upon thee.',        damage:25, xp:20, morality: 0 },
                { text:'Offer a prayer without',  type:'good',    effect:'The Old Gods grant thee vigour.',                     bonus:{hp:20}, xp:30, morality:+10 },
                { text:'Pass by with haste',      type:'neutral', effect:'Thou choosest safety over curiosity.',                xp:10, morality: 0 }
            ]
        },
        {
            text:'A withered peddler by the wayside offereth a blind trade.',
            options:[
                { text:'Give him gold for a relic',type:'good',   effect:'He bestows an ancient relic upon thee.',   item:true, damage:10, xp:30, morality:+5 },
                { text:'Slay the beggar',          type:'bad',    effect:'He was a sorcerer in disguise! A curse falls!',       damage:30, xp:15, morality:-20 },
                { text:'Decline and walk on',      type:'neutral',effect:'The peddler vanishes into the mists.',                xp:8, morality:0 }
            ]
        },
        {
            text:'A bridge of brittle bone spans a chasm of roaring fire.',
            options:[
                { text:'Cross with all speed',      type:'bad',    effect:'The bone snaps! Thou art scorched.',        damage:22, xp:18, morality: 0 },
                { text:'Perform a rite of passage', type:'good',   effect:'Wisdom guides thy steps over safely.',      bonus:{int:5}, xp:35, morality: 0 },
                { text:'Seek a ford downstream',    type:'neutral',effect:'Thou losest time but keep thy skin.',       xp:10, morality: 0 }
            ]
        },
        {
            text:'A feast is laid upon a stone table in a moonlit clearing. No soul is in sight.',
            options:[
                { text:'Eat the hearty bread',  type:'good',    effect:'A welcome meal! Strength returneth.',  bonus:{hp:30}, xp:25, morality:0 },
                { text:'Drink the purple wine', type:'bad',     effect:'Tainted with nightshade!',             damage:40, xp:10, morality:0 },
                { text:'Inspect the cutlery',   type:'good',    effect:'A silver trinket catches thine eye.',  item:true, xp:30, morality:0 }
            ]
        },
        {
            text:'A wounded traveller lies across the path, moaning softly.',
            options:[
                { text:'Offer healing herbs',   type:'good',    effect:'The traveller gifts thee a charm.',    bonus:{int:4}, xp:30, morality:+15 },
                { text:'Rob the helpless fool', type:'bad',     effect:'A hidden blade! The traveller was a rogue.', damage:20, item:true, xp:15, morality:-20 },
                { text:'Step around them',      type:'neutral', effect:'Thou walkest on, unmoved.',            xp:8, morality:-5 }
            ]
        },
        {
            text:'A crumbling tower looms above the canopy. Runes of power glow upon its door.',
            options:[
                { text:'Force the door open',    type:'bad',    effect:'A ward explodes! Arcane fire scorcheth thee.', damage:35, xp:15, morality:0 },
                { text:'Read the runes aloud',   type:'good',   effect:'The tower yields its secrets.',              item:true, bonus:{int:3}, xp:40, morality:0 },
                { text:'Leave well alone',       type:'neutral',effect:'Some doors are not meant to be opened.',      xp:8, morality:0 }
            ]
        },
        {
            text:'Twin moons hang low. The forest husheth — an uncanny silence.',
            options:[
                { text:'Stand guard all night', type:'good',    effect:'Thy vigilance is rewarded.',           bonus:{str:3}, xp:28, morality:+5 },
                { text:'Light a great fire',    type:'bad',     effect:'Thou art seen! Creatures swarm.',      damage:18, xp:12, morality:0 },
                { text:'Press on through night',type:'neutral', effect:'Thou stumblest exhausted but reach the dawn.', xp:10, morality:0 }
            ]
        },
        {
            text:'An ethereal stag of pure white light standeth in the glade.',
            options:[
                { text:'Touch its flank',       type:'good',    effect:'Divine warmth floweth into thee.',    bonus:{hp:35,int:4}, xp:45, morality:+10 },
                { text:'Attempt to hunt it',    type:'bad',     effect:'It vanisheth and thou art cursed.',   damage:28, xp:8, morality:-15 },
                { text:'Observe in silence',    type:'neutral', effect:'The stag fades like morning frost.',  xp:12, morality:+5 }
            ]
        },
        {
            text:'A rusted iron chest lies half-buried in the earth. Faint sounds come from within.',
            options:[
                { text:'Pry the lid open',      type:'good',    effect:'A trapped pixie! She grants thee a boon.', item:true, xp:35, morality:+10 },
                { text:'Smash it with a weapon',type:'bad',     effect:'A glyph of warding detonates!',            damage:30, xp:12, morality:0 },
                { text:'Leave it buried',       type:'neutral', effect:'Whatever lurks inside shall stay buried.',  xp:8, morality:0 }
            ]
        },
        {
            text:'Voices echo from a cave — familiar voices thou canst not place.',
            options:[
                { text:'Call out and enter',    type:'bad',     effect:'An illusion lured thee! Thou art ambushed.', damage:25, xp:12, morality:0 },
                { text:'Throw a stone in first',type:'good',    effect:'Startled bats reveal a hidden cache.',       item:true, xp:32, morality:0 },
                { text:'Seal the cave mouth',   type:'neutral', effect:'Silence returns. The voices cease.',         xp:8, morality:0 }
            ]
        },
        {
            text:'A dying knight clutches a sealed letter marked with royal wax.',
            options:[
                { text:'Read the letter',             type:'good',    effect:'Intelligence of enemy positions!', bonus:{int:6}, xp:38, morality:+5 },
                { text:'Take the knight\'s sword',    type:'good',    effect:'A fine blade — well worth carrying.', item:true, xp:32, morality:0 },
                { text:'Give last rites and move on', type:'neutral', effect:'Thou honourest the fallen.', xp:15, morality:+10 }
            ]
        },
        {
            text:'A mirror stands freestanding in the wood. Thine reflection moveth differently.',
            options:[
                { text:'Smash the mirror',         type:'bad',    effect:'Seven years of misfortune beginth.',  damage:20, xp:10, morality:0 },
                { text:'Speak to the reflection',  type:'good',   effect:'It whispereth forgotten lore.',       bonus:{int:8}, xp:42, morality:0 },
                { text:'Drape it with a cloak',    type:'neutral',effect:'Out of sight, out of mind.',          xp:8, morality:0 }
            ]
        },
        {
            text:'Rain begins. Beneath a hollow oak thou findest crude shelter and a fire already lit.',
            options:[
                { text:'Rest by the fire',    type:'good',    effect:'Warmth restores thy vitality.',    bonus:{hp:25}, xp:28, morality:0 },
                { text:'Search the hollow',   type:'good',    effect:'A hermit\'s stash — potions!',      item:true, xp:32, morality:0 },
                { text:'Sleep in the rain',   type:'bad',     effect:'Hypothermia bites deep.',           damage:15, xp:10, morality:0 }
            ]
        },
        {
            text:'A vast spider-web blocks the path. Something large shifteth at its centre.',
            options:[
                { text:'Charge through',     type:'bad',    effect:'The spider descends! Thou art bitten.',    damage:32, xp:12, morality:0 },
                { text:'Burn the web',       type:'good',   effect:'The spider flees, leaving egg-sac treasure.', item:true, xp:35, morality:0 },
                { text:'Find a way around',  type:'neutral',effect:'An hour detour keeps thee unbitten.',        xp:10, morality:0 }
            ]
        },
        {
            text:'A child stands alone on a stump, singing a tuneless song.',
            options:[
                { text:'Approach and speak',    type:'bad',    effect:'It is a changeling. Its touch rotteth.',  damage:28, xp:8, morality:0 },
                { text:'Leave an offering',     type:'good',   effect:'The fey child gifts thee a blessing.',    bonus:{str:4,int:4}, xp:40, morality:+10 },
                { text:'Ignore the child',      type:'neutral',effect:'The singing fadeth as thou walkest on.',  xp:8, morality:-5 }
            ]
        },
        // ── 15 New Scenarios ────────────────────────────────────
        {
            text:'A dying bard sits propped against a tree, playing his last song. His eyes seek thine.',
            options:[
                { text:'Sit and listen until the end', type:'good',    effect:'His final verse granteth thee strange courage.', bonus:{cha:3,int:4}, xp:38, morality:+15 },
                { text:'Take his lute and move on',    type:'bad',     effect:'His curse follows thee — the lute plays itself!', damage:15, xp:18, morality:-20 },
                { text:'Leave a coin at his feet',     type:'neutral', effect:'A small kindness. The music fades.',              xp:15, morality:+8 }
            ]
        },
        {
            text:'A grove of glowing mushrooms lines the path. They pulse with an inner purple light.',
            options:[
                { text:'Eat a handful',               type:'bad',     effect:'Hallucinations overwhelm thy senses!',           damage:20, xp:15, morality:0 },
                { text:'Harvest them carefully',      type:'good',    effect:'An alchemist\'s treasure. A vial of healing.',    bonus:{hp:20}, item:true, xp:35, morality:0 },
                { text:'Admire them from a distance', type:'neutral', effect:'Their light guides thee safely through the dark.', xp:10, morality:0 }
            ]
        },
        {
            text:'A sacred pool glistens in a shaft of moonlight. Carvings of the Old Gods surround it.',
            options:[
                { text:'Bathe in the holy water',   type:'good',    effect:'Wounds close. Spirits lift.',           bonus:{hp:35,sta:2}, xp:40, morality:+15 },
                { text:'Defile the shrine',         type:'bad',     effect:'Divine wrath strikes thee down!',        damage:45, xp:5, morality:-30 },
                { text:'Kneel and pray in silence', type:'neutral', effect:'A sense of peace. Nothing more.',        xp:12, morality:+8 }
            ]
        },
        {
            text:'A travelling merchant with a loaded cart offereth his wares. His eyes dart too quickly.',
            options:[
                { text:'Buy his \'guaranteed\' cure-all', type:'bad',     effect:'Snake oil! Thou art swindled and poisoned.', damage:18, xp:12, morality:0 },
                { text:'Trade fairly for supplies',       type:'good',    effect:'Good quality rope and salves.',               item:true, xp:30, morality:+5 },
                { text:'Report him to nobody and pass',   type:'neutral', effect:'His cart rattles away into the mist.',        xp:8, morality:0 }
            ]
        },
        {
            text:'An old hermit emerges from a hollow log and offers thee a riddle. "Answer or suffer," he croaks.',
            options:[
                { text:'Answer boldly: "Shadow"',   type:'good',    effect:'Correct! He cackles and hands thee a trinket.', item:true, bonus:{int:3}, xp:38, morality:+5 },
                { text:'Strike him to silence him', type:'bad',     effect:'He was a forest spirit. His kin punish thee!',  damage:30, xp:8, morality:-25 },
                { text:'Pretend to ponder and flee',type:'neutral', effect:'His cackle follows thee for an hour.',          xp:8, morality:-5 }
            ]
        },
        {
            text:'Ruins of an old battlefield lie across the road. Rusted helms and splintered shields everywhere.',
            options:[
                { text:'Search the dead for valuables', type:'bad',     effect:'A restless spirit waketh!',            damage:22, xp:15, morality:-10 },
                { text:'Salvage a shield and honour the fallen', type:'good', effect:'Fine salvage and good karma.', item:true, xp:35, morality:+10 },
                { text:'Walk carefully through the carnage', type:'neutral', effect:'Thou passest without disturbing anything.', xp:10, morality:0 }
            ]
        },
        {
            text:'A locked iron door stands alone between two trees, with no wall attached to it.',
            options:[
                { text:'Pick the lock and open it',  type:'bad',     effect:'A portal swallows one of thine allies briefly!', damage:25, xp:18, morality:0 },
                { text:'Read the runes on the frame',type:'good',    effect:'Ancient ward dispelled. A key and a blessing.', item:true, bonus:{lck:3}, xp:40, morality:0 },
                { text:'Burn the door and leave',    type:'neutral', effect:'The flames reveal nothing. But thou feel safer.', xp:8, morality:0 }
            ]
        },
        {
            text:'Fireflies spelling words gather ahead: "TURN BACK" they form, then scatter.',
            options:[
                { text:'Heed the warning and detour', type:'good',    effect:'Thou avoidest a hidden ambush.',          bonus:{lck:2}, xp:28, morality:+5 },
                { text:'Press on regardless',         type:'bad',     effect:'Thou walkest directly into a snare.',     damage:28, xp:12, morality:0 },
                { text:'Wait for the fireflies to return', type:'neutral', effect:'They do not come back.',              xp:8, morality:0 }
            ]
        },
        {
            text:'A bridge is guarded by a toll-collector — a large toad-man in a too-small hat.',
            options:[
                { text:'Pay his toll (take 15 damage to purse, not body)', type:'neutral', effect:'He bows. The bridge is well-maintained.', xp:15, morality:+5 },
                { text:'Bribe him with a shiny item',  type:'good',    effect:'He accepts happily and waves thee through.', item:true, xp:25, morality:0 },
                { text:'Intimidate and push past',     type:'bad',     effect:'He was a retired wizard. He is not pleased.', damage:24, xp:12, morality:-15 }
            ]
        },
        {
            text:'Thou stumblest upon a plague-stricken cottage at the forest\'s edge. A survivor calls for aid.',
            options:[
                { text:'Enter and tend to the sick',    type:'good',    effect:'They bless thee with their last healing potion.', bonus:{hp:20,sta:2}, xp:40, morality:+20 },
                { text:'Burn the cottage (mercy or necessity?)', type:'bad', effect:'The ash spirit punisheth thee.',             damage:20, xp:10, morality:-10 },
                { text:'Leave food at the door and retreat', type:'neutral', effect:'The survivor calls out blessings to thy back.', xp:15, morality:+8 }
            ]
        },
        {
            text:'A crater of fresh impact steams with strange minerals. Something pulses beneath the surface.',
            options:[
                { text:'Dig into the crater',      type:'bad',     effect:'A void creature woke beneath the stone!',   damage:30, xp:15, morality:0 },
                { text:'Collect the outer crystals',type:'good',   effect:'Skystone shards, worth plenty to a sage.',   item:true, xp:38, morality:0 },
                { text:'Mark it on a mental map',  type:'neutral', effect:'Thou noteth the location for a later visit.', xp:10, morality:0 }
            ]
        },
        {
            text:'A giant spider\'s nest blocks the road. The eggs are strangely golden.',
            options:[
                { text:'Steal the golden eggs',    type:'bad',     effect:'The mother returns immediately.',            damage:35, xp:18, morality:-5 },
                { text:'Offer a trade — drop a weapon as decoy', type:'good', effect:'She takes the bait. The eggs yield silk armour.', item:true, xp:38, morality:0 },
                { text:'Burn the nest and run',    type:'neutral', effect:'The eggs pop spectacularly. Thou escapeth.',  xp:12, morality:0 }
            ]
        },
        {
            text:'An enchanted music box sits open on a mossy stone, playing a haunting melody on its own.',
            options:[
                { text:'Wind it further and listen', type:'good',   effect:'Thy fellowship is soothed and healed.',      bonus:{hp:20,cha:2}, xp:35, morality:+5 },
                { text:'Smash it',                   type:'bad',    effect:'The melody becomes a scream!',               damage:22, xp:8, morality:-8 },
                { text:'Take it (it never stops playing)', type:'neutral', effect:'The tune followeth thee for days.',    item:true, xp:20, morality:0 }
            ]
        },
        {
            text:'An old woman in black offers a bowl of soup outside her cottage. "For free," she says. "Always free."',
            options:[
                { text:'Accept the soup gratefully', type:'good',   effect:'Restorative broth! Strength returneth.',     bonus:{hp:30,sta:3}, xp:30, morality:+10 },
                { text:'Decline but ask her news',   type:'good',   effect:'She knows of a nearby cache of weapons.',    item:true, xp:25, morality:+5 },
                { text:'Suspect witchcraft and flee',type:'neutral',effect:'She calls after thee: "It was just soup."',  xp:8, morality:-5 }
            ]
        },
        {
            text:'A locked chest hangs from a tree by a chain. A note reads: "Honesty opens all locks."',
            options:[
                { text:'Confess thy greatest failing (honesty)', type:'good', effect:'The lock clicks open. Remarkable.', item:true, xp:45, morality:+15 },
                { text:'Lie loudly and try to pick it',          type:'bad',  effect:'The chain shocks thee.',            damage:20, xp:10, morality:-5 },
                { text:'Cut the tree down',                      type:'neutral', effect:'The chest falls but is already empty.', xp:8, morality:0 }
            ]
        },
        {
            text:'A cloaked figure at the crossroads offereth thee a choice: "Power, wisdom, or fortune?"',
            options:[
                { text:'Choose Power', type:'good',    effect:'A surge of battle-strength flows through thee.',      bonus:{str:6}, xp:40, morality:0 },
                { text:'Choose Wisdom',type:'good',    effect:'Thy mind sharpens like a new blade.',                 bonus:{int:6,cha:2}, xp:40, morality:+5 },
                { text:'Choose Fortune',type:'good',   effect:'Coins and a gleaming gem fall from the sky.',         item:true, bonus:{lck:3}, xp:40, morality:0 }
            ]
        },
    ],

    /* ═══════════════════════════════════════════════════════════
       UNEVENTFUL TURNS — peaceful walking events
       Three choices each: press on / rest / search
       ═══════════════════════════════════════════════════════════ */
    uneventfulEvents: [
        {
            text:'The path winds through a stand of ancient oaks. Shafts of pale light break the canopy. The wood is still.',
            pressOn:  'Thy fellowship strides onward in comfortable silence.',
            restFlavour: 'Thy fellowship rests beneath the oaks, breathing easier for it.',
            searchFlavour: 'Searching the old oaks...',
        },
        {
            text:'A cold stream crosseth the road. The water is clear, the stones smooth. Somewhere upstream, a waterfall murmurs.',
            pressOn:  'Thou crosseth the stream in good order and press on.',
            restFlavour: 'The cold water soothes tired muscles and cleans old wounds.',
            searchFlavour: 'Searching the stream banks...',
        },
        {
            text:'The canopy thickeneth until little light reacheth the ground. The underwood is dense and quiet. Spiders watch.',
            pressOn:  'Thou ducketh beneath branches and trudge onward.',
            restFlavour: 'Thy fellowship sits back-to-back in the dark and rests briefly.',
            searchFlavour: 'Searching the dense underwood...',
        },
        {
            text:'A morning mist descendeth through the trees, rendering everything pale and silent. Thy breath smoketh in the cold.',
            pressOn:  'Thou wades through the mist, compass in hand.',
            restFlavour: 'The mist is cool and restful. Thy fellowship breathes deeply.',
            searchFlavour: 'Searching the misty ground...',
        },
        {
            text:'Dusk cometh early beneath the boughs. The fellowship halts at a mossy clearing, the first open sky in hours.',
            pressOn:  'Thy fellowship agrees to press on by starlight.',
            restFlavour: 'Thy fellowship makes camp in the clearing. Sleep cometh easily.',
            searchFlavour: 'Searching the clearing\'s edge...',
        },
        {
            text:'Birdsong fills the canopy — dozens of species, a chorus of life entirely indifferent to thy struggle.',
            pressOn:  'The birdsong followeth thee down the trail.',
            restFlavour: 'The birdsong sootheth thy nerves. Thy fellowship rests listening.',
            searchFlavour: 'Searching the undergrowth for nests...',
        },
        {
            text:'The trail all but disappears beneath thick ferns and fallen branches. Thy fellowship musteth pick its way carefully.',
            pressOn:  'Slowly, stubbornly, thy fellowship forces through.',
            restFlavour: 'Thy fellowship stops and catches its breath in the ferns.',
            searchFlavour: 'Searching the overgrown trail...',
        },
        {
            text:'A wide valley openeth unexpectedly below thee — a sea of dark green reaching to distant grey peaks.',
            pressOn:  'The valley path is long but thy spirits are lifted by the view.',
            restFlavour: 'Thy fellowship sits at the valley rim and rests. The view maketh it worthwhile.',
            searchFlavour: 'Searching the valley ridge...',
        },
        {
            text:'Storm clouds gather to the north. A faint smell of lightning toucheth the air. The birds stop singing.',
            pressOn:  'Thy fellowship quickeneth its pace ahead of the weather.',
            restFlavour: 'Thy fellowship taketh shelter beneath an overhang. The storm passeth.',
            searchFlavour: 'Searching the stony shelter...',
        },
        {
            text:'The air smelleth of pine resin and cold earth. The silence is deep here — the true silence of a very old wood.',
            pressOn:  'Thy fellowship marcheth on, heartened by the clean air.',
            restFlavour: 'Thy fellowship rests in the old silence. Something about it healeth.',
            searchFlavour: 'Searching the ancient roots...',
        },
    ],

    /* ═══════════════════════════════════════════════════════════
       AMBIENT LINES — unchanged
       ═══════════════════════════════════════════════════════════ */
    ambience:[
        'The wind carryeth the scent of old ash and pine.',
        'Somewhere in the dark, an owl calleth twice and falleth silent.',
        'The path narrows. Roots curl across the stones like sleeping serpents.',
        'A distant bell tolls — though there is no church for a hundred leagues.',
        'The canopy closeth above like a cathedral of shadow.',
        'Mud suckleth at thy boots with each step deeper into the wood.',
        'Fireflies pulse in the bracken, cold and silent as dying stars.',
        'One of thy companions murmureth a prayer in their native tongue.',
        'The trees here are old. Very old. They remember things thou dost not.',
        'A cold mist riseth from the ground without cause.',
        'Thou passest a cairn of stones left by some prior traveller — long dead, no doubt.',
        'The bark of the oaks beareth claw marks, high up — very high up.',
        'Thy shadow seemeth slightly longer than it should be this hour.',
        'Something watcheth from the treeline. It doeth not follow. Yet.',
        'The road signs here have been deliberately turned the wrong way.',
        'A coin glints in the mud. Thou leavest it. Something about it feeleth wrong.',
        'The night birds stop singing all at once.',
        'An old boot hangeth from a branch above the path. Just one.',
        'Thy breath maketh no mist tonight, despite the cold.',
        'A faint sobbing cometh from somewhere below the roots.',
    ],

    healFlavors:[
        '{name} applies a poultice of moonwort and breathes easier.',
        '{name} murmurs a minor healing cantrip beneath their breath.',
        '{name} binds wounds with herbs gathered from the roadside.',
        'A warm forest breeze carries gentle healing magic to {name}.',
        '{name} drinks from an old vial of green tincture found earlier.',
        '{name} tears strips from their cloak and tends to a wound.',
        'The Old Gods see fit to mend {name}\'s wounds.',
        '{name} splashes cold stream water over a gash — it cleans it well enough.',
    ],

    treasuryFlavors:[
        'Amidst the mud thou discoverest a leather pouch — heavy with coin.',
        'A dead bandit nearby yieldeth a coin purse worth looting.',
        'Half-buried under a root: a small casket of silver and gems.',
        'A dislodged flagstone revealeth a hoard left by some long-dead traveller.',
        'The shattered remains of a merchant\'s cart contain scattered valuables.',
        'A hollow tree yields a secret cache of gold dust and uncut gemstones.',
        'Thou dost stumble upon the remnants of an old shrine — offerings still gleam.',
    ],

    victoryLines:[
        'The far shore receiveth thee. Behind thee, the wood closeth like a wound.',
        'Bards shall sing of this crossing — or wouldst thou prefer they did not?',
        'The Old Gods nod in approval. The Darkwood hath been cheated of its due.',
        'Thou emergeth scarred, diminished, and utterly alive.',
        'The far village sees thy fellowship emerge and whispers: impossible.',
    ],
    defeatLines:[
        'The Darkwood consumeth all, in time.',
        'Thy bones join the many others that line the ancient roots.',
        'The trees do not mourn thee. They never do.',
        'Another fellowship enters the wood. They do not find what thou hast left behind.',
        'In a hundred years, children shall be warned not to enter the wood. They shall not know thy name.',
    ],
};
