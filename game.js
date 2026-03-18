/**
 * GAME.JS — Norrtounia: The Dark Forest  v0.8.1
 * ─────────────────────────────────────────────────────────────────
 * Fixes over v0.8:
 *  1. executeAttack() — now calls endCombat(true) when monster dies
 *     instead of doing nothing (which froze the game).
 *  2. executeAttackReturn() — same fix.
 *  3. life_drain — removed the double call to finishAbilityTurn()
 *     after executeAttackReturn() which caused double turn-advance.
 *  4. All ability branches that kill the monster now reach endCombat.
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ══ GLOBAL TOOLTIP — one floating div, avoids all overflow:hidden clipping ══ */
let _nttEl=null;
function nttEl(){
    if(!_nttEl){
        _nttEl=document.createElement('div');
        _nttEl.id='ntt';
        _nttEl.style.cssText='display:none;position:fixed;z-index:9999;max-width:280px;min-width:150px;background:#000;border:1px solid rgba(201,162,39,0.75);padding:8px 11px;font-family:\'IM Fell English\',Georgia,serif;font-size:14px;line-height:1.65;color:#fff;pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,0.92);text-align:left;white-space:normal;';
        document.body.appendChild(_nttEl);
    }
    return _nttEl;
}
function showTip(el,html){
    el.addEventListener('mouseenter',e=>{
        const t=nttEl();
        t.innerHTML=html;
        t.style.display='block';
        placeTip(e);
    });
    el.addEventListener('mousemove',placeTip);
    el.addEventListener('mouseleave',()=>{nttEl().style.display='none';});
}
function placeTip(e){
    const t=nttEl(),W=window.innerWidth,H=window.innerHeight;
    const tw=t.offsetWidth||240,th=t.offsetHeight||100;
    let x=e.clientX+14,y=e.clientY-10;
    if(x+tw>W-8)x=e.clientX-tw-10;
    if(y+th>H-8)y=H-th-8;
    if(y<4)y=4;
    t.style.left=x+'px';t.style.top=y+'px';
}
/* colour helpers for tooltip content */
const C={stat:'#88ccff',hp:'#6abf45',item:'#c9a227',skill:'#e879f9',lore:'#bbbbbb',warn:'#ff7733',good:'#6abf45',blood:'#cc2222'};
function tc(color,text){return `<span style="color:${C[color]||color}">${text}</span>`;}

/* ═══════════════════════════════════════════════════════════════
   1. PORTRAIT SPRITE SYSTEM
   ═══════════════════════════════════════════════════════════════ */
const PORTRAIT = {
    SHEET_W:1024,SHEET_H:1024,DISPLAY_W:60,DISPLAY_H:78,
    COL_X:[22,113,202,290,380,469,560,649,739,830,918],
    COL_W:[81,78,78,79,78,81,79,79,81,78,83],
    ROW_Y:[43,141,242,348,460,572,682,799,908],
    ROW_H:[97,100,105,111,111,109,116,108,97],
    RACE_COL:{'Human':{male:0,female:1},'High Elf':{male:2,female:2},'Wood Elf':{male:3,female:3},'Mountain Dwarf':{male:4,female:4},'Hill Dwarf':{male:5,female:5},'Halfling':{male:6,female:6},'Gnome':{male:7,female:7},'Orc':{male:8,female:8},'Half-Orc':{male:9,female:9},'Tiefling':{male:10,female:10}},
    ARCHETYPE_ROW:{warrior:[0,1],rogue:[2,3],mage:[4,5],holy:[6,7],hybrid:[8,8]},
    CLASS_ARCHETYPE:{'Knight':'warrior','Fighter':'warrior','Barbarian':'warrior','Blood Knight':'warrior','Templar':'warrior','Rogue':'rogue','Dark Rogue':'rogue','Shadow Dancer':'rogue','Ranger':'rogue','Arcane Archer':'rogue','Wizard':'mage','Sorcerer':'mage','Necromancer':'mage','Pyromancer':'mage','Void Walker':'mage','Cleric':'holy','Paladin':'holy','Druid':'holy','Warden':'holy','Shaman':'holy','Warlock':'hybrid','Bard':'hybrid','Battle Mage':'hybrid','Monk':'hybrid'},
};
function portraitStyle(hero){
    const P=PORTRAIT,rc=P.RACE_COL[hero.race]??{male:0,female:1};
    const col=hero.gender===0?rc.male:rc.female;
    const arch=P.CLASS_ARCHETYPE[hero.job]??'warrior';
    const row=(P.ARCHETYPE_ROW[arch]??[0,0])[hero.gender??0];
    const srcX=P.COL_X[col]??0,srcY=P.ROW_Y[row]??0,srcW=P.COL_W[col]??80,srcH=P.ROW_H[row]??100;
    const sx=P.DISPLAY_W/srcW,sy=P.DISPLAY_H/srcH;
    return [`background-image:url('portraits.png')`,`background-repeat:no-repeat`,`background-size:${(P.SHEET_W*sx).toFixed(1)}px ${(P.SHEET_H*sy).toFixed(1)}px`,`background-position:${-(srcX*sx).toFixed(1)}px ${-(srcY*sy).toFixed(1)}px`,`image-rendering:pixelated`,`width:${P.DISPLAY_W}px`,`height:${P.DISPLAY_H}px`].join(';');
}

/* ═══════════════════════════════════════════════════════════════
   1b. MONSTER SPRITE SYSTEM
   monsters1.jpg — 1024×1024, 6 cols × 5 rows = 30 cells
   Monsters in data.js map 1-to-1 by array index (0-27).
   Great Honk overrides to spriteIdx:29 (goose, bottom-right).
   ═══════════════════════════════════════════════════════════════ */
const MPORTRAIT = {
    SHEET_W:1024,SHEET_H:1024,DISPLAY_W:60,DISPLAY_H:78,COLS:6,
    COL_X:[25, 190, 354, 518, 684, 849],
    COL_W:[148, 147, 147, 148, 148, 151],
    ROW_Y:[37,  215, 414, 617, 811],
    ROW_H:[161, 181, 185, 176, 175],
};

function monsterPortraitStyle(idx){
    const P=MPORTRAIT;
    const col=idx%P.COLS,row=Math.floor(idx/P.COLS);
    if(row>=P.ROW_Y.length||col>=P.COL_X.length)return `width:${P.DISPLAY_W}px;height:${P.DISPLAY_H}px;background:#111;`;
    const srcX=P.COL_X[col],srcY=P.ROW_Y[row],srcW=P.COL_W[col],srcH=P.ROW_H[row];
    const sx=P.DISPLAY_W/srcW,sy=P.DISPLAY_H/srcH;
    return [`background-image:url('monsters1.jpg')`,`background-repeat:no-repeat`,`background-size:${(P.SHEET_W*sx).toFixed(1)}px ${(P.SHEET_H*sy).toFixed(1)}px`,`background-position:${-(srcX*sx).toFixed(1)}px ${-(srcY*sy).toFixed(1)}px`,`image-rendering:pixelated`,`width:${P.DISPLAY_W}px`,`height:${P.DISPLAY_H}px`].join(';');
}

/* ═══════════════════════════════════════════════════════════════
   2. AUDIO
   ═══════════════════════════════════════════════════════════════ */
let _ctx;
function actx(){if(!_ctx)_ctx=new(window.AudioContext||window.webkitAudioContext)();if(_ctx.state==='suspended')_ctx.resume();return _ctx;}
function tone(freq,type='square',dur=0.12,vol=0.06,when=0){try{const ctx=actx(),t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.012);g.gain.setValueAtTime(vol*0.80,t+dur*0.55);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(actx().destination);o.start(t);o.stop(t+dur);}catch(_){}}

const SFX={
    roll:()=>{tone(480,'square',0.07,0.05);tone(600,'square',0.07,0.04,0.04);},
    lock:()=>{tone(260,'triangle',0.18,0.05);tone(330,'triangle',0.12,0.04,0.10);},
    start:()=>{[440,550,660,880].forEach((f,i)=>tone(f,'sine',0.15+i*0.05,0.05,i*0.13));},
    levelUp:()=>{[523,659,784,1047,1319].forEach((f,i)=>tone(f,'sine',0.18,0.06,i*0.10));},
    good:()=>{tone(523,'sine',0.12,0.05);tone(659,'sine',0.16,0.05,0.10);tone(784,'sine',0.22,0.04,0.22);},
    bad:()=>{tone(160,'sawtooth',0.14,0.07);tone(120,'sawtooth',0.22,0.07,0.10);tone(90,'sawtooth',0.18,0.05,0.28);},
    neutral:()=>tone(380,'triangle',0.14,0.04),
    loot:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,'sine',0.12,0.04,i*0.07));},
    heal:()=>{tone(528,'sine',0.22,0.04);tone(660,'sine',0.18,0.03,0.10);tone(792,'sine',0.14,0.03,0.22);},
    crit:()=>{tone(550,'square',0.08,0.07);tone(880,'sine',0.18,0.06,0.06);tone(1100,'sine',0.12,0.05,0.16);},
    strike:()=>{tone(180,'sawtooth',0.10,0.07);tone(140,'sawtooth',0.20,0.06,0.06);},
    heavyHit:()=>{tone(100,'sawtooth',0.18,0.08);tone(70,'sawtooth',0.28,0.07,0.10);tone(50,'square',0.20,0.06,0.25);},
    ability:()=>{tone(660,'sine',0.12,0.05);tone(880,'sine',0.18,0.04,0.10);},
    shield:()=>{tone(330,'triangle',0.20,0.05);tone(440,'triangle',0.15,0.04,0.12);},
    dodge:()=>tone(660,'triangle',0.12,0.04),
    charm:()=>{tone(880,'sine',0.12,0.04);tone(1108,'sine',0.20,0.04,0.10);tone(660,'sine',0.18,0.03,0.25);},
    flee:()=>{tone(330,'triangle',0.08,0.04);tone(440,'triangle',0.12,0.04,0.08);},
    treasury:()=>{[660,784,880].forEach((f,i)=>tone(f,'sine',0.15,0.04,i*0.08));},

    /* Spell-type sounds — called from resolveHeroHit by damage type */
    spellLightning:()=>{
        // crackling burst: rapid high-pitched pops + low rumble
        try{const ctx=actx();
        [0,0.03,0.07,0.12,0.17].forEach(w=>{
            const o=ctx.createOscillator(),g=ctx.createGain();
            o.type='sawtooth';o.frequency.value=800+Math.random()*1200;
            g.gain.setValueAtTime(0.08,ctx.currentTime+w);
            g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+w+0.04);
            o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+w);o.stop(ctx.currentTime+w+0.05);
        });
        tone(80,'sawtooth',0.35,0.06,0.05);}catch(_){}
    },
    spellFire:()=>{
        // whoosh + crackle: noise-like sawtooth swells
        [180,240,320].forEach((f,i)=>tone(f,'sawtooth',0.18,0.06,i*0.06));
        tone(600,'sawtooth',0.12,0.04,0.12);
    },
    spellFrost:()=>{
        // glassy high tones descending
        [1047,880,740,622].forEach((f,i)=>tone(f,'sine',0.14,0.04,i*0.07));
        tone(220,'triangle',0.25,0.03,0.20);
    },
    spellHoly:()=>{
        // bright bell-like chord
        [523,659,784,1047].forEach((f,i)=>tone(f,'sine',0.20,0.05,i*0.04));
        tone(1319,'sine',0.18,0.04,0.18);
    },
    spellPoison:()=>{
        // low gooey bubbling pulses
        [110,90,75].forEach((f,i)=>tone(f,'sawtooth',0.22,0.06,i*0.09));
        tone(200,'triangle',0.15,0.03,0.25);
    },
    spellShadow:()=>{
        // dark resonant drone + flutter
        tone(55,'sawtooth',0.40,0.07);
        [220,180,140].forEach((f,i)=>tone(f,'square',0.14,0.04,0.05+i*0.08));
    },
    spellNecrotic:()=>{
        // hollow descending moan
        [330,261,220,185].forEach((f,i)=>tone(f,'sawtooth',0.18,0.05,i*0.10));
        tone(65,'sawtooth',0.35,0.06,0.30);
    },
    spellArcane:()=>{
        // shimmering ascending glitter
        [440,554,659,784,880].forEach((f,i)=>tone(f,'sine',0.12,0.04,i*0.05));
    },
    spellNature:()=>{
        // earthy thud + rising flute
        tone(80,'triangle',0.25,0.06);
        [392,494,587].forEach((f,i)=>tone(f,'triangle',0.15,0.04,0.08+i*0.07));
    },
    spellBlood:()=>{
        // brutal thud + whipping
        tone(60,'sawtooth',0.30,0.08);
        tone(300,'sawtooth',0.15,0.06,0.08);
        tone(200,'sawtooth',0.12,0.05,0.18);
    },
    spellVoid:()=>{
        // deep rumble + distorted screech
        tone(40,'sawtooth',0.45,0.07);
        tone(1200,'sawtooth',0.10,0.04,0.10);
        tone(800,'sawtooth',0.08,0.03,0.22);
    },
    spellPsychic:()=>{
        // high warble sine waves
        [880,1108,660,880].forEach((f,i)=>tone(f,'sine',0.14,0.04,i*0.06));
        tone(440,'triangle',0.20,0.03,0.22);
    },

    /* Victory — triumphant fanfare with harmony */
    victory:()=>{
        // Melody
        [[523,0],[659,.14],[784,.28],[1047,.44],[784,.64],[880,.80],[1047,.96],[1319,1.12],[1047,1.36],[784,1.52]].forEach(([f,t])=>tone(f,'sine',0.22,0.06,t));
        // Harmony a third below
        [[392,0],[523,.14],[659,.28],[784,.44],[659,.64],[784,.80]].forEach(([f,t])=>tone(f,'triangle',0.14,0.04,t));
        // Bass drum hits
        [0,0.44,0.96,1.52].forEach(t=>tone(55,'sawtooth',0.20,0.08,t));
    },

    /* Death — longer mournful dirge, clearly different from victory */
    death:()=>{
        // Slow descending toll
        [[330,0],[294,.50],[261,1.0],[220,1.60],[185,2.30],[147,3.10]].forEach(([f,t])=>tone(f,'triangle',0.50,0.06,t));
        // Low drone
        tone(55,'sawtooth',3.50,0.05,0.20);
        // Muffled drum
        [0,0.80,1.80].forEach(t=>tone(60,'sawtooth',0.25,0.07,t));
    },

    honk:()=>{try{const ctx=actx(),o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(220,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(440,ctx.currentTime+0.25);o.frequency.exponentialRampToValueAtTime(330,ctx.currentTime+0.50);g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(0.14,ctx.currentTime+0.04);g.gain.setValueAtTime(0.14,ctx.currentTime+0.28);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.55);o.connect(g);g.connect(actx().destination);o.start();o.stop(ctx.currentTime+0.55);}catch(_){}},
    doubleHonk:()=>{SFX.honk();setTimeout(SFX.honk,620);},
};

