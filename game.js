/**
 * GAME.JS — Norrtounia: The Dark Forest  v0.6
 * ─────────────────────────────────────────────────────────────────
 * New in v0.6:
 *   • Portrait sprite system using portraits.png (11×9 grid)
 *   • Hero gender (0=male, 1=female) — determines sprite column/row
 *   • Portrait strip rendered ABOVE the frame, not inside it
 *   • Game window now shows text only; stats live in the portrait strip
 *   • Floating +STAT flash on the portrait card on level-up
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. PORTRAIT SPRITE SYSTEM
   ═══════════════════════════════════════════════════════════════
   Sprite sheet: portraits.png  1024×1024px
   Grid: 11 columns × 9 rows, irregular cell sizes.

   Column layout (race):
     0 = Human Male       1 = Human Female
     2 = High Elf         3 = Wood Elf
     4 = Mountain Dwarf   5 = Hill Dwarf
     6 = Halfling         7 = Gnome
     8 = Orc              9 = Half-Orc
    10 = Tiefling

   Row layout (class archetype × gender):
     0 = warrior male     1 = warrior female
     2 = rogue male       3 = rogue female
     4 = mage male        5 = mage female
     6 = holy male        7 = holy female
     8 = hybrid (any gender — single row)
   ═══════════════════════════════════════════════════════════════ */

const PORTRAIT = {
    SHEET_W:  1024,
    SHEET_H:  1024,
    DISPLAY_W: 60,    // display width per portrait in the strip (px)
    DISPLAY_H: 78,    // display height per portrait (px)

    // Pixel X start of each column (measured from sprite sheet scan)
    COL_X:  [22,  113, 202, 290, 380, 469, 560, 649, 739, 830, 918],
    // Pixel width of each column
    COL_W:  [81,   78,  78,  79,  78,  81,  79,  79,  81,  78,  83],
    // Pixel Y start of each row
    ROW_Y:  [43,  141, 242, 348, 460, 572, 682, 799, 908],
    // Pixel height of each row
    ROW_H:  [97,  100, 105, 111, 111, 109, 116, 108,  97],

    /* Race → { male:col, female:col }
     * Human has dedicated male (col 0) and female (col 1) columns.
     * All other races share one column; gender is expressed via row pairing. */
    RACE_COL: {
        'Human':          { male:0, female:1 },
        'High Elf':       { male:2, female:2 },
        'Wood Elf':       { male:3, female:3 },
        'Mountain Dwarf': { male:4, female:4 },
        'Hill Dwarf':     { male:5, female:5 },
        'Halfling':       { male:6, female:6 },
        'Gnome':          { male:7, female:7 },
        'Orc':            { male:8, female:8 },
        'Half-Orc':       { male:9, female:9 },
        'Tiefling':       { male:10, female:10 },
    },

    /* Archetype → [male_row, female_row]
     * Hybrid only has one row (row 8) — used for both genders. */
    ARCHETYPE_ROW: {
        warrior: [0, 1],
        rogue:   [2, 3],
        mage:    [4, 5],
        holy:    [6, 7],
        hybrid:  [8, 8],
    },

    /* Class → archetype name */
    CLASS_ARCHETYPE: {
        'Knight':       'warrior',
        'Fighter':      'warrior',
        'Barbarian':    'warrior',
        'Blood Knight': 'warrior',
        'Templar':      'warrior',
        'Rogue':        'rogue',
        'Dark Rogue':   'rogue',
        'Shadow Dancer':'rogue',
        'Ranger':       'rogue',
        'Arcane Archer':'rogue',
        'Wizard':       'mage',
        'Sorcerer':     'mage',
        'Necromancer':  'mage',
        'Pyromancer':   'mage',
        'Void Walker':  'mage',
        'Cleric':       'holy',
        'Paladin':      'holy',
        'Druid':        'holy',
        'Warden':       'holy',
        'Shaman':       'holy',
        'Warlock':      'hybrid',
        'Bard':         'hybrid',
        'Battle Mage':  'hybrid',
        'Monk':         'hybrid',
    },
};

/**
 * Compute the CSS background-* properties to display the correct
 * sprite cell at the target display size.
 *
 * We scale the entire sheet so that the specific cell (srcX,srcY,srcW,srcH)
 * maps exactly onto a (displayW × displayH) box.
 *
 * @param {object} hero
 * @returns {string}  CSS style string (background-image, size, position, width, height)
 */
