/**
 * GAME.JS — Norrtounia: The Dark Forest
 * ─────────────────────────────────────────────────────────────────
 * Features:
 *   • Intro / Setup / Play / End screen flow
 *   • Background chiptune medieval music (Web Audio, looping)
 *   • Varied SFX: combat, loot, scenarios, honk, victory, death
 *   • The Great Honk of Death — legendary goose encounter
 *   • Random flavour dialogue during play
 *   • Victory vs Defeat visual states
 *   • Keyboard shortcuts: R = reroll, 1/2/3 = choices
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   AUDIO ENGINE
   ═══════════════════════════════════════════════════════════════ */

let _ctx;
function actx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
}

/**
 * Play a synthesised tone.
 * @param {number}   freq  Hz
 * @param {string}   type  square | sine | sawtooth | triangle
 * @param {number}   dur   seconds
 * @param {number}   vol   0–1 relative volume
 * @param {number}   when  AudioContext time offset (default: now)
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
        env.gain.setValueAtTime(vol * 0.8, t + dur * 0.55);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(env);
        env.connect(actx().destination);
        osc.start(t);
        osc.stop(t + dur);
    } catch (_) {}
}

/* ── SFX library ───────────────────────────────────────────── */
const SFX = {
    /* UI */
    roll:    () => { tone(480,'square',0.07,0.05); tone(600,'square',0.07,0.04,0.04); },
    lock:    () => { tone(260,'triangle',0.18,0.05); tone(330,'triangle',0.12,0.04,0.10); },
    start:   () => {
        tone(440,'sine',0.15,0.05); tone(550,'sine',0.20,0.05,0.12);
        tone(660,'sine',0.35,0.05,0.25); tone(880,'sine',0.25,0.04,0.45);
    },

    /* Scenario — good */
    good: () => {
        tone(523,'sine',0.12,0.05); tone(659,'sine',0.16,0.05,0.10);
        tone(784,'sine',0.22,0.04,0.22);
    },

    /* Scenario — bad / hurt */
    bad: () => {
        tone(160,'sawtooth',0.14,0.07); tone(120,'sawtooth',0.22,0.07,0.10);
        tone(90, 'sawtooth',0.18,0.05,0.28);
    },

    /* Neutral */
    neutral: () => tone(380,'triangle',0.14,0.04),

    /* Loot found */
    loot: () => {
        [523,659,784,1047].forEach((f, i) => tone(f,'sine',0.12,0.04, i*0.07));
    },

    /* Combat strike */
    strike: () => {
        tone(180,'sawtooth',0.10,0.07); tone(140,'sawtooth',0.20,0.06,0.06);
    },

    /* Heavy monster hit */
    heavyHit: () => {
        tone(100,'sawtooth',0.18,0.08); tone(70,'sawtooth',0.28,0.07,0.10);
        tone(50,'square',0.20,0.06,0.25);
    },

    /* Flee success */
    flee: () => { tone(330,'triangle',0.08,0.04); tone(440,'triangle',0.12,0.04,0.08); },

    /* Victory fanfare */
    victory: () => {
        const seq = [[523,0],[659,0.18],[784,0.36],[1047,0.54],
                     [784,0.80],[880,0.96],[1047,1.18],[1397,1.40]];
        seq.forEach(([f,t]) => tone(f,'sine',0.22,0.05,t));
    },

    /* Defeat dirge */
    death: () => {
        tone(220,'sawtooth',0.40,0.07);
        tone(185,'sawtooth',0.35,0.06,0.35);
        tone(147,'sawtooth',0.50,0.07,0.65);
        tone(110,'sawtooth',0.70,0.06,1.10);
    },

    /* The Great Honk — approximated goose honk */
    honk: () => {
        // Harsh nasal buzz, pitch bending upward like a goose
        try {
            const ctx = actx();
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
            osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.50);
            env.gain.setValueAtTime(0, ctx.currentTime);
            env.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.04);
            env.gain.setValueAtTime(0.14, ctx.currentTime + 0.28);
            env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
            osc.connect(env); env.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.55);
        } catch (_) {}
    },
    doubleHonk: () => {
        SFX.honk();
        setTimeout(SFX.honk, 620);
    },
};