/** Play the appropriate spell sound for a damage type */
function playSfxForDmgType(dmgType){
    const map={
        lightning:'spellLightning',fire:'spellFire',frost:'spellFrost',
        holy:'spellHoly',poison:'spellPoison',shadow:'spellShadow',
        necrotic:'spellNecrotic',arcane:'spellArcane',nature:'spellNature',
        blood:'spellBlood',void:'spellVoid',psychic:'spellPsychic',
    };
    const fn=map[dmgType];
    if(fn&&SFX[fn]) SFX[fn]();
    else SFX.strike();
}

/* ═══════════════════════════════════════════════════════════════
   3. MUSIC — 5 synthesised tracks
   ═══════════════════════════════════════════════════════════════ */
let bgStarted=false,bgMaster=null,musicMuted=false;
function toggleMusic(){musicMuted=!musicMuted;if(bgMaster)bgMaster.gain.value=musicMuted?0:0.0196;renderTreasury();}
const N={A2:110,B2:123.5,C3:130.8,D3:146.8,E3:164.8,F3:174.6,Fs3:185,G3:196,A3:220,Bb3:233.1,B3:246.9,C4:261.6,Cs4:277.2,D4:293.7,E4:329.6,F4:349.2,Fs4:370,G4:392,A4:440,B4:493.9,C5:523.3,D5:587.3,E5:659.3,G5:784};
const MUSIC_TRACKS=[
/*
 * 7 medieval-fantasy tracks.  Each has:
 *   mel   = lead melody (square wave — lute/flute feel)
 *   bass  = bass line (triangle — viol/bass lute)
 *   chord = optional sustained harmony (triangle, soft)
 * Notes are [freq_Hz, beats].  BPM sets the tempo.
 */

/* ── Track 1: Tavern Reel ─ G major, lively 108 BPM ── */
{
  bpm:108, melVol:1.0, bassVol:0.50, melType:'square', bassType:'triangle',
  mel:[
    [N.G4,0.5],[N.A4,0.5],[N.B4,0.5],[N.G4,0.5],[N.D4,1],[N.B3,0.5],[N.D4,0.5],
    [N.G4,0.5],[N.Fs4,0.5],[N.G4,0.5],[N.A4,0.5],[N.B4,1],[N.A4,0.5],[N.G4,0.5],
    [N.D4,0.5],[N.E4,0.5],[N.Fs4,0.5],[N.G4,0.5],[N.A4,0.5],[N.B4,0.5],[N.D5,1],
    [N.C5,0.5],[N.B4,0.5],[N.A4,0.5],[N.G4,0.5],[N.Fs4,0.5],[N.E4,0.5],[N.D4,1],
    [N.G4,0.5],[N.B4,0.5],[N.D5,0.5],[N.G4,0.5],[N.A4,0.5],[N.B4,0.5],[N.G4,1],
    [N.E4,0.5],[N.Fs4,0.5],[N.G4,0.5],[N.A4,0.5],[N.B4,1.5],[N.A4,0.5],
    [N.G4,0.5],[N.Fs4,0.5],[N.E4,0.5],[N.D4,0.5],[N.G3,0.5],[N.A3,0.5],[N.B3,2],
  ],
  bass:[
    [N.G3,1],[N.D3,1],[N.G3,1],[N.D3,1],
    [N.C3,1],[N.G3,1],[N.C3,1],[N.G3,1],
    [N.D3,1],[N.A3,1],[N.D3,1],[N.G3,1],
    [N.G3,2],[N.D3,2],
  ]
},

/* ── Track 2: Bard's Lament ─ D minor, slow 66 BPM ── */
{
  bpm:66, melVol:0.90, bassVol:0.48, melType:'square', bassType:'triangle',
  mel:[
    [N.D4,2],[N.C4,1],[N.Bb3,1],[N.A3,1.5],[N.G3,0.5],[N.A3,1],
    [N.F3,1],[N.G3,1],[N.A3,2],[N.Bb3,1],[N.A3,1],
    [N.D4,1.5],[N.C4,0.5],[N.Bb3,1],[N.A3,1],[N.G3,2],
    [N.A3,1],[N.Bb3,0.5],[N.C4,0.5],[N.D4,1.5],[N.C4,0.5],[N.Bb3,1],[N.A3,1],
    [N.G3,1],[N.A3,1],[N.F3,2],[N.D3,4],
  ],
  bass:[
    [N.D3,2],[N.A2,2],[N.Bb2,2],[N.F2,2],
    [N.C3,2],[N.G2,2],[N.A2,2],[N.D3,2],
    [N.D3,4],[N.A2,4],
  ]
},

/* ── Track 3: Knight's March ─ C major, steady 84 BPM ── */
{
  bpm:84, melVol:0.95, bassVol:0.55, melType:'square', bassType:'triangle',
  mel:[
    [N.C4,1],[N.E4,1],[N.G4,1],[N.E4,0.5],[N.D4,0.5],[N.C4,2],
    [N.F3,1],[N.A3,1],[N.C4,1],[N.A3,0.5],[N.G3,0.5],[N.F3,2],
    [N.G3,1],[N.B3,1],[N.D4,1],[N.B3,0.5],[N.A3,0.5],[N.G3,1],[N.A3,1],
    [N.C4,1],[N.E4,1],[N.G4,2],[N.E4,1],[N.C4,1],
    [N.D4,1],[N.F4,1],[N.A4,1],[N.G4,1],[N.E4,1],[N.C4,1],
    [N.G3,1],[N.C4,2],[N.B3,1],[N.A3,1],[N.G3,2],
  ],
  bass:[
    [N.C3,2],[N.G3,2],[N.F3,2],[N.C3,2],
    [N.G3,2],[N.D3,2],[N.C3,4],
    [N.A2,2],[N.E3,2],[N.F3,2],[N.C3,2],[N.G3,4],
  ]
},

/* ── Track 4: Forest Wandering ─ A minor pentatonic, 72 BPM ── */
{
  bpm:72, melVol:0.88, bassVol:0.45, melType:'square', bassType:'triangle',
  mel:[
    [N.A3,1.5],[N.C4,0.5],[N.E4,1],[N.D4,0.5],[N.C4,0.5],[N.A3,2],
    [N.G3,1],[N.A3,0.5],[N.C4,0.5],[N.E4,1.5],[N.C4,0.5],[N.A3,1],
    [N.E4,1],[N.G4,1],[N.A4,1.5],[N.G4,0.5],[N.E4,1],[N.C4,1],
    [N.A3,0.5],[N.C4,0.5],[N.E4,1],[N.C4,1],[N.A3,1],[N.G3,1],[N.A3,2],
    [N.C4,1],[N.E4,0.5],[N.G4,0.5],[N.E4,1],[N.C4,1],[N.A3,2],
    [N.G3,1.5],[N.A3,0.5],[N.C4,1],[N.A3,3],
  ],
  bass:[
    [N.A2,4],[N.E3,4],[N.G3,2],[N.A2,2],
    [N.C3,4],[N.E3,4],[N.A2,4],[N.G2,4],
  ]
},

/* ── Track 5: Dark Portent ─ B natural minor, brooding 58 BPM ── */
{
  bpm:58, melVol:0.85, bassVol:0.55, melType:'square', bassType:'triangle',
  mel:[
    [N.B3,2],[N.A3,1],[N.G3,1],[N.Fs3,2],[N.E3,2],
    [N.D3,1],[N.E3,1],[N.Fs3,2],[N.G3,1],[N.A3,1],
    [N.B3,3],[N.A3,1],[N.G3,1],[N.Fs3,1],
    [N.E3,2],[N.Fs3,1],[N.G3,1],[N.B2,4],
    [N.B3,1],[N.D4,1],[N.Cs4,1],[N.B3,1],[N.A3,2],[N.G3,2],
    [N.Fs3,1],[N.E3,1],[N.D3,1],[N.Cs3,1],[N.B2,4],
  ],
  bass:[
    [N.B2,4],[N.E3,4],[N.G3,4],[N.Fs3,2],[N.E3,2],
    [N.A2,4],[N.B2,4],[N.E3,4],[N.B2,4],
  ]
},

/* ── Track 6: Village Green ─ F major, cheerful 100 BPM ── */
{
  bpm:100, melVol:0.92, bassVol:0.48, melType:'square', bassType:'triangle',
  mel:[
    [N.F4,1],[N.G4,1],[N.A4,0.5],[N.Bb4,0.5],[N.C5,1],[N.A4,1],
    [N.Bb4,0.5],[N.A4,0.5],[N.G4,1],[N.F4,2],[N.G4,1],
    [N.A4,1],[N.Bb4,0.5],[N.C5,0.5],[N.D5,1],[N.C5,1],
    [N.Bb4,0.5],[N.A4,0.5],[N.G4,1],[N.F4,3],
    [N.C4,1],[N.E4,1],[N.G4,1],[N.F4,0.5],[N.E4,0.5],[N.D4,1],[N.C4,1],
    [N.A3,0.5],[N.Bb3,0.5],[N.C4,1],[N.F4,3],
  ],
  bass:[
    [N.F3,2],[N.C3,2],[N.Bb2,2],[N.F3,2],
    [N.C3,2],[N.G3,2],[N.F3,2],[N.C3,2],
    [N.F3,4],[N.C3,4],
  ]
},

/* ── Track 7: Ancient Mystery ─ E Dorian, 68 BPM, 3-voice ── */
{
  bpm:68, melVol:0.92, bassVol:0.50, melType:'square', bassType:'triangle',
  mel:[
    [N.E4,1.5],[N.Fs4,0.5],[N.G4,1],[N.A4,1],[N.B4,1],[N.A4,1],
    [N.G4,1],[N.Fs4,0.5],[N.E4,0.5],[N.D4,1],[N.Cs4,1],[N.B3,2],
    [N.Cs4,1],[N.D4,1],[N.E4,1.5],[N.Fs4,0.5],[N.G4,1],[N.A4,1],
    [N.B4,2],[N.A4,1],[N.G4,1],[N.Fs4,1],[N.E4,1],
    [N.G4,1],[N.A4,1],[N.B4,1.5],[N.A4,0.5],[N.G4,1],[N.Fs4,1],
    [N.E4,1],[N.D4,1],[N.Cs4,2],[N.B3,1],[N.A3,1],[N.E3,2],
  ],
  bass:[
    [N.E3,4],[N.A3,4],[N.Fs3,4],[N.B2,4],
    [N.G3,4],[N.D3,4],[N.A2,4],[N.E3,4],
  ]
},
,
{bpm:96,melVol:0.95,bassVol:0.60,melType:'square',bassType:'sawtooth',mel:[[440,1],[349,.5],[440,.5],[392,1],[330,1],[294,.5],[330,.5],[349,1],[494,2],[440,.5],[392,.5],[294,1],[262,1],[440,1],[330,1],[294,2]],bass:[[147,1],[110,1],[147,1],[110,1],[175,2],[147,2],[110,2]]},
{bpm:60,melVol:0.85,bassVol:0.40,melType:'square',bassType:'triangle',mel:[[440,2],[277,1],[330,1],[440,1.5],[494,.5],[554,1],[440,2],[370,1],[330,1],[294,1.5],[247,1],[220,1],[330,2],[220,4]],bass:[[110,4],[165,4],[147,4],[110,4],[165,4],[123,4]]},
{bpm:55,melVol:0.90,bassVol:0.60,melType:'sawtooth',bassType:'sawtooth',mel:[[247,2],[349,2],[165,2],[233,2],[220,1],[294,1],[196,2],[262,1],[294,2],[175,1],[156,3],[110,1]],bass:[[123,4],[116,4],[110,4],[98,4]]},
];
let currentMood='normal';
function setMusicMood(m){currentMood=m;}
function startBgMusic(){
    if(bgStarted)return;
    bgStarted=true;
    bgMaster=actx().createGain();
    bgMaster.gain.value=0.0196;
    bgMaster.connect(actx().destination);
    scheduleNextTrack(actx().currentTime+0.10);
}

/**
 * Schedule a track starting at audioStartTime.
 * When it finishes, immediately schedule another random track.
 * Using the audio clock (not wall clock) for gapless looping.
 */
function scheduleNextTrack(audioStartTime){
    try{
        const ctx=actx();

        // Resume if suspended — then retry from current time
        if(ctx.state==='suspended'){
            ctx.resume().then(()=>scheduleNextTrack(ctx.currentTime+0.20));
            return;
        }

        // Clamp start to at least 150ms ahead so o.start() never fires on a past time
        const safeStart = Math.max(audioStartTime, ctx.currentTime + 0.15);

        const pool=currentMood==='battle'
            ?[MUSIC_TRACKS[0],MUSIC_TRACKS[2],MUSIC_TRACKS[7]]
            :currentMood==='tense'
            ?[MUSIC_TRACKS[7],MUSIC_TRACKS[9],MUSIC_TRACKS[4]]
            :[...MUSIC_TRACKS.slice(0,9)];
        const track=pick(pool);
        const B=60/track.bpm;

        function sv(notes,vol,type,sus=0.80){
            let t=safeStart;
            notes.forEach(([freq,beats])=>{
                try{
                    const dur=beats*B*sus;
                    const o=ctx.createOscillator(),g=ctx.createGain();
                    o.type=type; o.frequency.value=freq;
                    g.gain.setValueAtTime(0,t);
                    g.gain.linearRampToValueAtTime(vol,t+0.018);
                    g.gain.setValueAtTime(vol*0.65,t+dur*0.55);
                    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
                    o.connect(g); g.connect(bgMaster);
                    o.start(t); o.stop(t+dur);
                }catch(noteErr){/* skip bad note, keep scheduling */}
                t+=beats*B;
            });
        }

        const melBeats=track.mel.reduce((s,[,d])=>s+d,0);
        const bassBeats=track.bass.reduce((s,[,d])=>s+d,0);
        const trackLen=Math.max(melBeats,bassBeats)*B;

        sv(track.mel,  track.melVol,  track.melType,  0.80);
        sv(track.bass, track.bassVol, track.bassType, 0.65);

        const nextStart=safeStart+trackLen;
        const msUntilNext=(nextStart-ctx.currentTime)*1000;
        // Always schedule next track — minimum 200ms buffer to avoid rapid re-fire
        setTimeout(()=>scheduleNextTrack(nextStart), Math.max(200, msUntilNext-100));
    }catch(err){
        // If anything fails, retry after 2 seconds rather than stopping forever
        setTimeout(()=>scheduleNextTrack(actx().currentTime+0.20), 2000);
    }
}

/* ═══════════════════════════════════════════════════════════════
   4. SCREEN SHAKE
   ═══════════════════════════════════════════════════════════════ */