function portraitStyle(hero) {
    const P     = PORTRAIT;
    const rc    = P.RACE_COL[hero.race] ?? { male:0, female:1 };
    const col   = hero.gender === 0 ? rc.male : rc.female;
    const arch  = P.CLASS_ARCHETYPE[hero.job] ?? 'warrior';
    const rows  = P.ARCHETYPE_ROW[arch]        ?? [0,0];
    const row   = rows[hero.gender ?? 0];

    const srcX  = P.COL_X[col] ?? 0;
    const srcY  = P.ROW_Y[row] ?? 0;
    const srcW  = P.COL_W[col] ?? 80;
    const srcH  = P.ROW_H[row] ?? 100;

    const dW    = P.DISPLAY_W;
    const dH    = P.DISPLAY_H;
    const sx    = dW / srcW;
    const sy    = dH / srcH;

    return [
        `background-image:url('portraits.png')`,
        `background-repeat:no-repeat`,
        `background-size:${(P.SHEET_W * sx).toFixed(1)}px ${(P.SHEET_H * sy).toFixed(1)}px`,
        `background-position:${-(srcX * sx).toFixed(1)}px ${-(srcY * sy).toFixed(1)}px`,
        `image-rendering:pixelated`,
        `width:${dW}px`,
        `height:${dH}px`,
    ].join(';');
}

/* ═══════════════════════════════════════════════════════════════
   2. AUDIO ENGINE
   ═══════════════════════════════════════════════════════════════ */

let _ctx;
function actx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
}

/**
 * @param {number} freq   Hz
 * @param {string} type   oscillator waveform
 * @param {number} dur    duration in seconds
 * @param {number} vol    peak gain 0–1
 * @param {number} when   offset from AudioContext.currentTime
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

const SFX = {
    roll:     () => { tone(480,'square',0.07,0.05); tone(600,'square',0.07,0.04,0.04); },
    lock:     () => { tone(260,'triangle',0.18,0.05); tone(330,'triangle',0.12,0.04,0.10); },
    start:    () => { [440,550,660,880].forEach((f,i) => tone(f,'sine',0.15+i*0.05,0.05,i*0.13)); },
    levelUp:  () => { [523,659,784,1047,1319].forEach((f,i) => tone(f,'sine',0.18,0.06,i*0.10)); },
    good:     () => { tone(523,'sine',0.12,0.05); tone(659,'sine',0.16,0.05,0.10); tone(784,'sine',0.22,0.04,0.22); },
    bad:      () => { tone(160,'sawtooth',0.14,0.07); tone(120,'sawtooth',0.22,0.07,0.10); tone(90,'sawtooth',0.18,0.05,0.28); },
    neutral:  () => tone(380,'triangle',0.14,0.04),
    loot:     () => { [523,659,784,1047].forEach((f,i) => tone(f,'sine',0.12,0.04,i*0.07)); },
    heal:     () => tone(440,'sine',0.18,0.03),
    strike:   () => { tone(180,'sawtooth',0.10,0.07); tone(140,'sawtooth',0.20,0.06,0.06); },
    heavyHit: () => { tone(100,'sawtooth',0.18,0.08); tone(70,'sawtooth',0.28,0.07,0.10); tone(50,'square',0.20,0.06,0.25); },
    dodge:    () => tone(660,'triangle',0.12,0.04),
    flee:     () => { tone(330,'triangle',0.08,0.04); tone(440,'triangle',0.12,0.04,0.08); },
    treasury: () => { [660,784,880].forEach((f,i) => tone(f,'sine',0.15,0.04,i*0.08)); },
    victory:  () => { [[523,0],[659,.18],[784,.36],[1047,.54],[784,.80],[880,.96],[1047,1.18],[1397,1.40]].forEach(([f,t])=>tone(f,'sine',0.22,0.05,t)); },
    death:    () => { [220,185,147,110].forEach((f,i) => tone(f,'sawtooth',0.4+i*0.1,0.07,i*0.38)); },
    honk: () => {
        try {
            const ctx = actx(), osc = ctx.createOscillator(), env = ctx.createGain();
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
   3. BACKGROUND MUSIC — 5 synthesised medieval tracks
   ═══════════════════════════════════════════════════════════════ */

let bgStarted = false;
let bgMaster  = null;

const N = {
    A2:110, B2:123.5, C3:130.8, D3:146.8, E3:164.8, F3:174.6,
    Fs3:185, G3:196, Ab3:207.7, A3:220, Bb3:233.1, B3:246.9,
    C4:261.6, Cs4:277.2, D4:293.7, Ds4:311.1, E4:329.6, F4:349.2,
    Fs4:370, G4:392, Ab4:415.3, A4:440, Bb4:466.2, B4:493.9,
    C5:523.3, D5:587.3, E5:659.3, G5:784,
};

