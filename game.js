/**
 * GAME.JS — Norrtounia: The Dark Forest  v0.3
 * ─────────────────────────────────────────────────────────────────
 * New in v0.3:
 *   • DEX stat + dodge chance
 *   • Hero counter-attack phase with named attacks & coloured damage
 *   • XP system, level cap 100, stat gains, flash animations
 *   • 5 synthesised music tracks, randomised on loop
 *   • Gold & gem treasury (10% event); affects ranking if team wins
 *   • Team naming; saved with highscore
 *   • Fixed 100 encounters
 *   • Per-turn passive healing with lore flavour
 *   • Best item given to best-suited hero
 *   • Prompt bolding (gold left-border) in log
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. AUDIO ENGINE
   ═══════════════════════════════════════════════════════════════ */

let _ctx;
function actx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
}

/**
 * Play a single synthesised tone.
 * @param {number} freq  Hz
 * @param {string} type  oscillator waveform
 * @param {number} dur   duration in seconds
 * @param {number} vol   peak gain (0–1)
 * @param {number} when  delay from now in seconds
 */
function tone(freq, type = 'square', dur = 0.12, vol = 0.06, when = 0) {
    try {
        const ctx = actx();
        const t   = ctx.currentTime + when;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vol, t + 0.012);
        env.gain.setValueAtTime(vol * 0.80, t + dur * 0.55);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(env);
        env.connect(actx().destination);
        osc.start(t);
        osc.stop(t + dur);
    } catch (_) {}
}

/* ── SFX palette ─────────────────────────────────────────────── */
const SFX = {
    roll:    () => { tone(480,'square',0.07,0.05); tone(600,'square',0.07,0.04,0.04); },
    lock:    () => { tone(260,'triangle',0.18,0.05); tone(330,'triangle',0.12,0.04,0.10); },
    start:   () => {
        [440,550,660,880].forEach((f,i) =>
            tone(f,'sine',0.15+i*0.05,0.05,i*0.13));
    },
    levelUp: () => {
        [523,659,784,1047,1319].forEach((f,i) =>
            tone(f,'sine',0.18,0.06,i*0.10));
    },
    good:    () => { tone(523,'sine',0.12,0.05); tone(659,'sine',0.16,0.05,0.10); tone(784,'sine',0.22,0.04,0.22); },
    bad:     () => { tone(160,'sawtooth',0.14,0.07); tone(120,'sawtooth',0.22,0.07,0.10); tone(90,'sawtooth',0.18,0.05,0.28); },
    neutral: () => tone(380,'triangle',0.14,0.04),
    loot:    () => { [523,659,784,1047].forEach((f,i) => tone(f,'sine',0.12,0.04,i*0.07)); },
    heal:    () => tone(440,'sine',0.18,0.03),
    strike:  () => { tone(180,'sawtooth',0.10,0.07); tone(140,'sawtooth',0.20,0.06,0.06); },
    heavyHit:() => { tone(100,'sawtooth',0.18,0.08); tone(70,'sawtooth',0.28,0.07,0.10); tone(50,'square',0.20,0.06,0.25); },
    dodge:   () => tone(660,'triangle',0.12,0.04),
    flee:    () => { tone(330,'triangle',0.08,0.04); tone(440,'triangle',0.12,0.04,0.08); },
    treasury:() => { [660,784,880].forEach((f,i) => tone(f,'sine',0.15,0.04,i*0.08)); },
    victory: () => { [[523,0],[659,0.18],[784,0.36],[1047,0.54],[784,0.80],[880,0.96],[1047,1.18],[1397,1.40]].forEach(([f,t])=>tone(f,'sine',0.22,0.05,t)); },
    death:   () => { [220,185,147,110].forEach((f,i) => tone(f,'sawtooth',0.4+i*0.1,0.07,i*0.38)); },
    honk:    () => {
        try {
            const ctx = actx();
            const osc = ctx.createOscillator(), env = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
            osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.50);
            env.gain.setValueAtTime(0, ctx.currentTime);
            env.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.04);
            env.gain.setValueAtTime(0.14, ctx.currentTime + 0.28);
            env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
            osc.connect(env); env.connect(actx().destination);
            osc.start(); osc.stop(ctx.currentTime + 0.55);
        } catch (_) {}
    },
    doubleHonk: () => { SFX.honk(); setTimeout(SFX.honk, 620); },
};

/* ═══════════════════════════════════════════════════════════════
   2. BACKGROUND MUSIC — 5 synthesised medieval tracks
      Each track = { bpm, mel:[[freq,beats],...], bass:[[freq,beats],...] }
      A track is picked at random; when it finishes it picks another.
   ═══════════════════════════════════════════════════════════════ */