function shake(){const el=document.getElementById('frame-wrap');el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');}

/* ═══════════════════════════════════════════════════════════════
   5. GAME STATE
   ═══════════════════════════════════════════════════════════════ */
const MAX_TURNS=100;
let party=[null,null,null],turn=0,teamName='',treasury={gold:0,gems:0};

/* ── Battle state — reset at start of each combat ── */
const battle={
    monster:null,order:[],turnIdx:0,round:1,active:false,charmUsed:false,
    monsterAtkMult:1.0,monsterAtkMultRounds:0,
    heroDmgMult:{},         // {heroIdx: {mult, rounds}}
    monsterSkipTurns:0,
    heroShielded:{},        // {heroIdx: roundsRemaining}
    heroPhaseShift:{},      // {heroIdx: roundsRemaining}
    heroRegen:{},           // {heroIdx: {amount, rounds}}
    heroRage:{},            // {heroIdx: roundsRemaining}
    combustPrimed:{},       // {heroIdx: bool}
    judgmentPrimed:{},      // {heroIdx: bool}
    dotEffects:[],          // [{dmgPerRound,dmgType,rounds,source}]
    monsterResistNullified:false,
    monsterAttackedLastRound:false,
    spiritTotemRounds:0,
    inspiredHero:null,      // heroIdx
};

function resetBattle(){Object.assign(battle,{monster:null,order:[],turnIdx:0,round:1,active:false,charmUsed:false,monsterAtkMult:1.0,monsterAtkMultRounds:0,heroDmgMult:{},monsterSkipTurns:0,heroShielded:{},heroPhaseShift:{},heroRegen:{},heroRage:{},combustPrimed:{},judgmentPrimed:{},dotEffects:[],monsterResistNullified:false,monsterAttackedLastRound:false,spiritTotemRounds:0,inspiredHero:null});}

/* ═══════════════════════════════════════════════════════════════
   6. ABILITY EFFECTS
   Each key = ability id from data.js.
   All paths must eventually reach either:
     • endCombat(true/false)  — battle over
     • finishAbilityTurn()    — non-attack ability complete, advance turn
     • executeAttack()        — handles advance + endCombat internally
   ═══════════════════════════════════════════════════════════════ */
const ABILITY_EFFECTS={

    /* ── Warriors ── */
    shield_wall:(h,hi)=>{battle.heroShielded[hi]=(battle.heroShielded[hi]||0)+1;log(`${h.name} raises their shield — the next blow will be absorbed.`);SFX.shield();finishAbilityTurn();},
    rallying_cry:(h)=>{const heal=Math.floor(0.12*h.maxHp);party.filter(x=>x.hp>0).forEach(x=>{x.hp=Math.min(x.hp+heal,x.maxHp);});log(`${h.name} sounds a Rallying Cry! All allies recover ${heal} HP.`);SFX.ability();finishAbilityTurn();},
    rage:(h,hi)=>{battle.heroRage[hi]=3;log(`${h.name} enters a RAGE! +70% damage for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    reckless_atk:(h,hi)=>{log(`${h.name} swings a Reckless Attack — 2× power!`);executeAttack(h,hi,2.0);},
    second_wind:(h)=>{const heal=Math.floor(0.20*h.maxHp);h.hp=Math.min(h.hp+heal,h.maxHp);log(`${h.name} finds a Second Wind! +${heal} HP.`);SFX.heal();finishAbilityTurn();},
    action_surge:(h,hi)=>{
        log(`${h.name} surges — attacking twice!`);SFX.ability();
        resolveHeroHit(h,hi,pick(h.attackNames),1.0);
        if(battle.monster.currentHp<=0){endCombat(true);return;}
        setTimeout(()=>{
            if(battle.monster.currentHp>0)resolveHeroHit(h,hi,pick(h.attackNames),1.0);
            if(battle.monster.currentHp<=0){endCombat(true);return;}
            finishAbilityTurn();
        },350);
    },

    /* ── Holy ── */
    lay_on_hands:(h)=>{const w=party.filter(x=>x.hp>0&&x.hp/x.maxHp<=0.30);const t=w.length?w[0]:h;const a=w.length?t.maxHp:Math.floor(0.40*h.maxHp);t.hp=Math.min(t.hp+a,t.maxHp);log(`${h.name} lays hands on ${t.name}! +${a} HP.`);SFX.heal();finishAbilityTurn();},
    divine_smite:(h,hi)=>{const isEvil=DAMAGE_TYPES[battle.monster.damageType]?.alignment==='dark'||battle.monster.undead;const mult=isEvil?2.5:2.0;log(`${h.name} calls Divine Smite!${isEvil?' Extra judgement against this evil foe!':''}`);executeAttack(h,hi,mult,false,'holy');},
    divine_heal:(h)=>{const t=party.filter(x=>x.hp>0).reduce((b,x)=>(x.hp/x.maxHp)<(b.hp/b.maxHp)?x:b);const a=Math.floor(0.35*t.maxHp);t.hp=Math.min(t.hp+a,t.maxHp);log(`${h.name} channels Divine Heal to ${t.name}! +${a} HP.`);SFX.heal();finishAbilityTurn();},
    turn_undead:(h,hi)=>{const isU=!!battle.monster.undead;if(!isU){battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);log(`${h.name} invokes Turn Undead — the creature is stunned!`);}else{log(`${h.name} invokes Turn Undead! Holy power blazes against the undead!`);}executeAttack(h,hi,isU?3.0:1.0,false,'holy');},
    holy_aegis:(h)=>{party.forEach((_,i)=>{battle.heroShielded[i]=(battle.heroShielded[i]||0)+1;});log(`${h.name} raises Holy Aegis — whole party shielded!`);SFX.shield();finishAbilityTurn();},
    judgment:(h,hi)=>{battle.judgmentPrimed[hi]=true;log(`${h.name} marks ${battle.monster.name} with Judgment!`);SFX.ability();finishAbilityTurn();},
    spirit_totem:(h)=>{battle.spiritTotemRounds=2;log(`${h.name} summons a Spirit Totem! Party heals 10 HP/round for 2 rounds.`);SFX.ability();finishAbilityTurn();},
    thunder_axe:(h,hi)=>{log(`${h.name} calls Thunder Axe — 2.5× lightning!`);executeAttack(h,hi,2.5,false,'lightning');},

    /* ── Rogues ── */
    backstab:(h,hi)=>{if(!battle.monsterAttackedLastRound){log(`${h.name} cannot Backstab — the monster has not yet attacked.`);SFX.neutral();finishAbilityTurn();return;}log(`${h.name} drives a Backstab — 2.5× damage!`);executeAttack(h,hi,2.5);},
    vanish:(h)=>{log(`${h.name} vanishes into shadow — the fellowship retreats!`);SFX.flee();battle.active=false;setTimeout(nextTurn,500);},
    hunters_mark:(h,hi)=>{battle.heroDmgMult[hi]={mult:1.6,rounds:3};log(`${h.name} applies Hunter's Mark — +60% damage for 3 attacks.`);SFX.ability();finishAbilityTurn();},
    distracting_shot:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);log(`${h.name} fires a Distracting Shot — monster loses next action!`);SFX.ability();finishAbilityTurn();},
    poison_blade:(h)=>{battle.dotEffects.push({dmgPerRound:18,dmgType:'poison',rounds:3,source:h.name});log(`${h.name} applies deep Poison — 18 poison damage/round for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    smoke_bomb:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);log(`${h.name} hurls a Smoke Bomb — monster blinded, next attack misses!`);SFX.ability();finishAbilityTurn();},
    shadow_step:(h,hi)=>{battle.heroShielded[hi]=(battle.heroShielded[hi]||0)+1;log(`${h.name} Shadow Steps — dodging next attack and striking at 1.5×!`);executeAttack(h,hi,1.5);},
    eclipse:(h)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.60);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,2);log(`${h.name} casts Eclipse — monster attack −40% for 2 rounds.`);SFX.ability();finishAbilityTurn();},
    arcane_pierce:(h,hi)=>{
        log(`${h.name} fires Arcane Pierce — bypassing all resistance!`);
        const orig=battle.monster.resistances||{};
        battle.monster.resistances={};          // nullify for this hit (sync)
        resolveHeroHit(h,hi,pick(h.attackNames),1.0);
        battle.monster.resistances=orig;         // restore immediately after sync hit
        if(battle.monster.currentHp<=0){endCombat(true);return;}
        advanceBattleTurn();renderStats();setTimeout(processBattleTurn,300);
    },
    volley:(h,hi)=>{
        log(`${h.name} looses an Arrow Volley — two shots at 75% power!`);SFX.ability();
        resolveHeroHit(h,hi,pick(h.attackNames),0.75);
        if(battle.monster.currentHp<=0){endCombat(true);return;}
        setTimeout(()=>{
            if(battle.monster.currentHp>0)resolveHeroHit(h,hi,pick(h.attackNames),0.75);
            if(battle.monster.currentHp<=0){endCombat(true);return;}
            finishAbilityTurn();
        },350);
    },

    /* ── Mages ── */
    frost_nova:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,2);log(`${h.name} casts Frost Nova — monster FROZEN for 2 turns!`);SFX.ability();finishAbilityTurn();},
    arcane_surge:(h,hi)=>{const rc=Math.floor(0.20*h.maxHp);h.hp=Math.max(1,h.hp-rc);log(`${h.name} channels Arcane Surge (${rc} recoil) — 3× power!`);executeAttack(h,hi,3.0);},
    chain_lightning:(h,hi)=>{log(`${h.name} releases Chain Lightning — 2.5×!`);executeAttack(h,hi,2.5,false,'lightning');},
    wild_magic:(h,hi)=>{
        const eff=pick(['triple','freeze','heal','loot','recoil']);
        log(`${h.name} triggers Wild Magic Surge — unpredictable!`);SFX.ability();
        if(eff==='triple'){log('Pure destruction! 3× damage!');executeAttack(h,hi,3.0);return;}
        if(eff==='freeze'){battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,2);log('Monster frozen for 2 turns!');finishAbilityTurn();return;}
        if(eff==='heal'){party.filter(x=>x.hp>0).forEach(x=>{x.hp=Math.min(x.hp+25,x.maxHp);});log('The surge heals all allies for 25 HP!');SFX.heal();finishAbilityTurn();return;}
        if(eff==='loot'){giveLoot();log('The surge summons a relic from the ether!');finishAbilityTurn();return;}
        if(eff==='recoil'){const d=rand(20,40);h.hp=Math.max(1,h.hp-d);log(`The surge backfires — ${h.name} takes ${d} damage!`);SFX.bad();shake();finishAbilityTurn();return;}
    },
    undead_barrier:(h,hi)=>{battle.heroShielded[hi]=(battle.heroShielded[hi]||0)+1;log(`${h.name} raises an Undead Barrier — next hit absorbed.`);SFX.shield();finishAbilityTurn();},
    wither:(h,hi)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.70);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,2);log(`${h.name} casts Wither — monster −30% attack + 1.5× necrotic hit!`);executeAttack(h,hi,1.5,false,'necrotic');},
    combustion:(h,hi)=>{battle.combustPrimed[hi]=true;log(`${h.name} primes Combustion — next Fireball deals 3×!`);SFX.ability();finishAbilityTurn();},
    inferno_dot:(h)=>{battle.dotEffects.push({dmgPerRound:20,dmgType:'fire',rounds:3,source:h.name});log(`${h.name} sets ${battle.monster.name} ablaze — 20 fire damage/round for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    reality_tear:(h)=>{battle.monsterResistNullified=true;log(`${h.name} tears Reality — monster defences nullified for this battle!`);SFX.ability();finishAbilityTurn();},
    phase_shift:(h,hi)=>{battle.heroPhaseShift[hi]=2;log(`${h.name} Phase Shifts into the void — untargetable for 2 rounds.`);SFX.ability();finishAbilityTurn();},

    /* ── Hybrids ── */
    hex:(h)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.80);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,3);log(`${h.name} places a Hex — monster −20% attack for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    pact_of_blood:(h,hi)=>{const s=Math.floor(0.25*h.maxHp);h.hp=Math.max(1,h.hp-s);log(`${h.name} invokes the Pact of Blood (sacrifice ${s} HP) — 3×!`);executeAttack(h,hi,3.0);},
    inspire:(h,hi)=>{
        let ti=null;
        for(let i=1;i<battle.order.length;i++){const e=battle.order[(battle.turnIdx+i)%battle.order.length];if(e.type==='hero'&&e.entity.hp>0){ti=party.indexOf(e.entity);break;}}
        if(ti!==null){battle.inspiredHero=ti;log(`${h.name} Inspires ${party[ti].name} — their next attack deals 2×!`);}
        else{log(`${h.name} plays an Inspiring tune!`);}
        SFX.charm();finishAbilityTurn();
    },
    dirge:(h)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.65);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,3);log(`${h.name} plays a Dirge of Ruin — monster −35% attack for 3 rounds.`);SFX.charm();finishAbilityTurn();},
    burning_weapon:(h,hi)=>{battle.heroDmgMult[hi]={mult:1.35,rounds:3};log(`${h.name} ignites their weapon — +35% damage for 3 attacks.`);SFX.ability();finishAbilityTurn();},
    arcane_armor:(h,hi)=>{battle.heroShielded[hi]=(battle.heroShielded[hi]||0)+1;log(`${h.name} weaves Arcane Armour — next hit absorbed.`);SFX.shield();finishAbilityTurn();},
    flurry:(h,hi)=>{
        log(`${h.name} unleashes a Flurry of Blows — 3 strikes!`);SFX.ability();
        let delay=0;
        for(let s=0;s<3;s++){
            const sn=s;
            setTimeout(()=>{
                if(battle.monster.currentHp>0)resolveHeroHit(h,hi,pick(h.attackNames),0.55);
                if(battle.monster.currentHp<=0){endCombat(true);return;}
                if(sn===2)finishAbilityTurn();
            },delay);
            delay+=280;
        }
    },
    ki_block:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);log(`${h.name} channels Ki Block — monster next attack cancelled.`);SFX.ability();finishAbilityTurn();},
    /* FIX: life_drain uses resolveHeroHit directly, then handles advance itself
       (previously called executeAttackReturn + finishAbilityTurn = double-advance) */
    life_drain:(h,hi)=>{
        const dmg=resolveHeroHit(h,hi,pick(h.attackNames),1.0);
        const stolen=Math.floor(dmg*0.60);
        h.hp=Math.min(h.hp+stolen,h.maxHp);
        log(`${h.name} drains ${stolen} HP back through Life Drain!`);
        if(battle.monster.currentHp<=0){endCombat(true);return;}
        advanceBattleTurn();renderStats();setTimeout(processBattleTurn,350);
    },
    blood_surge:(h,hi)=>{const s=Math.floor(0.25*h.maxHp);h.hp=Math.max(1,h.hp-s);log(`${h.name} surges with Blood (sacrifice ${s} HP) — 2.5×!`);executeAttack(h,hi,2.5);},
    natures_grasp:(h)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.65);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,2);log(`${h.name} uses Nature's Grasp — monster −35% attack for 2 rounds.`);SFX.ability();finishAbilityTurn();},
    barkskin:(h)=>{party.filter(x=>x.hp>0).forEach(x=>{x.hp=Math.min(x.hp+20,x.maxHp+20);x.maxHp+=20;});log(`${h.name} hardens Barkskin — everyone gains +20 temporary HP.`);SFX.ability();finishAbilityTurn();},
    entangle:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,2);log(`${h.name} casts Entangle — monster rooted for 2 turns!`);SFX.ability();finishAbilityTurn();},
    regrowth:(h)=>{const t=party.filter(x=>x.hp>0).reduce((b,x)=>(x.hp/x.maxHp)<(b.hp/b.maxHp)?x:b);const ti=party.indexOf(t);battle.heroRegen[ti]={amount:Math.floor(0.08*t.maxHp),rounds:3};log(`${h.name} applies Regrowth to ${t.name} — regenerates ${battle.heroRegen[ti].amount} HP/round for 3 rounds.`);SFX.ability();finishAbilityTurn();},
};