const MUSIC_TRACKS = [
    {
        bpm:78, melVol:1.0, bassVol:0.55, melType:'square', bassType:'triangle',
        mel:[[N.A3,1],[N.C4,.5],[N.D4,.5],[N.E4,1],[N.D4,1],[N.C4,1],[N.B3,.5],[N.A3,.5],[N.B3,1],[N.G3,1],[N.A3,1],[N.B3,.5],[N.C4,.5],[N.D4,1],[N.C4,1],[N.B3,1],[N.A3,.5],[N.G3,.5],[N.A3,2],[N.E4,1],[N.D4,.5],[N.E4,.5],[N.F4,1],[N.E4,1],[N.D4,1],[N.C4,.5],[N.B3,.5],[N.A3,1],[N.B3,1],[N.C4,1],[N.D4,1],[N.E4,.5],[N.D4,.5],[N.C4,1],[N.B3,1],[N.A3,1],[N.G3,1],[N.A3,.5],[N.B3,.5],[N.A3,3]],
        bass:[[N.A2,4],[N.E3,4],[N.G3,2],[N.A2,2],[N.A2,4],[N.G3,4],[N.E3,4],[N.A2,4]],
    },
    {
        bpm:62, melVol:0.85, bassVol:0.50, melType:'square', bassType:'triangle',
        mel:[[N.D4,2],[N.C4,1],[N.Bb3,1],[N.A3,2],[N.G3,1],[N.A3,1],[N.D4,2],[N.F3,1],[N.G3,1],[N.A3,4],[N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],[N.F3,2],[N.G3,2],[N.A3,2],[N.D3,4],[N.A3,1],[N.Bb3,1],[N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],[N.F3,2],[N.G3,1],[N.A3,1],[N.D3,4]],
        bass:[[N.D3,4],[N.C3,4],[N.Bb2,4],[N.A2,4],[N.D3,4],[N.A2,4],[N.Bb2,2],[N.C3,2],[N.D3,4]],
    },
    {
        bpm:96, melVol:0.90, bassVol:0.45, melType:'square', bassType:'triangle',
        mel:[[N.G3,.5],[N.A3,.5],[N.B3,1],[N.D4,1],[N.E4,.5],[N.D4,.5],[N.B3,1],[N.A3,1],[N.G3,.5],[N.B3,.5],[N.D4,1],[N.G4,2],[N.E4,1],[N.D4,1],[N.C4,.5],[N.D4,.5],[N.E4,1],[N.D4,1],[N.C4,.5],[N.B3,.5],[N.A3,1],[N.G3,1],[N.B3,.5],[N.A3,.5],[N.G3,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.G3,2],[N.D4,.5],[N.E4,.5],[N.Fs4,1],[N.G4,1],[N.E4,.5],[N.D4,.5],[N.B3,2],[N.A3,.5],[N.B3,.5],[N.C4,1],[N.D4,2],[N.C4,1],[N.B3,1],[N.A3,2]],
        bass:[[N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2],[N.G3,2],[N.C3,2],[N.D3,4],[N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2]],
    },
    {
        bpm:55, melVol:0.80, bassVol:0.55, melType:'square', bassType:'triangle',
        mel:[[N.B3,2],[N.A3,1],[N.Fs3,1],[N.E3,2],[N.D3,1],[N.E3,1],[N.Fs3,2],[N.A3,2],[N.B3,4],[N.D4,2],[N.B3,1],[N.A3,1],[N.Fs3,2],[N.E3,2],[N.D3,2],[N.E3,1],[N.Fs3,1],[N.B2,4],[N.B3,1],[N.A3,1],[N.G3,1],[N.Fs3,1],[N.E3,2],[N.D3,2],[N.E3,2],[N.Fs3,2],[N.B2,4]],
        bass:[[N.B2,4],[N.A2,4],[N.Fs3,4],[N.B2,4],[N.B2,4],[N.E3,4],[N.Fs3,2],[N.B2,6]],
    },
    {
        bpm:70, melVol:0.90, bassVol:0.50, melType:'square', bassType:'triangle',
        mel:[[N.E4,1.5],[N.D4,.5],[N.E4,1],[N.Cs4,1],[N.B3,2],[N.A3,1],[N.B3,.5],[N.Cs4,.5],[N.D4,1],[N.E4,1],[N.Fs4,1],[N.G4,1],[N.A4,2],[N.G4,1],[N.Fs4,1],[N.E4,2],[N.D4,2],[N.B3,1],[N.Cs4,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.E3,2],[N.Fs3,1],[N.G3,1],[N.A3,2],[N.B3,1],[N.Cs4,1],[N.D4,2],[N.E4,1],[N.D4,1],[N.Cs4,1],[N.B3,1],[N.A3,4]],
        bass:[[N.E3,4],[N.A3,4],[N.Fs3,4],[N.E3,4],[N.A2,4],[N.B2,4],[N.E3,4],[N.A2,4]],
    },
];

