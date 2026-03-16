/**
 * GAME.JS — Norrtounia: The Dark Forest  v0.7
 * ─────────────────────────────────────────────────────────────────
 * New in v0.7:
 *  • New stats: CHA (Charisma), STA (Stamina), LCK (Luck)
 *  • Gender stat modifiers
 *  • Race resistances applied in combat
 *  • Individual turn-based combat with initiative ordering
 *  • Monster HP tracked across multiple battle turns
 *  • Critical strike (DEX + LCK based)
 *  • Per-hero morality (shifts with choices, affects leadership)
 *  • Party leader (highest leadership) shown with crown; only leader flees
 *  • Charm mechanic (CHA-based, once per battle)
 *  • Uneventful turns (walking / resting / foraging)
 *  • Gold and Gems written in full in the UI
 *  • All stats shown in hover tooltip on portrait cards
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. PORTRAIT SPRITE SYSTEM  (unchanged from v0.6)
   ═══════════════════════════════════════════════════════════════ */
const PORTRAIT = {
    SHEET_W:1024, SHEET_H:1024, DISPLAY_W:60, DISPLAY_H:78,
    COL_X: [22,  113, 202, 290, 380, 469, 560, 649, 739, 830, 918],
    COL_W: [81,   78,  78,  79,  78,  81,  79,  79,  81,  78,  83],
    ROW_Y: [43,  141, 242, 348, 460, 572, 682, 799, 908],
    ROW_H: [97,  100, 105, 111, 111, 109, 116, 108,  97],
    RACE_COL:{
        'Human':{'male':0,'female':1},'High Elf':{'male':2,'female':2},
        'Wood Elf':{'male':3,'female':3},'Mountain Dwarf':{'male':4,'female':4},
        'Hill Dwarf':{'male':5,'female':5},'Halfling':{'male':6,'female':6},
        'Gnome':{'male':7,'female':7},'Orc':{'male':8,'female':8},
        'Half-Orc':{'male':9,'female':9},'Tiefling':{'male':10,'female':10},
    },
    ARCHETYPE_ROW:{ warrior:[0,1], rogue:[2,3], mage:[4,5], holy:[6,7], hybrid:[8,8] },
    CLASS_ARCHETYPE:{
        'Knight':'warrior','Fighter':'warrior','Barbarian':'warrior',
        'Blood Knight':'warrior','Templar':'warrior',
        'Rogue':'rogue','Dark Rogue':'rogue','Shadow Dancer':'rogue',
        'Ranger':'rogue','Arcane Archer':'rogue',
        'Wizard':'mage','Sorcerer':'mage','Necromancer':'mage',
        'Pyromancer':'mage','Void Walker':'mage',
        'Cleric':'holy','Paladin':'holy','Druid':'holy','Warden':'holy','Shaman':'holy',
        'Warlock':'hybrid','Bard':'hybrid','Battle Mage':'hybrid','Monk':'hybrid',
    },
};