/* ═══════════════════════════════════════════════════════════════
   7. INIT
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
    rollParty();
    document.getElementById('btn-enter').addEventListener('click',enterWood);
    // Save button: saves name and shows a brief visual confirmation
    const saveBtn=document.getElementById('btn-save-name');
    if(saveBtn){
        saveBtn.addEventListener('click',()=>{
            const inp=document.getElementById('team-name-input');
            const name=(inp?.value.trim())||'';
            if(name){
                saveBtn.textContent='✓ Saved';
                saveBtn.style.color='#6abf45';
                setTimeout(()=>{saveBtn.textContent='Save';saveBtn.style.color='';},1200);
            }
        });
    }
    // btn-roll and btn-start are rendered dynamically inside the setup screen
    window.addEventListener('keydown',e=>{
        const k=e.key.toLowerCase();
        if(k==='r'&&!document.getElementById('ctrl-setup').classList.contains('hidden')){SFX.roll();rollParty();return;}
        if(['1','2','3','4'].includes(k)){const btns=document.querySelectorAll('#ctrl-play .px-btn');const idx=+k-1;if(btns[idx]&&!btns[idx].disabled)btns[idx].click();}
    });
});

function enterWood(){
    startBgMusic();SFX.start();
    const inp=document.getElementById('team-name-input');
    teamName=(inp?.value.trim())||'The Unnamed Fellowship';
    showScreen('screen-setup');showCtrl('ctrl-setup');
}

/* ═══════════════════════════════════════════════════════════════
   8. PARTY GENERATION
   ═══════════════════════════════════════════════════════════════ */
function rollParty(){party=party.map(h=>(h&&h.locked)?h:makeHero());detectPartyLeader();renderSetup();}

function makeHero(){
    const race=pick(GAME_DATA.races),cls=pick(GAME_DATA.classes),g=rand(0,1);
    const gm=g===0?GENDER_MOD.male:GENDER_MOD.female;
    const hp=clamp(race.hp+cls.hpB+rand(0,18),10,999);
    return {
        name:pick(race.names),race:race.name,job:cls.name,gender:g,
        hp,maxHp:hp,
        str:clamp(race.str+cls.strB+rand(0,6)+gm.str,1,99),
        int:clamp(race.int+cls.intB+rand(0,6),1,99),
        dex:clamp(race.dex+cls.dexB+rand(0,6),1,99),
        cha:clamp(race.cha+cls.chaB+rand(0,5)+gm.cha,1,30),
        sta:clamp(race.sta+cls.staB+rand(0,5)+gm.sta,1,30),
        lck:clamp(race.lck+cls.lckB+rand(0,5)+gm.lck,1,30),
        leadership:clamp(cls.leadership+Math.floor((race.cha+cls.chaB-10)/3),1,20),
        morality:clamp(cls.moralityStart+rand(-5,5),-50,50),
        resistances:{...race.resistances},
        isLeader:false,lastInitiative:0,leaderAuraBonus:0,
        level:1,xp:0,xpNext:xpThreshold(1),bonusDmg:0,
        primaryStat:cls.primaryStat,damageType:cls.damageType,
        attackNames:cls.attackNames,
        abilities:cls.abilities,
        abilityCooldowns:{},
        items:[],locked:false,
    };
}
function xpThreshold(l){return l*60;}
function detectPartyLeader(){
    // Strip any existing aura bonus before recalculating
    party.forEach(h=>{if(h&&h.leaderAuraBonus){h.maxHp-=h.leaderAuraBonus;h.hp=Math.min(h.hp,h.maxHp);h.leaderAuraBonus=0;}});
    const a=party.filter(h=>h&&h.hp>0);
    if(!a.length){party.forEach(h=>{if(h)h.isLeader=false;});return;}
    const eff=h=>Math.floor((h.dex+h.lck)/4);
    const lead=a.reduce((b,h)=>eff(h)>eff(b)?h:b);
    party.forEach(h=>{if(h)h.isLeader=(h===lead);});
    // Apply inspiring aura to living non-leader allies: +1 to +4 max HP based on leadership
    const aura=Math.ceil(lead.leadership/5);
    a.forEach(h=>{if(!h.isLeader){h.leaderAuraBonus=aura;h.maxHp+=aura;}});
}
function partyAlignmentMod(){
    const alive=party.filter(h=>h&&h.hp>0);
    const lightW=alive.reduce((s,h)=>s+(h.morality>30?2:h.morality>10?1:0),0);
    const darkW=alive.reduce((s,h)=>s+(h.morality<-30?2:h.morality<-10?1:0),0);
    if(lightW>0&&darkW>0)return -Math.min(lightW,darkW);
    return Math.floor(Math.max(lightW,darkW)/2);
}
function alignIcon(morality){
    if(morality>30)return '😇';
    if(morality<-30)return '😈';
    if(morality>10)return '<span style="color:#e8c45a">✦</span>';
    if(morality<-10)return '<span style="color:#b47afe">◆</span>';
    return '';
}
function toggleLock(i){SFX.lock();party[i].locked=!party[i].locked;renderSetup();}

function renderSetup(){
    const c=document.getElementById('party-slots');c.innerHTML='';
    party.forEach((h,i)=>{
        const d=document.createElement('div');d.className=`slot-card${h.locked?' locked':''}`;
        const resLines=Object.entries(h.resistances).filter(([,v])=>v!==0)
            .map(([k,v])=>`<span style="color:#ff7733">${k}: ${v>0?'+':''}${v}%</span>`).join('<br>')||'None';
        d.innerHTML=`
            <span class="slot-name">${h.isLeader?'👑 ':''}${alignIcon(h.morality)} ${h.name}</span>
            <span class="slot-sub" data-setup-racejob="${i}">
                <span data-setup-race="${i}" style="cursor:help;border-bottom:1px dotted rgba(201,162,39,.4)">${h.race}</span>
                ·
                <span data-setup-job="${i}"  style="cursor:help;border-bottom:1px dotted rgba(201,162,39,.4)">${h.job}</span>
            </span>
            <span class="slot-stats">HP:${h.hp} STR:${h.str} INT:${h.int} DEX:${h.dex}</span>
            <span class="slot-stats">CHA:${h.cha} STA:${h.sta} LCK:${h.lck}</span>
            <span class="slot-sub" style="color:#c8c0b0">⚔ ${h.attackNames.join(' · ')}</span>
            <span class="slot-sub ability-hint" style="cursor:help" data-setup-abil="${i}">⚡ ${h.abilities.map(a=>a.name).join(' · ')}</span>
            <button class="bind-btn" onclick="toggleLock(${i})">${h.locked?'Release':'Keep Hero'}</button>`;
        c.appendChild(d);

        // Wire tooltips via global JS system (immune to overflow:hidden)
        const raceData=GAME_DATA.races.find(r=>r.name===h.race);
        const clsData=GAME_DATA.classes.find(cl=>cl.name===h.job);
        const genderName=h.gender===0?'Male':'Female';
        const moralLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
        const initMod=Math.floor((h.dex+h.lck)/4);
        const resHTML=Object.entries(h.resistances).filter(([,v])=>v!==0)
            .map(([k,v])=>`<span style="color:#ff7733">${k}: ${v>0?'+':''}${v}%</span>`).join('  ')||'None';

        // Race tooltip
        const raceLoreText=raceData?.lore?`<br><br><em style="color:#aaaaaa;font-style:italic">${raceData.lore}</em>`:'';
        const raceTip=
            `<span style="color:#e8c45a;font-size:1.05em">${h.race}</span><br>`+
            `<span style="color:#88ccff">HP:${h.hp}  STR:${h.str}  INT:${h.int}  DEX:${h.dex}</span><br>`+
            `<span style="color:#88ccff">CHA:${h.cha}  STA:${h.sta}  LCK:${h.lck}</span>`+
            (resHTML!=='None'?`<br><span style="color:#ff7733">Resistances: ${resHTML}</span>`:'')+
            raceLoreText;
        const raceEl=d.querySelector(`[data-setup-race="${i}"]`);
        if(raceEl) showTip(raceEl, raceTip);

        // Class tooltip
        const abilLines=[...h.abilities].sort((a,b)=>a.cooldown-b.cooldown).map(a=>{const net=2-a.cooldown;const netCol=net>=0?'#6abf45':net>=-2?'#c8a040':'#cc3333';return `<span style="color:#e879f9">${a.name}</span> <span style="color:#aaaaaa">CD:${a.cooldown} · INIT cost:${a.cooldown} · net <span style="color:${netCol}">${net>=0?'+':''}${net}</span></span><br><span style="color:#bbbbbb;padding-left:8px">${a.desc}</span>`;}).join('<br>');
        const clsLoreText=clsData?.lore?`<br><br><em style="color:#aaaaaa;font-style:italic">${clsData.lore}</em>`:'';
        const genderLoreText2=(typeof GENDER_LORE!=='undefined')?GENDER_LORE[h.gender]:'';
        const genderLoreEl=genderLoreText2?`<br><br><span style="color:#e8c45a">${h.gender===0?'Male':'Female'}</span><br><em style="color:#aaaaaa;font-style:italic">${genderLoreText2}</em>`:'';
        const clsTip=
            `<span style="color:#e8c45a;font-size:1.05em">${h.job}</span><br>`+
            `Primary stat: <span style="color:#88ccff">${h.primaryStat?.toUpperCase()}</span>  `+
            `Damage: <span style="color:#ff7733">${h.damageType}</span>`+
            clsLoreText+
            `<br><br><span style="color:#e879f9">Abilities:</span><br>${abilLines}`+
            genderLoreEl;
        const jobEl=d.querySelector(`[data-setup-job="${i}"]`);
        if(jobEl) showTip(jobEl, clsTip);

        // Ability hint tooltip (same as class but focused on abilities)
        const abilEl=d.querySelector(`[data-setup-abil="${i}"]`);
        if(abilEl) showTip(abilEl, `<span style="color:#e879f9">Class Abilities</span><br><br>${abilLines}`);
    });
    renderPortraitStrip();
    // Action buttons below the hero cards, appended to the screen section (not the flex row)
    const screen=document.getElementById('screen-setup');
    const existing=document.getElementById('setup-action-btns');
    if(existing)existing.remove();
    const btnWrap=document.createElement('div');
    btnWrap.id='setup-action-btns';
    btnWrap.style.cssText='display:flex;gap:12px;justify-content:center;padding:14px 0 4px;';
    btnWrap.innerHTML=`
        <button id="btn-roll" class="px-btn" onclick="SFX.roll();rollParty();">⚄ Reroll [R]</button>
        <button id="btn-start" class="px-btn gold-btn" onclick="startGame();">▶ Commence Journey</button>`;
    screen.appendChild(btnWrap);
}

/* ═══════════════════════════════════════════════════════════════
   9. PORTRAIT STRIP
   Heroes left-aligned, active monster right-aligned.
   Status badges, HP colours, initiative, hover tooltips.
   ═══════════════════════════════════════════════════════════════ */

/* =========================================================
   9. PORTRAIT PANELS v1.0
   Card order: crown | sprite+status-overlay | hp-bar | name | class+lvl | icons
   ========================================================= */

function itemIcon(name){
    const n=name||'';
    if(/axe|pick/i.test(n))return '🪓';
    if(/mace|hammer/i.test(n))return '🔨';
    if(/sword|blade|claymore|shiv/i.test(n))return '⚔';
    if(/staff|wand/i.test(n))return '🪄';
    if(/orb|crystal/i.test(n))return '🔮';
    if(/scroll|tome|grimoire|codex/i.test(n))return '📜';
    if(/bow|quiver/i.test(n))return '🏹';
    if(/ring/i.test(n))return '💍';
    if(/amulet|crown|circlet/i.test(n))return '📿';
    if(/gloves|gauntlet/i.test(n))return '🥊';
    if(/boots/i.test(n))return '👢';
    if(/cloak|cape|sash/i.test(n))return '🧣';
    if(/vest|tunic|plate|armour|armor/i.test(n))return '🛡';
    if(/shield|aegis/i.test(n))return '🛡';
    if(/helm|helmet/i.test(n))return '⛑';
    if(/belt/i.test(n))return '🪢';
    if(/chain/i.test(n))return '⛓';
    if(/bandage|salve/i.test(n))return '🩹';
    return '✦';
}

function heroStatusIcons(hi){
    const t=[];
    if((battle.heroShielded[hi]||0)>0)   t.push({icon:'🛡',tip:'<span style="color:#88ccff">Shielded</span> — next hit absorbed'});
    if((battle.heroPhaseShift[hi]||0)>0) t.push({icon:'👁',tip:'<span style="color:#b47afe">Phase Shift</span> — untargetable'});
    if(battle.heroRegen[hi])             t.push({icon:'💚',tip:'<span style="color:#6abf45">Regenerating</span> HP each round'});
    if((battle.heroRage[hi]||0)>0)       t.push({icon:'🔥',tip:'<span style="color:#ff7733">Rage</span> — +70% damage'});
    if(battle.heroDmgMult[hi])           t.push({icon:'⬆',tip:'<span style="color:#ffe033">Damage buffed</span>'});
    if(battle.inspiredHero===hi)         t.push({icon:'🎵',tip:'<span style="color:#e879f9">Inspired</span> — next attack 2×'});
    if(battle.combustPrimed[hi])         t.push({icon:'💣',tip:'<span style="color:#ff7733">Combustion primed</span>'});
    if(battle.judgmentPrimed[hi])        t.push({icon:'⚖',tip:'<span style="color:#ffd700">Judgment</span> marked'});
    return t;
}
function monsterStatusIcons(){
    const t=[];
    if(battle.monsterSkipTurns>0)         t.push({icon:'❄',tip:`<span style="color:#88eeff">Stunned</span> ${battle.monsterSkipTurns} turn(s)`});
    if(battle.monster?.charmed)           t.push({icon:'💕',tip:'<span style="color:#e879f9">Charmed</span>'});
    if(battle.monsterResistNullified)     t.push({icon:'🕳',tip:'<span style="color:#7755dd">Resistances nullified</span>'});
    if(battle.monsterAtkMultRounds>0){const p=Math.round((1-battle.monsterAtkMult)*100);t.push({icon:'⬇',tip:`<span style="color:#88ccff">ATK −${p}%</span>`});}
    if(battle.dotEffects.some(d=>!d.targetType||d.targetType==='monster'))t.push({icon:'☠',tip:'<span style="color:#6abf45">DoT active</span>'});
    return t;
}