function startBgMusic() {
    if (bgStarted) return;
    bgStarted = true;
    bgMaster  = actx().createGain();
    bgMaster.gain.value = 0.0196;
    bgMaster.connect(actx().destination);
    playNextTrack();
}

function playNextTrack() {
    const ctx   = actx();
    const track = pick(MUSIC_TRACKS);
    const B     = 60 / track.bpm;

    function scheduleVoice(notes, t0, type, vol, sus = 0.78) {
        let t = t0;
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
            osc.connect(env); env.connect(bgMaster);
            osc.start(t); osc.stop(t + dur);
            t += beats * B;
        });
        return t;
    }

    const t0        = ctx.currentTime + 0.25;
    const melBeats  = track.mel.reduce((s,[,d])=>s+d, 0);
    const bassBeats = track.bass.reduce((s,[,d])=>s+d, 0);
    scheduleVoice(track.mel,  t0, track.melType,  track.melVol,  0.80);
    scheduleVoice(track.bass, t0, track.bassType, track.bassVol, 0.60);
    setTimeout(playNextTrack, (Math.max(melBeats, bassBeats) * B - 0.10) * 1000);
}

/* ═══════════════════════════════════════════════════════════════
   4. SCREEN SHAKE
   ═══════════════════════════════════════════════════════════════ */