let bgStarted = false;
let bgMaster  = null;   // GainNode shared across tracks

/* Note frequency constants (Hz) */
const N = {
    A2:110, B2:123.5, C3:130.8, D3:146.8, E3:164.8, F3:174.6,
    Fs3:185, G3:196,  Ab3:207.7,A3:220,  Bb3:233.1,B3:246.9,
    C4:261.6,Cs4:277.2,D4:293.7,Ds4:311.1,E4:329.6,F4:349.2,
    Fs4:370,  G4:392,  Ab4:415.3,A4:440,  Bb4:466.2,B4:493.9,
    C5:523.3, D5:587.3, E5:659.3, G5:784,
};

const MUSIC_TRACKS = [
    // ── Track 1: Forest Path (A natural minor, 78 BPM) ──────────
    {
        bpm:78, melVol:1.0, bassVol:0.55, melType:'square', bassType:'triangle',
        mel:[
            [N.A3,1],[N.C4,0.5],[N.D4,0.5],[N.E4,1],[N.D4,1],
            [N.C4,1],[N.B3,0.5],[N.A3,0.5],[N.B3,1],[N.G3,1],
            [N.A3,1],[N.B3,0.5],[N.C4,0.5],[N.D4,1],[N.C4,1],
            [N.B3,1],[N.A3,0.5],[N.G3,0.5],[N.A3,2],
            [N.E4,1],[N.D4,0.5],[N.E4,0.5],[N.F4,1],[N.E4,1],
            [N.D4,1],[N.C4,0.5],[N.B3,0.5],[N.A3,1],[N.B3,1],
            [N.C4,1],[N.D4,1],[N.E4,0.5],[N.D4,0.5],[N.C4,1],[N.B3,1],
            [N.A3,1],[N.G3,1],[N.A3,0.5],[N.B3,0.5],[N.A3,3],
        ],
        bass:[
            [N.A2,4],[N.E3,4],[N.G3,2],[N.A2,2],
            [N.A2,4],[N.G3,4],[N.E3,4],[N.A2,4],
        ]
    },
    // ── Track 2: Dungeon Depths (D natural minor, 62 BPM) ───────
    {
        bpm:62, melVol:0.85, bassVol:0.50, melType:'square', bassType:'triangle',
        mel:[
            [N.D4,2],[N.C4,1],[N.Bb3,1],[N.A3,2],[N.G3,1],[N.A3,1],
            [N.D4,2],[N.F3,1],[N.G3,1],[N.A3,4],
            [N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],[N.F3,2],
            [N.G3,2],[N.A3,2],[N.D3,4],
            [N.A3,1],[N.Bb3,1],[N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],
            [N.F3,2],[N.G3,1],[N.A3,1],[N.D3,4],
        ],
        bass:[
            [N.D3,4],[N.C3,4],[N.Bb2,4],[N.A2,4],
            [N.D3,4],[N.A2,4],[N.Bb2,2],[N.C3,2],[N.D3,4],
        ]
    },
    // ── Track 3: Tavern Ballad (G major, 96 BPM) ────────────────
    {
        bpm:96, melVol:0.90, bassVol:0.45, melType:'square', bassType:'triangle',
        mel:[
            [N.G3,0.5],[N.A3,0.5],[N.B3,1],[N.D4,1],[N.E4,0.5],[N.D4,0.5],[N.B3,1],[N.A3,1],
            [N.G3,0.5],[N.B3,0.5],[N.D4,1],[N.G4,2],[N.E4,1],[N.D4,1],
            [N.C4,0.5],[N.D4,0.5],[N.E4,1],[N.D4,1],[N.C4,0.5],[N.B3,0.5],[N.A3,1],[N.G3,1],
            [N.B3,0.5],[N.A3,0.5],[N.G3,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.G3,2],
            [N.D4,0.5],[N.E4,0.5],[N.Fs4,1],[N.G4,1],[N.E4,0.5],[N.D4,0.5],[N.B3,2],
            [N.A3,0.5],[N.B3,0.5],[N.C4,1],[N.D4,2],[N.C4,1],[N.B3,1],[N.A3,2],
        ],
        bass:[
            [N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2],
            [N.G3,2],[N.C3,2],[N.D3,4],
            [N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2],
        ]
    },
    // ── Track 4: Dark Omen (B natural minor, 55 BPM) ────────────
    {
        bpm:55, melVol:0.80, bassVol:0.55, melType:'square', bassType:'triangle',
        mel:[
            [N.B3,2],[N.A3,1],[N.Fs3,1],[N.E3,2],[N.D3,1],[N.E3,1],
            [N.Fs3,2],[N.A3,2],[N.B3,4],
            [N.D4,2],[N.B3,1],[N.A3,1],[N.Fs3,2],[N.E3,2],
            [N.D3,2],[N.E3,1],[N.Fs3,1],[N.B2,4],
            [N.B3,1],[N.A3,1],[N.G3,1],[N.Fs3,1],[N.E3,2],[N.D3,2],
            [N.E3,2],[N.Fs3,2],[N.B2,4],
        ],
        bass:[
            [N.B2,4],[N.A2,4],[N.Fs3,4],[N.B2,4],
            [N.B2,4],[N.E3,4],[N.Fs3,2],[N.B2,6],
        ]
    },
    // ── Track 5: Ancient Mystery (E Dorian, 70 BPM) ─────────────
    {
        bpm:70, melVol:0.90, bassVol:0.50, melType:'square', bassType:'triangle',
        mel:[
            [N.E4,1.5],[N.D4,0.5],[N.E4,1],[N.Cs4,1],[N.B3,2],
            [N.A3,1],[N.B3,0.5],[N.Cs4,0.5],[N.D4,1],[N.E4,1],[N.Fs4,1],[N.G4,1],
            [N.A4,2],[N.G4,1],[N.Fs4,1],[N.E4,2],[N.D4,2],
            [N.B3,1],[N.Cs4,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.E3,2],
            [N.Fs3,1],[N.G3,1],[N.A3,2],[N.B3,1],[N.Cs4,1],[N.D4,2],
            [N.E4,1],[N.D4,1],[N.Cs4,1],[N.B3,1],[N.A3,4],
        ],
        bass:[
            [N.E3,4],[N.A3,4],[N.Fs3,4],[N.E3,4],
            [N.A2,4],[N.B2,4],[N.E3,4],[N.A2,4],
        ]
    },
];

