/**
 * DATA.JS — The Great Compendium of Norrtounia  v0.8
 * ─────────────────────────────────────────────────────────────────
 * New in v0.8:
 *  • CHA / STA / LCK on all races and classes
 *  • Race resistances (DnD-lore-friendly)
 *  • Class leadership, moralityStart, abilities[] (2 per class)
 *  • GENDER_MOD applied in game.js makeHero()
 *  • Stat-gated bonus options on ~20 scenarios
 *  • 10 uneventful turn events
 * ─────────────────────────────────────────────────────────────────
 */

const DAMAGE_TYPES = {
    physical: { color:'#c8c0b0', label:'physical',  alignment:'neutral' },
    slashing: { color:'#c8c0b0', label:'slashing',  alignment:'neutral' },
    piercing: { color:'#d4c890', label:'piercing',  alignment:'neutral' },
    fire:     { color:'#ff7733', label:'fire',       alignment:'neutral' },
    lightning:{ color:'#ffe033', label:'lightning',  alignment:'neutral' },
    frost:    { color:'#88eeff', label:'frost',      alignment:'neutral' },
    poison:   { color:'#6abf45', label:'poison',     alignment:'evil'    },
    nature:   { color:'#5caa30', label:'nature',     alignment:'neutral' },
    shadow:   { color:'#b47afe', label:'shadow',     alignment:'evil'    },
    necrotic: { color:'#cc44ff', label:'necrotic',   alignment:'evil'    },
    void:     { color:'#7755dd', label:'void',       alignment:'evil'    },
    holy:     { color:'#ffd700', label:'holy',       alignment:'good'    },
    arcane:   { color:'#5bc8fa', label:'arcane',     alignment:'neutral' },
    psychic:  { color:'#e879f9', label:'psychic',    alignment:'neutral' },
    blood:    { color:'#cc2222', label:'blood',      alignment:'evil'    },
};

const GENDER_MOD = {
    male:   { str:+1, cha:-1, sta:+1, lck: 0 },
    female: { str:-1, cha:+1, sta: 0, lck:+1 },
};