function shake() {
    const el = document.getElementById('frame-wrap');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

/* ═══════════════════════════════════════════════════════════════
   5. GAME STATE
   ═══════════════════════════════════════════════════════════════ */
const MAX_TURNS = 100;

let party    = [null, null, null];
let turn     = 0;
let teamName = '';
let treasury = { gold:0, gems:0 };

/* ═══════════════════════════════════════════════════════════════
   6. INITIALISATION
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
    const inp = document.getElementById('team-name-input');
    teamName  = (inp?.value.trim()) || 'The Unnamed Fellowship';
    showScreen('screen-setup');
    showCtrl('ctrl-setup');
}

/* ═══════════════════════════════════════════════════════════════
   7. PARTY GENERATION
   ═══════════════════════════════════════════════════════════════ */
function rollParty() {
    party = party.map(h => (h && h.locked) ? h : makeHero());
    renderSetup();
}

/**
 * Build one random hero. Gender 0=male, 1=female (affects portrait sprite).
 */
function makeHero() {
    const race  = pick(GAME_DATA.races);
    const cls   = pick(GAME_DATA.classes);
    const hp    = clamp(race.hp + cls.hpB + rand(0,18), 10, 999);
    return {
        name:        pick(race.names),
        race:        race.name,
        job:         cls.name,
        gender:      rand(0, 1),    // 0=male, 1=female — drives portrait sprite
        hp, maxHp:   hp,
        str:         clamp(race.str + cls.strB + rand(0,6), 1, 99),
        int:         clamp(race.int + cls.intB + rand(0,6), 1, 99),
        dex:         clamp(race.dex + cls.dexB + rand(0,6), 1, 99),
        level:       1,
        xp:          0,
        xpNext:      xpThreshold(1),
        bonusDmg:    0,
        primaryStat: cls.primaryStat,
        damageType:  cls.damageType,
        attackNames: cls.attackNames,
        items:       [],
        locked:      false,
    };
}

function xpThreshold(level) { return level * 60; }

function toggleLock(i) {
    SFX.lock();
    party[i].locked = !party[i].locked;
    renderSetup();
}

/* ── Render setup screen slot cards ── */
function renderSetup() {
    const container = document.getElementById('party-slots');
    container.innerHTML = '';
    party.forEach((h, i) => {
        const div = document.createElement('div');
        div.className = `slot-card${h.locked ? ' locked' : ''}`;
        div.setAttribute('role', 'listitem');
        div.innerHTML = `
            <span class="slot-name">${h.name}</span>
            <span class="slot-sub">${h.race} · ${h.job}</span>
            <span class="slot-stats">HP:${h.hp}</span>
            <span class="slot-stats">STR:${h.str} INT:${h.int} DEX:${h.dex}</span>
            <button class="bind-btn" onclick="toggleLock(${i})">
                ${h.locked ? '🔒 BOUND' : '🔓 BIND'}
            </button>`;
        container.appendChild(div);
    });
    renderPortraitStrip();
}

/* ═══════════════════════════════════════════════════════════════
   8. PORTRAIT STRIP RENDERING
   Builds the 3 portrait cards above the frame.
   Called by renderSetup() and renderStats().
   ═══════════════════════════════════════════════════════════════ */
function renderPortraitStrip() {
    const strip = document.getElementById('portrait-strip');
    if (!strip || strip.classList.contains('hidden')) return;

    strip.innerHTML = party.map((h, i) => {
        const dead     = h.hp <= 0;
        const spr      = portraitStyle(h);
        const hpPct    = h.maxHp > 0 ? h.hp / h.maxHp * 100 : 0;
        const hpColor  = hpPct > 55 ? '#6abf45'
                       : hpPct > 25 ? '#c8a040'
                       : '#aa3333';

        return `
        <div class="portrait-card${dead ? ' portrait-dead' : ''}" id="portrait-card-${i}" role="listitem">
            <div class="portrait-sprite-wrap">
                <div class="portrait-sprite" style="${spr}"></div>
                ${dead ? '<div class="portrait-dead-x">✝</div>' : ''}
            </div>
            <div class="portrait-info">
                <span class="pi-name"><span class="pi-lv">Lv.${h.level}</span>${h.name}</span>
                <span class="pi-sub">${h.race} · ${h.job}</span>
                ${dead
                    ? `<span class="pi-dead">✝ SLAIN</span>`
                    : `<span class="pi-hp" style="color:${hpColor}">HP:${h.hp}/${h.maxHp}</span>
                       <span class="pi-stats">STR:${h.str} INT:${h.int} DEX:${h.dex}</span>
                       <span class="pi-xp">XP:${h.xp}/${h.xpNext}</span>
                       <span class="pi-item">${h.items.at(-1) ?? '—'}</span>`
                }
            </div>
        </div>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   9. GAME START
   ═══════════════════════════════════════════════════════════════ */
function startGame() {
    SFX.start();
    turn     = 0;
    treasury = { gold:0, gems:0 };

    showScreen('screen-play');
    showCtrl('ctrl-play');

    logPrompt('Thy fellowship crosseth the threshold. The wood closeth behind thee.');
    log(`${MAX_TURNS} trials lie ahead. May the Old Gods watch over thee.`);
    nextTurn();
}

/* ═══════════════════════════════════════════════════════════════
   10. MAIN LOOP
   ═══════════════════════════════════════════════════════════════ */
function nextTurn() {
    turn++;
    passiveHeal();
    renderStats();
    renderTreasury();

    if (turn > MAX_TURNS)              return endGame(true);
    if (party.every(h => h.hp <= 0))  return endGame(false);

    if (Math.random() < 0.15) log(pick(GAME_DATA.ambience));
    if (Math.random() < 0.10) doTreasuryEvent();

    Math.random() < 0.35 ? doCombat() : doScenario();
}

/* ═══════════════════════════════════════════════════════════════
   11. PASSIVE HEALING
   ═══════════════════════════════════════════════════════════════ */
function passiveHeal() {
    party.forEach(h => {
        if (h.hp <= 0 || h.hp >= h.maxHp) return;
        if (Math.random() > 0.65)          return;
        const amount = Math.max(1, Math.floor(h.maxHp * rand(1,4) / 100));
        h.hp = Math.min(h.hp + amount, h.maxHp);
        log(pick(GAME_DATA.healFlavors).replace('{name}', h.name).replace('{hp}', `+${amount} HP`));
        SFX.heal();
    });
}

/* ═══════════════════════════════════════════════════════════════
   12. TREASURY EVENT
   ═══════════════════════════════════════════════════════════════ */
function doTreasuryEvent() {
    const gold = rand(5,50);
    const gems = Math.random() < 0.35 ? rand(1,3) : 0;
    treasury.gold += gold;
    treasury.gems += gems;
    log(pick(GAME_DATA.treasuryFlavors));
    log(`✦ ${gold} gold${gems ? ` and ${gems} gem${gems>1?'s':''}` : ''} secured!`);
    SFX.treasury();
}

/* ═══════════════════════════════════════════════════════════════
   13. SCENARIO
   ═══════════════════════════════════════════════════════════════ */
function doScenario() {
    const ev = pick(GAME_DATA.scenarios);
    logPrompt(ev.text);
    setChoices(ev.options.map((opt, i) => ({
        label:  `[${i+1}] ${opt.text}`,
        action: () => resolveScenario(opt),
    })));
}

function resolveScenario(opt) {
    const h = aliveHero();
    if (!h) return;
    if (opt.damage)     { h.hp -= opt.damage; SFX.bad(); shake(); }
    if (opt.bonus?.hp)  { h.hp  = Math.min(h.hp+opt.bonus.hp,  h.maxHp); SFX.good(); }
    if (opt.bonus?.str) { h.str += opt.bonus.str;  SFX.good(); }
    if (opt.bonus?.int) { h.int += opt.bonus.int;  SFX.good(); }
    if (opt.bonus?.dex) { h.dex += opt.bonus.dex;  SFX.good(); }
    if (opt.item)         giveLoot(h);
    if (!opt.damage && !opt.bonus && !opt.item) SFX.neutral();
    log(`${h.name}: ${opt.effect}`);
    grantXP(h, opt.xp ?? 15);
    setTimeout(nextTurn, 40);
}

/* ═══════════════════════════════════════════════════════════════
   14. COMBAT — hero attacks first, monster retaliates
   ═══════════════════════════════════════════════════════════════ */
function doCombat() {
    const base = pick(GAME_DATA.monsters);
    if (base.special === 'honk') return doHonkEncounter();

    const scale   = 1 + (turn / 280) + (Math.random() * 0.70 - 0.35);
    const monster = {
        ...base,
        str: Math.max(1, Math.round(base.str * scale)),
        hp:  Math.round(base.hp * scale),
    };

    logPrompt(`${monster.icon} ${monster.name} emergeth from the darkness!`);
    if (monster.taunts && Math.random() < 0.30) log(pick(monster.taunts));

    setChoices([
        { label:'[1] Strike it down!', action: () => doFight(monster) },
        { label:'[2] Flee in terror!', action: () => doFlee(monster)  },
    ]);
}

function doFight(monster) {
    const h = aliveHero();
    if (!h) return;

    // Hero counter-attack
    const atkName = pick(h.attackNames);
    const statVal = h[h.primaryStat];
    const heroDmg = Math.max(1, Math.floor(statVal * 0.50) + rand(1, Math.max(2, Math.floor(statVal * 0.15))) + h.bonusDmg);
    const dmgInfo = DAMAGE_TYPES[h.damageType] ?? DAMAGE_TYPES.physical;
    const dmgSpan = `<span style="color:${dmgInfo.color}">${heroDmg} ${dmgInfo.label}</span>`;
    logHTML(`${h.name} uses ${atkName}! ${dmgSpan} to ${monster.name}.`);

    // Monster retaliation — DEX reduces chance of being hit
    const dodgePct = Math.min(40, Math.max(0, (h.dex - 5) * 1.5));
    if (Math.random() * 100 < dodgePct) {
        log(`${h.name} dodges the strike! (DEX ${h.dex})`);
        SFX.dodge();
    } else {
        h.hp -= monster.str;
        log(`${h.name} takes ${monster.str} damage from ${monster.name}!`);
        monster.str > 24 ? SFX.heavyHit() : SFX.strike();
        shake();
    }

    // Loot chance — bonus if hero dealt strong damage
    const lootChance = heroDmg >= monster.hp ? Math.min(1, monster.loot + 0.20) : monster.loot;
    if (Math.random() < lootChance) giveLoot(h);

    // Rare monster boon
    if (monster.boon && Math.random() < 0.25) {
        if (monster.boon.hp)  h.hp  = Math.min(h.hp + monster.boon.hp, h.maxHp);
        if (monster.boon.str) h.str += monster.boon.str;
        if (monster.boon.int) h.int += monster.boon.int;
        log(`Strange energy from ${monster.name} flows into ${h.name}!`);
        SFX.good();
    }

    // XP scales with monster difficulty
    const baseXP = monster.xpValue ?? 40;
    const scaledXP = Math.round(baseXP * (monster.str / (GAME_DATA.monsters.find(m=>m.name===monster.name)?.str ?? monster.str) || 1));
    grantXP(h, scaledXP);

    setTimeout(nextTurn, 700);
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
   15. THE GREAT HONK OF DEATH
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
    ].forEach(({t,text,style}) => setTimeout(()=>log(text,style), t));
    setTimeout(()=>SFX.honk(), 2800);
    setTimeout(()=>setChoices([
        { label:'[1] Stand thy ground and fight!', action:fightHonk  },
        { label:'[2] Flee for thy very life!',     action:fleeHonk   },
    ]), 5400);
}

function fightHonk() {
    log('Thou raisest thy weapon against the eternal goose...');
    SFX.honk();
    setTimeout(()=>{
        if (Math.random() < 0.80) {
            party.forEach(h=>{ h.hp=0; });
            SFX.death(); shake(); shake();
            setTimeout(()=>{
                log('HONK.', 'blood');
                log('Thy fellowship is unmade. The Great Honk is eternal.', 'blood');
                setTimeout(()=>endGame(false), 1800);
            }, 600);
        } else {
            party.forEach(h=>{ if(h.hp>0) h.hp=Math.max(1,Math.floor(h.hp*0.08)); });
            log('The Goose... tires of thee. A miracle known to no other.');
            party.forEach(h=>grantXP(h, 500));
            SFX.victory();
            setTimeout(nextTurn, 1200);
        }
    }, 1200);
}

function fleeHonk() {
    log('Thou turnest and runnest as thou hast never run before!');
    SFX.flee();
    setTimeout(()=>{
        if (Math.random()<0.50) {
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
   16. LOOT — item given to the best-suited living hero
   ═══════════════════════════════════════════════════════════════ */
function giveLoot() {
    const item = pick(GAME_DATA.items);
    const recipient = getBestRecipient(item.stat);
    if (!recipient) return;
    recipient.items.push(item.name);
    recipient[item.stat] += item.val;
    log(`${recipient.name} found ✦ ${item.name}! (+${item.val} ${item.stat.toUpperCase()})`);
    SFX.loot();
}

function getBestRecipient(stat) {
    const alive = party.filter(h=>h.hp>0);
    if (!alive.length) return null;
    if (stat === 'hp') return alive.reduce((b,h)=>(h.hp/h.maxHp)<(b.hp/b.maxHp)?h:b);
    const primary = alive.filter(h=>h.primaryStat===stat);
    const pool    = primary.length ? primary : alive;
    return pool.reduce((b,h)=>h[stat]>b[stat]?h:b);
}

/* ═══════════════════════════════════════════════════════════════
   17. XP & LEVELLING
   ═══════════════════════════════════════════════════════════════ */
function grantXP(hero, amount) {
    if (!hero || hero.hp <= 0) return;
    hero.xp += amount;
    while (hero.xp >= hero.xpNext && hero.level < 100) {
        hero.xp    -= hero.xpNext;
        hero.level += 1;
        hero.xpNext = xpThreshold(hero.level);
        doLevelUp(hero);
    }
}

function doLevelUp(hero) {
    SFX.levelUp();
    log(`✦ ${hero.name} reached Level ${hero.level}!`);
    const gains = [];

    const primGain = rand(1,3);
    hero[hero.primaryStat] += primGain;
    gains.push({ stat:hero.primaryStat.toUpperCase(), val:primGain });

    const hpGain = rand(3,8);
    hero.maxHp += hpGain;
    hero.hp     = Math.min(hero.hp + hpGain, hero.maxHp);
    gains.push({ stat:'HP', val:hpGain });

    if (Math.random() < 0.40) {
        const sec = pick(['str','int','dex'].filter(s=>s!==hero.primaryStat));
        const v   = rand(1,2);
        hero[sec] += v;
        gains.push({ stat:sec.toUpperCase(), val:v });
    }

    if (hero.level % 5 === 0) {
        hero.bonusDmg += 1;
        gains.push({ stat:'DMG', val:1 });
    }

    const idx = party.indexOf(hero);
    gains.forEach((g, i) =>
        setTimeout(()=>flashStatGain(idx, `+${g.val} ${g.stat}`, '#e8c45a'), i * 320));
}

/**
 * Float a "+X STAT" label over the hero's portrait card.
 */
function flashStatGain(heroIndex, text, color) {
    const card = document.getElementById(`portrait-card-${heroIndex}`);
    if (!card) return;
    const el       = document.createElement('div');
    el.className   = 'stat-flash';
    el.textContent = text;
    el.style.color = color;
    card.appendChild(el);
    setTimeout(()=>el.remove(), 2500);
}

/* ═══════════════════════════════════════════════════════════════
   18. END GAME
   ═══════════════════════════════════════════════════════════════ */
function endGame(won) {
    showScreen('screen-end');
    showCtrl('ctrl-end');

    const endEl   = document.getElementById('screen-end');
    endEl.className = `screen ${won ? 'victory' : 'defeat'}`;

    const wealth  = treasury.gold + treasury.gems * 20;
    const titleEl   = document.getElementById('end-title');
    const flavourEl = document.getElementById('end-flavour');

    if (won) {
        SFX.victory();
        titleEl.textContent   = '✦ VICTORY ✦';
        flavourEl.textContent = pick(GAME_DATA.victoryLines) +
            ` Treasury: ${treasury.gold}g · ${treasury.gems} gems · ${wealth}g total.`;
    } else {
        SFX.death();
        titleEl.textContent   = '✧ DEFEAT ✧';
        flavourEl.textContent = pick(GAME_DATA.defeatLines);
    }

    const scores = JSON.parse(localStorage.getItem('norrt_scores') || '[]');
    scores.push({ team:teamName, turns:turn, won, gold:treasury.gold, gems:treasury.gems, wealth, date:new Date().toLocaleDateString('sv-SE') });
    scores.sort((a,b) => {
        if (a.won !== b.won) return a.won ? -1 : 1;
        if (a.won)           return b.wealth - a.wealth;
        return b.turns - a.turns;
    });
    localStorage.setItem('norrt_scores', JSON.stringify(scores.slice(0,50)));

    document.getElementById('highscore-list').innerHTML = scores.map((s,i)=>{
        const icon   = s.won ? '✦' : '✧';
        const colour = s.won ? 'var(--gold)' : 'var(--dim)';
        const detail = s.won ? `${s.turns} trials · ${s.wealth}g` : `${s.turns} trials`;
        return `<p style="color:${colour}">${i+1}. ${icon} ${s.team} · ${detail} · ${s.date}</p>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   19. RENDER HELPERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Switch visible screen. Shows / hides the portrait strip accordingly.
 * Strip is visible on all screens except the intro.
 */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');

    const strip     = document.getElementById('portrait-strip');
    const showStrip = id !== 'screen-intro';
    strip.classList.toggle('hidden', !showStrip);
    if (showStrip) renderPortraitStrip();
}

function showCtrl(id) {
    ['ctrl-intro','ctrl-setup','ctrl-play','ctrl-end'].forEach(c=>
        document.getElementById(c).classList.toggle('hidden', c !== id));
}

/** Highlight current prompt with gold border + white text; dim previous prompts. */
function logPrompt(text) {
    document.querySelectorAll('#game-log .prompt-current').forEach(p=>p.classList.remove('prompt-current'));
    const el = document.getElementById('game-log');
    const p  = document.createElement('p');
    p.className   = 'prompt-current';
    p.textContent = text;
    el.insertAdjacentElement('afterbegin', p);
}

/** Regular log line — recent entries slightly brighter, old ones dim. */
function log(text, style='pale') {
    document.querySelectorAll('#game-log .log-recent').forEach(p=>p.classList.remove('log-recent'));
    const el = document.getElementById('game-log');
    const p  = document.createElement('p');
    p.classList.add('log-recent');
    if (style==='blood') p.classList.add('log-blood');
    p.style.color = style==='blood' ? 'var(--blood)' : style==='dim' ? 'var(--dim)' : 'var(--pale)';
    p.textContent = text;
    el.insertAdjacentElement('afterbegin', p);
}

/** Log line with trusted inline HTML (used for coloured damage spans). */
function logHTML(html) {
    document.querySelectorAll('#game-log .log-recent').forEach(p=>p.classList.remove('log-recent'));
    const el = document.getElementById('game-log');
    const p  = document.createElement('p');
    p.classList.add('log-recent');
    p.style.color = 'var(--pale)';
    p.innerHTML   = html;
    el.insertAdjacentElement('afterbegin', p);
}

function setChoices(choices) {
    const el = document.getElementById('ctrl-play');
    el.innerHTML = '';
    choices.forEach(c=>{
        const btn = document.createElement('button');
        btn.className   = 'px-btn';
        btn.textContent = c.label;
        btn.addEventListener('click', ()=>{
            el.querySelectorAll('button').forEach(b=>b.disabled=true);
            c.action();
        });
        el.appendChild(btn);
    });
}

function clearChoices() { document.getElementById('ctrl-play').innerHTML=''; }

/** Re-render stats → updates portrait strip only. */
function renderStats() { renderPortraitStrip(); }

function renderTreasury() {
    const bar = document.getElementById('treasury-bar');
    if (!bar) return;
    const v = treasury.gold + treasury.gems * 20;
    bar.textContent = `⚔ Turn ${turn}/${MAX_TURNS}  ·  💰 ${treasury.gold}g  ·  💎 ${treasury.gems}  ·  ${v}g value`;
}

/* ═══════════════════════════════════════════════════════════════
   20. UTILITIES
   ═══════════════════════════════════════════════════════════════ */
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function aliveHero() {
    const alive = party.filter(h=>h.hp>0);
    return alive.length ? alive[Math.floor(Math.random()*alive.length)] : null;
}