function buildCard(spr,data){
    const{id,name,sublabel,hpPct,hpCol,dead,isLeader,isMonster,items,statusIcons,statTip,hpTip}=data;
    const hpW=Math.max(0,Math.min(100,hpPct)).toFixed(1);
    const cardCls=(isMonster?'portrait-card monster-card':'portrait-card')+(dead?' portrait-dead':'');
    const crownHTML=isLeader?'<div class="leader-crown">👑</div>':'';
    const deadHTML=dead?'<div class="portrait-dead-x">✝</div>':'';
    const statusHTML=statusIcons.map(s=>`<span class="status-icon" data-tip="${s.tip.replace(/"/g,'&quot;')}">${s.icon}</span>`).join('');
    const itemHTML=(items||[]).slice(-4).map(n=>{
        const ic=itemIcon(n);
        const it=GAME_DATA.items.find(x=>x.name===n);
        const tip=it?`<span style="color:var(--gold)">✦ ${n}</span><br>+${it.val} <span style="color:#88ccff">${it.stat.toUpperCase()}</span>`:n;
        return `<span class="pi-item-icon" data-itemname="${n.replace(/"/g,'&quot;')}">${ic}</span>`;
    }).join('');
    const nameCls=isMonster?'pi-name pi-name-monster':'pi-name';
    return `<div class="${cardCls}" id="${id}">
        ${crownHTML}
        <div class="portrait-sprite-wrap">
            <div class="portrait-sprite" style="${spr}"></div>
            ${deadHTML}
            <div class="status-overlay">${statusHTML}</div>
        </div>
        <div class="portrait-hp-wrap">
            <div class="portrait-hp-bar" style="width:${hpW}%;background:${hpCol}"></div>
            <span class="hp-tip">${hpTip}</span>
        </div>
        ${dead
          ? `<span class="pi-dead">✝ Slain</span>`
          : `<span class="${nameCls}">${name}<span class="stat-tooltip">${statTip}</span></span>
             <span class="pi-sub">${sublabel}<span class="stat-tooltip">${statTip}</span></span>
             <div class="pi-items">${itemHTML}</div>`
        }
    </div>`;
}

function portraitStyleSized(hero,dW,dH){
    const P=PORTRAIT,rc=P.RACE_COL[hero.race]??{male:0,female:1};
    const col=hero.gender===0?rc.male:rc.female;
    const arch=P.CLASS_ARCHETYPE[hero.job]??'warrior';
    const row=(P.ARCHETYPE_ROW[arch]??[0,0])[hero.gender??0];
    const srcX=P.COL_X[col]??0,srcY=P.ROW_Y[row]??0,srcW=P.COL_W[col]??80,srcH=P.ROW_H[row]??100;
    const sx=dW/srcW,sy=dH/srcH;
    return `background-image:url('portraits.png');background-repeat:no-repeat;background-size:${(P.SHEET_W*sx).toFixed(1)}px ${(P.SHEET_H*sy).toFixed(1)}px;background-position:${-(srcX*sx).toFixed(1)}px ${-(srcY*sy).toFixed(1)}px;image-rendering:pixelated;width:${dW}px;height:${dH}px`;
}
function monsterPortraitStyleSized(idx,dW,dH){
    const P=MPORTRAIT;
    const col=idx%P.COLS,row=Math.floor(idx/P.COLS);
    if(row>=P.ROW_Y.length||col>=P.COL_X.length)return `width:${dW}px;height:${dH}px;background:#111;`;
    const srcX=P.COL_X[col],srcY=P.ROW_Y[row],srcW=P.COL_W[col],srcH=P.ROW_H[row];
    const sx=dW/srcW,sy=dH/srcH;
    return `background-image:url('monsters1.jpg');background-repeat:no-repeat;background-size:${(P.SHEET_W*sx).toFixed(1)}px ${(P.SHEET_H*sy).toFixed(1)}px;background-position:${-(srcX*sx).toFixed(1)}px ${-(srcY*sy).toFixed(1)}px;image-rendering:pixelated;width:${dW}px;height:${dH}px`;
}

function renderPortraitStrip(){
    const hp=document.getElementById('hero-panel');
    if(hp){
        const order=party.map((h,i)=>({h,i}));
        if(battle.active) order.sort((a,b)=>(b.h.lastInitiative||0)-(a.h.lastInitiative||0));
        hp.innerHTML=order.map(({h,i})=>{
            const dead=h.hp<=0;
            const hpPct=h.maxHp>0?h.hp/h.maxHp*100:0;
            const hpCol=hpPct>55?'#4db84d':hpPct>25?'#c8a040':'#aa2222';
            const initMod=Math.floor((h.dex+h.lck)/4);
            const moralLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
            const aura=Math.ceil(h.leadership/5);
            const dtAlign=DAMAGE_TYPES[h.damageType]?.alignment||'neutral';
            const moralDmgBonus=dtAlign==='light'&&h.morality>0?Math.floor(h.morality/20):dtAlign==='dark'&&h.morality<0?Math.floor(-h.morality/20):0;
            const scenMod=clamp(Math.floor(h.morality/10),-5,5);
            const resLines=Object.entries(h.resistances).filter(([,v])=>v!==0).map(([k,v])=>`${k}:${v>0?'+':''}${v}%`).join(' ')||'None';
            const abilLines=[...h.abilities].sort((a,b)=>a.cooldown-b.cooldown).map(a=>{const cd=h.abilityCooldowns?.[a.id]||0;const net=2-a.cooldown;const netCol=net>=0?'#6abf45':net>=-2?'#c8a040':'#cc3333';return `<span style="color:#e879f9">${a.name}</span> <span style="color:#aaaaaa">INIT cost:${a.cooldown} · net <span style="color:${netCol}">${net>=0?'+':''}${net}</span>${cd>0?' · ⏳'+cd+'rnd':' · ✓'}</span><br><span style="color:#bbbbbb;padding-left:8px">${a.desc}</span>`;}).join('<br>');
            const cohMod=partyAlignmentMod();
            const statTip=`<b>${h.name}</b> Lv.${h.level}<br><span style="color:#88ccff">STR:${h.str} INT:${h.int} DEX:${h.dex}<br>CHA:${h.cha} STA:${h.sta} LCK:${h.lck}</span><br>INIT:+${initMod} · Lead:${h.leadership} (Aura +${aura})<br>⚖ ${moralLabel} (${h.morality})${moralDmgBonus>0?' +'+moralDmgBonus+' '+h.damageType:''}${scenMod!==0?' · scenario '+(scenMod>0?'-':'+')+Math.abs(scenMod)+' dmg':''}<br>Cohesion: ${cohMod>0?'+'+cohMod+' ✦ Aligned':cohMod<0?cohMod+' ⚠ Divided':'0 Neutral'}<br><span style="color:#ff7733">Resist: ${resLines}</span><br>${abilLines}`;
            const hpTip=`<span style="color:#6abf45">HP: ${h.hp}/${h.maxHp}</span>  XP: ${h.xp}/${h.xpNext}`;
            const spr=portraitStyleSized(h,66,84);
            return buildCard(spr,{
                id:`portrait-card-${i}`,
                name:h.name,
                sublabel:`${alignIcon(h.morality)} ${h.job} · Lv.${h.level}`,
                hpPct,hpCol,dead,isLeader:h.isLeader,isMonster:false,
                items:h.items,statusIcons:battle.active?heroStatusIcons(i):[],
                statTip,hpTip,
            });
        }).join('');
        // Wire tooltips on each portrait card
        order.forEach(({h,i})=>{
            const card=document.getElementById(`portrait-card-${i}`);
            if(!card)return;
            const dead=h.hp<=0;
            const initMod=Math.floor((h.dex+h.lck)/4);
            const moralLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
            const moralDesc=h.morality>30?'Upholds honour above all else. Holds the line when others would not.':h.morality>10?'Virtuous by habit, if not always by choice.':h.morality>-10?'Neither driven by virtue nor corruption. Reliable enough.':h.morality>-30?'Conscience worn thin. Useful in dark places.':'Honour is a memory. Power is the only language left.';
            const moralCol=h.morality>30?'#e8c45a':h.morality>10?'#6abf45':h.morality>-10?'#aaaaaa':h.morality>-30?'#c8802a':'#cc3333';
            const aura2=Math.ceil(h.leadership/5);
            const dtAlign2=DAMAGE_TYPES[h.damageType]?.alignment||'neutral';
            const moralDmgBonus2=dtAlign2==='light'&&h.morality>0?Math.floor(h.morality/20):dtAlign2==='dark'&&h.morality<0?Math.floor(-h.morality/20):0;
            const scenMod2=clamp(Math.floor(h.morality/10),-5,5);
            const moralAlignLine=dtAlign2==='light'?`<span style="color:#ffd700">Light-aligned damage (holy, nature).</span> Positive morality grants +${moralDmgBonus2} bonus damage per hit.`:dtAlign2==='dark'?`<span style="color:#b47afe">Dark-aligned damage (shadow, necrotic, void, blood, poison, fire).</span> Negative morality grants +${moralDmgBonus2} bonus damage per hit.`:`<span style="color:#aaaaaa">Neutral damage type — morality grants no damage bonus.</span><br>Light types (holy, nature) favour the righteous. Dark types (shadow, necrotic, void, blood, poison, fire) favour the corrupt.`;
            const scenModLine=scenMod2>0?`Righteous bearing softens misfortune: −${scenMod2} to scenario damage.`:scenMod2<0?`Corruption draws darker fate: +${-scenMod2} to scenario damage.`:`Morality too close to neutral to affect the wilds.`;
            const cohMod2=partyAlignmentMod();
            const lightCount=party.filter(x=>x&&x.hp>0&&x.morality>10).length;
            const darkCount=party.filter(x=>x&&x.hp>0&&x.morality<-10).length;
            const cohLabel=cohMod2>0?`<span style="color:#6abf45">✦ Aligned (+${cohMod2} initiative) — Light and Dark are in harmony.</span>`:cohMod2<0?`<span style="color:#cc3333">⚠ Divided (${cohMod2} initiative) — ${lightCount} light vs ${darkCount} dark hero${lightCount+darkCount!==1?'es':''} in conflict.</span>`:`<span style="color:#aaaaaa">Neutral — no alignment synergy or conflict.</span>`;
            const cohDesc=cohMod2>0?`All heroes roll initiative with +${cohMod2}. Shared conviction sharpens the fellowship.`:cohMod2<0?`All heroes roll initiative with ${cohMod2}. Opposing beliefs fracture the fellowship's resolve.`:`Neutral heroes do not impose cohesion effects on others.`;
            const resLines=Object.entries(h.resistances).filter(([,v])=>v!==0).map(([k,v])=>`${k}: ${v>0?'+':''}${v}%`).join('<br>')||'None';
            const abilLines=[...h.abilities].sort((a,b)=>a.cooldown-b.cooldown).map(a=>{const cd=h.abilityCooldowns[a.id]||0;const net=2-a.cooldown;const netCol=net>=0?'#6abf45':net>=-2?'#c8a040':'#cc3333';return `${tc('skill',a.name)} <span style="color:#aaaaaa">INIT cost:${a.cooldown} · net <span style="color:${netCol}">${net>=0?'+':''}${net}</span> · ${cd>0?tc('warn','⏳'+cd+'rnd'):'<span style="color:#6abf45">✓ ready</span>'}</span><br><span style="color:#bbbbbb;padding-left:8px">${a.desc}</span>`;}).join('<br>');
            const raceData=GAME_DATA.races.find(r=>r.name===h.race);
            const clsData=GAME_DATA.classes.find(c=>c.name===h.job);
            const genderName=h.gender===0?'Male':'Female';
            const genderLoreText=(typeof GENDER_LORE!=='undefined')?GENDER_LORE[h.gender]:'';
            const raceLore=raceData?.lore?`<br><em style="color:#aaaaaa;font-style:italic">${raceData.lore}</em>`:'';
            const clsLore=clsData?.lore?`<br><em style="color:#aaaaaa;font-style:italic">${clsData.lore}</em>`:'';
            const genderLore=genderLoreText?`<br><em style="color:#aaaaaa;font-style:italic">${genderLoreText}</em>`:'';
            const statHtml=
                `<b style="color:#ffffff">${h.name}</b>  <span style="color:#88ccff">Lv.${h.level}</span><br>`+
                `${tc('stat','STR:'+h.str+'  INT:'+h.int+'  DEX:'+h.dex)}<br>`+
                `${tc('stat','CHA:'+h.cha+'  STA:'+h.sta+'  LCK:'+h.lck)}<br>`+
                `Initiative bonus: +${initMod}<br>`+
                (resLines!=='None'?`${tc('warn','Resistances: '+resLines)}<br>`:'')+
                `<br><span style="color:#e8c45a">✦ Inspiring Aura  (Leadership ${h.leadership})</span><br>`+
                `Grants +${aura2} max HP to allies · +${aura2} XP per combat victory.<br>`+
                `<br><span style="font-size:1.2em">${alignIcon(h.morality)}</span> <span style="color:${moralCol};font-weight:bold">⚖ ${moralLabel}  (${h.morality})</span><br>`+
                `<em style="color:#aaaaaa">${moralDesc}</em><br>`+
                `${moralAlignLine}<br>`+
                `<em style="color:#aaaaaa">${scenModLine}</em><br>`+
                `<br>${cohLabel}<br>`+
                `<em style="color:#aaaaaa">${cohDesc}</em>`+
                `<br><br><span style="color:#e879f9">— Abilities (weak → strong) —</span><br>${abilLines}`+
                `<br><br><span style="color:#e8c45a">${h.race}</span>${raceLore}`+
                `<br><br><span style="color:#e8c45a">${h.job}</span>${clsLore}`+
                `<br><span style="color:#c8c0b0">⚔ Basic attacks: ${h.attackNames.join(' · ')}</span><br>`+
                `<em style="color:#aaaaaa">Initiative cost: 1 (fast). One is chosen at random each attack.</em>`+
                `<br><br><span style="color:#e8c45a">${genderName}</span>${genderLore}`;
            const hpHtml=`${tc('hp','HP: '+h.hp+'/'+h.maxHp)}<br>XP: ${h.xp}/${h.xpNext}`;
            const spriteEl=card.querySelector('.portrait-sprite-wrap');
            const nameEl=card.querySelector('.pi-name');
            const subEl=card.querySelector('.pi-sub');
            const hpEl=card.querySelector('.portrait-hp-wrap');
            if(spriteEl) showTip(spriteEl,statHtml);
            if(nameEl)   showTip(nameEl,statHtml);
            if(subEl)    showTip(subEl,statHtml);
            if(hpEl)     showTip(hpEl,hpHtml);
            // Item icon tooltips
            card.querySelectorAll('.pi-item-icon').forEach(ic=>{
                const name=ic.dataset.itemname;
                if(!name)return;
                const item=GAME_DATA.items.find(x=>x.name===name);
                if(!item)return;
                showTip(ic,`${tc('item','✦ '+item.name)}<br>+${item.val} ${tc('stat',item.stat.toUpperCase())}`);
            });
            // Status icon tooltips
            card.querySelectorAll('.status-icon').forEach(ic=>{
                const tip=ic.dataset.tip;
                if(tip) showTip(ic,tip);
            });
        });
    }
    const mp=document.getElementById('monster-panel');
    if(mp){
        if(battle.active&&battle.monster&&battle.monster.currentHp>0){
            const m=battle.monster;
            const mIdx=GAME_DATA.monsters.findIndex(x=>x.name===m.name);
            const sIdx=m.spriteIdx??(mIdx>=0?mIdx:0);
            const spr=monsterPortraitStyleSized(sIdx,66,84);
            const hpPct=m.maxHp>0?m.currentHp/m.maxHp*100:0;
            const hpCol=hpPct>66?'#c84040':hpPct>33?'#b85520':'#771010';
            const dotInfo=battle.dotEffects.filter(d=>!d.targetType||d.targetType==='monster').map(d=>`${d.dmgType} ${d.dmgPerRound}/r`).join(', ')||'None';
            const statTip=`<b>${m.name}</b><br><span style="color:#ff7733">ATK:${m.str}</span> INIT:${m.initiative??'?'} Rnd:${battle.round}${m.undead?'<br>☠ Undead':''}${battle.monsterResistNullified?'<br>⚠ Nullified':''}${dotInfo!=='None'?'<br>DoT: '+dotInfo:''}`;
            const hpTip=`<span style="color:#6abf45">HP: ${m.currentHp}/${m.maxHp}</span>`;
            mp.innerHTML=buildCard(spr,{
                id:'monster-card',name:m.name,
                sublabel:`${m.icon} Round ${battle.round}`,
                hpPct,hpCol,dead:false,isLeader:false,isMonster:true,
                items:[],statusIcons:monsterStatusIcons(),
                statTip,hpTip,
            });
        } else { mp.innerHTML=''; return; }
        // Wire monster card tooltips
        const mc=document.getElementById('monster-card');
        if(mc){
            const m=battle.monster;
            const dotInfo=battle.dotEffects.filter(d=>!d.targetType||d.targetType==='monster').map(d=>`${d.dmgType} ${d.dmgPerRound}/r×${d.rounds}`).join(', ')||'None';
            const mData=GAME_DATA.monsters.find(x=>x.name===m.name);
            const lorePart=mData?.lore?`<br><br>${tc('lore',mData.lore)}`:'';
            const mHtml=`${tc('item',m.name)}${lorePart}<br><br>${tc('warn','ATK: '+m.str+(battle.monsterAtkMult!==1?' ×'+battle.monsterAtkMult.toFixed(2):''))}<br>INIT: ${m.initiative??'?'} · Round: ${battle.round}${m.undead?'<br>'+tc('blood','☠ Undead'):''}${battle.monsterResistNullified?'<br>'+tc('warn','⚠ Resistances nullified'):''}${dotInfo!=='None'?'<br>DoT: '+tc('warn',dotInfo):''}`;
            const hpHtml=`${tc('hp','HP: '+m.currentHp+'/'+m.maxHp)}`;
            const spriteEl=mc.querySelector('.portrait-sprite-wrap');
            const nameEl=mc.querySelector('.pi-name');
            const hpEl=mc.querySelector('.portrait-hp-wrap');
            if(spriteEl) showTip(spriteEl,mHtml);
            if(nameEl)   showTip(nameEl,mHtml);
            if(hpEl)     showTip(hpEl,hpHtml);
            mc.querySelectorAll('.status-icon').forEach(ic=>{const tip=ic.dataset.tip;if(tip)showTip(ic,tip);});
        }
    }
}