const GENDER_LORE={
    0: 'Male heroes gain slight advantages in strength and stamina, tempered by lower charisma. Long celebrated in warrior cultures for physical endurance — though this has led to some celebrated catastrophes.',
    1: 'Female heroes gain natural charisma and luck, with marginally less raw strength. Frequently underestimated by enemies, rivals, and employers. This is rarely a mistake anyone makes twice.',
};
const GAME_DATA = {

    races: [
        {
            name:'High Elf', lore:'Born into centuries of existence, High Elves were shaping arcane lore before humans learned written language. Their courts shimmer with magic and cold condescension. Every one is a master of something. Most are insufferable about it.', icon:'🧝', hp:45, str:8, int:18, dex:14, cha:14, sta:10, lck:10,
            resistances:{ psychic:15, nature:10, shadow:-5 },
            names:['Aelthas','Baelin','Caelum','Dagoron','Elowen','Faelar','Galanis','Hareth','Ielenia','Kaelen','Luthien','Miravel','Naerth','Orophin','Phaedel','Quelen','Rilven','Saelihn','Thalanil','Uialen','Vanyar','Yvraine','Zalthar','Aerith','Eldrin','Loralai','Tauriel','Fingon','Turgon','Finrod','Amroth','Celeborn','Galadriel','Glorfindel','Haldir','Idril','Maeglin','Nimrodel','Olwe','Voronwe','Celebrimbor','Ecthelion','Aredhel','Anaire','Nerdanel','Elenwë','Indis','Earwen','Melian','Lúthien']
        },
        {
            name:'Wood Elf', lore:'The elves who never left the ancient groves. Swift as startled deer, silent as moss, and deadlier than either. They trust a drawn bowstring more than any wall or any promise ever made.', icon:'🏹', hp:50, str:11, int:14, dex:16, cha:12, sta:11, lck:11,
            resistances:{ nature:20, poison:10, fire:-5 },
            names:['Sylvar','Arannis','Briavel','Celorn','Daeris','Elvanna','Ferith','Galadrel','Haeven','Ilphas','Jaroviel','Karith','Lirien','Maevis','Nyreth','Olindel','Pyriel','Quellis','Rhovar','Sethiel','Tarvinh','Ulavar','Verathos','Wylaen','Xylara','Yaraliel','Zarevith','Aravel','Belanis','Caelar','Daevish','Elovar','Farindel','Gavrial','Haevar','Ilyvar','Jenthar','Kaelar','Leothil','Miravar']
        },
        {
            name:'Mountain Dwarf', lore:'Carved from the bones of the world, Mountain Dwarves are as immovable as the stone they mine. Centuries of war with deep-dwelling horrors have made them fierce, methodical, and completely unforgiving.', icon:'⛏️', hp:80, str:17, int:7, dex:5, cha:7, sta:17, lck:8,
            resistances:{ poison:20, physical:10, fire:5, frost:10, psychic:-5 },
            names:['Bordin','Dwalin','Eitri','Farin','Gimli','Hadhod','Isen','Jari','Kili','Loni','Morni','Nori','Oin','Pori','Rumni','Stari','Thrain','Ufar','Vili','Ymir','Gloin','Thorin','Balin','Bifur','Bofur','Bombur','Dain','Fundin','Durin','Telchar','Azaghal','Gamil','Narvi','Harbek','Thuradin','Brottor','Bromm','Dagnath','Gromnir','Halvar']
        },
        {
            name:'Hill Dwarf', lore:'More worldly than their mountain kin, Hill Dwarves run trading routes, breweries, and mercenary companies. They still hit exactly as hard. They simply charge for it.', icon:'🛡️', hp:70, str:15, int:10, dex:7, cha:8, sta:15, lck:9,
            resistances:{ poison:15, physical:5, frost:5 },
            names:['Aldrek','Brundir','Corvis','Delvak','Elmar','Foldur','Grundar','Hordar','Ingvar','Jorvak','Kramdur','Longrin','Mordak','Naldrin','Ordak','Peldur','Rudvak','Skordak','Torvik','Ulmar','Vigdar','Woldak','Alvrik','Bekdar','Comdak','Drolvak','Eldvar','Folvak','Goldar','Heldrak']
        },
        {
            name:'Orc', lore:'Shaped by generations of war. Orc culture values strength as the only honest currency. They have shattered armies and toppled kingdoms. They do not apologise for this.', icon:'💢', hp:95, str:20, int:4, dex:6, cha:5, sta:16, lck:7,
            resistances:{ physical:15, poison:10, holy:-15, psychic:-10 },
            names:['Azog','Bolg','Dush','Grom','Holg','Ishka','Jugg','Korg','Lugg','Morg','Nug','Ogg','Pug','Rorg','Throk','Ufthak','Vorg','Yug','Gothmog','Ugluk','Shagrat','Gorbag','Mauhur','Lagduf','Muzgash','Radbug','Orgrim','Durotan','Garrosh','Kargath','Kilrogg','Varok','Grommash','Saurfang','Gordul','Kraghur','Mulgrak','Nazdrek','Orgrak','Pushdug']
        },
        {
            name:'Half-Orc', lore:'Two bloods, two worlds, belonging fully to neither. Half-Orcs inherit orcish ferocity and human cunning — a combination that makes them invaluable companions and terrible enemies.', icon:'⚔️', hp:75, str:18, int:8, dex:8, cha:7, sta:14, lck:8,
            resistances:{ physical:10, poison:5 },
            names:['Gothrak','Halvrek','Jorgak','Keldrath','Largor','Malgrim','Nargor','Olgrak','Peldrath','Quelgrak','Ragnak','Seldrak','Tholgrak','Uglrim','Veldrak','Worgak','Ardrak','Belgor','Cruldak','Drolgak']
        },
        {
            name:'Human', lore:'Short-lived, relentlessly ambitious, and staggeringly adaptable. Humans founded more civilisations, started more wars, and died more heroically than any other race. Whether this is admirable is a matter of ongoing debate.', icon:'🗡️', hp:65, str:13, int:13, dex:11, cha:12, sta:12, lck:11,
            resistances:{},
            names:['Alaric','Beorn','Cedric','Dara','Edric','Faramir','Goran','Hilda','Ivar','Jora','Kael','Leif','Marek','Nesta','Oswin','Piers','Quinn','Rowan','Sigrid','Tyra','Aragorn','Boromir','Eomer','Theoden','Elendil','Bard','Brand','Godric','Osric','Wulfric','Aldred','Cuthbert','Dunstan','Eadwig','Hereward','Frideswide','Gisela','Ingrid','Jorunn','Lothar']
        },
        {
            name:'Halfling', lore:'Barely three feet tall, constitutionally incapable of walking past an adventure without joining it, and statistically improbable in their survival rate. Scholars cannot explain Halfling luck. Halflings do not try.', icon:'🍀', hp:55, str:9, int:15, dex:15, cha:14, sta:10, lck:16,
            resistances:{ psychic:10, shadow:5 },
            names:['Adalbert','Binbo','Clovis','Drogo','Esme','Falco','Gundabald','Hilda','Isembold','Jago','Kira','Lotho','Mira','Nob','Odo','Pearl','Rufus','Saradas','Tanta','Urco','Andwise','Bandobras','Camellia','Daisy','Estella','Griffo','Hamfast','Largo','Merimas','Rosie']
        },
        {
            name:'Gnome', lore:'Ancient beyond reckoning and curious about everything. Gnomes invented entire fields of study, lost interest, and moved on. Their absentmindedness hides formidable magical talent.', icon:'🔮', hp:48, str:7, int:19, dex:13, cha:12, sta:9, lck:13,
            resistances:{ arcane:15, lightning:10, poison:5, psychic:5 },
            names:['Alston','Boddynock','Dimble','Eldon','Frug','Gerbo','Gimble','Glim','Jebeddo','Kellen','Namfoodle','Orryn','Roondar','Seebo','Sindri','Tock','Warryn','Wrenn','Zook','Alvo','Bimpnottin','Chatterfang','Duvamil','Erky','Fonkin','Glinnen','Nissa','Orlan','Quellyn','Solia']
        },
        {
            name:'Tiefling', lore:'Carrying infernal heritage written in horns and ember-eyes, Tieflings are met with suspicion wherever they travel. Most spend their lives either earning trust — or proving the fear justified.', icon:'😈', hp:58, str:12, int:16, dex:12, cha:13, sta:12, lck:9,
            resistances:{ fire:20, shadow:10, frost:-10, holy:-5 },
            names:['Akmenos','Amnon','Barakas','Damakos','Ekemon','Iados','Kairon','Leucis','Melech','Mordai','Morthos','Pelaios','Skamos','Therai','Vivex','Alyma','Brynn','Criella','Damaia','Kallista','Lerissa','Makaria','Nemeia','Orianna','Phelaia','Rieta','Tanis','Ulele','Vena','Zhara']
        },
    ],

    classes: [
        { name:'Knight', lore:'Armoured champions sworn to a code and a liege. Their honour is genuine — and their blade enforces it without hesitation or apology.',       hpB:25,  strB:6,  intB:0,  dexB:-2, chaB:2,  staB:4,  lckB:0,  leadership:15, moralityStart:10,  primaryStat:'str', damageType:'slashing',  attackNames:['Blade Strike','Shield Bash','Charging Cleave','Valiant Blow','Knight\'s Judgment'],       abilities:[{id:'shield_wall',  name:'Shield Wall',   desc:'Absorb next monster hit completely',         cooldown:3},{id:'rallying_cry', name:'Rallying Cry',  desc:'Heal all allies for 12% of their max HP',    cooldown:4}] },
        { name:'Wizard', lore:'Decades of study compressed into formulas that can unmake the world. Fragile, arrogant, and extraordinarily dangerous. Mostly to others.',       hpB:-15, strB:0,  intB:12, dexB:0,  chaB:0,  staB:-2, lckB:2,  leadership:10, moralityStart:0,   primaryStat:'int', damageType:'frost',     attackNames:['Frost Bolt','Ice Lance','Glacial Ray','Winter\'s Grasp','Arcane Freeze'],         abilities:[{id:'frost_nova',   name:'Frost Nova',    desc:'Monster skips next 2 turns (frozen)',         cooldown:5},{id:'arcane_surge', name:'Arcane Surge',  desc:'3× damage — 20% HP recoil to self',          cooldown:4}] },
        { name:'Rogue', lore:'Experts in ending things quietly. They prefer shadows, gaps in armour, and clean exits over any form of direct confrontation.',        hpB:5,   strB:3,  intB:4,  dexB:6,  chaB:1,  staB:0,  lckB:5,  leadership:7,  moralityStart:-5,  primaryStat:'dex', damageType:'piercing',  attackNames:['Backstab','Venomous Strike','Shadow Jab','Evasive Lunge','Crippling Slash'],      abilities:[{id:'backstab',     name:'Backstab',      desc:'2.5× dmg if monster attacked last round',    cooldown:2},{id:'vanish',       name:'Vanish',         desc:'Guaranteed escape — no roll needed',          cooldown:6}] },
        { name:'Cleric', lore:'A conduit for divine will. Clerics heal with one hand and smite with the other, with equal sincerity in both. Their god is watching. Always.',       hpB:15,  strB:1,  intB:7,  dexB:0,  chaB:4,  staB:3,  lckB:1,  leadership:13, moralityStart:20,  primaryStat:'int', damageType:'holy',      attackNames:['Sacred Flame','Divine Smite','Radiant Strike','Blessed Blow','Holy Rebuke'],        abilities:[{id:'divine_heal',  name:'Divine Heal',   desc:'Heal most wounded ally for 35% max HP',       cooldown:3},{id:'turn_undead',  name:'Turn Undead',    desc:'+200% vs undead, or stun non-undead 1 turn',  cooldown:4}] },
        { name:'Barbarian', lore:'Rage is not a flaw. In the right hands it is a weapon sharper than any blade ever forged. The right hands are usually covered in someone else\'s blood.',    hpB:40,  strB:10, intB:-6, dexB:-1, chaB:-2, staB:6,  lckB:0,  leadership:9,  moralityStart:-5,  primaryStat:'str', damageType:'physical',  attackNames:['Reckless Strike','Frenzy','Cleave','Blood Rage','Primal Roar'],                   abilities:[{id:'rage',         name:'Rage',           desc:'+70% damage for 3 rounds',                    cooldown:5},{id:'reckless_atk',name:'Reckless Attack',desc:'2× damage this hit',                          cooldown:2}] },
        { name:'Paladin', lore:'Bound by sacred oath to stand between darkness and the innocent. The most dangerous thing in any forest is a Paladin who has found something worth dying for.',      hpB:20,  strB:4,  intB:4,  dexB:1,  chaB:6,  staB:4,  lckB:2,  leadership:18, moralityStart:25,  primaryStat:'str', damageType:'holy',      attackNames:['Smite Evil','Holy Strike','Aura of Justice','Crusader\'s Blow','Lay on Smite'],    abilities:[{id:'lay_on_hands', name:'Lay on Hands',  desc:'Fully heal dying ally; else heal self 40%',   cooldown:5},{id:'divine_smite', name:'Divine Smite',   desc:'2× holy (+50% vs evil monsters)',              cooldown:3}] },
        { name:'Druid', lore:'Nature does not negotiate. Neither do its priests. They are the teeth and the roots and the slow inevitable patience of the living world.',        hpB:10,  strB:2,  intB:8,  dexB:2,  chaB:2,  staB:3,  lckB:3,  leadership:12, moralityStart:15,  primaryStat:'int', damageType:'nature',    attackNames:['Thorn Whip','Entangle','Nature\'s Wrath','Wild Strike','Barkskin Lash'],         abilities:[{id:'entangle',     name:'Entangle',      desc:'Monster rooted — skips 2 turns',              cooldown:4},{id:'regrowth',     name:'Regrowth',       desc:'Apply regen to ally: 8% HP/round × 3 rounds', cooldown:4}] },
        { name:'Ranger', lore:'Tracker, hunter, wilderness survivor. The forest is their kingdom and every creature in it is known to them. Some of those creatures owe them favours.',       hpB:12,  strB:5,  intB:3,  dexB:5,  chaB:1,  staB:2,  lckB:4,  leadership:11, moralityStart:5,   primaryStat:'dex', damageType:'piercing',  attackNames:['Precise Shot','Hunter\'s Mark','Arrow Volley','Pinning Strike','Quivering Palm'], abilities:[{id:'hunters_mark', name:'Hunter\'s Mark', desc:'+60% damage for next 3 attacks',               cooldown:4},{id:'distracting_shot',name:'Distracting Shot',desc:'Monster skips its next action',             cooldown:3}] },
        { name:'Bard', lore:'Every tavern needs one. Every battle benefits from one more. Bards weave tales and spells with equal facility and approximately equal reliability.',         hpB:0,   strB:2,  intB:10, dexB:3,  chaB:7,  staB:0,  lckB:4,  leadership:14, moralityStart:5,   primaryStat:'int', damageType:'psychic',   attackNames:['Vicious Mockery','Dissonant Whispers','Psychic Lash','Cacophony','Word of Ruin'],  abilities:[{id:'inspire',      name:'Inspire',        desc:'Next ally\'s attack deals 2× damage',          cooldown:3},{id:'dirge',        name:'Dirge of Ruin',  desc:'Monster −35% attack for 3 rounds',             cooldown:4}] },
        { name:'Sorcerer', lore:'Magic runs in their blood, inherited rather than learned. They burn brighter than Wizards, with correspondingly less control and considerably more collateral damage.',     hpB:-10, strB:0,  intB:14, dexB:1,  chaB:2,  staB:-1, lckB:2,  leadership:9,  moralityStart:0,   primaryStat:'int', damageType:'lightning', attackNames:['Lightning Bolt','Chain Lightning','Arc Flash','Thunder Clap','Surge Strike'],      abilities:[{id:'chain_lightning',name:'Chain Lightning',desc:'2.5× lightning damage',                     cooldown:4},{id:'wild_magic',   name:'Wild Magic Surge',desc:'Random effect — powerful but unpredictable',   cooldown:3}] },
        { name:'Warlock', lore:'Power bargained from a patron who asks very little upfront and remembers everything owed. The price is rarely worth it. They pay it anyway and ask for more.',      hpB:5,   strB:1,  intB:11, dexB:2,  chaB:3,  staB:1,  lckB:1,  leadership:8,  moralityStart:-10, primaryStat:'int', damageType:'shadow',    attackNames:['Eldritch Blast','Hex','Shadow Bolt','Void Curse','Dark Pact Strike'],            abilities:[{id:'hex',          name:'Hex',             desc:'Monster −20% attack for 3 rounds',             cooldown:3},{id:'pact_of_blood',name:'Pact of Blood',   desc:'Spend 20% HP for 3× damage',                  cooldown:3}] },
        { name:'Monk', lore:'The body is a weapon. Monks spend a lifetime making it sharper than any steel and more patient than any stone. They are rarely in a hurry.',         hpB:18,  strB:7,  intB:2,  dexB:5,  chaB:2,  staB:4,  lckB:2,  leadership:10, moralityStart:15,  primaryStat:'dex', damageType:'physical',  attackNames:['Flurry of Blows','Ki Strike','Stunning Strike','Iron Fist','Open Hand Blow'],     abilities:[{id:'flurry',       name:'Flurry of Blows',desc:'3 strikes at 55% power each',                 cooldown:2},{id:'ki_block',     name:'Ki Block',       desc:'Cancel monster\'s next attack entirely',       cooldown:4}] },
        { name:'Fighter', lore:'No spell, no divine patron, no ancestral power. Just a person who is exceptionally skilled at not dying and making others do it instead.',      hpB:22,  strB:8,  intB:-2, dexB:1,  chaB:0,  staB:5,  lckB:0,  leadership:12, moralityStart:0,   primaryStat:'str', damageType:'slashing',  attackNames:['Precise Strike','Whirlwind','Battle Cry Slash','Riposte','Second Wind Blow'],      abilities:[{id:'second_wind',  name:'Second Wind',    desc:'Heal self for 20% max HP',                     cooldown:3},{id:'action_surge', name:'Action Surge',   desc:'Attack twice this turn at full power',         cooldown:4}] },
        { name:'Necromancer', lore:'The line between life and death is not a wall — it is a door. Necromancers hold the key and charge admission. The dead find this arrangement agreeable.',  hpB:-5,  strB:-1, intB:15, dexB:0,  chaB:-1, staB:0,  lckB:0,  leadership:7,  moralityStart:-20, primaryStat:'int', damageType:'necrotic',  attackNames:['Death Bolt','Soul Drain','Bone Spear','Wither','Grave Chill'],                   abilities:[{id:'undead_barrier',name:'Undead Barrier', desc:'Absorb the next monster hit entirely',         cooldown:4},{id:'wither',       name:'Wither',         desc:'−30% monster attack + 1.5× necrotic hit',     cooldown:3}] },
        { name:'Pyromancer', lore:'Some inherit fire in the blood. Others court it deliberately. Both find it impossible to put down once begun. The scorched landscape follows them everywhere.',   hpB:-5,  strB:0,  intB:10, dexB:0,  chaB:0,  staB:0,  lckB:1,  leadership:8,  moralityStart:-5,  primaryStat:'int', damageType:'fire',      attackNames:['Fireball','Flame Strike','Inferno Burst','Scorch','Magma Wave'],                  abilities:[{id:'combustion',   name:'Combustion',     desc:'Prime: next attack deals 3× damage',           cooldown:2},{id:'inferno_dot',  name:'Inferno',        desc:'20 fire damage per round for 3 rounds',        cooldown:4}] },
        { name:'Dark Rogue', lore:'A Rogue who discovered that shadow and poison complement each other perfectly and has since refined both arts to a professional standard.',   hpB:3,   strB:2,  intB:2,  dexB:7,  chaB:1,  staB:-1, lckB:6,  leadership:6,  moralityStart:-15, primaryStat:'dex', damageType:'poison',    attackNames:['Poisoned Blade','Shadow Mark','Venom Slash','Toxic Jab','Lethal Mist'],         abilities:[{id:'poison_blade', name:'Poison Blade',   desc:'18 poison damage per round for 3 rounds',      cooldown:3},{id:'smoke_bomb',   name:'Smoke Bomb',     desc:'Monster blinded — next attack misses',         cooldown:3}] },
        { name:'Blood Knight', lore:'Warriors who realised that suffering — their own and their enemies\' — makes excellent fuel for something terrible and effective.', hpB:30,  strB:7,  intB:-3, dexB:-1, chaB:-1, staB:5,  lckB:0,  leadership:9,  moralityStart:-15, primaryStat:'str', damageType:'blood',     attackNames:['Blood Slash','Crimson Cleave','Hemorrhage','Life Drain','Sanguine Fury'],       abilities:[{id:'life_drain',   name:'Life Drain',     desc:'Deal damage and steal 60% back as HP',         cooldown:3},{id:'blood_surge',  name:'Blood Surge',    desc:'Sacrifice 25% HP for 2.5× damage',             cooldown:3}] },
        { name:'Arcane Archer', lore:'A rare tradition of weaving spellwork directly into each arrow. Extremely precise. Extremely lethal. Takes years to master and moments to demonstrate.',hpB:8,   strB:2,  intB:5,  dexB:5,  chaB:1,  staB:1,  lckB:4,  leadership:10, moralityStart:0,   primaryStat:'dex', damageType:'arcane',    attackNames:['Magic Arrow','Arcane Shot','Seeking Bolt','Phase Pierce','Runic Arrow'],        abilities:[{id:'arcane_pierce',name:'Arcane Pierce',  desc:'This hit ignores all monster resistance',      cooldown:3},{id:'volley',       name:'Arrow Volley',   desc:'Two arrows at 75% power each',                cooldown:3}] },
        { name:'Shaman', lore:'The boundary between the living and ancestor spirits is thin for Shamans. They call across it freely, and something always answers. Not always what was summoned.',       hpB:5,   strB:2,  intB:9,  dexB:2,  chaB:3,  staB:2,  lckB:3,  leadership:13, moralityStart:10,  primaryStat:'int', damageType:'lightning', attackNames:['Spirit Strike','Lightning Totem','Storm Call','Thunder Axe','Ancestor\'s Wrath'],  abilities:[{id:'spirit_totem', name:'Spirit Totem',   desc:'Party heals 10 HP each round for 2 rounds',    cooldown:4},{id:'thunder_axe',  name:'Thunder Axe',    desc:'2.5× lightning damage',                        cooldown:3}] },
        { name:'Templar', lore:'Holy soldiers of a militant religious order. Their faith is a shield. Their conviction is a sword. Their certainty makes them terrifying to stand against.',      hpB:22,  strB:5,  intB:4,  dexB:1,  chaB:5,  staB:4,  lckB:1,  leadership:16, moralityStart:20,  primaryStat:'str', damageType:'holy',      attackNames:['Holy Wrath','Sacred Blade','Divine Judgment','Righteous Fury','Inquisitor\'s Strike'], abilities:[{id:'holy_aegis',  name:'Holy Aegis',     desc:'Whole party shielded — all absorb 1 hit',      cooldown:4},{id:'judgment',      name:'Judgment',       desc:'Mark monster: +100% vs evil, +50% vs neutral',cooldown:3}] },
        { name:'Shadow Dancer', lore:'Combat is a dance. Shadow Dancers simply choose a partner that nobody else can see, hear, or touch until it is already too late.',hpB:2,   strB:1,  intB:3,  dexB:8,  chaB:2,  staB:0,  lckB:5,  leadership:7,  moralityStart:-10, primaryStat:'dex', damageType:'shadow',    attackNames:['Shadow Step','Umbral Slash','Phantom Strike','Darkness Waltz','Eclipse Blade'], abilities:[{id:'shadow_step',  name:'Shadow Step',    desc:'Dodge next hit then counter at 1.5×',          cooldown:3},{id:'eclipse',       name:'Eclipse',        desc:'Monster −40% attack for 2 rounds',             cooldown:4}] },
        { name:'Void Walker', lore:'There is something deeply wrong with Void Walkers. This was true before the void. The void simply made it legible to others.',  hpB:-8,  strB:0,  intB:13, dexB:2,  chaB:-2, staB:0,  lckB:1,  leadership:6,  moralityStart:-15, primaryStat:'int', damageType:'void',      attackNames:['Void Rend','Reality Tear','Annihilate','Entropy Blast','Null Strike'],           abilities:[{id:'reality_tear', name:'Reality Tear',   desc:'Nullify monster resistances for entire battle',cooldown:4},{id:'phase_shift',   name:'Phase Shift',    desc:'Untargetable for 2 rounds',                    cooldown:5}] },
        { name:'Battle Mage', lore:'What happens when a soldier refuses to give up the sword but adds fire to it anyway. Effective at close range. Dangerous to stand near regardless of whose side you are on.',  hpB:15,  strB:5,  intB:7,  dexB:2,  chaB:0,  staB:2,  lckB:1,  leadership:11, moralityStart:0,   primaryStat:'str', damageType:'fire',      attackNames:['Flaming Blade','Fire Slash','Burning Strike','Magma Fist','Ember Cleave'],      abilities:[{id:'burning_weapon',name:'Burning Weapon',desc:'+35% fire damage for next 3 attacks',          cooldown:3},{id:'arcane_armor',  name:'Arcane Armour',  desc:'Absorb next monster hit',                      cooldown:3}] },
        { name:'Warden', lore:'Ancient guardians of old-growth forests, bound to territories they defend with primal ferocity and an intimate knowledge of every root and shadow within them.',       hpB:10,  strB:3,  intB:6,  dexB:4,  chaB:2,  staB:3,  lckB:3,  leadership:13, moralityStart:15,  primaryStat:'dex', damageType:'nature',    attackNames:['Thornbind','Barkskin Slash','Vine Whip','Nature\'s Fury','Root Strike'],         abilities:[{id:'natures_grasp',name:'Nature\'s Grasp',desc:'Monster −35% attack for 2 rounds',             cooldown:3},{id:'barkskin',      name:'Barkskin',       desc:'All allies gain +20 temporary HP',              cooldown:4}] },
    ],

    items: [
        { name:'Ancient Blade',          stat:'str', val:6  },
        { name:'Dragon-bone Axe',        stat:'str', val:14 },
        { name:'Ogre-Slayer Mace',       stat:'str', val:9  },
        { name:'Gauntlets of Might',     stat:'str', val:5  },
        { name:'Iron-Forged Claymore',   stat:'str', val:11 },
        { name:'Rusty War-Pick',         stat:'str', val:3  },
        { name:'Executioner\'s Sword',   stat:'str', val:15 },
        { name:'Berserker\'s Chain',     stat:'str', val:8  },
        { name:'Blade of the Fallen',    stat:'str', val:12 },
        { name:'Runecarved Axe',         stat:'str', val:10 },
        { name:'Staff of Galdor',        stat:'int', val:7  },
        { name:'Amulet of Kings',        stat:'int', val:9  },
        { name:'Scroll of Infinite Sky', stat:'int', val:4  },
        { name:'Grimoire of Shadows',    stat:'int', val:12 },
        { name:'Sage\'s Crystal Orb',    stat:'int', val:10 },
        { name:'Crown of the Magi',      stat:'int', val:13 },
        { name:'Tome of the Astral Sea', stat:'int', val:8  },
        { name:'Seer\'s Circlet',        stat:'int', val:11 },
        { name:'Midnight Codex',         stat:'int', val:14 },
        { name:'Swift Boots',            stat:'dex', val:7  },
        { name:'Shadow Gloves',          stat:'dex', val:5  },
        { name:'Elven Quiver',           stat:'dex', val:9  },
        { name:'Shadowstep Ring',        stat:'dex', val:6  },
        { name:'Acrobat\'s Sash',        stat:'dex', val:8  },
        { name:'Phantom Blade',          stat:'dex', val:11 },
        { name:'Viper Fang Shiv',        stat:'dex', val:10 },
        { name:'Mithril Vest',           stat:'hp',  val:35 },
        { name:'Shield of Aegis',        stat:'hp',  val:25 },
        { name:'Cured Leather Tunic',    stat:'hp',  val:10 },
        { name:'Enchanted Cloak',        stat:'hp',  val:15 },
        { name:'Ring of Regeneration',   stat:'hp',  val:20 },
        { name:'Plate of the Fallen',    stat:'hp',  val:40 },
        { name:'Belt of Giant Strength', stat:'hp',  val:30 },
        { name:'Stone-Skin Salve',       stat:'hp',  val:18 },
        { name:'Dragonscale Cape',       stat:'hp',  val:32 },
        { name:'Helm of the Bulwark',    stat:'hp',  val:20 },
        { name:'Blessed Bandages',       stat:'hp',  val:12 },
    ],

    monsters: [
        { name:'Fell Wolf',         icon:'🐺', lore:'A wolf touched by dark magic. Larger than natural, impossibly silent, with eyes that burn at the back of the darkness. Hunters who tracked one rarely returned to describe it.', hp: 40, str: 8,  loot:0.20, xpValue: 35, taunts:['A low growl echoes through the pines.','It circles thee slowly.'] },
        { name:'Forest Wraith',     icon:'☠️', lore:'The restless dead of those who died lost in the wood. They wander still, looking for a way out they will never find. Cold air and whispered voices announce their presence.', hp: 55, str:12,  loot:0.35, xpValue: 50, undead:true, taunts:['A cold whisper: "Join us..."','The air temperature droppeth sharply.'] },
        { name:'Cave Bat Swarm',    icon:'🦇', lore:'Individually harmless. In swarms of hundreds, they strip flesh from bone before you can swing twice. The sound alone has broken soldiers.', hp: 20, str: 5,  loot:0.10, xpValue: 25 },
        { name:'Shadow Stalker',    icon:'👤', lore:'Something that moves where there is no light to cast a shadow. Those who have seen its face have not described it. Those who have not seen it have simply not looked behind them yet.', hp: 60, str:14,  loot:0.30, xpValue: 55, taunts:['It moveth without sound.'] },
        { name:'Twisted Ent',       icon:'🌲', lore:'A tree-spirit warped by old dark magic into something that hates. Slowly. Implacably. It does not chase. It does not need to. You are already within its reach.', hp: 85, str:11,  loot:0.45, xpValue: 50, taunts:['The trees... move.'] },
        { name:'Skeleton Sentry',   icon:'💀', lore:'The bones of an old war still keeping their post. They have no eyes. They still find you. Some stand where they fell centuries ago, still at attention.', hp: 35, str: 9,  loot:0.20, xpValue: 35, undead:true, taunts:['Bones rattle in the silence.'] },
        { name:'Poisonous Adder',   icon:'🐍', lore:'A viper large enough to swallow a halfling whole. Its venom induces vivid hallucinations before it causes death. Some victims have been found laughing.', hp: 25, str:15,  loot:0.15, xpValue: 45 },
        { name:'Grave Ghoul',       icon:'🧟', lore:'Flesh-eaters drawn to battlefields and graveyards. They smell the dying from miles away and come quickly. Their hands are stronger than they look.', hp: 55, str:13,  loot:0.40, xpValue: 50, undead:true, taunts:['It sniffs the air... hungrily.'] },
        { name:'Goblin Pack',       icon:'👺', lore:'Individually cowardly and incompetent. In numbers, emboldened by each other\'s presence to commit terrible acts. They will retreat the moment it turns against them, and return when it does not.', hp: 30, str: 7,  loot:0.25, xpValue: 30, taunts:['\'Give us your shinies!\''] },
        { name:'Bog Hag',           icon:'🧌', lore:'An ancient creature of curse and glamour who appears differently to each visitor — always appealing, always wrong. She has been offering trades in this forest for longer than the forest has had a name.', hp: 50, str:16,  loot:0.50, xpValue: 60, boon:{int:3}, taunts:['\'Pretty travellers... come closer.\''] },
        { name:'Stone Gargoyle',    icon:'🗿', lore:'Guardian statues animated by old ward-magic. They were created to protect something. They have forgotten what. Only the guarding remains, and the destroying of those who come too close.', hp: 70, str:14,  loot:0.35, xpValue: 55 },
        { name:'Bandit Swordsman',  icon:'⚔️', lore:'Human, desperate, and dangerous. Poverty and violence have made them efficient at separating travellers from their possessions and occasionally their lives.', hp: 50, str:13,  loot:0.40, xpValue: 50, taunts:['\'Your gold or your life, pilgrim.\''] },
        { name:'Cursed Scarecrow',  icon:'🎃', lore:'Set to guard a field long since abandoned. The magic animating it has curdled into something hostile and confused. It no longer knows why it guards. Only that it must.', hp: 38, str:11,  loot:0.30, xpValue: 45, boon:{str:2} },
        { name:'Marsh Leech',       icon:'🪱', lore:'The size of a forearm, with three rows of serrated teeth. Drawn to warmth and blood. Silent until it is too late, and even then the victim often does not notice until the blood loss becomes obvious.', hp: 22, str: 6,  loot:0.10, xpValue: 25 },
        { name:'Hobgoblin Captain', icon:'🪖', lore:'Unlike their goblin cousins, Hobgoblins are disciplined, organised, and patient. This one commands a unit. The others obey without question. Killing the captain first is strongly advised.', hp: 90, str:18,  loot:0.60, xpValue: 85, taunts:['\'Soldiers! To me!\''] },
        { name:'Werewolf',          icon:'🐺', lore:'A person no longer. The beast has eaten whatever they used to be and left only hunger. It is faster than it looks and it looks very fast.', hp:100, str:22,  loot:0.55, xpValue: 95, taunts:['It standeth on two legs... then four.'] },
        { name:'Dark Elf Assassin', icon:'🥷', lore:'Sent from the Underdark to kill someone specific. You are probably not the target. Probably. Either way, being nearby when it finds its mark is inadvisable.', hp: 80, str:20,  loot:0.65, xpValue: 90 },
        { name:'Basilisk',          icon:'🦎', lore:'Looking into its eyes turns flesh to stone. It knows this. It uses this. The petrified remains of its previous victims litter the area around its lair like terrible garden ornaments.', hp: 95, str:17,  loot:0.50, xpValue: 80, taunts:['Do NOT meet its gaze.'] },
        { name:'Bone Colossus',     icon:'💀', lore:'A construct of bound skeletal remains animated by powerful necromancy. Built for war. Never decommissioned. Still loyal to an army that has been dust for eight hundred years.', hp:110, str:24,  loot:0.70, xpValue:105, undead:true },
        { name:'Cursed Paladin',    icon:'⚔️', lore:'A holy warrior whose faith broke under circumstances nobody survived to describe, replaced by something cold and inverted. The power remains. The mercy does not. The armour still bears the divine sigil.', hp: 95, str:21,  loot:0.65, xpValue: 95, boon:{hp:15} },
        { name:'Forest Troll',      icon:'👹', lore:'Regenerating flesh, endless appetite, and surprising cunning. Fire and acid are effective. Everything else is inconvenience. Its territory spans three valleys and it remembers every intruder.', hp: 90, str:19,  loot:0.55, xpValue: 88, taunts:['\'TROLL HUNGRY.\''] },
        { name:'Mountain Troll',    icon:'👹', lore:'Larger than a horse, stronger than a battering ram, with a memory for grudges that outlasts most civilisations. It has been known to wait a decade to return a slight.', hp:130, str:28,  loot:0.80, xpValue:135 },
        { name:'Ancient Wyvern',    icon:'🐲', lore:'A distant cousin of dragons, with none of the magic and all of the ferocity. Territorial across a fifty-mile radius. The acid it spits dissolves steel in minutes.', hp:155, str:34,  loot:0.90, xpValue:160, taunts:['A shadow vast as a house descendeth.'] },
        { name:'Necromancer Lord',  icon:'🧙', lore:'A practitioner of death magic who has spent decades perfecting their craft and views your fellowship primarily as raw material for future projects. The dead that surround them are former adventurers.', hp:110, str:38,  loot:0.75, xpValue:150, boon:{int:6}, taunts:['\'Death is but a door, and I hold the key.\''] },
        { name:'Chaos Knight',      icon:'⚔️', lore:'A warrior who serves no lord and follows no code. Destruction is its own purpose and they have made it their life\'s work. Former soldiers who broke under battle stress and never found their way back.', hp:140, str:30,  loot:0.70, xpValue:140 },
        { name:'Lich of the Void',  icon:'💀', lore:'A spellcaster who escaped death through a ritual too terrible to describe, and has had thousands of years since to regret that they did not. Still angry. The void has made them strange.', hp:170, str:42,  loot:0.85, xpValue:190, undead:true, boon:{int:8} },
        { name:'Elder Dragon',      icon:'🐉', lore:'To the Dragon, this encounter is a minor inconvenience to be resolved quickly so it can return to its century-long contemplations. To you, it is the most significant event of your remaining life.', hp:200, str:45,  loot:0.95, xpValue:200, taunts:['\'Curious. A morsel that walketh upright.\''] },
        { name:'The Great Honk of Death', icon:'🪿', lore:'What it is. Where it came from. Why it is here. No one knows. No one who has researched it has published their findings. Armies have fled it. Kingdoms have offered tribute. It honks and moves on.', hp:9999, str:999, loot:1.0, xpValue:500, special:'honk', spriteIdx:29 },
    ],

    scenarios: [
        { text:'Thou findest a shrine o\'ergrown with weeping moss.',
          options:[{text:'Enter the ruins',type:'bad',effect:'A trap springs! Heavy stones fall.',damage:25,xp:20,morality:0},{text:'Offer a prayer without',type:'good',effect:'The Old Gods grant thee vigour.',bonus:{hp:20},xp:30,morality:10},{text:'Pass by with haste',type:'neutral',effect:'Thou choosest safety over curiosity.',xp:10,morality:0}],
          gated:[{requires:{stat:'int',min:16},text:'Study the runes first (INT 16+)',effect:'Ancient magic defused. A hidden offering revealed.',item:true,xp:40}] },
        { text:'A withered peddler by the wayside offereth a blind trade.',
          options:[{text:'Give him gold for a relic',type:'good',effect:'He bestows a relic upon thee.',item:true,damage:10,xp:30,morality:5},{text:'Slay the beggar',type:'bad',effect:'He was a sorcerer! A curse falls!',damage:30,xp:15,morality:-20},{text:'Decline and walk on',type:'neutral',effect:'The peddler vanishes.',xp:8,morality:0}],
          gated:[{requires:{stat:'cha',min:14},text:'Negotiate with charm (CHA 14+)',effect:'He reveals his best wares at no cost.',item:true,xp:35}] },
        { text:'A bridge of brittle bone spans a chasm of roaring fire.',
          options:[{text:'Cross with all speed',type:'bad',effect:'The bone snaps! Thou art scorched.',damage:22,xp:18,morality:0},{text:'Perform a rite of passage',type:'good',effect:'Wisdom guides thy steps safely.',bonus:{int:5},xp:35,morality:0},{text:'Seek a ford downstream',type:'neutral',effect:'Thou losest time but keep thy skin.',xp:10,morality:0}],
          gated:[{requires:{stat:'str',min:17},text:'Rip a stone slab as a bridge (STR 17+)',effect:'Brute force solves the puzzle.',bonus:{str:2},xp:30}] },
        { text:'A feast is laid upon a stone table in a moonlit clearing.',
          options:[{text:'Eat the hearty bread',type:'good',effect:'A welcome meal! Strength returneth.',bonus:{hp:30},xp:25,morality:0},{text:'Drink the purple wine',type:'bad',effect:'Tainted with nightshade!',damage:40,xp:10,morality:0},{text:'Inspect the cutlery',type:'good',effect:'A silver trinket catches thine eye.',item:true,xp:30,morality:0}],
          gated:[{requires:{stat:'int',min:15},text:'Detect magic on the food (INT 15+)',effect:'Thou identifies the safe dishes. A full safe meal.',bonus:{hp:40,int:2},xp:38}] },
        { text:'A wounded traveller lies across the path, moaning softly.',
          options:[{text:'Offer healing herbs',type:'good',effect:'The traveller gifts thee a charm.',bonus:{int:4},xp:30,morality:15},{text:'Rob the helpless fool',type:'bad',effect:'A hidden blade!',damage:20,item:true,xp:15,morality:-20},{text:'Step around them',type:'neutral',effect:'Thou walkest on.',xp:8,morality:-5}],
          gated:[{requires:{stat:'sta',min:14},text:'Give full first aid (STA 14+)',effect:'Thy knowledge saves them. They share a healing draught.',bonus:{hp:30},xp:40,morality:20}] },
        { text:'A crumbling tower looms above the canopy. Runes of power glow upon its door.',
          options:[{text:'Force the door open',type:'bad',effect:'A ward explodes! Arcane fire scorcheth thee.',damage:35,xp:15,morality:0},{text:'Read the runes aloud',type:'good',effect:'The tower yields its secrets.',item:true,bonus:{int:3},xp:40,morality:0},{text:'Leave well alone',type:'neutral',effect:'Some doors are not meant to be opened.',xp:8,morality:0}],
          gated:[{requires:{stat:'int',min:18},text:'Fully decipher and disarm (INT 18+)',effect:'Perfect mastery. The vault within yields treasure.',item:true,bonus:{int:4},xp:55}] },
        { text:'Twin moons hang low. The forest husheth — an uncanny silence.',
          options:[{text:'Stand guard all night',type:'good',effect:'Thy vigilance is rewarded.',bonus:{str:3},xp:28,morality:5},{text:'Light a great fire',type:'bad',effect:'Thou art seen! Creatures swarm.',damage:18,xp:12,morality:0},{text:'Press on through night',type:'neutral',effect:'Thou stumblest exhausted but reach the dawn.',xp:10,morality:0}],
          gated:[{requires:{stat:'dex',min:15},text:'Scout ahead silently (DEX 15+)',effect:'Thy stealthy scout reveals a safe path and an abandoned camp.',item:true,xp:35}] },
        { text:'An ethereal stag of pure white light standeth in the glade.',
          options:[{text:'Touch its flank',type:'good',effect:'Divine warmth floweth into thee.',bonus:{hp:35,int:4},xp:45,morality:10},{text:'Attempt to hunt it',type:'bad',effect:'It vanisheth and thou art cursed.',damage:28,xp:8,morality:-15},{text:'Observe in silence',type:'neutral',effect:'The stag fades like morning frost.',xp:12,morality:5}],
          gated:[{requires:{stat:'cha',min:15},text:'Speak the Old Tongue greeting (CHA 15+)',effect:'The stag bows and bestows a true blessing upon thy fellowship.',bonus:{hp:25},xp:50,morality:20}] },
        { text:'A rusted iron chest lies half-buried in the earth.',
          options:[{text:'Pry the lid open',type:'good',effect:'A trapped pixie! She grants thee a boon.',item:true,xp:35,morality:10},{text:'Smash it with a weapon',type:'bad',effect:'A glyph of warding detonates!',damage:30,xp:12,morality:0},{text:'Leave it buried',type:'neutral',effect:'Whatever lurks inside shall stay buried.',xp:8,morality:0}],
          gated:[{requires:{stat:'dex',min:14},text:'Pick the lock carefully (DEX 14+)',effect:'A perfect technique. The chest opens cleanly.',item:true,bonus:{dex:2},xp:42}] },
        { text:'Voices echo from a cave — familiar voices thou canst not place.',
          options:[{text:'Call out and enter',type:'bad',effect:'An illusion lured thee! Thou art ambushed.',damage:25,xp:12,morality:0},{text:'Throw a stone in first',type:'good',effect:'Startled bats reveal a hidden cache.',item:true,xp:32,morality:0},{text:'Seal the cave mouth',type:'neutral',effect:'Silence returns.',xp:8,morality:0}],
          gated:[{requires:{stat:'int',min:15},text:'Analyse the illusion (INT 15+)',effect:'Thou breaks the cantrip pattern. The cave yields real treasure.',item:true,xp:40}] },
        { text:'A dying knight clutches a sealed letter marked with royal wax.',
          options:[{text:'Read the letter',type:'good',effect:'Intelligence of enemy positions!',bonus:{int:6},xp:38,morality:5},{text:'Take the knight\'s sword',type:'good',effect:'A fine blade.',item:true,xp:32,morality:0},{text:'Give last rites and move on',type:'neutral',effect:'Thou honourest the fallen.',xp:15,morality:10}],
          gated:[{requires:{stat:'cha',min:13},text:'Rally the dying knight\'s spirit (CHA 13+)',effect:'He revives just enough to share a secret shortcut and his heirloom.',item:true,bonus:{cha:2},xp:45,morality:15}] },
        { text:'A mirror stands freestanding in the wood. Thine reflection moveth differently.',
          options:[{text:'Smash the mirror',type:'bad',effect:'Seven years of misfortune beginth.',damage:20,xp:10,morality:0},{text:'Speak to the reflection',type:'good',effect:'It whispereth forgotten lore.',bonus:{int:8},xp:42,morality:0},{text:'Drape it with a cloak',type:'neutral',effect:'Out of sight, out of mind.',xp:8,morality:0}],
          gated:[{requires:{stat:'int',min:16},text:'Commune with the mirror spirit (INT 16+)',effect:'Thou retrieves a relic trapped within the mirror world.',item:true,bonus:{int:5},xp:50}] },
        { text:'Rain begins. Beneath a hollow oak thou findest crude shelter and a fire already lit.',
          options:[{text:'Rest by the fire',type:'good',effect:'Warmth restores thy vitality.',bonus:{hp:25},xp:28,morality:0},{text:'Search the hollow',type:'good',effect:'A hermit\'s stash!',item:true,xp:32,morality:0},{text:'Sleep in the rain',type:'bad',effect:'Hypothermia bites deep.',damage:15,xp:10,morality:0}],
          gated:[{requires:{stat:'sta',min:13},text:'Maintain full watch while others rest (STA 13+)',effect:'Everyone rests fully while thou keepest watch. Double healing.',bonus:{hp:40},xp:35}] },
        { text:'A vast spider-web blocks the path. Something large shifteth at its centre.',
          options:[{text:'Charge through',type:'bad',effect:'The spider descends! Thou art bitten.',damage:32,xp:12,morality:0},{text:'Burn the web',type:'good',effect:'The spider flees, leaving egg-sac treasure.',item:true,xp:35,morality:0},{text:'Find a way around',type:'neutral',effect:'An hour detour keeps thee unbitten.',xp:10,morality:0}],
          gated:[{requires:{stat:'dex',min:16},text:'Traverse the web without touching it (DEX 16+)',effect:'Perfect balance. Thou crosses and takes the spider\'s prize cache.',item:true,bonus:{dex:2},xp:45}] },
        { text:'A child stands alone on a stump, singing a tuneless song.',
          options:[{text:'Approach and speak',type:'bad',effect:'It is a changeling. Its touch rotteth.',damage:28,xp:8,morality:0},{text:'Leave an offering',type:'good',effect:'The fey child gifts thee a blessing.',bonus:{str:4,int:4},xp:40,morality:10},{text:'Ignore the child',type:'neutral',effect:'The singing fadeth as thou walkest on.',xp:8,morality:-5}],
          gated:[{requires:{stat:'cha',min:16},text:'Sing back in the Old Tongue (CHA 16+)',effect:'The fey child grants thee a powerful ward.',bonus:{hp:20,cha:3,lck:3},xp:50,morality:15}] },
        { text:'A dying bard sits propped against a tree, playing his last song.',
          options:[{text:'Sit and listen until the end',type:'good',effect:'His verse granteth thee strange courage.',bonus:{cha:3,int:4},xp:38,morality:15},{text:'Take his lute and move on',type:'bad',effect:'His curse follows thee!',damage:15,xp:18,morality:-20},{text:'Leave a coin at his feet',type:'neutral',effect:'A small kindness.',xp:15,morality:8}],
          gated:[{requires:{stat:'cha',min:13},text:'Play the last verse alongside him (CHA 13+)',effect:'He bequeaths thee his magical instrument.',item:true,bonus:{cha:2},xp:45,morality:20}] },
        { text:'A grove of glowing mushrooms lines the path. They pulse with an inner purple light.',
          options:[{text:'Eat a handful',type:'bad',effect:'Hallucinations overwhelm thy senses!',damage:20,xp:15,morality:0},{text:'Harvest them carefully',type:'good',effect:'An alchemist\'s treasure.',bonus:{hp:20},item:true,xp:35,morality:0},{text:'Admire from a distance',type:'neutral',effect:'Their light guides thee safely.',xp:10,morality:0}],
          gated:[{requires:{stat:'int',min:14},text:'Identify the species precisely (INT 14+)',effect:'Thou harvests only the potent healing variety.',bonus:{hp:35},item:true,xp:42}] },
        { text:'A sacred pool glistens in a shaft of moonlight. Carvings of the Old Gods surround it.',
          options:[{text:'Bathe in the holy water',type:'good',effect:'Wounds close. Spirits lift.',bonus:{hp:35},xp:40,morality:15},{text:'Defile the shrine',type:'bad',effect:'Divine wrath strikes thee down!',damage:45,xp:5,morality:-30},{text:'Kneel and pray in silence',type:'neutral',effect:'A sense of peace.',xp:12,morality:8}],
          gated:[{requires:{stat:'cha',min:15},text:'Lead the fellowship in prayer (CHA 15+)',effect:'The Old Gods are moved. The whole party is healed.',bonus:{hp:30},xp:50,morality:20}] },
        { text:'A travelling merchant offereth his wares. His eyes dart too quickly.',
          options:[{text:'Buy his cure-all',type:'bad',effect:'Snake oil! Thou art swindled and poisoned.',damage:18,xp:12,morality:0},{text:'Trade fairly for supplies',type:'good',effect:'Good quality supplies.',item:true,xp:30,morality:5},{text:'Pass on by',type:'neutral',effect:'His cart rattles away.',xp:8,morality:0}],
          gated:[{requires:{stat:'cha',min:14},text:'Negotiate a better deal (CHA 14+)',effect:'Thy silver tongue wins two items for the price of one.',item:true,bonus:{cha:1},xp:38}] },
        { text:'An old hermit emerges from a hollow log and offers thee a riddle.',
          options:[{text:'Answer boldly: "Shadow"',type:'good',effect:'Correct! He hands thee a trinket.',item:true,bonus:{int:3},xp:38,morality:5},{text:'Strike him to silence him',type:'bad',effect:'He was a forest spirit!',damage:30,xp:8,morality:-25},{text:'Pretend to ponder and flee',type:'neutral',effect:'His cackle follows thee.',xp:8,morality:-5}],
          gated:[{requires:{stat:'int',min:17},text:'Solve the deeper riddle (INT 17+)',effect:'The hermit\'s jaw drops. He bestows his secret hoard.',item:true,bonus:{int:4},xp:55}] },
        { text:'A cloaked figure at the crossroads offereth thee a choice: "Power, wisdom, or fortune?"',
          options:[{text:'Choose Power',type:'good',effect:'A surge of battle-strength.',bonus:{str:6},xp:40,morality:0},{text:'Choose Wisdom',type:'good',effect:'Thy mind sharpens.',bonus:{int:6,cha:2},xp:40,morality:5},{text:'Choose Fortune',type:'good',effect:'Coins and a gleaming gem.',item:true,bonus:{lck:3},xp:40,morality:0}],
          gated:[{requires:{stat:'cha',min:17},text:'Ask for all three (CHA 17+)',effect:'The figure laughs. "A bold soul." All three boons granted.',bonus:{str:3,int:3,lck:2},xp:60,morality:5}] },
        { text:'An enchanted music box sits open on a mossy stone, playing a haunting melody.',
          options:[{text:'Wind it further and listen',type:'good',effect:'Thy fellowship is soothed and healed.',bonus:{hp:20,cha:2},xp:35,morality:5},{text:'Smash it',type:'bad',effect:'The melody becomes a scream!',damage:22,xp:8,morality:-8},{text:'Take it with thee',type:'neutral',effect:'The tune followeth thee for days.',item:true,xp:20,morality:0}] },
        { text:'An old woman in black offers a bowl of soup. "For free," she says. "Always free."',
          options:[{text:'Accept the soup gratefully',type:'good',effect:'Restorative broth! Strength returneth.',bonus:{hp:30},xp:30,morality:10},{text:'Decline but ask her news',type:'good',effect:'She knows of a nearby cache.',item:true,xp:25,morality:5},{text:'Suspect witchcraft and flee',type:'neutral',effect:'She calls after thee: "It was just soup."',xp:8,morality:-5}],
          gated:[{requires:{stat:'int',min:15},text:'Identify her as a hedge-witch healer (INT 15+)',effect:'Her true skill revealed — she gifts thee a genuine cure-all.',bonus:{hp:40},item:true,xp:45,morality:10}] },
        { text:'A locked chest hangs from a tree. A note reads: "Honesty opens all locks."',
          options:[{text:'Confess thy greatest failing',type:'good',effect:'The lock clicks open.',item:true,xp:45,morality:15},{text:'Lie loudly and try to pick it',type:'bad',effect:'The chain shocks thee.',damage:20,xp:10,morality:-5},{text:'Cut the tree down',type:'neutral',effect:'The chest falls but is already empty.',xp:8,morality:0}] },
    ],

    uneventfulEvents:[
        {text:'The path winds through a stand of ancient oaks. Shafts of pale light break the canopy.',pressOn:'Thy fellowship strides onward in comfortable silence.',restFlavour:'Thy fellowship rests beneath the oaks, breathing easier.',searchFlavour:'Searching the old oaks...'},
        {text:'A cold stream crosseth the road. The water is clear, the stones smooth.',pressOn:'Thou crosseth the stream in good order and press on.',restFlavour:'The cold water soothes tired muscles.',searchFlavour:'Searching the stream banks...'},
        {text:'The canopy thickeneth until little light reacheth the ground. The underwood is dense and quiet.',pressOn:'Thou ducketh beneath branches and trudge onward.',restFlavour:'Thy fellowship sits back-to-back in the dark and rests.',searchFlavour:'Searching the dense underwood...'},
        {text:'A morning mist descendeth through the trees, rendering everything pale and silent.',pressOn:'Thou wades through the mist, compass in hand.',restFlavour:'The mist is cool and restful.',searchFlavour:'Searching the misty ground...'},
        {text:'Dusk cometh early beneath the boughs. The fellowship halts at a mossy clearing.',pressOn:'Thy fellowship agrees to press on by starlight.',restFlavour:'Thy fellowship makes camp in the clearing. Sleep cometh easily.',searchFlavour:'Searching the clearing\'s edge...'},
        {text:'Birdsong fills the canopy — dozens of species, a chorus of life.',pressOn:'The birdsong followeth thee down the trail.',restFlavour:'The birdsong sootheth thy nerves.',searchFlavour:'Searching the undergrowth for nests...'},
        {text:'The trail all but disappears beneath thick ferns and fallen branches.',pressOn:'Slowly, stubbornly, thy fellowship forces through.',restFlavour:'Thy fellowship stops and catches its breath in the ferns.',searchFlavour:'Searching the overgrown trail...'},
        {text:'A wide valley openeth unexpectedly below thee — a sea of dark green.',pressOn:'The valley path is long but thy spirits are lifted.',restFlavour:'Thy fellowship sits at the valley rim and rests.',searchFlavour:'Searching the valley ridge...'},
        {text:'Storm clouds gather to the north. A faint smell of lightning toucheth the air.',pressOn:'Thy fellowship quickeneth its pace ahead of the weather.',restFlavour:'Thy fellowship taketh shelter beneath an overhang. The storm passeth.',searchFlavour:'Searching the stony shelter...'},
        {text:'The air smelleth of pine resin and cold earth. The silence is deep here.',pressOn:'Thy fellowship marcheth on, heartened by the clean air.',restFlavour:'Thy fellowship rests in the old silence. Something about it healeth.',searchFlavour:'Searching the ancient roots...'},
    ],

    ambience:['The wind carryeth the scent of old ash and pine.','Somewhere in the dark, an owl calleth twice and falleth silent.','The path narrows. Roots curl across the stones like sleeping serpents.','A distant bell tolls — though there is no church for a hundred leagues.','The canopy closeth above like a cathedral of shadow.','Mud suckleth at thy boots with each step deeper into the wood.','Fireflies pulse in the bracken, cold and silent as dying stars.','One of thy companions murmureth a prayer in their native tongue.','The trees here are old. Very old. They remember things thou dost not.','A cold mist riseth from the ground without cause.','Thou passest a cairn of stones left by some prior traveller — long dead.','The bark of the oaks beareth claw marks, high up.','Thy shadow seemeth slightly longer than it should be this hour.','Something watcheth from the treeline. It doeth not follow. Yet.','The night birds stop singing all at once.','An old boot hangeth from a branch above the path. Just one.'],

    healFlavors:['{name} applies a poultice of moonwort and breathes easier.','{name} murmurs a minor healing cantrip beneath their breath.','{name} binds wounds with herbs gathered from the roadside.','A warm forest breeze carries gentle healing magic to {name}.','{name} drinks from an old vial of green tincture.','{name} tears strips from their cloak and tends to a wound.','The Old Gods see fit to mend {name}\'s wounds.','{name} splashes cold stream water over a gash.'],
    treasuryFlavors:['Amidst the mud thou discoverest a leather pouch — heavy with coin.','A dead bandit nearby yieldeth a coin purse worth looting.','Half-buried under a root: a small casket of silver and gems.','A dislodged flagstone revealeth a hoard left by some long-dead traveller.','The shattered remains of a merchant\'s cart contain scattered valuables.','A hollow tree yields a secret cache of gold dust and uncut gemstones.'],
    victoryLines:['The far shore receiveth thee. Behind thee, the wood closeth like a wound.','Bards shall sing of this crossing — or wouldst thou prefer they did not?','The Old Gods nod in approval. The Darkwood hath been cheated of its due.','Thou emergeth scarred, diminished, and utterly alive.','The far village sees thy fellowship emerge and whispers: impossible.'],
    defeatLines:['The Darkwood consumeth all, in time.','Thy bones join the many others that line the ancient roots.','The trees do not mourn thee. They never do.','Another fellowship enters the wood. They do not find what thou hast left behind.','In a hundred years, children shall be warned not to enter the wood. They shall not know thy name.'],
};