function portraitStyle(hero) {
    const P=PORTRAIT, rc=P.RACE_COL[hero.race]??{male:0,female:1};
    const col=hero.gender===0?rc.male:rc.female;
    const arch=P.CLASS_ARCHETYPE[hero.job]??'warrior';
    const row=(P.ARCHETYPE_ROW[arch]??[0,0])[hero.gender??0];
    const srcX=P.COL_X[col]??0, srcY=P.ROW_Y[row]??0;
    const srcW=P.COL_W[col]??80, srcH=P.ROW_H[row]??100;
    const sx=P.DISPLAY_W/srcW, sy=P.DISPLAY_H/srcH;
    return [
        `background-image:url('portraits.png')`,
        `background-repeat:no-repeat`,
        `background-size:${(P.SHEET_W*sx).toFixed(1)}px ${(P.SHEET_H*sy).toFixed(1)}px`,
        `background-position:${-(srcX*sx).toFixed(1)}px ${-(srcY*sy).toFixed(1)}px`,
        `image-rendering:pixelated`,
        `width:${P.DISPLAY_W}px`,
        `height:${P.DISPLAY_H}px`,
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

function tone(freq, type='square', dur=0.12, vol=0.06, when=0) {
    try {
        const ctx=actx(), t=ctx.currentTime+when;
        const osc=ctx.createOscillator(), env=ctx.createGain();
        osc.type=type; osc.frequency.value=freq;
        env.gain.setValueAtTime(0,t);
        env.gain.linearRampToValueAtTime(vol,t+0.012);
        env.gain.setValueAtTime(vol*0.80,t+dur*0.55);
        env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
        osc.connect(env); env.connect(actx().destination);
        osc.start(t); osc.stop(t+dur);
    } catch(_){}
}

const SFX = {
    roll:     ()=>{ tone(480,'square',0.07,0.05); tone(600,'square',0.07,0.04,0.04); },
    lock:     ()=>{ tone(260,'triangle',0.18,0.05); tone(330,'triangle',0.12,0.04,0.10); },
    start:    ()=>{ [440,550,660,880].forEach((f,i)=>tone(f,'sine',0.15+i*0.05,0.05,i*0.13)); },
    levelUp:  ()=>{ [523,659,784,1047,1319].forEach((f,i)=>tone(f,'sine',0.18,0.06,i*0.10)); },
    good:     ()=>{ tone(523,'sine',0.12,0.05); tone(659,'sine',0.16,0.05,0.10); tone(784,'sine',0.22,0.04,0.22); },
    bad:      ()=>{ tone(160,'sawtooth',0.14,0.07); tone(120,'sawtooth',0.22,0.07,0.10); tone(90,'sawtooth',0.18,0.05,0.28); },
    neutral:  ()=>tone(380,'triangle',0.14,0.04),
    loot:     ()=>{ [523,659,784,1047].forEach((f,i)=>tone(f,'sine',0.12,0.04,i*0.07)); },
    heal:     ()=>tone(440,'sine',0.18,0.03),
    strike:   ()=>{ tone(180,'sawtooth',0.10,0.07); tone(140,'sawtooth',0.20,0.06,0.06); },
    crit:     ()=>{ tone(550,'square',0.08,0.07); tone(880,'sine',0.18,0.06,0.06); tone(1100,'sine',0.12,0.05,0.16); },
    heavyHit: ()=>{ tone(100,'sawtooth',0.18,0.08); tone(70,'sawtooth',0.28,0.07,0.10); tone(50,'square',0.20,0.06,0.25); },
    dodge:    ()=>tone(660,'triangle',0.12,0.04),
    charm:    ()=>{ tone(880,'sine',0.12,0.04); tone(1108,'sine',0.20,0.04,0.10); tone(660,'sine',0.18,0.03,0.25); },
    flee:     ()=>{ tone(330,'triangle',0.08,0.04); tone(440,'triangle',0.12,0.04,0.08); },
    treasury: ()=>{ [660,784,880].forEach((f,i)=>tone(f,'sine',0.15,0.04,i*0.08)); },
    victory:  ()=>{ [[523,0],[659,.18],[784,.36],[1047,.54],[784,.80],[880,.96],[1047,1.18],[1397,1.40]].forEach(([f,t])=>tone(f,'sine',0.22,0.05,t)); },
    death:    ()=>{ [220,185,147,110].forEach((f,i)=>tone(f,'sawtooth',0.4+i*0.1,0.07,i*0.38)); },
    honk: ()=>{
        try {
            const ctx=actx(),osc=ctx.createOscillator(),env=ctx.createGain();
            osc.type='sawtooth';
            osc.frequency.setValueAtTime(220,ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440,ctx.currentTime+0.25);
            osc.frequency.exponentialRampToValueAtTime(330,ctx.currentTime+0.50);
            env.gain.setValueAtTime(0,ctx.currentTime);
            env.gain.linearRampToValueAtTime(0.14,ctx.currentTime+0.04);
            env.gain.setValueAtTime(0.14,ctx.currentTime+0.28);
            env.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.55);
            osc.connect(env); env.connect(actx().destination);
            osc.start(); osc.stop(ctx.currentTime+0.55);
        } catch(_){}
    },
    doubleHonk:()=>{ SFX.honk(); setTimeout(SFX.honk,620); },
};

/* ═══════════════════════════════════════════════════════════════
   3. BACKGROUND MUSIC — 5 tracks (unchanged from v0.6)
   ═══════════════════════════════════════════════════════════════ */
let bgStarted=false, bgMaster=null;
const N={
    A2:110,B2:123.5,C3:130.8,D3:146.8,E3:164.8,F3:174.6,
    Fs3:185,G3:196,Ab3:207.7,A3:220,Bb3:233.1,B3:246.9,
    C4:261.6,Cs4:277.2,D4:293.7,Ds4:311.1,E4:329.6,F4:349.2,
    Fs4:370,G4:392,Ab4:415.3,A4:440,Bb4:466.2,B4:493.9,
    C5:523.3,D5:587.3,E5:659.3,G5:784,
};
const MUSIC_TRACKS=[
    {bpm:78,melVol:1.0,bassVol:0.55,melType:'square',bassType:'triangle',
     mel:[[N.A3,1],[N.C4,.5],[N.D4,.5],[N.E4,1],[N.D4,1],[N.C4,1],[N.B3,.5],[N.A3,.5],[N.B3,1],[N.G3,1],[N.A3,1],[N.B3,.5],[N.C4,.5],[N.D4,1],[N.C4,1],[N.B3,1],[N.A3,.5],[N.G3,.5],[N.A3,2],[N.E4,1],[N.D4,.5],[N.E4,.5],[N.F4,1],[N.E4,1],[N.D4,1],[N.C4,.5],[N.B3,.5],[N.A3,1],[N.B3,1],[N.C4,1],[N.D4,1],[N.E4,.5],[N.D4,.5],[N.C4,1],[N.B3,1],[N.A3,1],[N.G3,1],[N.A3,.5],[N.B3,.5],[N.A3,3]],
     bass:[[N.A2,4],[N.E3,4],[N.G3,2],[N.A2,2],[N.A2,4],[N.G3,4],[N.E3,4],[N.A2,4]]},
    {bpm:62,melVol:0.85,bassVol:0.50,melType:'square',bassType:'triangle',
     mel:[[N.D4,2],[N.C4,1],[N.Bb3,1],[N.A3,2],[N.G3,1],[N.A3,1],[N.D4,2],[N.F3,1],[N.G3,1],[N.A3,4],[N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],[N.F3,2],[N.G3,2],[N.A3,2],[N.D3,4],[N.A3,1],[N.Bb3,1],[N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],[N.F3,2],[N.G3,1],[N.A3,1],[N.D3,4]],
     bass:[[N.D3,4],[N.C3,4],[N.Bb2,4],[N.A2,4],[N.D3,4],[N.A2,4],[N.Bb2,2],[N.C3,2],[N.D3,4]]},
    {bpm:96,melVol:0.90,bassVol:0.45,melType:'square',bassType:'triangle',
     mel:[[N.G3,.5],[N.A3,.5],[N.B3,1],[N.D4,1],[N.E4,.5],[N.D4,.5],[N.B3,1],[N.A3,1],[N.G3,.5],[N.B3,.5],[N.D4,1],[N.G4,2],[N.E4,1],[N.D4,1],[N.C4,.5],[N.D4,.5],[N.E4,1],[N.D4,1],[N.C4,.5],[N.B3,.5],[N.A3,1],[N.G3,1],[N.B3,.5],[N.A3,.5],[N.G3,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.G3,2],[N.D4,.5],[N.E4,.5],[N.Fs4,1],[N.G4,1],[N.E4,.5],[N.D4,.5],[N.B3,2],[N.A3,.5],[N.B3,.5],[N.C4,1],[N.D4,2],[N.C4,1],[N.B3,1],[N.A3,2]],
     bass:[[N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2],[N.G3,2],[N.C3,2],[N.D3,4],[N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2]]},
    {bpm:55,melVol:0.80,bassVol:0.55,melType:'square',bassType:'triangle',
     mel:[[N.B3,2],[N.A3,1],[N.Fs3,1],[N.E3,2],[N.D3,1],[N.E3,1],[N.Fs3,2],[N.A3,2],[N.B3,4],[N.D4,2],[N.B3,1],[N.A3,1],[N.Fs3,2],[N.E3,2],[N.D3,2],[N.E3,1],[N.Fs3,1],[N.B2,4],[N.B3,1],[N.A3,1],[N.G3,1],[N.Fs3,1],[N.E3,2],[N.D3,2],[N.E3,2],[N.Fs3,2],[N.B2,4]],
     bass:[[N.B2,4],[N.A2,4],[N.Fs3,4],[N.B2,4],[N.B2,4],[N.E3,4],[N.Fs3,2],[N.B2,6]]},
    {bpm:70,melVol:0.90,bassVol:0.50,melType:'square',bassType:'triangle',
     mel:[[N.E4,1.5],[N.D4,.5],[N.E4,1],[N.Cs4,1],[N.B3,2],[N.A3,1],[N.B3,.5],[N.Cs4,.5],[N.D4,1],[N.E4,1],[N.Fs4,1],[N.G4,1],[N.A4,2],[N.G4,1],[N.Fs4,1],[N.E4,2],[N.D4,2],[N.B3,1],[N.Cs4,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.E3,2],[N.Fs3,1],[N.G3,1],[N.A3,2],[N.B3,1],[N.Cs4,1],[N.D4,2],[N.E4,1],[N.D4,1],[N.Cs4,1],[N.B3,1],[N.A3,4]],
     bass:[[N.E3,4],[N.A3,4],[N.Fs3,4],[N.E3,4],[N.A2,4],[N.B2,4],[N.E3,4],[N.A2,4]]},
];

function startBgMusic() {
    if (bgStarted) return;
    bgStarted=true;
    bgMaster=actx().createGain();
    bgMaster.gain.value=0.0196;
    bgMaster.connect(actx().destination);
    playNextTrack();
}
function playNextTrack() {
    const ctx=actx(), track=pick(MUSIC_TRACKS), B=60/track.bpm;
    function sv(notes,t0,type,vol,sus=0.78) {
        let t=t0;
        notes.forEach(([freq,beats])=>{
            const dur=beats*B*sus;
            const osc=ctx.createOscillator(),env=ctx.createGain();
            osc.type=type; osc.frequency.value=freq;
            env.gain.setValueAtTime(0,t);
            env.gain.linearRampToValueAtTime(vol,t+0.018);
            env.gain.setValueAtTime(vol*0.65,t+dur*0.55);
            env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
            osc.connect(env); env.connect(bgMaster);
            osc.start(t); osc.stop(t+dur);
            t+=beats*B;
        });
        return t;
    }
    const t0=ctx.currentTime+0.25;
    const mb=track.mel.reduce((s,[,d])=>s+d,0);
    const bb=track.bass.reduce((s,[,d])=>s+d,0);
    sv(track.mel, t0,track.melType, track.melVol, 0.80);
    sv(track.bass,t0,track.bassType,track.bassVol,0.60);
    setTimeout(playNextTrack,(Math.max(mb,bb)*B-0.10)*1000);
}

/* ═══════════════════════════════════════════════════════════════
   4. SCREEN SHAKE
   ═══════════════════════════════════════════════════════════════ */
function shake() {
    const el=document.getElementById('frame-wrap');
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}

/* ═══════════════════════════════════════════════════════════════
   5. GAME STATE
   ═══════════════════════════════════════════════════════════════ */
const MAX_TURNS = 100;
let party    = [null, null, null];
let turn     = 0;
let teamName = '';
let treasury = { gold:0, gems:0 };

/* ── Battle state — lives only during a combat sequence ── */
const battle = {
    monster:   null,   // { ...monsterData, currentHp, maxHp, charmed }
    order:     [],     // [{ entity, type:'hero'|'monster', initiative }]
    turnIdx:   0,
    round:     1,
    active:    false,
    charmUsed: false,
};

/* ═══════════════════════════════════════════════════════════════
   6. INITIALISATION
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    rollParty();
    document.getElementById('btn-enter').addEventListener('click', enterWood);
    document.getElementById('btn-roll').addEventListener('click', ()=>{ SFX.roll(); rollParty(); });
    document.getElementById('btn-start').addEventListener('click', startGame);
    window.addEventListener('keydown', e=>{
        const k=e.key.toLowerCase();
        if (k==='r' && !document.getElementById('ctrl-setup').classList.contains('hidden')) {
            SFX.roll(); rollParty(); return;
        }
        if (['1','2','3'].includes(k)) {
            const btns=document.querySelectorAll('#ctrl-play .px-btn');
            const idx=+k-1;
            if (btns[idx] && !btns[idx].disabled) btns[idx].click();
        }
    });
});

function enterWood() {
    startBgMusic();
    SFX.start();
    const inp=document.getElementById('team-name-input');
    teamName=(inp?.value.trim())||'The Unnamed Fellowship';
    showScreen('screen-setup');
    showCtrl('ctrl-setup');
}

/* ═══════════════════════════════════════════════════════════════
   7. PARTY GENERATION & HERO CREATION
   ═══════════════════════════════════════════════════════════════ */
function rollParty() {
    party=party.map(h=>(h&&h.locked)?h:makeHero());
    detectPartyLeader();
    renderSetup();
}

/**
 * Build one hero with all stats (including new CHA/STA/LCK)
 * and apply gender modifiers.
 */
function makeHero() {
    const race = pick(GAME_DATA.races);
    const cls  = pick(GAME_DATA.classes);
    const g    = rand(0,1);   // 0=male, 1=female
    const gmod = g===0 ? GENDER_MOD.male : GENDER_MOD.female;

    const hp    = clamp(race.hp + cls.hpB + rand(0,18), 10, 999);
    const str   = clamp(race.str + cls.strB + rand(0,6) + gmod.str, 1, 99);
    const intel = clamp(race.int + cls.intB + rand(0,6), 1, 99);
    const dex   = clamp(race.dex + cls.dexB + rand(0,6), 1, 99);
    const cha   = clamp(race.cha + cls.chaB + rand(0,5) + gmod.cha, 1, 30);
    const sta   = clamp(race.sta + cls.staB + rand(0,5) + gmod.sta, 1, 30);
    const lck   = clamp(race.lck + cls.lckB + rand(0,5) + gmod.lck, 1, 30);

    // Leadership = class base + CHA bonus
    const leadership = clamp(cls.leadership + Math.floor((cha-10)/3), 1, 20);

    // Copy race resistances
    const resistances = { ...race.resistances };

    return {
        name:          pick(race.names),
        race:          race.name,
        job:           cls.name,
        gender:        g,
        hp, maxHp:     hp,
        str, int:      intel, dex,
        cha, sta, lck,
        leadership,
        morality:      clamp(cls.moralityStart + rand(-5,5), -50, 50),
        resistances,
        isLeader:      false,   // set by detectPartyLeader()
        lastInitiative:0,       // last rolled combat initiative
        level:         1,
        xp:            0,
        xpNext:        xpThreshold(1),
        bonusDmg:      0,
        primaryStat:   cls.primaryStat,
        damageType:    cls.damageType,
        attackNames:   cls.attackNames,
        items:         [],
        locked:        false,
    };
}

function xpThreshold(level) { return level * 60; }

/** Determine the hero with the highest leadership score and mark them. */
function detectPartyLeader() {
    const alive = party.filter(h=>h&&h.hp>0);
    if (!alive.length) { party.forEach(h=>{ if(h) h.isLeader=false; }); return; }
    // Apply morality bonus: morality > 50 → +2 leadership; < -50 → -2
    const effLeadership = h => h.leadership + (h.morality>50?2:h.morality<-50?-2:0);
    const leader = alive.reduce((best,h)=>effLeadership(h)>effLeadership(best)?h:best);
    party.forEach(h=>{ if(h) h.isLeader = (h===leader); });
}

function toggleLock(i) {
    SFX.lock();
    party[i].locked=!party[i].locked;
    renderSetup();
}

/* ── Setup screen ── */
function renderSetup() {
    const container=document.getElementById('party-slots');
    container.innerHTML='';
    party.forEach((h,i)=>{
        const div=document.createElement('div');
        div.className=`slot-card${h.locked?' locked':''}`;
        div.setAttribute('role','listitem');
        div.innerHTML=`
            <span class="slot-name">${h.isLeader?'👑 ':''}${h.name}</span>
            <span class="slot-sub">${h.race} · ${h.job}</span>
            <span class="slot-stats">HP:${h.hp} STR:${h.str} INT:${h.int} DEX:${h.dex}</span>
            <span class="slot-stats">CHA:${h.cha} STA:${h.sta} LCK:${h.lck}</span>
            <button class="bind-btn" onclick="toggleLock(${i})">${h.locked?'🔒 BOUND':'🔓 BIND'}</button>`;
        container.appendChild(div);
    });
    renderPortraitStrip();
}

/* ═══════════════════════════════════════════════════════════════
   8. PORTRAIT STRIP
   Main view: portrait sprite + HP + Initiative indicator
   Hover tooltip: all other stats + resistances + morality
   ═══════════════════════════════════════════════════════════════ */
function renderPortraitStrip() {
    const strip=document.getElementById('portrait-strip');
    if (!strip||strip.classList.contains('hidden')) return;

    strip.innerHTML=party.map((h,i)=>{
        const dead  = h.hp<=0;
        const spr   = portraitStyle(h);
        const hpPct = h.maxHp>0?h.hp/h.maxHp*100:0;
        const hpCol = hpPct>55?'#6abf45':hpPct>25?'#c8a040':'#aa3333';

        // Resistance summary for tooltip
        const resLines = Object.entries(h.resistances)
            .filter(([,v])=>v!==0)
            .map(([k,v])=>`${k}: ${v>0?'+':''}${v}%`)
            .join(' · ') || 'None';
        const moralLabel = h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
        const initLabel  = Math.floor((h.dex+h.lck)/4);

        const tooltip = `STR:${h.str} INT:${h.int} DEX:${h.dex}&#10;CHA:${h.cha} STA:${h.sta} LCK:${h.lck}&#10;Leadership:${h.leadership} Morality:${moralLabel}&#10;Initiative modifier:+${initLabel}&#10;Resistances: ${resLines}`;

        return `
        <div class="portrait-card${dead?' portrait-dead':''}" id="portrait-card-${i}" role="listitem">
            <div class="portrait-sprite-wrap">
                <div class="portrait-sprite" style="${spr}"></div>
                ${dead?'<div class="portrait-dead-x">✝</div>':''}
                ${h.isLeader?'<div class="leader-crown">👑</div>':''}
            </div>
            <div class="portrait-info">
                <span class="pi-name"><span class="pi-lv">Lv.${h.level}</span>${h.name}</span>
                <span class="pi-sub">${h.race} · ${h.job}</span>
                ${dead
                    ?`<span class="pi-dead">✝ SLAIN</span>`
                    :`<span class="pi-hp" style="color:${hpCol}">HP:${h.hp}/${h.maxHp}</span>
                      <span class="pi-init">INIT:+${initLabel}${h.lastInitiative?` (rolled ${h.lastInitiative})`:''}  </span>
                      <span class="pi-item">${h.items.at(-1)??'—'}</span>`
                }
                <div class="stat-tooltip" role="tooltip" aria-label="Hero stats">${tooltip.replace(/&#10;/g,'<br>')}</div>
            </div>
        </div>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   9. GAME START
   ═══════════════════════════════════════════════════════════════ */
function startGame() {
    SFX.start();
    turn=0; treasury={gold:0,gems:0};
    detectPartyLeader();
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
    detectPartyLeader();
    renderStats();
    renderTreasury();

    if (turn>MAX_TURNS)              return endGame(true);
    if (party.every(h=>h.hp<=0))    return endGame(false);

    if (Math.random()<0.15)  log(pick(GAME_DATA.ambience));
    if (Math.random()<0.10)  doTreasuryEvent();

    // Distribution: 30% combat, 55% scenario, 15% uneventful
    const r=Math.random();
    if      (r<0.30) doCombat();
    else if (r<0.85) doScenario();
    else             doUneventfulTurn();
}

/* ═══════════════════════════════════════════════════════════════
   11. PASSIVE HEALING  (STA affects heal rate)
   ═══════════════════════════════════════════════════════════════ */
function passiveHeal() {
    party.forEach(h=>{
        if (h.hp<=0||h.hp>=h.maxHp) return;
        // STA boosts base heal chance and amount
        const healChance = 0.40 + h.sta*0.015;
        if (Math.random()>healChance) return;
        const amount=Math.max(1,Math.floor(h.maxHp*(rand(1,3)+Math.floor(h.sta/5))/100));
        h.hp=Math.min(h.hp+amount,h.maxHp);
        log(pick(GAME_DATA.healFlavors).replace('{name}',h.name).replace('{hp}',`+${amount} HP`));
        SFX.heal();
    });
}

/* ═══════════════════════════════════════════════════════════════
   12. TREASURY EVENT  (LCK boosts find chance)
   ═══════════════════════════════════════════════════════════════ */
function doTreasuryEvent() {
    const gold=rand(5,50);
    const gems=Math.random()<0.35?rand(1,3):0;
    treasury.gold+=gold;
    treasury.gems+=gems;
    log(pick(GAME_DATA.treasuryFlavors));
    log(`✦ ${gold} gold coins${gems?` and ${gems} precious gem${gems>1?'s':''}`:''}  secured!`);
    SFX.treasury();
}

/* ═══════════════════════════════════════════════════════════════
   13. UNEVENTFUL TURN
   ═══════════════════════════════════════════════════════════════ */
function doUneventfulTurn() {
    const ev=pick(GAME_DATA.uneventfulEvents);
    logPrompt(ev.text);
    setChoices([
        {
            label:'[1] Press on through the wood',
            action:()=>{
                log(ev.pressOn);
                SFX.neutral();
                setTimeout(nextTurn,40);
            }
        },
        {
            label:'[2] Rest and recover',
            action:()=>{
                party.forEach(h=>{
                    if (h.hp<=0) return;
                    const heal=Math.max(2,Math.floor(h.maxHp*(0.06+h.sta*0.003)));
                    h.hp=Math.min(h.hp+heal,h.maxHp);
                    log(`${h.name} rests. +${heal} HP`);
                });
                log(ev.restFlavour);
                SFX.heal();
                setTimeout(nextTurn,40);
            }
        },
        {
            label:'[3] Search the surroundings',
            action:()=>{
                // LCK affects find chance
                const bestLck=Math.max(...party.filter(h=>h.hp>0).map(h=>h.lck));
                const chance=0.12+bestLck*0.008;
                log(ev.searchFlavour);
                if (Math.random()<chance) {
                    giveLoot();
                } else {
                    log('Naught of value is found here.');
                }
                SFX.neutral();
                setTimeout(nextTurn,40);
            }
        },
    ]);
}

/* ═══════════════════════════════════════════════════════════════
   14. SCENARIO
   ═══════════════════════════════════════════════════════════════ */
function doScenario() {
    const ev=pick(GAME_DATA.scenarios);
    logPrompt(ev.text);
    setChoices(ev.options.map((opt,i)=>({
        label:`[${i+1}] ${opt.text}`,
        action:()=>resolveScenario(opt),
    })));
}

function resolveScenario(opt) {
    const h=aliveHero();
    if (!h) return;
    if (opt.damage)     { h.hp-=opt.damage; SFX.bad(); shake(); }
    if (opt.bonus?.hp)  { h.hp=Math.min(h.hp+opt.bonus.hp,h.maxHp); SFX.good(); }
    if (opt.bonus?.str) { h.str+=opt.bonus.str; SFX.good(); }
    if (opt.bonus?.int) { h.int+=opt.bonus.int; SFX.good(); }
    if (opt.bonus?.dex) { h.dex+=opt.bonus.dex; SFX.good(); }
    if (opt.bonus?.cha) { h.cha+=opt.bonus.cha; SFX.good(); }
    if (opt.bonus?.sta) { h.sta+=opt.bonus.sta; SFX.good(); }
    if (opt.bonus?.lck) { h.lck+=opt.bonus.lck; SFX.good(); }
    if (opt.item)         giveLoot();
    if (!opt.damage&&!opt.bonus&&!opt.item) SFX.neutral();
    // Morality shift
    if (opt.morality) updateMorality(h, opt.morality);
    log(`${h.name}: ${opt.effect}`);
    grantXP(h, opt.xp??15);
    setTimeout(nextTurn,40);
}

/* ═══════════════════════════════════════════════════════════════
   15. MORALITY
   ═══════════════════════════════════════════════════════════════ */
function updateMorality(hero, delta) {
    hero.morality=clamp(hero.morality+delta,-100,100);
}

/** Human-readable morality label */
function moralityLabel(m) {
    if (m>50)  return 'Righteous';
    if (m>20)  return 'Good';
    if (m>-20) return 'Neutral';
    if (m>-50) return 'Shadowed';
    return 'Corrupt';
}

/* ═══════════════════════════════════════════════════════════════
   16. COMBAT — individual turn system
   ═══════════════════════════════════════════════════════════════ */

function doCombat() {
    const base=pick(GAME_DATA.monsters);
    if (base.special==='honk') return doHonkEncounter();

    // Scale monster with turn progression (±35% random swing)
    const scaleMul=1+(turn/280)+(Math.random()*0.70-0.35);
    battle.monster={
        ...base,
        currentHp: Math.round(base.hp*scaleMul),
        maxHp:     Math.round(base.hp*scaleMul),
        str:       Math.max(1,Math.round(base.str*scaleMul)),
        charmed:   false,
    };
    battle.charmUsed=false;
    battle.round=1;
    battle.active=true;

    logPrompt(`${battle.monster.icon} ${battle.monster.name} emerges from the shadows!`);
    if (battle.monster.taunts&&Math.random()<0.30)
        log(pick(battle.monster.taunts));

    // ── Roll initiative ──────────────────────────────────────
    const order=[];
    party.filter(h=>h.hp>0).forEach(h=>{
        const roll=rollInitiative(h);
        h.lastInitiative=roll;
        order.push({entity:h, type:'hero', initiative:roll});
    });
    // Monster initiative: d12 + scaled from its base HP
    const mInit=rand(1,12)+Math.floor(battle.monster.maxHp/40);
    battle.monster.initiative=mInit;
    order.push({entity:battle.monster, type:'monster', initiative:mInit});
    order.sort((a,b)=>b.initiative-a.initiative);
    battle.order=[...order];
    battle.turnIdx=0;

    // Log initiative order
    const orderStr=order.map(e=>
        `${e.type==='hero'?e.entity.name:battle.monster.name}(${e.initiative})`
    ).join(' › ');
    log(`Initiative: ${orderStr}`);
    log(`━━━ Battle Round 1 ━━━`);

    processBattleTurn();
}

/**
 * Roll initiative for one hero.
 * d20 + DEX modifier + LCK modifier + leadership bonus for leader
 */
function rollInitiative(hero) {
    const base    = rand(1,20);
    const dexBonus= Math.floor(hero.dex/4);
    const lckBonus= Math.floor(hero.lck/5);
    const leadBonus= hero.isLeader?2:0;
    return base+dexBonus+lckBonus+leadBonus;
}

/**
 * Process the next entity's turn in the initiative order.
 * Skips dead entities. When all have acted, starts a new round.
 */
function processBattleTurn() {
    // Win / loss checks
    if (battle.monster.currentHp<=0) return endCombat(true);
    if (party.every(h=>h.hp<=0))     return endGame(false);

    // Advance past dead entities (up to full order length attempts)
    let attempts=0;
    while (attempts<battle.order.length) {
        const cur=battle.order[battle.turnIdx];
        const isDead=cur.type==='hero'
            ?cur.entity.hp<=0
            :battle.monster.currentHp<=0;
        if (!isDead) break;
        battle.turnIdx=(battle.turnIdx+1)%battle.order.length;
        if (battle.turnIdx===0) { battle.round++; log(`━━━ Battle Round ${battle.round} ━━━`); }
        attempts++;
    }
    if (attempts>=battle.order.length) return endCombat(false); // somehow stuck

    const cur=battle.order[battle.turnIdx];

    if (cur.type==='monster') {
        setTimeout(doMonsterTurn, 550);
    } else {
        showHeroAction(cur.entity);
    }
}

function advanceBattleTurn() {
    battle.turnIdx=(battle.turnIdx+1)%battle.order.length;
    if (battle.turnIdx===0) {
        battle.round++;
        log(`━━━ Battle Round ${battle.round} ━━━`);
    }
}

/* ── Monster's turn ── */
function doMonsterTurn() {
    if (battle.monster.currentHp<=0) return endCombat(true);
    if (party.every(h=>h.hp<=0))     return endGame(false);

    // Charmed — skip attack
    if (battle.monster.charmed) {
        battle.monster.charmed=false;
        log(`${battle.monster.name} is charmed — it hesitates and does nothing!`);
        SFX.charm();
        advanceBattleTurn();
        renderStats();
        setTimeout(processBattleTurn,400);
        return;
    }

    const target=aliveHero();
    if (!target) return endGame(false);

    // Apply resistance
    const mDmgType = battle.monster.damageType || 'physical';
    const res = target.resistances[mDmgType] ?? 0;
    const rawDmg = battle.monster.str+rand(-3,3);
    const damage = Math.max(1, Math.round(rawDmg*(1-res/100)));

    target.hp-=damage;
    if (res>0) {
        log(`${battle.monster.name} strikes ${target.name}! ${damage} damage (${res}% resisted).`);
    } else {
        log(`${battle.monster.name} strikes ${target.name}! ${damage} damage.`);
    }
    battle.monster.str>24?SFX.heavyHit():SFX.strike();
    shake();

    advanceBattleTurn();
    renderStats();
    setTimeout(processBattleTurn,500);
}

/* ── Hero action prompt ── */
function showHeroAction(hero) {
    // Show monster health status
    const hpPct=battle.monster.currentHp/battle.monster.maxHp;
    const hpDesc=hpPct>0.75?'looks unharmed':hpPct>0.50?'is wounded':hpPct>0.25?'is badly hurt':'is near death';
    log(`${battle.monster.name} ${hpDesc}. (${battle.monster.currentHp}/${battle.monster.maxHp} HP)`);
    log(`${hero.isLeader?'👑 ':''}${hero.name}'s turn!`);

    const atkName=pick(hero.attackNames);
    const choices=[{
        label:`[1] ${atkName} the ${battle.monster.name}!`,
        action:()=>doHeroAttack(hero,atkName),
    }];

    // CHA-based charm (once per battle, CHA >= 13)
    if (!battle.charmUsed && hero.cha>=13) {
        const charmChance=Math.min(30,Math.round((hero.cha-12)*5));
        choices.push({
            label:`[2] Attempt to charm (${charmChance}% chance)`,
            action:()=>attemptCharm(hero),
        });
    }

    // Flee — only party leader
    if (hero.isLeader) {
        choices.push({
            label:`[${choices.length+1}] Attempt to flee (leader only)`,
            action:()=>attemptFlee(hero),
        });
    }

    setChoices(choices);
}

/* ── Hero attacks ── */
function doHeroAttack(hero, atkName) {
    const statVal=hero[hero.primaryStat];
    let damage=Math.max(1,
        Math.floor(statVal*0.50)+rand(1,Math.max(2,Math.floor(statVal*0.15)))+hero.bonusDmg);

    // Critical strike: chance = (DEX/2 + LCK/2) / 120, max 35%
    const critChance=Math.min(0.35,(hero.dex+hero.lck)/240);
    const isCrit=Math.random()<critChance;
    if (isCrit) { damage=Math.round(damage*1.75); }

    // Alignment bonus: good-aligned damage vs evil-aligned resistance
    const dmgInfo=DAMAGE_TYPES[hero.damageType]??DAMAGE_TYPES.physical;
    // (future: monster alignment resistance could apply here)

    battle.monster.currentHp-=damage;

    const critSpan=isCrit?` <span style="color:#ffe033;font-weight:bold">✦ CRITICAL!</span>`:'';
    logHTML(`${hero.name} uses ${atkName}! `+
            `<span style="color:${dmgInfo.color}">${damage} ${dmgInfo.label} damage</span>`+
            ` to ${battle.monster.name}.${critSpan}`);

    if (isCrit) { SFX.crit(); } else { battle.monster.str>24?SFX.heavyHit():SFX.strike(); }

    if (battle.monster.currentHp<=0) { return endCombat(true); }

    grantXP(hero, 8);   // small XP per hit
    advanceBattleTurn();
    renderStats();
    setTimeout(processBattleTurn,300);
}

/* ── Charm attempt ── */
function attemptCharm(hero) {
    battle.charmUsed=true;
    const chance=Math.min(0.30,(hero.cha-12)*0.05);
    if (Math.random()<chance) {
        battle.monster.charmed=true;
        log(`${hero.name} beguiles ${battle.monster.name}! It will lose its next action.`);
        SFX.charm();
        updateMorality(hero,3);
    } else {
        log(`${hero.name}'s charm fails against ${battle.monster.name}.`);
        SFX.neutral();
    }
    advanceBattleTurn();
    setTimeout(processBattleTurn,400);
}

/* ── Flee attempt (leader only) ── */
function attemptFlee(hero) {
    log(`${hero.name} rallies the fellowship to retreat...`);
    if (Math.random()>0.45) {
        log(`${hero.name} leads the party to safety!`);
        SFX.flee();
        battle.active=false;
        setTimeout(nextTurn,500);
    } else {
        log(`The ${battle.monster.name} cuts off the retreat!`,'blood');
        SFX.bad();
        advanceBattleTurn();
        setTimeout(processBattleTurn,400);
    }
}

/* ── End of combat ── */
function endCombat(won) {
    battle.active=false;
    if (party.every(h=>h.hp<=0)) return endGame(false);

    if (won) {
        log(`${battle.monster.name} is defeated!`);
        SFX.good();
        if (Math.random()<battle.monster.loot) giveLoot();
        if (battle.monster.boon&&Math.random()<0.25) {
            const h=aliveHero();
            if (h) {
                if (battle.monster.boon.hp)  h.hp=Math.min(h.hp+battle.monster.boon.hp,h.maxHp);
                if (battle.monster.boon.int) h.int+=battle.monster.boon.int;
                log(`Strange energy from ${battle.monster.name} flows into ${h.name}!`);
            }
        }
        // XP for the whole surviving party, scaled to monster difficulty
        const baseXP = battle.monster.xpValue??40;
        const scale  = battle.monster.str /
            (GAME_DATA.monsters.find(m=>m.name===battle.monster.name)?.str ?? battle.monster.str);
        const xpEach = Math.round(baseXP*(scale||1));
        party.filter(h=>h.hp>0).forEach(h=>grantXP(h,xpEach));
    }

    renderStats();
    setTimeout(nextTurn,700);
}

/* ═══════════════════════════════════════════════════════════════
   17. THE GREAT HONK OF DEATH
   ═══════════════════════════════════════════════════════════════ */
function doHonkEncounter() {
    clearChoices();
    SFX.doubleHonk();
    [{t:0,   text:'The forest falleth utterly silent.',                        style:'pale'},
     {t:900, text:'A shadow crosseth the canopy overhead.',                    style:'pale'},
     {t:1900,text:'From the mists emergeth... THE GREAT HONK OF DEATH.',       style:'blood'},
     {t:2900,text:'🪿 It regardeth thee with one terrible, ancient eye.',      style:'blood'},
     {t:3800,text:'"Men have wept at its passing. Armies have broken and fled.',style:'dim'},
     {t:4600,text:'"Scholars who beheld it could not sleep for a fortnight."',  style:'dim'},
    ].forEach(({t,text,style})=>setTimeout(()=>log(text,style),t));
    setTimeout(()=>SFX.honk(),2800);
    setTimeout(()=>setChoices([
        {label:'[1] Stand thy ground and fight!', action:fightHonk},
        {label:'[2] Flee for thy very life!',     action:fleeHonk},
    ]),5400);
}
function fightHonk() {
    log('Thou raisest thy weapon against the eternal goose...');
    SFX.honk();
    setTimeout(()=>{
        if (Math.random()<0.80) {
            party.forEach(h=>{h.hp=0;});
            SFX.death(); shake(); shake();
            setTimeout(()=>{ log('HONK.','blood'); log('Thy fellowship is unmade. The Great Honk is eternal.','blood'); setTimeout(()=>endGame(false),1800); },600);
        } else {
            party.forEach(h=>{if(h.hp>0) h.hp=Math.max(1,Math.floor(h.hp*0.08));});
            log('The Goose... tires of thee. A miracle known to no other.');
            party.forEach(h=>grantXP(h,500));
            SFX.victory();
            setTimeout(nextTurn,1200);
        }
    },1200);
}
function fleeHonk() {
    log('Thou turnest and runnest as thou hast never run before!');
    SFX.flee();
    setTimeout(()=>{
        if (Math.random()<0.50) { log('Somehow, impossibly, thou escapest. The honk fades... for now.'); setTimeout(nextTurn,800); }
        else { log('THE GREAT HONK FINDETH THEE.','blood'); SFX.doubleHonk(); setTimeout(fightHonk,1200); }
    },900);
}

/* ═══════════════════════════════════════════════════════════════
   18. LOOT — given to best-suited hero; LCK improves item quality
   ═══════════════════════════════════════════════════════════════ */
function giveLoot() {
    const item=pick(GAME_DATA.items);
    const recipient=getBestRecipient(item.stat);
    if (!recipient) return;
    recipient.items.push(item.name);
    recipient[item.stat]+=item.val;
    log(`${recipient.name} found ✦ ${item.name}! (+${item.val} ${item.stat.toUpperCase()})`);
    SFX.loot();
}

function getBestRecipient(stat) {
    const alive=party.filter(h=>h.hp>0);
    if (!alive.length) return null;
    if (stat==='hp') return alive.reduce((b,h)=>(h.hp/h.maxHp)<(b.hp/b.maxHp)?h:b);
    const primary=alive.filter(h=>h.primaryStat===stat);
    const pool=primary.length?primary:alive;
    return pool.reduce((b,h)=>h[stat]>b[stat]?h:b);
}

/* ═══════════════════════════════════════════════════════════════
   19. XP & LEVELLING
   ═══════════════════════════════════════════════════════════════ */
function grantXP(hero, amount) {
    if (!hero||hero.hp<=0) return;
    hero.xp+=amount;
    while (hero.xp>=hero.xpNext&&hero.level<100) {
        hero.xp-=hero.xpNext;
        hero.level+=1;
        hero.xpNext=xpThreshold(hero.level);
        doLevelUp(hero);
    }
}

function doLevelUp(hero) {
    SFX.levelUp();
    log(`✦ ${hero.name} reached Level ${hero.level}!`);
    const gains=[];
    const pg=rand(1,3);
    hero[hero.primaryStat]+=pg;
    gains.push({stat:hero.primaryStat.toUpperCase(),val:pg});
    const hg=rand(3,8);
    hero.maxHp+=hg; hero.hp=Math.min(hero.hp+hg,hero.maxHp);
    gains.push({stat:'HP',val:hg});
    if (Math.random()<0.40) {
        const sec=pick(['str','int','dex','cha','sta','lck'].filter(s=>s!==hero.primaryStat));
        const v=rand(1,2); hero[sec]+=v;
        gains.push({stat:sec.toUpperCase(),val:v});
    }
    if (hero.level%5===0) { hero.bonusDmg+=1; gains.push({stat:'DMG',val:1}); }
    // Update leadership
    hero.leadership=clamp(hero.leadership+Math.floor(hero.level/10),1,20);
    const idx=party.indexOf(hero);
    gains.forEach((g,i)=>setTimeout(()=>flashStatGain(idx,`+${g.val} ${g.stat}`,'#e8c45a'),i*320));
}

function flashStatGain(heroIndex, text, color) {
    const card=document.getElementById(`portrait-card-${heroIndex}`);
    if (!card) return;
    const el=document.createElement('div');
    el.className='stat-flash'; el.textContent=text; el.style.color=color;
    card.appendChild(el);
    setTimeout(()=>el.remove(),2500);
}

/* ═══════════════════════════════════════════════════════════════
   20. END GAME
   ═══════════════════════════════════════════════════════════════ */
function endGame(won) {
    showScreen('screen-end');
    showCtrl('ctrl-end');
    const endEl=document.getElementById('screen-end');
    endEl.className=`screen ${won?'victory':'defeat'}`;
    const wealth=treasury.gold+treasury.gems*20;
    const titleEl=document.getElementById('end-title');
    const flavourEl=document.getElementById('end-flavour');
    if (won) {
        SFX.victory();
        titleEl.textContent='✦ VICTORY ✦';
        flavourEl.textContent=pick(GAME_DATA.victoryLines)+
            ` Treasury: ${treasury.gold} gold · ${treasury.gems} gems · ${wealth} gold value.`;
    } else {
        SFX.death();
        titleEl.textContent='✧ DEFEAT ✧';
        flavourEl.textContent=pick(GAME_DATA.defeatLines);
    }
    const scores=JSON.parse(localStorage.getItem('norrt_scores')||'[]');
    scores.push({team:teamName,turns:turn,won,gold:treasury.gold,gems:treasury.gems,wealth,date:new Date().toLocaleDateString('sv-SE')});
    scores.sort((a,b)=>{
        if (a.won!==b.won) return a.won?-1:1;
        if (a.won) return b.wealth-a.wealth;
        return b.turns-a.turns;
    });
    localStorage.setItem('norrt_scores',JSON.stringify(scores.slice(0,50)));
    document.getElementById('highscore-list').innerHTML=scores.map((s,i)=>{
        const icon=s.won?'✦':'✧',colour=s.won?'var(--gold)':'var(--dim)';
        const detail=s.won?`${s.turns} trials · ${s.wealth} gold`:`${s.turns} trials`;
        return `<p style="color:${colour}">${i+1}. ${icon} ${s.team} · ${detail} · ${s.date}</p>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   21. RENDER HELPERS
   ═══════════════════════════════════════════════════════════════ */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    const strip=document.getElementById('portrait-strip');
    const showStrip=id!=='screen-intro';
    strip.classList.toggle('hidden',!showStrip);
    if (showStrip) renderPortraitStrip();
}

function showCtrl(id) {
    ['ctrl-intro','ctrl-setup','ctrl-play','ctrl-end'].forEach(c=>
        document.getElementById(c).classList.toggle('hidden',c!==id));
}

function logPrompt(text) {
    document.querySelectorAll('#game-log .prompt-current').forEach(p=>p.classList.remove('prompt-current'));
    const el=document.getElementById('game-log');
    const p=document.createElement('p');
    p.className='prompt-current'; p.textContent=text;
    el.insertAdjacentElement('afterbegin',p);
}

function log(text, style='pale') {
    document.querySelectorAll('#game-log .log-recent').forEach(p=>p.classList.remove('log-recent'));
    const el=document.getElementById('game-log');
    const p=document.createElement('p');
    p.classList.add('log-recent');
    if (style==='blood') p.classList.add('log-blood');
    p.style.color=style==='blood'?'var(--blood)':style==='dim'?'var(--dim)':'var(--pale)';
    p.textContent=text;
    el.insertAdjacentElement('afterbegin',p);
}

function logHTML(html) {
    document.querySelectorAll('#game-log .log-recent').forEach(p=>p.classList.remove('log-recent'));
    const el=document.getElementById('game-log');
    const p=document.createElement('p');
    p.classList.add('log-recent'); p.style.color='var(--pale)';
    p.innerHTML=html;
    el.insertAdjacentElement('afterbegin',p);
}

function setChoices(choices) {
    const el=document.getElementById('ctrl-play');
    el.innerHTML='';
    choices.forEach(c=>{
        const btn=document.createElement('button');
        btn.className='px-btn'; btn.textContent=c.label;
        btn.addEventListener('click',()=>{
            el.querySelectorAll('button').forEach(b=>b.disabled=true);
            c.action();
        });
        el.appendChild(btn);
    });
}

function clearChoices() { document.getElementById('ctrl-play').innerHTML=''; }

/** renderStats now just re-renders the portrait strip (stats live there) */
function renderStats() { detectPartyLeader(); renderPortraitStrip(); }

function renderTreasury() {
    const bar=document.getElementById('treasury-bar');
    if (!bar) return;
    const v=treasury.gold+treasury.gems*20;
    bar.textContent=`⚔ Turn ${turn}/${MAX_TURNS}  ·  ${treasury.gold} gold  ·  ${treasury.gems} gems  ·  ${v} gold value`;
}

/* ═══════════════════════════════════════════════════════════════
   22. UTILITIES
   ═══════════════════════════════════════════════════════════════ */
const pick  = arr=>arr[Math.floor(Math.random()*arr.length)];
const rand  = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));

function aliveHero() {
    const alive=party.filter(h=>h.hp>0);
    return alive.length?alive[Math.floor(Math.random()*alive.length)]:null;
}

/**
 * Apply a resistance modifier.
 * @param {number} damage   raw damage value
 * @param {number} resPct   percentage resistance (positive=reduction, negative=weakness)
 * @returns {number}  actual damage after resistance
 */
function applyResistance(damage, resPct) {
    return Math.max(1, Math.round(damage*(1-resPct/100)));
}