/* ── Background music ──────────────────────────────────────── */
let bgStarted = false;

function startBgMusic() {
    if (bgStarted) return;
    bgStarted = true;

    const ctx = actx();
    const master = ctx.createGain();
    master.gain.value = 0.0196;    // very soft overall (-30%)
    master.connect(ctx.destination);

    /*
     * A-minor / Dorian — medieval bard melody
     * Notes: A3=440, B3=493.88, C4=523.25, D4=587.33, E4=659.25
     *        F4=698.46, G4=784.00, A4=880
     *        Lower: E3=329.63, G3=392, A2=220
     *
     * Format: [frequency_Hz, duration_in_beats]
     * Tempo: 78 BPM → 1 beat = 0.769s
     */
    const BPM   = 78;
    const B     = 60 / BPM;   // seconds per beat

    const A2=220, E3=329.63, G3=392, A3=440, B3=493.88,
          C4=523.25, D4=587.33, E4=659.25, F4=698.46, G4=784;

    // Melody — two 8-bar phrases that loop
    const MEL = [
        // Phrase 1 — gentle opening
        [A3,1],[C4,0.5],[D4,0.5],[E4,1],[D4,1],
        [C4,1],[B3,0.5],[A3,0.5],[B3,1],[G3,1],
        [A3,1],[B3,0.5],[C4,0.5],[D4,1],[C4,1],
        [B3,1],[A3,0.5],[G3,0.5],[A3,2],
        // Phrase 2 — rises and resolves
        [E4,1],[D4,0.5],[E4,0.5],[F4,1],[E4,1],
        [D4,1],[C4,0.5],[B3,0.5],[A3,1],[B3,1],
        [C4,1],[D4,1],[E4,0.5],[D4,0.5],[C4,1],[B3,1],
        [A3,1],[G3,1],[A3,0.5],[B3,0.5],[A3,3],
    ];

    // Bass/drone — slow, simple counter-melody
    const BASS = [
        [A2,4],[E3,4],[G3,2],[A2,2],
        [A2,4],[G3,4],[E3,4],[A2,4],
    ];

    const melTotalBeats = MEL.reduce((s,[,d])=>s+d,0);
    const basTotalBeats = BASS.reduce((s,[,d])=>s+d,0);

    function scheduleVoice(notes, startTime, type, vol, sustainMul = 0.78) {
        let t = startTime;
        notes.forEach(([freq, dur]) => {
            const noteDur = dur * B * sustainMul;
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(vol, t + 0.018);
            env.gain.setValueAtTime(vol * 0.65, t + noteDur * 0.55);
            env.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
            osc.connect(env); env.connect(master);
            osc.start(t); osc.stop(t + noteDur);
            t += dur * B;
        });
        return t;
    }

    let melStart = ctx.currentTime + 0.30;
    let basStart = ctx.currentTime + 0.30;

    function loop() {
        scheduleVoice(MEL,  melStart, 'square',   1.0, 0.80);
        scheduleVoice(BASS, basStart, 'triangle', 0.55, 0.60);

        melStart += melTotalBeats * B;
        basStart += basTotalBeats * B;

        // Re-schedule 1.5s before the loop ends
        const delay = Math.min(melTotalBeats, basTotalBeats) * B - 1.5;
        setTimeout(loop, delay * 1000);
    }

    loop();
}

/* ═══════════════════════════════════════════════════════════════
   SCREEN SHAKE
   ═══════════════════════════════════════════════════════════════ */