/* ═══════════════════════════════════════════════════════════════
   10. GAME START & MAIN LOOP
   ═══════════════════════════════════════════════════════════════ */
function startGame(){SFX.start();turn=0;treasury={gold:0,gems:0};detectPartyLeader();showScreen('screen-play');showCtrl('ctrl-play');logPrompt('Thy fellowship crosseth the threshold. The wood closeth behind thee.');log(`${MAX_TURNS} trials lie ahead. May the Old Gods watch over thee.`);nextTurn();}

function nextTurn(){
    turn++;passiveHeal();detectPartyLeader();renderStats();renderTreasury();
    if(turn>MAX_TURNS)return endGame(true);
    if(party.every(h=>h.hp<=0))return endGame(false);
    if(Math.random()<0.15)log(pick(GAME_DATA.ambience));
    if(Math.random()<0.10)doTreasuryEvent();
    const r=Math.random();
    if(r<0.30)doCombat();
    else if(r<0.85)doScenario();
    else doUneventfulTurn();
}

function passiveHeal(){party.forEach(h=>{if(h.hp<=0||h.hp>=h.maxHp)return;if(Math.random()>0.40+h.sta*0.015)return;const a=Math.max(1,Math.floor(h.maxHp*(rand(1,3)+Math.floor(h.sta/5))/100));h.hp=Math.min(h.hp+a,h.maxHp);log(pick(GAME_DATA.healFlavors).replace('{name}',h.name).replace('{hp}',`+${a} HP`));SFX.heal();});}
function doTreasuryEvent(){const gold=rand(5,50),gems=Math.random()<0.35?rand(1,3):0;treasury.gold+=gold;treasury.gems+=gems;log(pick(GAME_DATA.treasuryFlavors));log(`✦ ${gold} gold coins${gems?` and ${gems} precious gem${gems>1?'s':''}`:''}  secured!`);SFX.treasury();}

function fullPartyRest(flavour){
    party.forEach(h=>{
        if(!h||h.hp<=0)return;
        const missing=h.maxHp-h.hp;
        h.hp=h.maxHp;
        // Reset all ability cooldowns
        Object.keys(h.abilityCooldowns).forEach(id=>{h.abilityCooldowns[id]=0;});
        log(`${h.name} fully rests.${missing>0?' ('+missing+' HP restored)':' (already at full HP)'} All abilities refreshed.`);
    });
    if(flavour)log(flavour);
    SFX.heal();
}

function doUneventfulTurn(){
    const ev=pick(GAME_DATA.uneventfulEvents);logPrompt(ev.text);
    const restTip=
        `${tc('hp','💚 Full rest — restores all HP to maximum')}<br>`+
        `${tc('good','✓ Resets all ability cooldowns')}<br>`+
        `${tc('good','✓ Clears any lingering afflictions')}<br><br>`+
        `${tc('lore','The fellowship takes a full respite. One trial spent.')}`;
    setChoices([
        {label:'[1] Press on through the wood',tooltip:tc('lore','→ Safe — continue forward, no effect'),action:()=>{log(ev.pressOn);SFX.neutral();setTimeout(nextTurn,40);}},
        {label:'[2] Rest and recover',tooltip:restTip,action:()=>{fullPartyRest(ev.restFlavour);setTimeout(nextTurn,40);}},
        {label:'[3] Search the surroundings',action:()=>{const best=Math.max(...party.filter(h=>h.hp>0).map(h=>h.lck));if(Math.random()<0.12+best*0.008)giveLoot();else log('Naught of value is found here.');log(ev.searchFlavour);SFX.neutral();setTimeout(nextTurn,40);},tooltip:tc('item','🍀 ~12–25% chance to find an item')+' (LCK improves this)'},
    ]);
}

/* ═══════════════════════════════════════════════════════════════
   11. SCENARIO — with stat-gated bonus options
   ═══════════════════════════════════════════════════════════════ */
function doScenario(){
    const ev=pick(GAME_DATA.scenarios);logPrompt(ev.text);
    const typeIcon={'good':tc('good','✦ Favourable'),'bad':tc('warn','⚠ Risky'),'neutral':tc('lore','~ Uncertain')};
    const choices=ev.options.map((opt,i)=>{
        const icon=typeIcon[opt.type||'neutral']||typeIcon.neutral;
        const tip=`${icon}<br><br>${tc('lore',opt.effect||opt.text)}`+
            (opt.damage?`<br>${tc('warn','May cause '+opt.damage+' damage')}`:'')+ 
            (opt.bonus?`<br>${tc('good','Grants a bonus')}`:'')+ 
            (opt.item?`<br>${tc('item','May yield an item')}`:'');
        return {label:`[${i+1}] ${opt.text}`,tooltip:tip,action:()=>resolveScenario(opt)};
    });
    if(ev.gated){ev.gated.forEach(g=>{const hero=party.find(h=>h.hp>0&&h[g.requires.stat]>=g.requires.min);if(hero){
            const gTip=`${tc('good','✦ Guaranteed success')}<br>${hero.name} meets the requirement (${g.requires.stat.toUpperCase()} ${hero[g.requires.stat]} ≥ ${g.requires.min})<br><br>${tc('lore',g.effect||g.text)}${g.bonus?'<br>'+tc('good','Grants a bonus'):''}${g.item?'<br>'+tc('item','Yields an item'):''}`;
            choices.push({label:`[${choices.length+1}] [${g.requires.stat.toUpperCase()} ${g.requires.min}+] ${hero.name}: ${g.text}`,tooltip:gTip,action:()=>resolveGated(hero,g),isGated:true});
        }});}
    setChoices(choices);
}
function resolveScenario(opt){
    const h=aliveHero();if(!h)return;
    if(opt.damage){
        // Morality softens or worsens misfortune: +1 morality = -1 dmg (floor(morality/10), capped ±5)
        const moralMod=clamp(Math.floor(h.morality/10),-5,5);
        const dmg=Math.max(1,opt.damage-moralMod);
        h.hp-=dmg;
        const mLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
        if(moralMod>0)log(`${mLabel} bearing softens the blow. (−${moralMod} damage)`);
        else if(moralMod<0)log(`${mLabel} draws darker fate. (+${-moralMod} damage)`);
        SFX.bad();shake();
    }
    if(opt.bonus?.hp)h.hp=Math.min(h.hp+(opt.bonus.hp||0),h.maxHp);
    if(opt.bonus?.str)h.str+=opt.bonus.str;if(opt.bonus?.int)h.int+=opt.bonus.int;
    if(opt.bonus?.dex)h.dex+=opt.bonus.dex;if(opt.bonus?.cha)h.cha+=opt.bonus.cha;
    if(opt.bonus?.sta)h.sta+=opt.bonus.sta;if(opt.bonus?.lck)h.lck+=opt.bonus.lck;
    if(opt.bonus&&!opt.damage)SFX.good();
    if(opt.item)giveLoot();
    if(!opt.damage&&!opt.bonus&&!opt.item)SFX.neutral();
    if(opt.morality)h.morality=clamp(h.morality+opt.morality,-100,100);
    log(`${h.name}: ${opt.effect}`);grantXP(h,opt.xp??15);setTimeout(nextTurn,40);
}
function resolveGated(hero,g){
    SFX.good();
    if(g.bonus?.hp)hero.hp=Math.min(hero.hp+(g.bonus.hp||0),hero.maxHp);
    if(g.bonus?.str)hero.str+=g.bonus.str;if(g.bonus?.int)hero.int+=g.bonus.int;
    if(g.bonus?.dex)hero.dex+=g.bonus.dex;if(g.bonus?.cha)hero.cha+=g.bonus.cha;
    if(g.bonus?.sta)hero.sta+=g.bonus.sta;if(g.bonus?.lck)hero.lck+=g.bonus.lck;
    if(g.item)giveLoot();
    if(g.morality)hero.morality=clamp(hero.morality+(g.morality||0),-100,100);
    log(`✦ ${hero.name} (${g.requires.stat.toUpperCase()} ${hero[g.requires.stat]}): ${g.effect}`);
    grantXP(hero,g.xp??30);setTimeout(nextTurn,40);
}

/* ═══════════════════════════════════════════════════════════════
   12. COMBAT
   ═══════════════════════════════════════════════════════════════ */
function doCombat(){
    const base=pick(GAME_DATA.monsters);
    if(base.special==='honk')return doHonkEncounter();
    const scale=1+(turn/280)+(Math.random()*0.70-0.35);
    resetBattle();
    battle.monster={...base,currentHp:Math.round(base.hp*scale),maxHp:Math.round(base.hp*scale),str:Math.max(1,Math.round(base.str*scale)),charmed:false,resistances:{}};
    battle.active=true;
    setMusicMood('battle');
    logPrompt(`${battle.monster.icon} ${battle.monster.name} emerges from the shadows!`);
    if(battle.monster.taunts&&Math.random()<0.30)log(pick(battle.monster.taunts));
    const order=[];
    party.filter(h=>h.hp>0).forEach(h=>{const r=rollInitiative(h);h.lastInitiative=r;order.push({entity:h,type:'hero',initiative:r});});
    const mi=rand(1,12)+Math.floor(battle.monster.maxHp/40);
    battle.monster.initiative=mi;
    order.push({entity:battle.monster,type:'monster',initiative:mi});
    order.sort((a,b)=>b.initiative-a.initiative);
    battle.order=[...order];battle.turnIdx=0;battle.round=1;
    log(`Initiative: ${order.map(e=>`${e.type==='hero'?e.entity.name:battle.monster.name}(${e.initiative})`).join(' › ')}`);
    const cohMod=partyAlignmentMod();
    if(cohMod>0)log(`✦ Aligned fellowship — cohesion grants +${cohMod} to all initiative.`);
    else if(cohMod<0)log(`⚠ Divided fellowship — alignment conflict: ${cohMod} to all initiative.`,'blood');
    log('━━━ Battle Round 1 ━━━');
    processBattleTurn();
}

function rollInitiative(h){return rand(1,20)+Math.floor(h.dex/4)+Math.floor(h.lck/5)+(h.isLeader?2:0)+partyAlignmentMod();}

function processRoundEffects(){
    // DOTs
    battle.dotEffects=battle.dotEffects.filter(dot=>{
        if(battle.monster.currentHp<=0)return false;
        battle.monster.currentHp=Math.max(0,battle.monster.currentHp-dot.dmgPerRound);
        const col=DAMAGE_TYPES[dot.dmgType]?.color||'#fff';
        logHTML(`<span style="color:${col}">${dot.dmgPerRound} ${dot.dmgType} damage from ${dot.source}'s poison!</span>`);
        dot.rounds--;return dot.rounds>0;
    });
    // Regen
    Object.entries(battle.heroRegen).forEach(([i,r])=>{const h=party[i];if(h&&h.hp>0){h.hp=Math.min(h.hp+r.amount,h.maxHp);log(`${h.name} regenerates ${r.amount} HP.`);}r.rounds--;if(r.rounds<=0)delete battle.heroRegen[i];});
    // Spirit totem
    if(battle.spiritTotemRounds>0){party.filter(h=>h.hp>0).forEach(h=>{h.hp=Math.min(h.hp+10,h.maxHp);});log('The Spirit Totem pulses — all allies heal 10 HP!');SFX.heal();battle.spiritTotemRounds--;}
    // Tick debuffs
    if(battle.monsterAtkMultRounds>0){battle.monsterAtkMultRounds--;if(battle.monsterAtkMultRounds===0)battle.monsterAtkMult=1.0;}
    Object.entries(battle.heroDmgMult).forEach(([i,d])=>{d.rounds--;if(d.rounds<=0)delete battle.heroDmgMult[i];});
}