function startBgMusic() {
    if (bgStarted) return;
    bgStarted = true;
    const ctx  = actx();
    bgMaster   = ctx.createGain();
    bgMaster.gain.value = 0.0196;   // soft master volume
    bgMaster.connect(ctx.destination);
    playNextTrack();
}

function playNextTrack() {
    const ctx   = actx();
    const track = pick(MUSIC_TRACKS);
    const B     = 60 / track.bpm;   // seconds per beat

    function scheduleVoice(notes, startTime, type, vol, sus = 0.78) {
        let t = startTime;
        notes.forEach(([freq, beats]) => {
            const dur = beats * B * sus;
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(vol, t + 0.018);
            env.gain.setValueAtTime(vol * 0.65, t + dur * 0.55);
            env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(env);
            env.connect(bgMaster);
            osc.start(t);
            osc.stop(t + dur);
            t += beats * B;
        });
        return t;
    }

    const startTime  = ctx.currentTime + 0.25;
    const melBeats   = track.mel.reduce((s, [,d]) => s + d, 0);
    const bassBeats  = track.bass.reduce((s, [,d]) => s + d, 0);
    const loopBeats  = Math.max(melBeats, bassBeats);

    scheduleVoice(track.mel,  startTime, track.melType,  track.melVol,  0.80);
    scheduleVoice(track.bass, startTime, track.bassType, track.bassVol, 0.60);

    // Schedule next track to start just as this one ends
    setTimeout(playNextTrack, (loopBeats * B - 0.10) * 1000);
}

/* ═══════════════════════════════════════════════════════════════
   3. SCREEN SHAKE
   ═══════════════════════════════════════════════════════════════ */