function shake() {
    const el = document.getElementById('frame-wrap');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

/* ═══════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════ */
let party    = [null, null, null];
let turn     = 0;
let maxTurns = 0;

/* ═══════════════════════════════════════════════════════════════
   INIT
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

/* Show intro → setup */
function enterWood() {
    startBgMusic();
    SFX.start();
    showScreen('screen-setup');
    showCtrl('ctrl-setup');
}

/* ═══════════════════════════════════════════════════════════════
   PARTY GENERATION
   ═══════════════════════════════════════════════════════════════ */
function rollParty() {
    party = party.map(h => (h && h.locked) ? h : makeHero());
    renderSetup();
}

function makeHero() {
    const race = pick(GAME_DATA.races);
    const cls  = pick(GAME_DATA.classes);
    const hp   = clamp(race.hp + cls.hpB + rand(0,18), 10, 999);
    return {
        name:   pick(race.names),
        race:   race.name,
        job:    cls.name,
        hp,     maxHp: hp,
        str:    clamp(race.str + cls.strB + rand(0,6), 1, 99),
        int:    clamp(race.int + cls.intB + rand(0,6), 1, 99),
        items:  [],
        locked: false
    };
}

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
            <span class="slot-name">${h.name}</span>
            <span class="slot-sub">${h.race}</span>
            <span class="slot-sub">${h.job}</span>
            <span class="slot-stats">HP:${h.hp} STR:${h.str} INT:${h.int}</span>
            <button class="px-btn" onclick="toggleLock(${i})">${h.locked ? '🔒 BOUND' : '🔓 BIND'}</button>
        `;
        container.appendChild(div);
    });
}

/* ═══════════════════════════════════════════════════════════════
   GAME START
   ═══════════════════════════════════════════════════════════════ */
function startGame() {
    SFX.start();
    turn     = 0;
    maxTurns = rand(20, 200);

    showScreen('screen-play');
    showCtrl('ctrl-play');

    log('Thou steppest beyond the ancient gate into the Darkwood...', 'dim');
    log(`${maxTurns} trials await ere the far shore. May the Old Gods be with thee.`, 'dim');

    nextTurn();
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LOOP
   ═══════════════════════════════════════════════════════════════ */
function nextTurn() {
    turn++;
    renderStats();

    if (turn >= maxTurns)             return endGame(true);
    if (party.every(h => h.hp <= 0)) return endGame(false);

    // Occasional ambient flavour lines (15% chance)
    if (Math.random() < 0.15) {
        log(pick(GAME_DATA.ambience));
    }

    Math.random() < 0.35 ? doCombat() : doScenario();
}

/* ═══════════════════════════════════════════════════════════════
   SCENARIO
   ═══════════════════════════════════════════════════════════════ */
function doScenario() {
    const ev = pick(GAME_DATA.scenarios);
    log('— ' + ev.text, 'pale');
    setChoices(ev.options.map((opt, i) => ({
        label: `[${i+1}] ${opt.text}`,
        action: () => resolveScenario(opt)
    })));
}

function resolveScenario(opt) {
    const h = aliveHero();
    if (!h) return;

    if (opt.damage) {
        h.hp -= opt.damage;
        SFX.bad(); shake();
    }
    if (opt.bonus?.hp)  { h.hp  = Math.min(h.hp + opt.bonus.hp, h.maxHp); SFX.good(); }
    if (opt.bonus?.str) { h.str += opt.bonus.str; SFX.good(); }
    if (opt.bonus?.int) { h.int += opt.bonus.int; SFX.good(); }
    if (opt.item)         giveLoot(h);
    if (!opt.damage && !opt.bonus && !opt.item) SFX.neutral();

    log(`› ${h.name}: ${opt.effect}`);
    setTimeout(nextTurn, 40);
}

/* ═══════════════════════════════════════════════════════════════
   COMBAT
   ═══════════════════════════════════════════════════════════════ */
function doCombat() {
    const m = pick(GAME_DATA.monsters);

    // ── Special: The Great Honk of Death ──
    if (m.special === 'honk') return doHonkEncounter();

    const icon = m.icon || '👾';
    log(`⚔ ${icon} ${m.name} emergeth from the darkness!`);

    // Monster battle-cry (25% chance)
    if (m.taunts && Math.random() < 0.25) {
        log(`› "${pick(m.taunts)}"`, 'dim');
    }

    setChoices([
        { label: '[1] Strike it down!', action: () => doFight(m) },
        { label: '[2] Flee in terror!', action: () => doFlee(m)  },
    ]);
}

function doFight(m) {
    const h = aliveHero();
    if (!h) return;
    h.hp -= m.str;
    log(`${h.name} takes ${m.str} wounds from ${m.name}!`);

    m.str > 20 ? SFX.heavyHit() : SFX.strike();
    shake();

    if (Math.random() < m.loot) giveLoot(h);

    // Monster boon (enchantment / strange gift)
    if (m.boon && Math.random() < 0.28) {
        if (m.boon.hp)  h.hp  = Math.min(h.hp  + m.boon.hp,  h.maxHp);
        if (m.boon.str) h.str += m.boon.str;
        if (m.boon.int) h.int += m.boon.int;
        log(`Strange magic from ${m.name} floods into ${h.name}!`);
        SFX.good();
    }

    setTimeout(nextTurn, 650);
}

function doFlee(m) {
    if (Math.random() > 0.45) {
        log(`${aliveHero()?.name ?? 'Thy party'} escapes into the undergrowth!`);
        SFX.flee();
        setTimeout(nextTurn, 40);
    } else {
        log(`The ${m.name} cuts off thy retreat!`);
        doFight(m);
    }
}

/* ═══════════════════════════════════════════════════════════════
   ✦ THE GREAT HONK OF DEATH — Legendary Encounter ✦
   ═══════════════════════════════════════════════════════════════ */
function doHonkEncounter() {
    clearChoices();
    SFX.doubleHonk();

    // Sequential atmospheric lines
    const lines = [
        { t: 0,    text: 'The forest falleth utterly silent.', style: 'pale' },
        { t: 900,  text: 'A shadow crosseth the canopy overhead.', style: 'pale' },
        { t: 1900, text: 'From the mists emergeth... THE GREAT HONK OF DEATH.', style: 'blood' },
        { t: 2900, text: '🪿 It regardeth thee with one terrible, ancient eye.', style: 'blood' },
        { t: 3800, text: '"Men have wept at its passing. Armies have broken and fled.', style: 'dim' },
        { t: 4600, text: '"Scholars who beheld it could not sleep thereafter for a fortnight."', style: 'dim' },
    ];

    lines.forEach(({ t, text, style }) => setTimeout(() => log(text, style), t));

    // Play honk sound mid-reveal
    setTimeout(() => SFX.honk(), 2800);

    // Show choices after reveal
    setTimeout(() => {
        setChoices([
            { label: '[1] Stand thy ground and fight!', action: fightHonk },
            { label: '[2] Flee for thy very life!',    action: fleeHonk  },
        ]);
    }, 5400);
}

function fightHonk() {
    log('Thou raisest thy weapon against the eternal goose...', 'dim');
    SFX.honk();
    setTimeout(() => {
        if (Math.random() < 0.80) {
            // 80% — total annihilation
            party.forEach(h => { h.hp = 0; });
            SFX.death();
            shake(); shake();
            setTimeout(() => {
                log('HONK.', 'blood');
                log('Thy fellowship is unmade. The Great Honk is eternal.', 'blood');
                setTimeout(() => endGame(false), 1800);
            }, 600);
        } else {
            // 20% — miraculous survival
            party.forEach(h => { if (h.hp > 0) h.hp = Math.max(1, Math.floor(h.hp * 0.08)); });
            log('The Goose... tires of thee. Thou hast survived — a miracle known to no other.', 'pale');
            SFX.victory();
            setTimeout(nextTurn, 1200);
        }
    }, 1200);
}

function fleeHonk() {
    log('Thou turnest and runnest as thou hast never run before!', 'pale');
    SFX.flee();
    setTimeout(() => {
        if (Math.random() < 0.50) {
            log('Somehow, impossibly, thou escapest. The honk fades behind thee... for now.', 'dim');
            setTimeout(nextTurn, 800);
        } else {
            log('THE GREAT HONK FINDETH THEE.', 'blood');
            SFX.doubleHonk();
            setTimeout(fightHonk, 1200);
        }
    }, 900);
}

/* ═══════════════════════════════════════════════════════════════
   LOOT
   ═══════════════════════════════════════════════════════════════ */
function giveLoot(h) {
    const item = pick(GAME_DATA.items);
    h.items.push(item.name);
    h[item.stat] += item.val;
    log(`${h.name} found ✦ ${item.name}! (+${item.val} ${item.stat.toUpperCase()})`);
    SFX.loot();
}

/* ═══════════════════════════════════════════════════════════════
   END GAME
   ═══════════════════════════════════════════════════════════════ */
function endGame(won) {
    showScreen('screen-end');
    showCtrl('ctrl-end');

    const endEl = document.getElementById('screen-end');
    endEl.className = `screen ${won ? 'victory' : 'defeat'}`;

    const titleEl   = document.getElementById('end-title');
    const flavourEl = document.getElementById('end-flavour');

    if (won) {
        SFX.victory();
        titleEl.textContent   = '✦ VICTORY ✦';
        flavourEl.textContent = pick(GAME_DATA.victoryLines);
    } else {
        SFX.death();
        titleEl.textContent   = '✧ DEFEAT ✧';
        flavourEl.textContent = pick(GAME_DATA.defeatLines);
    }

    // Save to local highscore
    const scores = JSON.parse(localStorage.getItem('norrt_scores') || '[]');
    scores.push({ turns: turn, won, date: new Date().toLocaleDateString('sv-SE') });
    scores.sort((a, b) => (a.won !== b.won) ? (a.won ? -1 : 1) : b.turns - a.turns);
    localStorage.setItem('norrt_scores', JSON.stringify(scores.slice(0, 50)));

    const listEl = document.getElementById('highscore-list');
    listEl.innerHTML = scores.map((s, i) =>
        `<p style="color:${s.won ? 'var(--gold)' : 'var(--dim)'}">` +
        `${i+1}. ${s.won ? '✦' : '✧'} ${s.turns} trials · ${s.date}</p>`
    ).join('');
}

/* ═══════════════════════════════════════════════════════════════
   RENDER HELPERS
   ═══════════════════════════════════════════════════════════════ */

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showCtrl(id) {
    ['ctrl-intro','ctrl-setup','ctrl-play','ctrl-end'].forEach(c =>
        document.getElementById(c).classList.toggle('hidden', c !== id)
    );
}

/**
 * Append a line to the game log.
 * style: 'pale' (default white) | 'blood' (red) | 'dim' (grey)
 * Colours are intentionally limited: white for most events,
 * red only for deaths / The Great Honk. Flashing + SFX carry the rest.
 */
function log(text, style = 'pale') {
    const el = document.getElementById('game-log');
    const p  = document.createElement('p');
    p.style.color =
        style === 'blood' ? 'var(--blood)' :
        style === 'dim'   ? 'var(--dim)'   :
        'var(--pale)';
    p.textContent = text;
    el.insertAdjacentElement('afterbegin', p);
}

function setChoices(choices) {
    const el = document.getElementById('ctrl-play');
    el.innerHTML = '';
    choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className   = 'px-btn';
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
            <span class="stat-name">${h.name}</span>
            ${dead
                ? '<span class="stat-dead">✝ SLAIN</span>'
                : `HP:${h.hp}/${h.maxHp}<br>STR:${h.str} INT:${h.int}`}
            <span class="stat-item">${h.items.at(-1) ?? '—'}</span>
        </div>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function aliveHero() {
    const alive = party.filter(h => h.hp > 0);
    return alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
}