function processBattleTurn(){
    if(!battle.active)return;
    if(battle.monster.currentHp<=0)return endCombat(true);
    if(party.every(h=>h.hp<=0))return endGame(false);
    // Skip dead entities
    for(let a=0;a<battle.order.length;a++){
        const cur=battle.order[battle.turnIdx];
        const dead=cur.type==='hero'?cur.entity.hp<=0:battle.monster.currentHp<=0;
        if(!dead)break;
        advanceBattleTurn();
    }
    const cur=battle.order[battle.turnIdx];
    if(cur.type==='monster')setTimeout(doMonsterTurn,550);
    else showHeroAction(cur.entity);
}

function advanceBattleTurn(){
    battle.turnIdx=(battle.turnIdx+1)%battle.order.length;
    if(battle.turnIdx===0){
        battle.round++;processRoundEffects();
        if(battle.monster.currentHp<=0){endCombat(true);return;}
        if(party.every(h=>h.hp<=0)){endGame(false);return;}
        // Re-sort by current mutable initiative (heroes earn/spend throughout the battle)
        battle.order.sort((a,b)=>b.initiative-a.initiative);
        log(`━━━ Battle Round ${battle.round} ━━━`);
    }
}

function doMonsterTurn(){
    if(!battle.active)return;
    if(battle.monster.currentHp<=0)return endCombat(true);
    if(battle.monsterSkipTurns>0){battle.monsterSkipTurns--;log(`${battle.monster.name} cannot act this turn!`);SFX.neutral();advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);return;}
    if(battle.monster.charmed){battle.monster.charmed=false;log(`${battle.monster.name} is charmed — hesitates!`);SFX.charm();advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);return;}
    const valid=party.filter((h,i)=>h.hp>0&&!(battle.heroPhaseShift[i]>0));
    if(!valid.length){log(`${battle.monster.name} finds no valid target!`);advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);return;}
    const target=valid[Math.floor(Math.random()*valid.length)],ti=party.indexOf(target);
    if(battle.heroPhaseShift[ti]>0)battle.heroPhaseShift[ti]--;
    const mDT=battle.monster.damageType||'physical',res=target.resistances?.[mDT]??0;
    let rawDmg=Math.round(battle.monster.str*battle.monsterAtkMult)+rand(-3,3);
    if(battle.heroShielded[ti]>0){battle.heroShielded[ti]--;log(`${target.name}'s shield absorbs the blow!`);SFX.shield();}
    else{const dmg=Math.max(1,Math.round(rawDmg*(1-res/100)));target.hp-=dmg;log(`${battle.monster.name} strikes ${target.name}! ${dmg} damage${res>0?` (${res}% resisted)`:''}.`);battle.monster.str>24?SFX.heavyHit():SFX.strike();shake();}
    battle.monsterAttackedLastRound=true;
    advanceBattleTurn();renderStats();setTimeout(processBattleTurn,500);
}

function showHeroAction(hero){
    const hi=party.indexOf(hero);
    Object.keys(hero.abilityCooldowns).forEach(id=>{if(hero.abilityCooldowns[id]>0)hero.abilityCooldowns[id]--;});
    if(battle.heroPhaseShift[hi]>0)battle.heroPhaseShift[hi]--;
    if(battle.heroRage[hi]>0)battle.heroRage[hi]--;
    const hpPct=battle.monster.currentHp/battle.monster.maxHp;
    const hpDesc=hpPct>0.75?'unharmed':hpPct>0.50?'wounded':hpPct>0.25?'badly hurt':'near death';
    log(`${battle.monster.icon} ${battle.monster.name} is ${hpDesc}. (${battle.monster.currentHp}/${battle.monster.maxHp} HP)  ${hero.isLeader?'👑 ':''}${hero.name}'s turn.`);

    const sv=hero[hero.primaryStat];
    const minD=Math.max(1,Math.floor(sv*0.50)+1+hero.bonusDmg);
    const maxD=Math.max(1,Math.floor(sv*0.50)+Math.max(2,Math.floor(sv*0.15))+hero.bonusDmg);
    const critP=Math.round(Math.min(35,(hero.dex+hero.lck)/240*100));
    const mData=GAME_DATA.monsters.find(x=>x.name===battle.monster.name);
    const mLore=mData?.lore?`<br><br>${tc('lore',mData.lore)}`:'';

    const choices=[];
    const atkName=pick(hero.attackNames);
    const oe=battle.order.find(e=>e.type==='hero'&&e.entity===hero);
    const curInit=oe?oe.initiative:hero.lastInitiative;
    const basicCost=1;
    // Basic attack tooltip — cost 1, recovery +2 on hit = net +1
    const atkTip=`${tc('item','⚔ Basic attack')}  <span style="color:#88ccff">— ${atkName}</span><br>`+
        `Est. damage: ${tc('stat',minD+'–'+maxD)} ${tc('lore',hero.damageType)}<br>`+
        `Crit chance: ${tc('good',critP+'%')}<br>`+
        `Initiative cost: ${tc('good',basicCost)} · Recovery on hit: ${tc('good','+2')} · Net: ${tc('good','+1 per round')}<br>`+
        `Current initiative: ${tc('stat',curInit)}<br><br>`+
        `${tc('good','✦ Choosing basic attack when stronger skills are available')} earns +1 Morality on a killing blow.`;
    choices.push({label:`[1] ${atkName}`,tooltip:atkTip,action:()=>{
        if(oe)oe.initiative=Math.max(1,oe.initiative-basicCost);
        executeAttackWithMorality(hero,hi,1.0,true);
    }});

    hero.abilities.forEach(ab=>{
        const cd=hero.abilityCooldowns[ab.id]||0,ready=cd===0;
        const abCost=ab.cooldown;
        const netInit=2-abCost; // recovery is always +2 on hit
        const costLabel=abCost<=2?'light':abCost<=4?'moderate':'heavy';
        const costCol=abCost<=2?'good':abCost<=4?'warn':'blood';
        const netCol=netInit>=0?'good':netInit>=-2?'warn':'blood';
        let tipColor=ready?'item':'warn';
        const abTip=`${tc(tipColor,ab.name)}<br>`+
            `${tc('skill',ab.desc)}<br><br>`+
            (ready?`${tc('good','✓ Ready')}`:`${tc('warn','⏳ Cooldown: '+cd+' round(s) remaining')}`)+
            `<br>Cooldown: ${ab.cooldown} rounds after use<br>`+
            `Initiative cost: ${tc(costCol,abCost+' ('+costLabel+')')} · Recovery on hit: ${tc('good','+2')} · Net: ${tc(netCol,(netInit>=0?'+':'')+netInit)}<br>`+
            `Current initiative: ${tc('stat',curInit)}`+
            (battle.monster.name&&mData?`<br><br>${tc('lore',mData.name)}${mLore}`:'');
        choices.push({
            label:`[${choices.length+1}] ${ab.name}`+(ready?'':'  ('+cd+' rnd)')+`  — ${ab.desc}`,
            disabled:!ready,
            cooldown:!ready,
            tooltip:abTip,
            action:()=>{
                if(!ready){log(`${ab.name} is on cooldown (${cd} rounds).`);SFX.neutral();advanceBattleTurn();setTimeout(processBattleTurn,300);return;}
                if(oe)oe.initiative=Math.max(1,oe.initiative-abCost);
                hero.abilityCooldowns[ab.id]=ab.cooldown;
                const fn=ABILITY_EFFECTS[ab.id];
                if(!fn){log(`[Error: ability ${ab.id} not found — skipping turn]`);finishAbilityTurn();return;}
                fn(hero,hi);
            },
        });
    });
    if(hero.isLeader){
        const fleeTip=`${tc('warn','Attempt to escape combat')}<br>`+
            `~55% chance of success<br><br>`+
            `${tc('warn','⚠ Failure: battle continues')}<br>`+
            `${tc('warn','⚠ Success: −5 Morality (cowardice)')}<br>`+
            `Only the party leader may attempt this.`;
        choices.push({label:`[${choices.length+1}] Attempt to flee (leader only)`,isFlee:true,tooltip:fleeTip,action:()=>attemptFlee(hero)});
    }
    setChoices(choices);
}

/* Basic attack with morality-on-kill reward for choosing weaker option */
function executeAttackWithMorality(hero,hi,mult,isBasic=false){
    resolveHeroHit(hero,hi,pick(hero.attackNames),mult);
    if(battle.monster.currentHp<=0){
        endCombat(true);
        // If player used basic attack when at least one ability was available, reward morality
        if(isBasic){
            const hadAbility=hero.abilities.some(ab=>(hero.abilityCooldowns[ab.id]||0)===0);
            if(hadAbility){
                hero.morality=clamp(hero.morality+1,-100,100);
                log(`${hero.name} dispatched the foe with honour. (Morality +1)`);
            }
        }
        return;
    }
    advanceBattleTurn();renderStats();setTimeout(processBattleTurn,300);
}

/* ─────────────────────────────────────────────
   CORE ATTACK HELPERS
   
   executeAttack:
     • resolves the hit synchronously
     • if monster dies → endCombat(true) immediately  ← BUG FIX
     • otherwise → advance turn, schedule next turn
   ───────────────────────────────────────────── */
function executeAttack(hero,hi,mult,_guaranteeHit=false,overrideDmgType=null){
    resolveHeroHit(hero,hi,pick(hero.attackNames),mult,overrideDmgType);
    if(battle.monster.currentHp<=0){endCombat(true);return;}   // ← FIXED
    advanceBattleTurn();
    renderStats();
    setTimeout(processBattleTurn,300);
}

/**
 * Resolve one hero hit.
 * Returns damage dealt. Does NOT advance the turn.
 */
function resolveHeroHit(hero,hi,atkName,mult,overrideDmgType=null){
    if(battle.monster.currentHp<=0)return 0;
    let stat=hero[hero.primaryStat];
    let dmg=Math.max(1,Math.floor(stat*0.50)+rand(1,Math.max(2,Math.floor(stat*0.15)))+hero.bonusDmg);
    dmg=Math.round(dmg*mult);
    if(battle.heroRage[hi]>0)dmg=Math.round(dmg*1.70);
    if(battle.heroDmgMult[hi])dmg=Math.round(dmg*battle.heroDmgMult[hi].mult);
    if(battle.inspiredHero===hi){dmg=Math.round(dmg*2.0);battle.inspiredHero=null;log(`${hero.name} is Inspired — double damage!`);}
    if(battle.combustPrimed[hi]){dmg=Math.round(dmg*3.0);battle.combustPrimed[hi]=false;log(`Combustion triggers — 3×!`);}
    if(battle.judgmentPrimed[hi]){const jm=battle.monster.undead?2.0:1.5;dmg=Math.round(dmg*jm);battle.judgmentPrimed[hi]=false;log(`Judgment strikes! ×${jm}!`);}
    const critChance=Math.min(0.35,(hero.dex+hero.lck)/240);
    const isCrit=Math.random()<critChance;
    if(isCrit)dmg=Math.round(dmg*1.75);
    const dmgType=overrideDmgType||hero.damageType;
    const dmgInfo=DAMAGE_TYPES[dmgType]??DAMAGE_TYPES.physical;
    // Morality alignment bonus: light types benefit from positive morality, dark types from negative
    const dtAlign=dmgInfo.alignment;
    let moralBonus=0;
    if(dtAlign==='light'&&hero.morality>0)moralBonus=Math.floor(hero.morality/20);
    else if(dtAlign==='dark'&&hero.morality<0)moralBonus=Math.floor(-hero.morality/20);
    dmg+=moralBonus;
    let res=0;
    if(!battle.monsterResistNullified&&battle.monster.resistances)res=battle.monster.resistances[dmgType]??0;
    if(res!==0)dmg=Math.max(1,Math.round(dmg*(1-res/100)));
    battle.monster.currentHp=Math.max(0,battle.monster.currentHp-dmg);
    // Initiative recovery: successful hit +2, resisted/poor hit +1 (capped at lastInitiative+5)
    const oeR=battle.order.find(e=>e.type==='hero'&&e.entity===hero);
    if(oeR){const recovery=res>30?1:2;oeR.initiative=Math.min(oeR.initiative+recovery,hero.lastInitiative+5);}
    const critSpan=isCrit?` <span style="color:#ffe033">✦ CRIT!</span>`:'';
    const moralSpan=moralBonus>0?` <span style="color:#aaaaaa">(+${moralBonus} aligned)</span>`:'';
    logHTML(`${hero.name} — ${atkName}: <span style="color:${dmgInfo.color}">${dmg} ${dmgInfo.label}</span>${critSpan}${moralSpan}`);
    if(isCrit)SFX.crit();playSfxForDmgType(dmgType);
    if(isCrit||battle.monster.str>24)shake();
    return dmg;
}

/**
 * Called at the end of any non-attack ability.
 * Checks for monster death (shouldn't happen for buffs, but safety net).
 */
function finishAbilityTurn(){
    if(battle.monster.currentHp<=0){endCombat(true);return;}
    if(party.every(h=>h.hp<=0)){endGame(false);return;}
    advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);
}

function attemptFlee(hero){
    log(`${hero.name} rallies the fellowship to retreat...`);
    if(Math.random()>0.45){log(`${hero.name} leads the party to safety!`);SFX.flee();hero.morality=clamp(hero.morality-5,-100,100);log(`${hero.name} bears a quiet shame at the retreat. (Morality -5)`);battle.active=false;setMusicMood('normal');setTimeout(nextTurn,500);}
    else{log(`The ${battle.monster.name} cuts off the retreat!`,'blood');SFX.bad();advanceBattleTurn();setTimeout(processBattleTurn,400);}
}

function endCombat(won){
    if(!battle.active)return;   // guard against double-calls
    battle.active=false;
    if(party.every(h=>h.hp<=0))return endGame(false);
    if(won){
        setMusicMood('normal');log(`${battle.monster.name} is defeated!`);SFX.good();
        if(Math.random()<battle.monster.loot)giveLoot();
        if(battle.monster.boon&&Math.random()<0.25){const h=aliveHero();if(h){if(battle.monster.boon.hp)h.hp=Math.min(h.hp+battle.monster.boon.hp,h.maxHp);if(battle.monster.boon.int)h.int+=battle.monster.boon.int;log(`Strange energy from ${battle.monster.name} flows into ${h.name}!`);}}
        const bXP=battle.monster.xpValue??40;
        const sf=battle.monster.str/(GAME_DATA.monsters.find(m=>m.name===battle.monster.name)?.str??battle.monster.str)||1;
        const ldr=party.find(h=>h&&h.isLeader&&h.hp>0);
        const inspireBonus=ldr?Math.ceil(ldr.leadership/5):0;
        if(ldr&&inspireBonus>0)log(`${ldr.name}'s inspiring presence grants +${inspireBonus} XP to all.`);
        party.filter(h=>h.hp>0).forEach(h=>grantXP(h,Math.round(bXP*sf)+inspireBonus));
    }
    renderStats();setTimeout(nextTurn,700);
}