function shake() {
    const el = document.getElementById('frame-wrap');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

/* ═══════════════════════════════════════════════════════════════
   4. GAME STATE
   ═══════════════════════════════════════════════════════════════ */
const MAX_TURNS = 100;

let party    = [null, null, null];
let turn     = 0;
let teamName = '';
let treasury = { gold: 0, gems: 0 };

/* ═══════════════════════════════════════════════════════════════
   5. INITIALISATION
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    rollParty();

    document.getElementById('btn-enter').addEventListener('click', enterWood);
    document.getElementById('btn-roll').addEventListener('click', () => { SFX.roll(); rollParty(); });
    document.getElementById('btn-start').addEventListener('click', startGame);

    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (k === 'r' && !document.getElementById('ctrl-setup').classList.contains('hidden')) {
            SFX.roll(); rollParty(); return;
        }
        if (['1','2','3'].includes(k)) {
            const btns = document.querySelectorAll('#ctrl-play .px-btn');
            const idx  = +k - 1;
            if (btns[idx] && !btns[idx].disabled) btns[idx].click();
        }
    });
});

function enterWood() {
    startBgMusic();
    SFX.start();
    // Read team name from input
    const inp = document.getElementById('team-name-input');
    teamName  = inp ? inp.value.trim() : '';
    if (!teamName) teamName = 'The Unnamed Fellowship';
    showScreen('screen-setup');
    showCtrl('ctrl-setup');
}

/* ═══════════════════════════════════════════════════════════════
   6. PARTY GENERATION
   ═══════════════════════════════════════════════════════════════ */
function rollParty() {
    party = party.map(h => (h && h.locked) ? h : makeHero());
    renderSetup();
}

/**
 * Create a fresh hero object from random race + class.
 * @returns {object} hero
 */
function makeHero() {
    const race = pick(GAME_DATA.races);
    const cls  = pick(GAME_DATA.classes);
    const hp   = clamp(race.hp + cls.hpB + rand(0, 18), 10, 999);
    const str  = clamp(race.str + cls.strB + rand(0, 6),  1, 99);
    const intel= clamp(race.int + cls.intB + rand(0, 6),  1, 99);
    const dex  = clamp(race.dex + cls.dexB + rand(0, 6),  1, 99);
    return {
        name:        pick(race.names),
        race:        race.name,
        raceIcon:    race.icon,
        job:         cls.name,
        hp, maxHp:   hp,
        str, int:    intel, dex,
        level:       1,
        xp:          0,
        xpNext:      xpThreshold(1),
        bonusDmg:    0,               // flat bonus added to every attack
        primaryStat: cls.primaryStat,
        damageType:  cls.damageType,
        attackNames: cls.attackNames,
        items:       [],
        locked:      false,
    };
}

/** XP required to level up from `level` → `level+1` */
function xpThreshold(level) { return level * 60; }

function toggleLock(i) {
    SFX.lock();
    party[i].locked = !party[i].locked;
    renderSetup();
}

function renderSetup() {
    const container = document.getElementById('party-slots');
    container.innerHTML = '';
    party.forEach((h, i) => {
        const div = document.createElement('div');
        div.className = `slot-card${h.locked ? ' locked' : ''}`;
        div.setAttribute('role', 'listitem');
        div.innerHTML = `
            <span class="slot-race-icon">${h.raceIcon}</span>
            <span class="slot-name">${h.name}</span>
            <span class="slot-sub">${h.race} · ${h.job}</span>
            <span class="slot-stats">HP:${h.hp} STR:${h.str} INT:${h.int} DEX:${h.dex}</span>
            <button class="bind-btn" onclick="toggleLock(${i})">
                ${h.locked ? '🔒 BOUND' : '🔓 BIND'}
            </button>`;
        container.appendChild(div);
    });
}

/* ═══════════════════════════════════════════════════════════════
   7. GAME START
   ═══════════════════════════════════════════════════════════════ */
function startGame() {
    SFX.start();
    turn     = 0;
    treasury = { gold: 0, gems: 0 };

    showScreen('screen-play');
    showCtrl('ctrl-play');

    logPrompt('Thy fellowship crosseth the threshold. The wood closeth behind thee.');
    log(`${MAX_TURNS} trials lie ahead. May the Old Gods watch over thee.`);
    nextTurn();
}

/* ═══════════════════════════════════════════════════════════════
   8. MAIN LOOP
   ═══════════════════════════════════════════════════════════════ */
function nextTurn() {
    turn++;
    passiveHeal();
    renderStats();
    renderTreasury();

    if (turn > MAX_TURNS)              return endGame(true);
    if (party.every(h => h.hp <= 0))  return endGame(false);

    // Ambient flavour (15% chance)
    if (Math.random() < 0.15) log(pick(GAME_DATA.ambience));

    // Treasury event (10% chance)
    if (Math.random() < 0.10) doTreasuryEvent();

    // 35% combat, 65% scenario
    Math.random() < 0.35 ? doCombat() : doScenario();
}

/* ═══════════════════════════════════════════════════════════════
   9. PASSIVE TURN EFFECTS — healing
   ═══════════════════════════════════════════════════════════════ */
function passiveHeal() {
    party.forEach(h => {
        if (h.hp <= 0 || h.hp >= h.maxHp) return;
        if (Math.random() > 0.65) return;          // 65% chance to trigger
        const amount = Math.max(1, Math.floor(h.maxHp * rand(1, 4) / 100));
        h.hp = Math.min(h.hp + amount, h.maxHp);
        const flavour = pick(GAME_DATA.healFlavors)
            .replace('{name}', h.name)
            .replace('{hp}',   `+${amount} HP`);
        log(flavour);
        SFX.heal();
    });
}

/* ═══════════════════════════════════════════════════════════════
   10. TREASURY EVENT
   ═══════════════════════════════════════════════════════════════ */
function doTreasuryEvent() {
    const goldFound = rand(5, 50);
    const gemsFound = Math.random() < 0.35 ? rand(1, 3) : 0;
    treasury.gold += goldFound;
    treasury.gems += gemsFound;
    const flavour = pick(GAME_DATA.treasuryFlavors);
    log(flavour);
    if (gemsFound) {
        log(`✦ ${goldFound} gold and ${gemsFound} gem${gemsFound>1?'s':''} secured!`);
    } else {
        log(`✦ ${goldFound} gold coins secured!`);
    }
    SFX.treasury();
}

/* ═══════════════════════════════════════════════════════════════
   11. SCENARIO
   ═══════════════════════════════════════════════════════════════ */
function doScenario() {
    const ev = pick(GAME_DATA.scenarios);
    logPrompt(ev.text);
    setChoices(ev.options.map((opt, i) => ({
        label: `[${i+1}] ${opt.text}`,
        action: () => resolveScenario(opt)
    })));
}

function resolveScenario(opt) {
    const h = aliveHero();
    if (!h) return;

    if (opt.damage)     { h.hp -= opt.damage; SFX.bad(); shake(); }
    if (opt.bonus?.hp)  { h.hp  = Math.min(h.hp + opt.bonus.hp,  h.maxHp); SFX.good(); }
    if (opt.bonus?.str) { h.str += opt.bonus.str; SFX.good(); }
    if (opt.bonus?.int) { h.int += opt.bonus.int; SFX.good(); }
    if (opt.bonus?.dex) { h.dex += opt.bonus.dex; SFX.good(); }
    if (opt.item)        giveLoot(h);
    if (!opt.damage && !opt.bonus && !opt.item) SFX.neutral();

    log(`${h.name}: ${opt.effect}`);
    grantXP(h, opt.xp ?? 15);
    setTimeout(nextTurn, 40);
}

/* ═══════════════════════════════════════════════════════════════
   12. COMBAT — hero attacks first, then monster retaliates
   ═══════════════════════════════════════════════════════════════ */
function doCombat() {
    const baseMonster = pick(GAME_DATA.monsters);

    // Special: legendary goose
    if (baseMonster.special === 'honk') return doHonkEncounter();

    // Scale monster difficulty gradually as turns progress (±35% random swing)
    const scaleFactor   = 1 + (turn / 280) + (Math.random() * 0.70 - 0.35);
    const scaledStr     = Math.max(1, Math.round(baseMonster.str * scaleFactor));
    const scaledHp      = Math.round(baseMonster.hp  * scaleFactor);
    const monster       = { ...baseMonster, str: scaledStr, hp: scaledHp };

    logPrompt(`${monster.icon} ${monster.name} emergeth from the darkness!`);

    // Optional battle-cry
    if (monster.taunts && Math.random() < 0.30) {
        log(pick(monster.taunts));
    }

    setChoices([
        { label: '[1] Strike it down!', action: () => doFight(monster) },
        { label: '[2] Flee in terror!', action: () => doFlee(monster)  },
    ]);
}

/**
 * Hero attacks first, then monster retaliates.
 * DEX stat provides a dodge chance against the monster's attack.
 */
function doFight(monster) {
    const h = aliveHero();
    if (!h) return;

    // ── Hero attacks ──────────────────────────────────────────
    const atkName    = pick(h.attackNames);
    const statVal    = h[h.primaryStat];
    const heroDmg    = Math.max(1, Math.floor(statVal * 0.50) + rand(1, Math.max(2, Math.floor(statVal * 0.15))) + h.bonusDmg);
    const dmgInfo    = DAMAGE_TYPES[h.damageType] ?? DAMAGE_TYPES.physical;
    const dmgSpan    = `<span style="color:${dmgInfo.color}">${heroDmg} ${dmgInfo.label}</span>`;

    logHTML(`${h.name} uses ${atkName}! ${dmgSpan} dmg to ${monster.name}.`);

    // ── Monster retaliates ────────────────────────────────────
    const dodgeRoll  = Math.random() * 100;
    const dodgePct   = Math.min(40, Math.max(0, (h.dex - 5) * 1.5));

    if (dodgeRoll < dodgePct) {
        log(`${h.name} dodges the attack! (DEX ${h.dex})`);
        SFX.dodge();
    } else {
        h.hp -= monster.str;
        log(`${h.name} takes ${monster.str} damage from ${monster.name}!`);
        monster.str > 24 ? SFX.heavyHit() : SFX.strike();
        shake();
    }

    // Bonus loot on fights with difficult monsters
    const lootChance = heroDmg >= monster.hp
        ? Math.min(1, monster.loot + 0.20)   // "kill" bonus
        : monster.loot;
    if (Math.random() < lootChance) giveLoot(h);

    // Monster magical boon (rare)
    if (monster.boon && Math.random() < 0.25) {
        if (monster.boon.hp)  h.hp  = Math.min(h.hp  + monster.boon.hp,  h.maxHp);
        if (monster.boon.str) h.str += monster.boon.str;
        if (monster.boon.int) h.int += monster.boon.int;
        log(`Strange energy from ${monster.name} flows into ${h.name}!`);
        SFX.good();
    }

    // XP — more for harder / scaled monsters
    const xpAward = Math.round((monster.xpValue ?? 40) * scaleFactor(monster));
    grantXP(h, xpAward);

    setTimeout(nextTurn, 700);
}

/** Return the effective scale factor used for a given monster object */
function scaleFactor(monster) {
    // Approximate from scaled vs base str
    return monster.str / (GAME_DATA.monsters.find(m => m.name === monster.name)?.str ?? monster.str) || 1;
}

function doFlee(monster) {
    const h = aliveHero();
    if (Math.random() > 0.45) {
        log(`${h?.name ?? 'Thy party'} escapes into the undergrowth!`);
        SFX.flee();
        setTimeout(nextTurn, 40);
    } else {
        log(`The ${monster.name} cuts off thy retreat!`);
        doFight(monster);
    }
}

/* ═══════════════════════════════════════════════════════════════
   13. THE GREAT HONK OF DEATH — legendary encounter
   ═══════════════════════════════════════════════════════════════ */
function doHonkEncounter() {
    clearChoices();
    SFX.doubleHonk();

    [
        { t:0,    text:'The forest falleth utterly silent.',                         style:'pale'  },
        { t:900,  text:'A shadow crosseth the canopy overhead.',                     style:'pale'  },
        { t:1900, text:'From the mists emergeth... THE GREAT HONK OF DEATH.',        style:'blood' },
        { t:2900, text:'🪿 It regardeth thee with one terrible, ancient eye.',       style:'blood' },
        { t:3800, text:'"Men have wept at its passing. Armies have broken and fled.',style:'dim'   },
        { t:4600, text:'"Scholars who beheld it could not sleep for a fortnight."',  style:'dim'   },
    ].forEach(({ t, text, style }) => setTimeout(() => log(text, style), t));

    setTimeout(() => SFX.honk(), 2800);

    setTimeout(() => setChoices([
        { label: '[1] Stand thy ground and fight!', action: fightHonk },
        { label: '[2] Flee for thy very life!',    action: fleeHonk  },
    ]), 5400);
}

function fightHonk() {
    log('Thou raisest thy weapon against the eternal goose...');
    SFX.honk();
    setTimeout(() => {
        if (Math.random() < 0.80) {
            party.forEach(h => { h.hp = 0; });
            SFX.death(); shake(); shake();
            setTimeout(() => {
                log('HONK.', 'blood');
                log('Thy fellowship is unmade. The Great Honk is eternal.', 'blood');
                setTimeout(() => endGame(false), 1800);
            }, 600);
        } else {
            party.forEach(h => { if (h.hp > 0) h.hp = Math.max(1, Math.floor(h.hp * 0.08)); });
            log('The Goose... tires of thee. A miracle known to no other.');
            party.forEach(h => grantXP(h, 500));
            SFX.victory();
            setTimeout(nextTurn, 1200);
        }
    }, 1200);
}

function fleeHonk() {
    log('Thou turnest and runnest as thou hast never run before!');
    SFX.flee();
    setTimeout(() => {
        if (Math.random() < 0.50) {
            log('Somehow, impossibly, thou escapest. The honk fades... for now.');
            setTimeout(nextTurn, 800);
        } else {
            log('THE GREAT HONK FINDETH THEE.', 'blood');
            SFX.doubleHonk();
            setTimeout(fightHonk, 1200);
        }
    }, 900);
}

/* ═══════════════════════════════════════════════════════════════
   14. LOOT — item given to the best-suited living hero
   ═══════════════════════════════════════════════════════════════ */
function giveLoot(/* hint — ignored, we pick best recipient */) {
    const item      = pick(GAME_DATA.items);
    const recipient = getBestRecipient(item.stat);
    if (!recipient) return;

    recipient.items.push(item.name);
    recipient[item.stat] += item.val;
    log(`${recipient.name} found ✦ ${item.name}! (+${item.val} ${item.stat.toUpperCase()})`);
    SFX.loot();
}

/**
 * Choose the best living hero to receive an item.
 * HP items → most injured (lowest HP ratio).
 * Stat items → hero whose primaryStat matches first,
 *              otherwise the hero with the highest matching stat.
 */
function getBestRecipient(stat) {
    const alive = party.filter(h => h.hp > 0);
    if (!alive.length) return null;

    if (stat === 'hp') {
        return alive.reduce((best, h) =>
            (h.hp / h.maxHp) < (best.hp / best.maxHp) ? h : best);
    }

    // Prefer heroes whose class primary stat matches
    const primary = alive.filter(h => h.primaryStat === stat);
    const pool    = primary.length ? primary : alive;
    return pool.reduce((best, h) => h[stat] > best[stat] ? h : best);
}

/* ═══════════════════════════════════════════════════════════════
   15. XP & LEVELLING
   ═══════════════════════════════════════════════════════════════ */

/**
 * Award XP to a hero and check for level-up.
 * @param {object} hero
 * @param {number} amount  base XP to award
 */
function grantXP(hero, amount) {
    if (!hero || hero.hp <= 0) return;
    hero.xp += amount;
    while (hero.xp >= hero.xpNext && hero.level < 100) {
        hero.xp     -= hero.xpNext;
        hero.level  += 1;
        hero.xpNext  = xpThreshold(hero.level);
        doLevelUp(hero);
    }
}

/** Apply stat gains on level-up and show flash animations. */
function doLevelUp(hero) {
    SFX.levelUp();
    log(`✦ ${hero.name} reached Level ${hero.level}!`);

    const gains = [];

    // Primary stat always increases
    const primGain = rand(1, 3);
    hero[hero.primaryStat] += primGain;
    gains.push({ stat: hero.primaryStat.toUpperCase(), val: primGain });

    // HP always grows
    const hpGain = rand(3, 8);
    hero.maxHp  += hpGain;
    hero.hp      = Math.min(hero.hp + hpGain, hero.maxHp);
    gains.push({ stat: 'HP', val: hpGain });

    // 40% chance: secondary stat bump
    if (Math.random() < 0.40) {
        const secondaries = ['str','int','dex'].filter(s => s !== hero.primaryStat);
        const s = pick(secondaries);
        const v = rand(1, 2);
        hero[s] += v;
        gains.push({ stat: s.toUpperCase(), val: v });
    }

    // Every 5 levels: bonus damage increases
    if (hero.level % 5 === 0) {
        hero.bonusDmg += 1;
        gains.push({ stat: 'DMG', val: 1 });
    }

    // Flash each gain on the card
    const heroIndex = party.indexOf(hero);
    gains.forEach((g, i) => {
        setTimeout(() => flashStatGain(heroIndex, `+${g.val} ${g.stat}`, '#e8c45a'), i * 320);
    });
}

/**
 * Briefly show a floating "+X STAT" label over a party member's stat card.
 */
function flashStatGain(heroIndex, text, color) {
    const cards = document.querySelectorAll('.stat-card');
    if (!cards[heroIndex]) return;
    const flash       = document.createElement('div');
    flash.className   = 'stat-flash';
    flash.textContent = text;
    flash.style.color = color;
    cards[heroIndex].appendChild(flash);
    setTimeout(() => flash.remove(), 2500);
}

/* ═══════════════════════════════════════════════════════════════
   16. END GAME
   ═══════════════════════════════════════════════════════════════ */
function endGame(won) {
    showScreen('screen-end');
    showCtrl('ctrl-end');

    const endEl     = document.getElementById('screen-end');
    endEl.className = `screen ${won ? 'victory' : 'defeat'}`;

    const titleEl   = document.getElementById('end-title');
    const flavourEl = document.getElementById('end-flavour');
    const treasVal  = treasury.gold + treasury.gems * 20;

    if (won) {
        SFX.victory();
        titleEl.textContent   = '✦ VICTORY ✦';
        flavourEl.textContent = pick(GAME_DATA.victoryLines) +
            ` Treasury: ${treasury.gold}g · ${treasury.gems} gems (${treasVal}g total).`;
    } else {
        SFX.death();
        titleEl.textContent   = '✧ DEFEAT ✧';
        flavourEl.textContent = pick(GAME_DATA.defeatLines);
    }

    // Persist highscore
    const scores = JSON.parse(localStorage.getItem('norrt_scores') || '[]');
    scores.push({
        team:   teamName,
        turns:  turn,
        won,
        gold:   treasury.gold,
        gems:   treasury.gems,
        wealth: treasVal,
        date:   new Date().toLocaleDateString('sv-SE'),
    });
    // Sort: wins rank above losses; among wins sort by wealth; among losses sort by turns
    scores.sort((a, b) => {
        if (a.won !== b.won) return a.won ? -1 : 1;
        if (a.won)           return b.wealth - a.wealth;
        return b.turns - a.turns;
    });
    localStorage.setItem('norrt_scores', JSON.stringify(scores.slice(0, 50)));

    const listEl = document.getElementById('highscore-list');
    listEl.innerHTML = scores.map((s, i) => {
        const icon   = s.won ? '✦' : '✧';
        const colour = s.won ? 'var(--gold)' : 'var(--dim)';
        const detail = s.won
            ? `${s.turns} turns · ${s.wealth}g`
            : `${s.turns} turns`;
        return `<p style="color:${colour}">${i+1}. ${icon} ${s.team} · ${detail} · ${s.date}</p>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   17. RENDER HELPERS
   ═══════════════════════════════════════════════════════════════ */

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showCtrl(id) {
    ['ctrl-intro','ctrl-setup','ctrl-play','ctrl-end'].forEach(c =>
        document.getElementById(c).classList.toggle('hidden', c !== id));
}

/**
 * Add a PROMPT line — white + gold left-border. Dims previous prompts.
 */
function logPrompt(text) {
    // Dim previous prompt lines
    document.querySelectorAll('#game-log .prompt-current').forEach(p => {
        p.classList.remove('prompt-current');
    });
    const el = document.getElementById('game-log');
    const p  = document.createElement('p');
    p.className   = 'prompt-current';
    p.textContent = text;
    el.insertAdjacentElement('afterbegin', p);
}

/**
 * Add a regular log line (dim by default; recent ones slightly brighter).
 * @param {string} text
 * @param {'pale'|'blood'|'dim'} style
 */
function log(text, style = 'pale') {
    // Fade any existing "recent" lines back to dim
    document.querySelectorAll('#game-log .log-recent').forEach(p => {
        p.classList.remove('log-recent');
    });
    const el = document.getElementById('game-log');
    const p  = document.createElement('p');
    p.classList.add('log-recent');
    if (style === 'blood') p.classList.add('log-blood');
    p.style.color =
        style === 'blood' ? 'var(--blood)' :
        style === 'dim'   ? 'var(--dim)'   :
        'var(--pale)';
    p.textContent = text;
    el.insertAdjacentElement('afterbegin', p);
}

/**
 * Add a log line that supports HTML (used for coloured damage spans).
 */
function logHTML(html, style = 'pale') {
    document.querySelectorAll('#game-log .log-recent').forEach(p => {
        p.classList.remove('log-recent');
    });
    const el = document.getElementById('game-log');
    const p  = document.createElement('p');
    p.classList.add('log-recent');
    p.style.color = style === 'blood' ? 'var(--blood)' : 'var(--pale)';
    p.innerHTML   = html;   // trusted internal strings only
    el.insertAdjacentElement('afterbegin', p);
}

function setChoices(choices) {
    const el = document.getElementById('ctrl-play');
    el.innerHTML = '';
    choices.forEach(c => {
        const btn     = document.createElement('button');
        btn.className = 'px-btn';
        btn.textContent = c.label;
        btn.addEventListener('click', () => {
            el.querySelectorAll('button').forEach(b => b.disabled = true);
            c.action();
        });
        el.appendChild(btn);
    });
}

function clearChoices() {
    document.getElementById('ctrl-play').innerHTML = '';
}

function renderStats() {
    document.getElementById('party-stats').innerHTML = party.map(h => {
        const dead = h.hp <= 0;
        return `<div class="stat-card" role="listitem">
            <span class="stat-name">
                <span class="stat-lv">Lv.${h.level}</span> ${h.name}
            </span>
            ${dead
                ? '<span class="stat-dead">✝ SLAIN</span>'
                : `HP:${h.hp}/${h.maxHp}<br>
                   STR:${h.str} INT:${h.int} DEX:${h.dex}<br>
                   <span class="stat-xp">XP:${h.xp}/${h.xpNext}</span>`}
            <span class="stat-item">${h.items.at(-1) ?? '—'}</span>
        </div>`;
    }).join('');
}

function renderTreasury() {
    const bar       = document.getElementById('treasury-bar');
    if (!bar) return;
    const treasVal  = treasury.gold + treasury.gems * 20;
    bar.textContent = `⚔ Turn ${turn}/${MAX_TURNS}  ·  💰 ${treasury.gold}g  ·  💎 ${treasury.gems}  ·  ${treasVal}g value`;
}

/* ═══════════════════════════════════════════════════════════════
   18. UTILITIES
   ═══════════════════════════════════════════════════════════════ */
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function aliveHero() {
    const alive = party.filter(h => h.hp > 0);
    return alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
}