/* ═══════════════════════════════════════════════════════════════
   13. THE GREAT HONK OF DEATH
   ═══════════════════════════════════════════════════════════════ */
function doHonkEncounter(){setMusicMood('tense');clearChoices();SFX.doubleHonk();[{t:0,text:'The forest falleth utterly silent.',style:'pale'},{t:900,text:'A shadow crosseth the canopy overhead.',style:'pale'},{t:1900,text:'From the mists emergeth... THE GREAT HONK OF DEATH.',style:'blood'},{t:2900,text:'🪿 It regardeth thee with one terrible, ancient eye.',style:'blood'},{t:3800,text:'"Men have wept at its passing. Armies have broken and fled.',style:'dim'},{t:4600,text:'"Scholars who beheld it could not sleep for a fortnight."',style:'dim'}].forEach(({t,text,style})=>setTimeout(()=>log(text,style),t));setTimeout(()=>SFX.honk(),2800);setTimeout(()=>setChoices([{label:'[1] Stand thy ground and fight!',action:fightHonk},{label:'[2] Flee for thy very life!',action:fleeHonk}]),5400);}
function fightHonk(){log('Thou raisest thy weapon against the eternal goose...');SFX.honk();setTimeout(()=>{if(Math.random()<0.80){party.forEach(h=>{h.hp=0;});SFX.death();shake();shake();setTimeout(()=>{log('HONK.','blood');log('Thy fellowship is unmade. The Great Honk is eternal.','blood');setTimeout(()=>endGame(false),1800);},600);}else{party.forEach(h=>{if(h.hp>0)h.hp=Math.max(1,Math.floor(h.hp*0.08));});log('The Goose... tires of thee. A miracle known to no other.');party.forEach(h=>grantXP(h,500));treasury.gems=(treasury.gems||0)+1;treasury.honkSlain=true;log('A precious gem falls from the heavens!');SFX.victory();setTimeout(nextTurn,1200);}},1200);}
function fleeHonk(){log('Thou turnest and runnest as thou hast never run before!');SFX.flee();setTimeout(()=>{if(Math.random()<0.50){log('Somehow, impossibly, thou escapest. The honk fades...');setTimeout(nextTurn,800);}else{log('THE GREAT HONK FINDETH THEE.','blood');SFX.doubleHonk();setTimeout(fightHonk,1200);}},900);}

/* ═══════════════════════════════════════════════════════════════
   14. LOOT & XP
   ═══════════════════════════════════════════════════════════════ */
function giveLoot(){const item=pick(GAME_DATA.items),r=getBestRecipient(item.stat);if(!r)return;r.items.push(item.name);r[item.stat]+=item.val;log(`${r.name} found ✦ ${item.name}! (+${item.val} ${item.stat.toUpperCase()})`);SFX.loot();}
function getBestRecipient(stat){const a=party.filter(h=>h.hp>0);if(!a.length)return null;if(stat==='hp')return a.reduce((b,h)=>(h.hp/h.maxHp)<(b.hp/b.maxHp)?h:b);const pr=a.filter(h=>h.primaryStat===stat);return(pr.length?pr:a).reduce((b,h)=>h[stat]>b[stat]?h:b);}
function grantXP(hero,amount){if(!hero||hero.hp<=0)return;hero.xp+=amount;while(hero.xp>=hero.xpNext&&hero.level<100){hero.xp-=hero.xpNext;hero.level+=1;hero.xpNext=xpThreshold(hero.level);doLevelUp(hero);}}
function doLevelUp(hero){SFX.levelUp();log(`✦ ${hero.name} reached Level ${hero.level}!`);const gains=[];const pg=rand(1,3);hero[hero.primaryStat]+=pg;gains.push({stat:hero.primaryStat.toUpperCase(),val:pg});const hg=rand(3,8);hero.maxHp+=hg;hero.hp=Math.min(hero.hp+hg,hero.maxHp);gains.push({stat:'HP',val:hg});if(Math.random()<0.40){const sec=pick(['str','int','dex','cha','sta','lck'].filter(s=>s!==hero.primaryStat));const v=rand(1,2);hero[sec]+=v;gains.push({stat:sec.toUpperCase(),val:v});}if(hero.level%5===0){hero.bonusDmg+=1;gains.push({stat:'DMG',val:1});}hero.leadership=clamp(hero.leadership+Math.floor(hero.level/10),1,20);const idx=party.indexOf(hero);gains.forEach((g,i)=>setTimeout(()=>flashStatGain(idx,`+${g.val} ${g.stat}`,'#e8c45a'),i*320));}
function flashStatGain(idx,text,color){const card=document.getElementById(`portrait-card-${idx}`);if(!card)return;const el=document.createElement('div');el.className='stat-flash';el.textContent=text;el.style.color=color;card.appendChild(el);setTimeout(()=>el.remove(),2500);}

/* ═══════════════════════════════════════════════════════════════
   15. END GAME
   ═══════════════════════════════════════════════════════════════ */
function endGame(won){
    if(!battle.active===false)battle.active=false;
    showScreen('screen-end');showCtrl('ctrl-end');
    const endEl=document.getElementById('screen-end');endEl.className=`screen ${won?'victory':'defeat'}`;
    const wealth=treasury.gold+treasury.gems*20;
    const avgMoral=Math.round(party.filter(h=>h).reduce((s,h)=>s+(h.morality||0),0)/party.filter(h=>h).length);
    const alignLabel=avgMoral>30?'Righteous':avgMoral>10?'Good':avgMoral>-10?'Neutral':avgMoral>-30?'Shadowed':'Corrupt';
    const alignCol=avgMoral>30?'#e8c45a':avgMoral>10?'#6abf45':avgMoral>-10?'#aaaaaa':avgMoral>-30?'#c8802a':'#cc3333';
    const titleEl=document.getElementById('end-title'),flavourEl=document.getElementById('end-flavour');
    if(won){SFX.victory();titleEl.textContent='✦ VICTORY ✦';flavourEl.innerHTML=pick(GAME_DATA.victoryLines)+` Treasury: ${treasury.gold} gold · ${treasury.gems} gems · ${wealth} gold value.<br>Fellowship stood as: <span style="color:${alignCol}">${alignLabel}</span> (avg morality ${avgMoral>0?'+':''}${avgMoral})`;}
    else{SFX.death();titleEl.textContent='✧ DEFEAT ✧';flavourEl.innerHTML=pick(GAME_DATA.defeatLines)+`<br>Fellowship stood as: <span style="color:${alignCol}">${alignLabel}</span> (avg morality ${avgMoral>0?'+':''}${avgMoral})`;}
    const scores=JSON.parse(localStorage.getItem('norrt_scores')||'[]');
    scores.push({team:teamName,turns:turn,won,gold:treasury.gold,gems:treasury.gems,wealth,align:alignLabel,honkSlain:!!treasury.honkSlain,date:new Date().toLocaleDateString('sv-SE')});
    scores.sort((a,b)=>{if(a.won!==b.won)return a.won?-1:1;if(a.won)return b.wealth-a.wealth;return b.turns-a.turns;});
    localStorage.setItem('norrt_scores',JSON.stringify(scores.slice(0,50)));
    document.getElementById('highscore-list').innerHTML=scores.map((s,i)=>{const icon=s.won?'✦':'✧',colour=s.won?'var(--gold)':'var(--dim)';const detail=s.won?`${s.turns} trials · ${s.wealth} gold · ${s.align||'Unknown'}`:`${s.turns} trials · ${s.align||'Unknown'}`;return `<p style="color:${colour}">${i+1}. ${icon} ${s.team} · ${detail} · ${s.date}</p>`;}).join('');
}

/* ═══════════════════════════════════════════════════════════════
   16. RENDER & UTILITIES
   ═══════════════════════════════════════════════════════════════ */
function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    const show=id!=='screen-intro';
    const hp=document.getElementById('hero-panel');
    const mp=document.getElementById('monster-panel');
    if(hp)hp.style.display=show?'flex':'none';
    if(mp)mp.style.display=show?'flex':'none';
    if(show)renderPortraitStrip();
}
function showCtrl(id){['ctrl-intro','ctrl-setup','ctrl-play','ctrl-end'].forEach(c=>document.getElementById(c).classList.toggle('hidden',c!==id));}
function logPrompt(text){
    document.querySelectorAll('#game-log .prompt-current').forEach(p=>p.classList.remove('prompt-current'));
    const el=document.getElementById('game-log');
    const sep=document.createElement('p');sep.className='log-spacer';sep.innerHTML='&nbsp;';
    el.insertAdjacentElement('afterbegin',sep);
    const p=document.createElement('p');p.className='prompt-current';p.textContent=text;
    el.insertAdjacentElement('afterbegin',p);
}
function log(text,style='pale'){const el=document.getElementById('game-log'),p=document.createElement('p');if(style==='blood')p.classList.add('log-blood');else if(style==='speech')p.classList.add('log-speech');p.textContent=text;el.insertAdjacentElement('afterbegin',p);enrichLog(el,p);}
function logHTML(html){
    const el=document.getElementById('game-log'),p=document.createElement('p');
    p.innerHTML=html;
    el.insertAdjacentElement('afterbegin',p);
    enrichLog(el,p);
}

/**
 * Add inline tooltip spans to item names and damage type labels found in HTML.
 * Item names are matched against GAME_DATA.items; damage types against DAMAGE_TYPES.
 */
function enrichLogHTML(html){
    return html; // tooltips added via JS after insert — see wrapLogTips()
}

/* After inserting a log <p>, wire tooltip spans in it using the global tip system */
function wrapLogTips(p){
    // Item names
    GAME_DATA.items.forEach(item=>{
        p.querySelectorAll('.log-tip-item').forEach(el=>{
            if(el.dataset.tipped) return;
            el.dataset.tipped='1';
            showTip(el, `<span style="color:#c9a227">✦ ${el.textContent}</span><br>+${item.val} <span style="color:#88ccff">${item.stat.toUpperCase()}</span>`);
        });
    });
    // Damage type spans (colored via logHTML)
    p.querySelectorAll('[data-dmgtype]').forEach(el=>{
        if(el.dataset.tipped) return;
        el.dataset.tipped='1';
        const dt=DAMAGE_TYPES[el.dataset.dmgtype];
        if(dt) showTip(el, `<span style="color:${dt.color}">${dt.label}</span> damage`);
    });
}

function enrichLog(_el, p) {
    // Work on innerHTML so we can wrap text nodes
    // Step 1: wrap item names
    GAME_DATA.items.forEach(item=>{
        if(!p.innerHTML.includes(item.name)) return;
        const esc=item.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        p.innerHTML=p.innerHTML.replace(
            new RegExp('(?<![\w>])(' + esc + ')(?![\w<])', 'g'),
            `<span style="color:#c9a227;cursor:help;border-bottom:1px dotted rgba(201,162,39,.5);" data-itemname="${item.name.replace(/"/g,'&quot;')}">$1</span>`
        );
    });
    // Step 2: wrap monster names
    GAME_DATA.monsters.forEach(mon=>{
        if(!p.innerHTML.includes(mon.name)) return;
        const esc=mon.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        p.innerHTML=p.innerHTML.replace(
            new RegExp('(?<![\w>])(' + esc + ')(?![\w<])', 'g'),
            `<span style="color:#ff9999;cursor:help;border-bottom:1px dotted rgba(255,100,100,.5);" data-monname="${mon.name.replace(/"/g,'&quot;')}">$1</span>`
        );
    });
    // Step 3: wire showTip on all wrapped spans
    p.querySelectorAll('[data-itemname]').forEach(span=>{
        if(span.dataset.tipped) return; span.dataset.tipped='1';
        const item=GAME_DATA.items.find(x=>x.name===span.dataset.itemname);
        if(!item) return;
        const lore=item.lore?`<br><br><em style="color:#bbbbbb">${item.lore}</em>`:'';
        showTip(span, `<span style="color:#c9a227">✦ ${item.name}</span><br>+${item.val} <span style="color:#88ccff">${item.stat.toUpperCase()}</span>${lore}`);
    });
    p.querySelectorAll('[data-monname]').forEach(span=>{
        if(span.dataset.tipped) return; span.dataset.tipped='1';
        const mon=GAME_DATA.monsters.find(x=>x.name===span.dataset.monname);
        if(!mon) return;
        const lore=mon.lore?`<br><br><em style="color:#bbbbbb">${mon.lore}</em>`:'';
        const hpInfo=mon.hp?`<br>HP: <span style="color:#88ccff">${mon.hp}</span>  ATK: <span style="color:#ff7733">${mon.str}</span>`:'';
        showTip(span, `<span style="color:#ff9999">${mon.name}</span>${hpInfo}${lore}`);
    });
}
function setChoices(choices){
    const el=document.getElementById('ctrl-play');
    el.innerHTML='';
    choices.forEach(c=>{
        const btn=document.createElement('button');
        let cls='px-btn';
        if(c.isGated)   cls+=' gated-btn';
        if(c.cooldown)  cls+=' btn-cooldown';    // ability on cooldown — reddish
        if(c.isFlee)    cls+=' btn-flee';
        btn.className=cls;
        if(c.disabled)  btn.classList.add('ability-cooldown');
        btn.textContent=c.label;
        // Attach tooltip via global system
        if(c.tooltip) showTip(btn, c.tooltip);
        btn.addEventListener('click',()=>{
            el.querySelectorAll('button').forEach(b=>b.disabled=true);
            c.action();
        });
        el.appendChild(btn);
    });
}
function clearChoices(){document.getElementById('ctrl-play').innerHTML='';}
function renderStats(){detectPartyLeader();renderPortraitStrip();}
function renderTreasury(){
    const bar=document.getElementById('treasury-bar');
    if(!bar)return;
    const total=treasury.gold+(treasury.gems||0)*100;
    bar.innerHTML=
        `<span class='tbar-turn'>⚔ Turn ${turn}/${MAX_TURNS}</span>`+
        `<span class='tbar-gold'>🪙 ${treasury.gold} Gold</span>`+
        `<span class='tbar-gem'>💎 ${treasury.gems||0} Gems</span>`+
        `<span class='tbar-total'>🏆 ${total} Total Riches</span>`+
        `<label class='tbar-music' style="cursor:pointer;opacity:0.55;font-size:0.82em;display:inline-flex;align-items:center;gap:3px;user-select:none;" title="Toggle music">`+
        `<input type='checkbox' ${musicMuted?'':'checked'} onchange='toggleMusic()' style="cursor:pointer;accent-color:#c9a227;width:11px;height:11px;"> ♪</label>`;
}

const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function aliveHero(){const a=party.filter(h=>h.hp>0);return a.length?a[Math.floor(Math.random()*a.length)]:null;}
