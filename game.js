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
    monster:null,monsters:[],targetIdx:0,isPack:false,order:[],turnIdx:0,round:1,active:false,charmUsed:false,
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
    currentRoll:null,       // {roll,label,color,mult} — d20 result for current action
    alignmentBonus:null,    // {roll,aligned,abilityAlign} — alignment bonus for current action
};

function resetBattle(){Object.assign(battle,{monster:null,monsters:[],targetIdx:0,isPack:false,order:[],turnIdx:0,round:1,active:false,charmUsed:false,monsterAtkMult:1.0,monsterAtkMultRounds:0,heroDmgMult:{},monsterSkipTurns:0,heroShielded:{},heroPhaseShift:{},heroRegen:{},heroRage:{},combustPrimed:{},judgmentPrimed:{},dotEffects:[],monsterResistNullified:false,monsterAttackedLastRound:false,spiritTotemRounds:0,inspiredHero:null,currentRoll:null,alignmentBonus:null});}

/* ═══════════════════════════════════════════════════════════════
   D20 DICE SYSTEM
   rollD20()     — returns {roll,label,color,mult}
   getDiceMult() — returns battle.currentRoll.mult or 1.0
   withDiceRoll(heroIdx, fn) — shows animation, then fires fn()
   showDiceRoll(heroIdx, result, cb) — portrait overlay animation
   ═══════════════════════════════════════════════════════════════ */
function tierD20(r){
    if(r===1) return{roll:r,label:'Fumble!',  color:'#cc2222',mult:0.25};
    if(r<=5)  return{roll:r,label:'Poor',     color:'#c87830',mult:0.50};
    if(r<=10) return{roll:r,label:'Partial',  color:'#c8c030',mult:0.75};
    if(r<=15) return{roll:r,label:'Success',  color:'#ffffff',mult:1.00};
    if(r<=19) return{roll:r,label:'Strong!',  color:'#6abf45',mult:1.30};
    return           {roll:r,label:'CRITICAL!',color:'#c9a227',mult:2.00};
}
function getLuckBonus(hero){return Math.round((hero.lck-10)/5);}
function rollWithLuck(hero){const raw=Math.floor(Math.random()*20)+1;return tierD20(clamp(raw+getLuckBonus(hero),1,20));}
function rollD20(){return tierD20(Math.floor(Math.random()*20)+1);}
function getDiceMult(){return battle.currentRoll?battle.currentRoll.mult:1.0;}

function showDiceRollOnCard(cardId,result,cb){
    const card=document.getElementById(cardId);
    if(!card){setTimeout(cb,0);return;}
    const ov=document.createElement('div');
    ov.className='dice-overlay';
    ov.innerHTML=`<span class="dice-spin">${Math.floor(Math.random()*20)+1}</span>`;
    card.appendChild(ov);
    const iv=setInterval(()=>{
        const s=ov.querySelector('.dice-spin');
        if(s)s.textContent=Math.floor(Math.random()*20)+1;
    },70);
    setTimeout(()=>{
        clearInterval(iv);
        ov.innerHTML=`<span class="dice-result" style="color:${result.color}">${result.roll}</span>`+
                     `<span class="dice-tier"   style="color:${result.color}">${result.label}</span>`;
    },1300);
    setTimeout(()=>{ov.remove();cb();},2200);
}

function withDiceRoll(heroIdx,actionFn,abilityId=null){
    const result=rollWithLuck(party[heroIdx]);
    battle.currentRoll=result;
    battle.alignmentBonus=null;
    const hero=party[heroIdx];
    setTimeout(()=>{
        logHTML(`${hero?hero.name:'Hero'} raises the die — 🎲 `+
            `<span style="color:${result.color};font-weight:bold">${result.roll}</span> `+
            `<span style="color:${result.color}">${result.label}</span>`);
    },1300);
    showDiceRollOnCard(`portrait-card-${heroIdx}`,result,()=>{
        // Resolve alignment effect before action fires
        if(abilityId&&hero){
            const as=computeHeroAlignState(hero,abilityId);
            if(as){
                if(as.aligned===true){
                    battle.alignmentBonus=as; // picked up by resolveHeroHit / heals
                    const msg=as.abilityAlign==='good'
                        ?`${hero.name}'s righteous heart empowers the deed! (<span style="color:#e8c45a">+${as.roll} aligned power</span>)`
                        :`${hero.name}'s dark nature feeds the deed! (<span style="color:#cc3333">+${as.roll} aligned power</span>)`;
                    logHTML(msg);
                } else if(as.aligned===false){
                    const shift=as.abilityAlign==='evil'?-as.roll:as.roll;
                    changeMorality(hero,shift);
                    const msg=as.abilityAlign==='evil'
                        ?`${hero.name} acts against their nature — this dark deed leaves a mark. (<span style="color:#cc3333">Morality −${as.roll}</span>)`
                        :`${hero.name} acts against their nature — mercy feels foreign here. (<span style="color:#e8c45a">Morality +${as.roll}</span>)`;
                    logHTML(msg);
                } else {
                    // Neutral hero: tiny nudge, no log clutter
                    const nudge=as.abilityAlign==='good'?1:-1;
                    changeMorality(hero,nudge);
                }
            }
        }
        actionFn();
    });
}

const DICE_TIP=`<br><br><span style="color:#888888">🎲 Roll: 1=Fumble×¼ · 2–5=Poor×½ · 6–10=Partial×¾ · 11–15=Hit×1 · 16–19=Strong×1.3 · 20=Crit×2</span>`;

/* ═══════════════════════════════════════════════════════════════
   ABILITY ALIGNMENT — good / evil tags on specific abilities
   Neutral abilities have no entry.
   ═══════════════════════════════════════════════════════════════ */
const ABILITY_ALIGNMENT={
    // ── Good ──────────────────────────────────────────────────────
    lay_on_hands:'good', divine_heal:'good',  rallying_cry:'good',
    holy_aegis:'good',   turn_undead:'good',  divine_smite:'good',
    spirit_totem:'good', inspire:'good',      judgment:'good',
    regrowth:'good',     shield_wall:'good',
    // ── Evil ──────────────────────────────────────────────────────
    pact_of_blood:'evil', life_drain:'evil',  blood_surge:'evil',
    hunters_mark:'evil',  wither:'evil',      undead_barrier:'evil',
    hex:'evil',           backstab:'evil',    poison_blade:'evil',
    necro_barrier:'evil', dirge:'evil',
};

/* Returns HTML icon prefix for a button label */
function getAlignIcon(abilityId){
    const a=ABILITY_ALIGNMENT[abilityId];
    if(a==='good') return `<span style="color:#e8c45a">✦</span> `;
    if(a==='evil') return `<span style="color:#cc3333">☠</span> `;
    return '';
}

/* Morality flash — animated +/- overlay on portrait card */
function flashMorality(hero,delta){
    if(!delta)return;
    const hi=party.indexOf(hero);
    if(hi<0)return;
    const card=document.getElementById(`portrait-card-${hi}`);
    if(!card)return;
    const el=document.createElement('div');
    el.className='moral-flash';
    el.style.color=delta>0?'#6abf45':'#cc3333';
    el.textContent=(delta>0?'+':'')+delta+' ⚖';
    card.appendChild(el);
    setTimeout(()=>el.remove(),2400);
}
/* Drop-in replacement for direct morality clamp assignments */
function changeMorality(hero,delta){
    hero.morality=clamp(hero.morality+delta,-100,100);
    flashMorality(hero,delta);
}

/* Returns null (neutral ability) or {roll,aligned,abilityAlign}:
   aligned=true  → hero alignment matches → bonus effect
   aligned=false → opposing alignment → morality penalty
   aligned=null  → neutral hero, small nudge only               */
function computeHeroAlignState(hero,abilityId){
    const abilityAlign=ABILITY_ALIGNMENT[abilityId];
    if(!abilityAlign) return null;
    const roll=rand(1,5);
    const heroGood=hero.morality>10, heroEvil=hero.morality<-10;
    if(abilityAlign==='good'&&heroGood)  return{roll,aligned:true, abilityAlign};
    if(abilityAlign==='evil'&&heroEvil)  return{roll,aligned:true, abilityAlign};
    if(abilityAlign==='good'&&heroEvil)  return{roll,aligned:false,abilityAlign};
    if(abilityAlign==='evil'&&heroGood)  return{roll,aligned:false,abilityAlign};
    return{roll,aligned:null,abilityAlign}; // neutral hero: gentle nudge
}

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
    rallying_cry:(h)=>{const ab=battle.alignmentBonus?.aligned===true?battle.alignmentBonus.roll:0;const heal=Math.max(1,Math.round(Math.floor(0.12*h.maxHp)*getDiceMult())+ab);party.filter(x=>x.hp>0).forEach(x=>{x.hp=Math.min(x.hp+heal,x.maxHp);});const cost=Math.min(5,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} sounds a Rallying Cry! All allies recover ${heal} HP. (${h.name} spends ${cost} HP in the effort)`);SFX.ability();finishAbilityTurn();},
    rage:(h,hi)=>{battle.heroRage[hi]=3;log(`${h.name} enters a RAGE! +70% damage for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    reckless_atk:(h,hi)=>{log(`${h.name} swings a Reckless Attack — 2× power!`);executeAttack(h,hi,2.0);},
    second_wind:(h)=>{const heal=Math.max(1,Math.round(Math.floor(0.20*h.maxHp)*getDiceMult()));h.hp=Math.min(h.hp+heal,h.maxHp);changeMorality(h,-1);log(`${h.name} finds a Second Wind! +${heal} HP. (Morality −1 — self-preservation over the mission)`);SFX.heal();finishAbilityTurn();},
    action_surge:(h,hi)=>{
        log(`${h.name} surges — attacking twice!`);SFX.ability();
        resolveHeroHit(h,hi,pick(h.attackNames),1.0);
        if(handleMonsterDeath()){endCombat(true);return;}
        setTimeout(()=>{
            if(!allMonstersDead())resolveHeroHit(h,hi,pick(h.attackNames),1.0);
            if(handleMonsterDeath()){endCombat(true);return;}
            finishAbilityTurn();
        },350);
    },

    /* ── Holy ── */
    lay_on_hands:(h)=>{const ab=battle.alignmentBonus?.aligned===true?battle.alignmentBonus.roll:0;const w=party.filter(x=>x.hp>0&&x.hp/x.maxHp<=0.30);const t=w.length?w[0]:h;const a=Math.max(1,Math.round((w.length?t.maxHp:Math.floor(0.40*h.maxHp))*getDiceMult())+ab);t.hp=Math.min(t.hp+a,t.maxHp);log(`${h.name} lays hands on ${t.name}! +${a} HP.`);SFX.heal();finishAbilityTurn();},
    divine_smite:(h,hi)=>{const isEvil=DAMAGE_TYPES[battle.monster.damageType]?.alignment==='dark'||battle.monster.undead;const mult=isEvil?2.5:2.0;log(`${h.name} calls Divine Smite!${isEvil?' Extra judgement against this evil foe!':''}`);executeAttack(h,hi,mult,false,'holy');},
    divine_heal:(h)=>{const ab=battle.alignmentBonus?.aligned===true?battle.alignmentBonus.roll:0;const t=party.filter(x=>x.hp>0).reduce((b,x)=>(x.hp/x.maxHp)<(b.hp/b.maxHp)?x:b);const a=Math.max(1,Math.round(Math.floor(0.35*t.maxHp)*getDiceMult())+ab);t.hp=Math.min(t.hp+a,t.maxHp);changeMorality(h,-1);log(`${h.name} channels Divine Heal to ${t.name}! +${a} HP. (Morality −1 — cannot save everyone)`);SFX.heal();finishAbilityTurn();},
    turn_undead:(h,hi)=>{const isU=!!battle.monster.undead;if(!isU){battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);log(`${h.name} invokes Turn Undead — the creature is stunned!`);}else{log(`${h.name} invokes Turn Undead! Holy power blazes against the undead!`);}executeAttack(h,hi,isU?3.0:1.0,false,'holy');},
    holy_aegis:(h)=>{party.forEach((_,i)=>{battle.heroShielded[i]=(battle.heroShielded[i]||0)+1;});const cost=Math.min(8,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} raises Holy Aegis — whole party shielded! (${h.name} spends ${cost} HP in divine exertion)`);SFX.shield();finishAbilityTurn();},
    judgment:(h,hi)=>{battle.judgmentPrimed[hi]=true;log(`${h.name} marks ${battle.monster.name} with Judgment!`);SFX.ability();finishAbilityTurn();},
    spirit_totem:(h)=>{battle.spiritTotemRounds=2;const cost=Math.min(8,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} summons a Spirit Totem! Party heals 10 HP/round for 2 rounds. (${h.name} spends ${cost} HP binding the spirit)`);SFX.ability();finishAbilityTurn();},
    thunder_axe:(h,hi)=>{log(`${h.name} calls Thunder Axe — 2.5× lightning!`);executeAttack(h,hi,2.5,false,'lightning');},

    /* ── Rogues ── */
    backstab:(h,hi)=>{if(!battle.monsterAttackedLastRound){log(`${h.name} cannot find an opening for Backstab — improvises a quick jab (0.7×)!`);SFX.strike();executeAttack(h,hi,0.70);return;}log(`${h.name} drives a Backstab — 2.5× damage!`);executeAttack(h,hi,2.5);},
    vanish:(h)=>{log(`${h.name} vanishes into shadow — the fellowship retreats!`);SFX.flee();battle.active=false;setTimeout(nextTurn,500);},
    hunters_mark:(h,hi)=>{battle.heroDmgMult[hi]={mult:1.6,rounds:3};changeMorality(h,-1);log(`${h.name} applies Hunter's Mark — +60% damage for 3 attacks. (Morality −1 — a death-mark is a dark rite)`);SFX.ability();finishAbilityTurn();},
    distracting_shot:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);const cost=Math.min(3,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} fires a Distracting Shot — monster loses next action! (${h.name} exposes herself for ${cost} HP)`);SFX.ability();finishAbilityTurn();},
    poison_blade:(h)=>{battle.dotEffects.push({dmgPerRound:18,dmgType:'poison',rounds:3,source:h.name});log(`${h.name} applies deep Poison — 18 poison damage/round for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    smoke_bomb:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);const cost=Math.min(3,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} hurls a Smoke Bomb — monster blinded, next attack misses! (${h.name} inhales fumes for ${cost} HP)`);SFX.ability();finishAbilityTurn();},
    shadow_step:(h,hi)=>{battle.heroShielded[hi]=(battle.heroShielded[hi]||0)+1;log(`${h.name} Shadow Steps — dodging next attack and striking at 1.5×!`);executeAttack(h,hi,1.5);},
    eclipse:(h)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.60);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,2);log(`${h.name} casts Eclipse — monster attack −40% for 2 rounds.`);SFX.ability();finishAbilityTurn();},
    arcane_pierce:(h,hi)=>{
        log(`${h.name} fires Arcane Pierce — bypassing all resistance!`);
        const orig=battle.monster.resistances||{};
        battle.monster.resistances={};          // nullify for this hit (sync)
        resolveHeroHit(h,hi,pick(h.attackNames),1.0);
        battle.monster.resistances=orig;         // restore immediately after sync hit
        if(handleMonsterDeath()){endCombat(true);return;}
        advanceBattleTurn();renderStats();setTimeout(processBattleTurn,300);
    },
    volley:(h,hi)=>{
        log(`${h.name} looses an Arrow Volley — two shots at 75% power!`);SFX.ability();
        resolveHeroHit(h,hi,pick(h.attackNames),0.75);
        if(handleMonsterDeath()){endCombat(true);return;}
        setTimeout(()=>{
            if(!allMonstersDead())resolveHeroHit(h,hi,pick(h.attackNames),0.75);
            if(handleMonsterDeath()){endCombat(true);return;}
            finishAbilityTurn();
        },350);
    },

    /* ── Mages ── */
    frost_nova:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,2);const cost=Math.min(5,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} casts Frost Nova — monster FROZEN for 2 turns! (${h.name} spends ${cost} HP in concentration)`);SFX.ability();finishAbilityTurn();},
    arcane_surge:(h,hi)=>{const rc=Math.floor(0.20*h.maxHp);h.hp=Math.max(1,h.hp-rc);log(`${h.name} channels Arcane Surge (${rc} recoil) — 3× power!`);executeAttack(h,hi,3.0);},
    chain_lightning:(h,hi)=>{log(`${h.name} releases Chain Lightning — 2.5×!`);executeAttack(h,hi,2.5,false,'lightning');},
    wild_magic:(h,hi)=>{
        const eff=pick(['triple','freeze','heal','loot','recoil']);
        log(`${h.name} triggers Wild Magic Surge — unpredictable!`);SFX.ability();
        if(eff==='triple'){log('Pure destruction! 3× damage!');executeAttack(h,hi,3.0);return;}
        if(eff==='freeze'){battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,2);log('Monster frozen for 2 turns!');finishAbilityTurn();return;}
        if(eff==='heal'){party.filter(x=>x.hp>0).forEach(x=>{x.hp=Math.min(x.hp+25,x.maxHp);});log('The surge heals all allies for 25 HP!');SFX.heal();finishAbilityTurn();return;}
        if(eff==='loot'){giveLoot();log('The surge summons a relic from the ether!');finishAbilityTurn();return;}
        if(eff==='recoil'){const d=rand(20,40);h.hp=Math.max(1,h.hp-d);changeMorality(h,1);log(`The surge backfires — ${h.name} takes ${d} damage! (Morality +1 — enduring chaos with dignity)`);SFX.bad();shake();finishAbilityTurn();return;}
    },
    undead_barrier:(h,hi)=>{battle.heroShielded[hi]=(battle.heroShielded[hi]||0)+1;log(`${h.name} raises an Undead Barrier — next hit absorbed.`);SFX.shield();finishAbilityTurn();},
    wither:(h,hi)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.70);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,2);changeMorality(h,-1);log(`${h.name} casts Wither — monster −30% attack + 1.5× necrotic hit! (Morality −1 — necrotic arts exact their toll)`);executeAttack(h,hi,1.5,false,'necrotic');},
    combustion:(h,hi)=>{battle.combustPrimed[hi]=true;log(`${h.name} primes Combustion — next Fireball deals 3×!`);SFX.ability();finishAbilityTurn();},
    inferno_dot:(h)=>{battle.dotEffects.push({dmgPerRound:20,dmgType:'fire',rounds:3,source:h.name});log(`${h.name} sets ${battle.monster.name} ablaze — 20 fire damage/round for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    reality_tear:(h)=>{battle.monsterResistNullified=true;const cost=Math.min(8,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} tears Reality — monster defences nullified for this battle! (${h.name} bleeds ${cost} HP from the strain)`);SFX.ability();finishAbilityTurn();},
    phase_shift:(h,hi)=>{battle.heroPhaseShift[hi]=2;const cost=Math.min(5,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} Phase Shifts into the void — untargetable for 2 rounds. (${h.name} spends ${cost} HP bleeding between worlds)`);SFX.ability();finishAbilityTurn();},

    /* ── Hybrids ── */
    hex:(h)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.80);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,3);log(`${h.name} places a Hex — monster −20% attack for 3 rounds.`);SFX.ability();finishAbilityTurn();},
    pact_of_blood:(h,hi)=>{const s=Math.floor(0.25*h.maxHp);h.hp=Math.max(1,h.hp-s);log(`${h.name} invokes the Pact of Blood (sacrifice ${s} HP) — 3×!`);executeAttack(h,hi,3.0);},
    inspire:(h)=>{
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
                if(!allMonstersDead())resolveHeroHit(h,hi,pick(h.attackNames),0.55);
                if(handleMonsterDeath()){endCombat(true);return;}
                if(sn===2)finishAbilityTurn();
            },delay);
            delay+=280;
        }
    },
    ki_block:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,1);const cost=Math.min(3,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} channels Ki Block — monster next attack cancelled. (${h.name} spends ${cost} HP burning ki)`);SFX.ability();finishAbilityTurn();},
    /* FIX: life_drain uses resolveHeroHit directly, then handles advance itself
       (previously called executeAttackReturn + finishAbilityTurn = double-advance) */
    life_drain:(h,hi)=>{
        const dmg=resolveHeroHit(h,hi,pick(h.attackNames),1.0);
        const stolen=Math.floor(dmg*0.60);
        h.hp=Math.min(h.hp+stolen,h.maxHp);
        log(`${h.name} drains ${stolen} HP back through Life Drain!`);
        if(handleMonsterDeath()){endCombat(true);return;}
        advanceBattleTurn();renderStats();setTimeout(processBattleTurn,350);
    },
    blood_surge:(h,hi)=>{const s=Math.floor(0.25*h.maxHp);h.hp=Math.max(1,h.hp-s);log(`${h.name} surges with Blood (sacrifice ${s} HP) — 2.5×!`);executeAttack(h,hi,2.5);},
    natures_grasp:(h)=>{battle.monsterAtkMult=Math.min(battle.monsterAtkMult,0.65);battle.monsterAtkMultRounds=Math.max(battle.monsterAtkMultRounds,2);log(`${h.name} uses Nature's Grasp — monster −35% attack for 2 rounds.`);SFX.ability();finishAbilityTurn();},
    barkskin:(h)=>{party.filter(x=>x.hp>0).forEach(x=>{x.hp=Math.min(x.hp+20,x.maxHp+20);x.maxHp+=20;});changeMorality(h,-1);log(`${h.name} hardens Barkskin — everyone gains +20 temporary HP. (Morality −1 — twisting nature is not without cost)`);SFX.ability();finishAbilityTurn();},
    entangle:(h)=>{battle.monsterSkipTurns=Math.max(battle.monsterSkipTurns,2);const cost=Math.min(5,h.hp-1);h.hp=Math.max(1,h.hp-cost);log(`${h.name} casts Entangle — monster rooted for 2 turns! (${h.name} bleeds ${cost} HP binding the roots)`);SFX.ability();finishAbilityTurn();},
    regrowth:(h)=>{const t=party.filter(x=>x.hp>0).reduce((b,x)=>(x.hp/x.maxHp)<(b.hp/b.maxHp)?x:b);const ti=party.indexOf(t);battle.heroRegen[ti]={amount:Math.floor(0.08*t.maxHp),rounds:3};log(`${h.name} applies Regrowth to ${t.name} — regenerates ${battle.heroRegen[ti].amount} HP/round for 3 rounds.`);SFX.ability();finishAbilityTurn();},
};

/* ═══════════════════════════════════════════════════════════════
   7. INIT
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
    rollParty();
    document.getElementById('btn-enter').addEventListener('click',enterWood);
    const scoresBtn=document.getElementById('btn-scores');
    if(scoresBtn)showTip(scoresBtn,'See Heroes of Old');
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
function partyConflictGap(){
    const alive=party.filter(h=>h&&h.hp>0);
    if(alive.length<2)return 0;
    const m=alive.map(h=>h.morality);
    return Math.max(...m)-Math.min(...m);
}
function conflictStatBonus(hero){
    const gap=partyConflictGap();
    if(gap<20)return 0;
    return Math.min(20,Math.floor(gap/10));
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
        const hasRes=Object.values(h.resistances).some(v=>v!==0);
        const mLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
        const mColor=h.morality>30?'#e8c45a':h.morality>10?'#6abf45':h.morality>-10?'#aaaaaa':h.morality>-30?'#c8802a':'#cc3333';
        d.innerHTML=`
            <span class="slot-name">${h.isLeader?`<span class="slot-crown" data-setup-crown="${i}" style="cursor:help">👑 </span>`:''}<span data-setup-name="${i}" style="cursor:help">${h.name}</span></span>
            <span class="slot-sub">
                <span data-setup-race="${i}" style="cursor:help;border-bottom:1px dotted rgba(201,162,39,.4)">${h.race}</span>
                ·
                <span data-setup-job="${i}" style="cursor:help;border-bottom:1px dotted rgba(201,162,39,.4)">${h.job}</span>
            </span>
            <span class="slot-align" data-setup-align="${i}" style="color:${mColor};cursor:help">⚖ ${mLabel} <span style="opacity:.60;font-size:.85em">(${h.morality>0?'+':''}${h.morality})</span></span>
            <div class="slot-stat-grid" data-setup-stats1="${i}" style="cursor:help">
                <div class="sg-cell"><span class="sg-label">HP</span><span class="sg-num sg-hp">${h.hp}</span></div>
                <div class="sg-cell${h.primaryStat==='str'?' sg-primary':''}"><span class="sg-label">STR</span><span class="sg-num">${h.str}</span></div>
                <div class="sg-cell${h.primaryStat==='int'?' sg-primary':''}"><span class="sg-label">INT</span><span class="sg-num">${h.int}</span></div>
                <div class="sg-cell${h.primaryStat==='dex'?' sg-primary':''}"><span class="sg-label">DEX</span><span class="sg-num">${h.dex}</span></div>
                <div class="sg-cell"><span class="sg-label">CHA</span><span class="sg-num">${h.cha}</span></div>
                <div class="sg-cell"><span class="sg-label">STA</span><span class="sg-num">${h.sta}</span></div>
                <div class="sg-cell"><span class="sg-label">LCK</span><span class="sg-num">${h.lck}</span></div>
            </div>
            <div class="slot-badges">
                <span class="slot-badge" data-setup-atk="${i}" style="cursor:help">⚔ Attacks</span>
                <span class="slot-badge slot-badge-abil" data-setup-abil="${i}" style="cursor:help">⚡ Abilities</span>
                ${hasRes?`<span class="slot-badge slot-badge-res" data-setup-res="${i}" style="cursor:help">🛡 Resists</span>`:''}
            </div>
            <button class="bind-btn" onclick="toggleLock(${i})">${h.locked?'Release':'Keep Hero'}</button>`;
        c.appendChild(d);

        // Wire tooltips via global JS system (immune to overflow:hidden)
        const raceData=GAME_DATA.races.find(r=>r.name===h.race);
        const clsData=GAME_DATA.classes.find(cl=>cl.name===h.job);
        const initMod=Math.floor(h.dex/4);
        const resHTML=Object.entries(h.resistances).filter(([,v])=>v!==0)
            .map(([k,v])=>`<span style="color:#ff7733">${k}: ${v>0?'+':''}${v}%</span>`).join('  ')||'None';

        // Alignment tooltip
        const dtAlign=DAMAGE_TYPES[h.damageType]?.alignment||'neutral';
        const moralDmgBonus=dtAlign==='light'&&h.morality>0?Math.floor(h.morality/20):dtAlign==='dark'&&h.morality<0?Math.floor(-h.morality/20):0;
        const alignTip=
            `<span style="color:${mColor};font-size:1.05em">⚖ ${mLabel}  (${h.morality>0?'+':''}${h.morality})</span><br><br>`+
            `<span style="color:#aaaaaa">Morality shapes how the world treats this hero.<br>It shifts through battle choices and deeds.</span><br><br>`+
            `<span style="color:#e8c45a">Righteous</span> <span style="color:#aaaaaa">> +30 — favoured by light, reduced scenario harm</span><br>`+
            `<span style="color:#6abf45">Good</span>       <span style="color:#aaaaaa">+11 to +30 — fate leans kindly</span><br>`+
            `<span style="color:#aaaaaa">Neutral</span>    <span style="color:#aaaaaa">−10 to +10 — no blessing, no curse</span><br>`+
            `<span style="color:#c8802a">Shadowed</span>  <span style="color:#aaaaaa">−11 to −30 — darker choices, darker fate</span><br>`+
            `<span style="color:#cc3333">Corrupt</span>   <span style="color:#aaaaaa">< −30 — scenario harm amplified, dark power grows</span><br><br>`+
            `<span style="color:#c8c0b0">Damage type:</span> <span style="color:#ff7733">${h.damageType}</span> `+
            (dtAlign==='light'?`<span style="color:#aaaaaa">(light)</span> — `+(h.morality>0?`<span style="color:#6abf45">+${moralDmgBonus} bonus per hit from alignment</span>`:`<span style="color:#aaaaaa">morality too low for damage bonus</span>`):
             dtAlign==='dark'?`<span style="color:#aaaaaa">(dark)</span> — `+(h.morality<0?`<span style="color:#b47afe">+${moralDmgBonus} bonus per hit from alignment</span>`:`<span style="color:#aaaaaa">morality too righteous for dark bonus</span>`):
             `<span style="color:#aaaaaa">(neutral — unaffected by morality)</span>`)+`<br><br>`+
            `<span style="color:#c8c0b0">How it changes:</span><br>`+
            `<span style="color:#6abf45">+1</span> <span style="color:#aaaaaa">basic attack kill when abilities were available</span><br>`+
            `<span style="color:#6abf45">+1</span> <span style="color:#aaaaaa">surviving a risky scenario choice</span><br>`+
            `<span style="color:#cc3333">−1</span> <span style="color:#aaaaaa">killing blow with strong ability (≥2×) at full HP</span><br>`+
            `<span style="color:#cc3333">−5</span> <span style="color:#aaaaaa">fleeing from combat</span>`;
        const alignEl=d.querySelector(`[data-setup-align="${i}"]`);
        if(alignEl) showTip(alignEl, alignTip);

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
        const atkInfoLine=`<span style="color:#c8c0b0">⚔ Basic Attacks</span> <span style="color:#aaaaaa">INIT cost: 1 · Recovery +2 on hit · net <span style="color:#6abf45">+1</span></span><br>`+
            `<span style="color:#bbbbbb;padding-left:8px">${h.attackNames.join(' · ')}</span><br>`+
            `<span style="color:#aaaaaa;padding-left:8px">Damage based on <span style="color:#88ccff">${h.primaryStat?.toUpperCase()}</span> · type: <span style="color:#ff7733">${h.damageType}</span> · one chosen at random</span>`;
        const abilLines=[...h.abilities].sort((a,b)=>a.cooldown-b.cooldown).map(a=>{const net=2-a.cooldown;const netCol=net>=0?'#6abf45':net>=-2?'#c8a040':'#cc3333';return `<span style="color:#e879f9">${a.name}</span> <span style="color:#aaaaaa">CD:${a.cooldown} · INIT cost:${a.cooldown} · net <span style="color:${netCol}">${net>=0?'+':''}${net}</span></span><br><span style="color:#bbbbbb;padding-left:8px">${a.desc}</span>`;}).join('<br>');
        const allAbilLines=atkInfoLine+'<br>'+abilLines;
        const clsLoreText=clsData?.lore?`<br><br><em style="color:#aaaaaa;font-style:italic">${clsData.lore}</em>`:'';
        const genderLoreText2=(typeof GENDER_LORE!=='undefined')?GENDER_LORE[h.gender]:'';
        const genderLoreEl=genderLoreText2?`<br><br><span style="color:#e8c45a">${h.gender===0?'Male':'Female'}</span><br><em style="color:#aaaaaa;font-style:italic">${genderLoreText2}</em>`:'';
        const clsTip=
            `<span style="color:#e8c45a;font-size:1.05em">${h.job}</span><br>`+
            `Primary stat: <span style="color:#88ccff">${h.primaryStat?.toUpperCase()}</span>  `+
            `Damage: <span style="color:#ff7733">${h.damageType}</span>`+
            clsLoreText+
            `<br><br><span style="color:#e879f9">Abilities:</span><br>${allAbilLines}`+
            genderLoreEl;
        const jobEl=d.querySelector(`[data-setup-job="${i}"]`);
        if(jobEl) showTip(jobEl, clsTip);

        // Ability hint tooltip — all abilities including basic attacks
        const abilEl=d.querySelector(`[data-setup-abil="${i}"]`);
        if(abilEl) showTip(abilEl, `<span style="color:#e879f9">All Abilities</span><br><br>${allAbilLines}`);

        // Hero name tooltip — leadership info
        const leaderTip=h.isLeader
            ?`<span style="color:#e8c45a">👑 Party Leader</span><br>Highest <span style="color:#88ccff">DEX+LCK</span> in the fellowship.<br>+2 initiative in battle · may attempt to flee.<br>Leadership ${h.leadership}: grants +${Math.ceil(h.leadership/5)} max HP to allies.`
            :`<span style="color:#aaaaaa">${h.name}</span><br>Not the party leader.<br><span style="color:#aaaaaa">Leader is determined by highest DEX+LCK score.</span>`;
        const nameEl=d.querySelector(`[data-setup-name="${i}"]`);
        if(nameEl) showTip(nameEl, leaderTip);

        // Stats tooltip — covers the whole grid
        const lkBon=Math.round((h.lck-10)/5);
        const statsTip=
            `<span style="color:#6abf45">HP ${h.hp}</span> — hit points before falling in combat<br>`+
            `<span style="color:${h.primaryStat==='str'?'#88ccff':'#888888'}">STR ${h.str}</span> — melee / physical damage${h.primaryStat==='str'?' <span style="color:#e8c45a">★ primary</span>':''}<br>`+
            `<span style="color:${h.primaryStat==='int'?'#88ccff':'#888888'}">INT ${h.int}</span> — spell / arcane damage${h.primaryStat==='int'?' <span style="color:#e8c45a">★ primary</span>':''}<br>`+
            `<span style="color:${h.primaryStat==='dex'?'#88ccff':'#888888'}">DEX ${h.dex}</span> — dodge ${Math.min(22,Math.round(h.dex/90*100))}% · acc +${Math.floor(h.dex/8)} dmg · crit ${Math.round(Math.min(35,h.dex/120*100))}% · flee${h.primaryStat==='dex'?' <span style="color:#e8c45a">★ primary</span>':''}<br>`+
            `<span style="color:#888888">CHA ${h.cha}</span> — cohesion and scenario social checks<br>`+
            `<span style="color:#888888">STA ${h.sta}</span> — stamina; affects resting and endurance<br>`+
            `<span style="color:#888888">LCK ${h.lck}</span> — dice roll modifier (${lkBon>=0?'+':''}${lkBon}) · loot fortune<br>`+
            `<br><span style="color:#aaaaaa">Initiative bonus: <span style="color:#88ccff">+${initMod}</span> (DEX÷4)<br>`+
            `Hover over Race or Class for detailed lore.</span>`;
        const stats1El=d.querySelector(`[data-setup-stats1="${i}"]`);
        if(stats1El) showTip(stats1El, statsTip);
        // Resistance tooltip
        if(hasRes){
            const resEl=d.querySelector(`[data-setup-res="${i}"]`);
            if(resEl){
                const resTipLines=Object.entries(h.resistances).filter(([,v])=>v!==0)
                    .map(([k,v])=>`<span style="color:${v>0?'#6abf45':'#cc3333'}">${v>0?'+':''}${v}%</span> vs <span style="color:#ff7733">${k}</span>`)
                    .join('<br>');
                showTip(resEl,`<span style="color:#ff7733">🛡 Resistances</span><br><br>${resTipLines}<br><br><span style="color:#aaaaaa">Positive: take less damage of that type<br>Negative: take more damage of that type</span>`);
            }
        }

        // Crown tooltip — only the leader has it
        if(h.isLeader){
            const crownEl=d.querySelector(`[data-setup-crown="${i}"]`);
            if(crownEl) showTip(crownEl,
                `<span style="color:#e8c45a;font-size:1.05em">👑 The Mantle of Command</span><br><br>`+
                `<span style="color:#c8c0b0">This soul presently bears the fellowship's burden of leadership — drawn by the Old Reckoning to the one whose instincts run sharpest and whose fortune burns brightest.</span><br><br>`+
                `<span style="color:#aaaaaa">It is no crown of blood or birthright. Should another prove swifter of foot and luckier of hand as the battle turns, the Mantle shall pass — without ceremony, without grief — to more worthy shoulders.</span><br><br>`+
                `<span style="color:#88ccff">Determined by: DEX + LCK</span><br>`+
                `<span style="color:#88ccff">+2 initiative in battle · may attempt to flee</span>`);
        }

        // Basic attack tooltip
        const atkEl=d.querySelector(`[data-setup-atk="${i}"]`);
        if(atkEl) showTip(atkEl, `<span style="color:#c8c0b0">⚔ Basic Attacks</span><br><br>`+
            `<span style="color:#bbbbbb">${h.attackNames.join('<br>')}</span><br><br>`+
            `Damage based on <span style="color:#88ccff">${h.primaryStat?.toUpperCase()}</span> · type: <span style="color:#ff7733">${h.damageType}</span><br>`+
            `INIT cost: <span style="color:#6abf45">1</span> · Recovery on hit: <span style="color:#6abf45">+2</span> · Net: <span style="color:#6abf45">+1/round</span><br>`+
            `One attack name is chosen at random each turn.`);
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
             <div class="pi-gap"></div>
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
        // During battle, crown goes to the hero with the highest current initiative (next to act)
        let crownHeroIdx=null;
        if(battle.active){
            // Crown goes on the hero whose turn it currently is
            const cur=battle.order[battle.turnIdx];
            if(cur&&cur.type==='hero'&&cur.entity.hp>0)
                crownHeroIdx=party.indexOf(cur.entity);
        }
        hp.innerHTML=order.map(({h,i})=>{
            const dead=h.hp<=0;
            const hpPct=h.maxHp>0?h.hp/h.maxHp*100:0;
            const hpCol=hpPct>55?'#4db84d':hpPct>25?'#c8a040':'#aa2222';
            const initMod=Math.floor(h.dex/4);
            const moralLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
            const aura=Math.ceil(h.leadership/5);
            const dtAlign=DAMAGE_TYPES[h.damageType]?.alignment||'neutral';
            const moralDmgBonus=dtAlign==='light'&&h.morality>0?Math.floor(h.morality/20):dtAlign==='dark'&&h.morality<0?Math.floor(-h.morality/20):0;
            const scenMod=clamp(Math.floor(h.morality/10),-5,5);
            const resLines=Object.entries(h.resistances).filter(([,v])=>v!==0).map(([k,v])=>`${k}:${v>0?'+':''}${v}%`).join(' ')||'None';
            const atkLine=`<span style="color:#c8c0b0">⚔ Basic: ${h.attackNames.join(' · ')}</span> <span style="color:#aaaaaa">(INIT cost:1 · net +1)</span>`;
            const abilLines=atkLine+'<br>'+[...h.abilities].sort((a,b)=>a.cooldown-b.cooldown).map(a=>{const cd=h.abilityCooldowns?.[a.id]||0;const net=2-a.cooldown;const netCol=net>=0?'#6abf45':net>=-2?'#c8a040':'#cc3333';return `<span style="color:#e879f9">${a.name}</span> <span style="color:#aaaaaa">INIT cost:${a.cooldown} · net <span style="color:${netCol}">${net>=0?'+':''}${net}</span>${cd>0?' · ⏳'+cd+'rnd':' · ✓'}</span><br><span style="color:#bbbbbb;padding-left:8px">${a.desc}</span>`;}).join('<br>');
            const cohMod=partyAlignmentMod();
            const lkBonC=getLuckBonus(h);
            const statTip=`<b>${h.name}</b> Lv.${h.level}<br><span style="color:#88ccff">STR:${h.str} INT:${h.int}</span><br>DEX:${h.dex} dodge${Math.min(22,Math.round(h.dex/90*100))}% acc+${Math.floor(h.dex/8)} crit${Math.round(Math.min(35,h.dex/120*100))}%<br>LCK:${h.lck} dice${lkBonC>=0?'+':''}${lkBonC} loot✦<br><span style="color:#88ccff">CHA:${h.cha} STA:${h.sta}</span><br>INIT:+${initMod} · Lead:${h.leadership} (Aura +${aura})<br>⚖ ${moralLabel} (${h.morality})${moralDmgBonus>0?' +'+moralDmgBonus+' '+h.damageType:''}${scenMod!==0?' · scenario '+(scenMod>0?'-':'+')+Math.abs(scenMod)+' dmg':''}<br>Cohesion: ${cohMod>0?'+'+cohMod+' ✦ Aligned':cohMod<0?cohMod+' ⚠ Divided':'0 Neutral'}<br><span style="color:#ff7733">Resist: ${resLines}</span><br>${abilLines}`;
            const hpTip=`<span style="color:#6abf45">HP: ${h.hp}/${h.maxHp}</span>  XP: ${h.xp}/${h.xpNext}`;
            const spr=portraitStyleSized(h,66,84);
            return buildCard(spr,{
                id:`portrait-card-${i}`,
                name:h.name,
                sublabel:`${h.gender===0?'Male':'Female'} ${h.race}<br>Level ${h.level}<br>${alignIcon(h.morality)} ${h.job}`,
                hpPct,hpCol,dead,isLeader:battle.active?i===crownHeroIdx:h.isLeader,isMonster:false,
                items:h.items,statusIcons:battle.active?heroStatusIcons(i):[],
                statTip,hpTip,
            });
        }).join('');
        // Wire tooltips on each portrait card
        order.forEach(({h,i})=>{
            const card=document.getElementById(`portrait-card-${i}`);
            if(!card)return;
            const initMod=Math.floor(h.dex/4);
            const moralLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
            const moralCol=h.morality>30?'#e8c45a':h.morality>10?'#6abf45':h.morality>-10?'#aaaaaa':h.morality>-30?'#c8802a':'#cc3333';
            const aura2=Math.ceil(h.leadership/5);
            const dtAlign2=DAMAGE_TYPES[h.damageType]?.alignment||'neutral';
            const moralDmgBonus2=dtAlign2==='light'&&h.morality>0?Math.floor(h.morality/20):dtAlign2==='dark'&&h.morality<0?Math.floor(-h.morality/20):0;
            const scenMod2=clamp(Math.floor(h.morality/10),-5,5);
            const moralAlignLine=dtAlign2==='light'&&h.morality>0?`<span style="color:#ffd700">Light damage · +${moralDmgBonus2} bonus per hit</span>`:dtAlign2==='dark'&&h.morality<0?`<span style="color:#b47afe">Dark damage · +${moralDmgBonus2} bonus per hit</span>`:dtAlign2==='light'?`<span style="color:#aaaaaa">Light damage · morality too low for bonus</span>`:dtAlign2==='dark'?`<span style="color:#aaaaaa">Dark damage · morality too righteous for bonus</span>`:`<span style="color:#aaaaaa">Neutral damage · no morality bonus</span>`;
            const scenModLine=scenMod2>0?`Fate: −${scenMod2} incoming scenario damage`:scenMod2<0?`Fate: +${-scenMod2} incoming scenario damage`:'';
            const cohMod2=partyAlignmentMod();
            const cohLine=cohMod2>0?`<span style="color:#6abf45">✦ Party aligned · +${cohMod2} initiative</span>`:cohMod2<0?`<span style="color:#cc3333">⚠ Party divided · ${cohMod2} initiative</span>`:`<span style="color:#aaaaaa">Party cohesion: neutral</span>`;
            const resLines=Object.entries(h.resistances).filter(([,v])=>v!==0).map(([k,v])=>`${k}: ${v>0?'+':''}${v}%`).join('<br>')||'None';
            const atkLine2=`<span style="color:#c8c0b0">⚔ Basic: ${h.attackNames.join(' · ')}</span> <span style="color:#aaaaaa">(INIT cost:1 · net +1)</span>`;
            const abilLines=atkLine2+'<br>'+[...h.abilities].sort((a,b)=>a.cooldown-b.cooldown).map(a=>{const cd=h.abilityCooldowns[a.id]||0;const net=2-a.cooldown;const netCol=net>=0?'#6abf45':net>=-2?'#c8a040':'#cc3333';return `${tc('skill',a.name)} <span style="color:#aaaaaa">INIT cost:${a.cooldown} · net <span style="color:${netCol}">${net>=0?'+':''}${net}</span> · ${cd>0?tc('warn','⏳'+cd+'rnd'):'<span style="color:#6abf45">✓ ready</span>'}</span><br><span style="color:#bbbbbb;padding-left:8px">${a.desc}</span>`;}).join('<br>');
            const raceData=GAME_DATA.races.find(r=>r.name===h.race);
            const clsData=GAME_DATA.classes.find(c=>c.name===h.job);
            const genderName=h.gender===0?'Male':'Female';
            const genderLoreText=(typeof GENDER_LORE!=='undefined')?GENDER_LORE[h.gender]:'';
            const raceLore=raceData?.lore?`<br><em style="color:#aaaaaa;font-style:italic">${raceData.lore}</em>`:'';
            const clsLore=clsData?.lore?`<br><em style="color:#aaaaaa;font-style:italic">${clsData.lore}</em>`:'';
            const genderLore=genderLoreText?`<br><em style="color:#aaaaaa;font-style:italic">${genderLoreText}</em>`:'';
            const lkBon2=getLuckBonus(h);
            const conflGap=partyConflictGap();
            const conflBon=conflictStatBonus(h);
            const conflLine=conflGap>=20
                ?`<br><span style="color:#e8c45a">⚖ Ancient Wisdom</span> <span style="color:#aaaaaa">(party moral gap: ${conflGap}) — +${conflBon} damage</span>`:'';
            const statHtml=
                `<b style="color:#ffffff">${h.name}</b>  <span style="color:#88ccff">Lv.${h.level}</span><br>`+
                `${tc('stat','STR:'+h.str+'  INT:'+h.int)}<br>`+
                `<span style="color:#88ccff">DEX:${h.dex}</span>  <span style="color:#aaaaaa">dodge ${Math.min(22,Math.round(h.dex/90*100))}% · acc +${Math.floor(h.dex/8)} dmg · crit ${Math.round(Math.min(35,h.dex/120*100))}% · flee bonus</span><br>`+
                `<span style="color:#88ccff">LCK:${h.lck}</span>  <span style="color:#aaaaaa">dice roll ${lkBon2>=0?'+':''}${lkBon2} · loot fortune${lkBon2>0?' ✦':''}</span><br>`+
                `${tc('stat','CHA:'+h.cha+'  STA:'+h.sta)}<br>`+
                `Initiative bonus: +${initMod} (DEX÷4)<br>`+
                (resLines!=='None'?`${tc('warn','Resistances: '+resLines)}<br>`:'')+
                `<br><span style="color:#e8c45a">✦ Inspiring Aura  (Leadership ${h.leadership})</span><br>`+
                `Grants +${aura2} max HP to allies · +${aura2} XP per combat victory.<br>`+
                `<br><span style="font-size:1.2em">${alignIcon(h.morality)}</span> <span style="color:${moralCol};font-weight:bold">⚖ ${moralLabel}  (${h.morality})</span><br>`+
                `${moralAlignLine}`+(scenModLine?`  <span style="color:#aaaaaa">· ${scenModLine}</span>`:'')+`<br>`+
                `${cohLine}${conflLine}<br>`+
                `<br><span style="color:#e879f9">Abilities</span><br>${abilLines}`+
                `<br><br><span style="color:#e8c45a">${h.race}</span>${raceLore}`+
                `<br><br><span style="color:#e8c45a">${h.job}</span>${clsLore}`+
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
        if(battle.active&&battle.monsters.length>0&&!allMonstersDead()){
            // Highest-initiative alive monster gets the crown
            const leaderEntry=battle.order.filter(e=>e.type==='monster'&&e.entity.currentHp>0)
                .reduce((b,e)=>!b||e.initiative>b.initiative?e:b,null);
            const leaderEntity=leaderEntry?.entity;
            mp.innerHTML=battle.monsters.map((m,idx)=>{
                const mIdx=GAME_DATA.monsters.findIndex(x=>x.name===m.name);
                const sIdx=m.spriteIdx??(mIdx>=0?mIdx:0);
                const spr=monsterPortraitStyleSized(sIdx,66,84);
                const dead=m.currentHp<=0;
                const hpPct=dead?0:(m.maxHp>0?m.currentHp/m.maxHp*100:0);
                const hpCol=hpPct>66?'#c84040':hpPct>33?'#b85520':'#771010';
                const oe=battle.order.find(e=>e.type==='monster'&&e.entity===m);
                const dotInfo=battle.dotEffects.filter(d=>!d.targetType||d.targetType==='monster').map(d=>`${d.dmgType} ${d.dmgPerRound}/r`).join(', ')||'None';
                const statTip=`<b>${m.name}${m.isPackLeader?'<span style="color:#c9a227"> ★ Alpha</span>':''}</b><br><span style="color:#ff7733">ATK:${m.str}</span> INIT:${oe?.initiative??'?'} Rnd:${battle.round}${m.undead?'<br>☠ Undead':''}${battle.monsterResistNullified?'<br>⚠ Nullified':''}${dotInfo!=='None'&&m===battle.monster?'<br>DoT: '+dotInfo:''}`;
                const hpTip=`<span style="color:#6abf45">HP: ${m.currentHp}/${m.maxHp}</span>`;
                const typeParts=[];
                if(m.undead)typeParts.push('<span style="color:#cc3333">☠ Undead</span>');
                if(m.isPackLeader&&battle.isPack)typeParts.push('<span style="color:#c9a227">★ Alpha</span>');
                const typeTag=typeParts.length?'<br>'+typeParts.join(' · '):'';
                return buildCard(spr,{
                    id:`monster-card-${idx}`,name:m.name,
                    sublabel:dead?'✝ Fallen':`${m.icon} Round ${battle.round}${typeTag}`,
                    hpPct,hpCol,dead:false,isLeader:m===leaderEntity,isMonster:true,
                    items:[],statusIcons:(dead||m!==battle.monster)?[]:monsterStatusIcons(),
                    statTip,hpTip,
                });
            }).join('');
            // Wire tooltips, targeting highlight, and click handlers
            battle.monsters.forEach((m,idx)=>{
                const card=document.getElementById(`monster-card-${idx}`);
                if(!card)return;
                const dead=m.currentHp<=0;
                const oe=battle.order.find(e=>e.type==='monster'&&e.entity===m);
                const mData=GAME_DATA.monsters.find(x=>x.name===m.name);
                const lorePart=mData?.lore?`<br><br>${tc('lore',mData.lore)}`:'';
                const initDisp=oe?.initiative??'?';
                const dotInfo2=battle.dotEffects.filter(d=>!d.targetType||d.targetType==='monster').map(d=>`${d.dmgType} ${d.dmgPerRound}/r×${d.rounds}`).join(', ')||'None';
                const undeadBlock=m.undead
                    ?`<br><br><span style="color:#cc3333;font-weight:bold">☠ Undead</span><br>`+
                     `<span style="color:#aaaaaa;font-style:italic">A creature denied true death — its body animated by dark will rather than life. Neither hunger nor fear moves it; only the purpose bound into its bones.</span><br><br>`+
                     `${tc('good','✦ Holy damage ×1.5')} · ${tc('skill','Turn Undead ×3.0 + stun')}<br>`+
                     `<span style="color:#888">☣ Immune to poison · Necrotic magic may restore rather than harm</span>`
                    :'';
                const mHtml=dead
                    ?`${tc('item',m.name)}<br><span style="color:#888">✝ Slain</span>`
                    :`${tc('item',m.name)}${m.isPackLeader?` <span style="color:#c9a227">★ Alpha</span>`:''}${lorePart}<br><br>${tc('warn','ATK: '+m.str+(battle.monsterAtkMult!==1?' ×'+battle.monsterAtkMult.toFixed(2):''))}<br>INIT: ${initDisp} · Round: ${battle.round}${undeadBlock}${battle.monsterResistNullified?'<br>'+tc('warn','⚠ Nullified'):''}${dotInfo2!=='None'&&m===battle.monster?'<br>DoT: '+tc('warn',dotInfo2):''}`;
                const hpHtml=`${tc('hp','HP: '+m.currentHp+'/'+m.maxHp)}`;
                const spriteEl=card.querySelector('.portrait-sprite-wrap');
                const nameEl=card.querySelector('.pi-name');
                const hpEl=card.querySelector('.portrait-hp-wrap');
                if(spriteEl)showTip(spriteEl,mHtml);
                if(nameEl)showTip(nameEl,mHtml);
                if(hpEl)showTip(hpEl,hpHtml);
                if(dead){card.style.opacity='0.40';card.style.filter='grayscale(0.70)';}
                else if(battle.isPack){
                    card.classList.add('monster-selectable');
                    if(m===battle.monster)card.classList.add('monster-targeted');
                    card.addEventListener('click',()=>selectTarget(idx));
                }
                card.querySelectorAll('.status-icon').forEach(ic=>{const tip=ic.dataset.tip;if(tip)showTip(ic,tip);});
            });
        } else { mp.innerHTML=''; return; }
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
        {label:'[1] Press on through the wood',tooltip:
            `${tc('good','→ The fellowship walks in purposeful silence.')}<br>`+
            `${tc('lore','Something about keeping on lifts the spirit — a quiet dignity in not stopping.')}<br><br>`+
            `<span style="color:#e8c45a">✦ +5 Morality to all heroes</span> <span style="color:#aaaaaa">(lasts until first round of next battle)</span>`,
         action:()=>{
            party.filter(h=>h&&h.hp>0).forEach(h=>{h.pressOnMoralBoost=5;});
            log(ev.pressOn);SFX.neutral();setTimeout(nextTurn,40);}},
        {label:'[2] Rest and recover',tooltip:restTip,action:()=>{fullPartyRest(ev.restFlavour);setTimeout(nextTurn,40);}},
        {label:'[3] Search the surroundings',action:()=>{const best=Math.max(...party.filter(h=>h.hp>0).map(h=>h.lck));if(Math.random()<0.12+best*0.008)giveLoot();else log('Naught of value is found here.');log(ev.searchFlavour);SFX.neutral();setTimeout(nextTurn,40);},tooltip:tc('item','🍀 ~12–25% chance to find an item')+' (LCK improves this)'},
    ]);
}

/* ═══════════════════════════════════════════════════════════════
   11. SCENARIO — with stat-gated bonus options
   ═══════════════════════════════════════════════════════════════ */
function moralScenIcon(m){
    if(!m)return '';
    return m>0?`<span style="color:#e8c45a">✦</span> `:`<span style="color:#cc3333">☠</span> `;
}
function moralScenTip(m){
    if(!m)return '';
    return m>0
        ?`<br><span style="color:#6abf45">⚖ Morality +${m} — a righteous deed</span>`
        :`<br><span style="color:#cc3333">⚖ Morality ${m} — a dark mark upon the soul</span>`;
}
function doScenario(){
    const ev=pick(GAME_DATA.scenarios);logPrompt(ev.text);
    const typeIcon={'good':tc('good','✦ Favourable'),'bad':tc('warn','⚠ Risky'),'neutral':tc('lore','~ Uncertain')};
    const choices=ev.options.map((opt,i)=>{
        const icon=typeIcon[opt.type||'neutral']||typeIcon.neutral;
        const isRisky=!!opt.damage;
        const isUncertain=!opt.damage&&!opt.bonus&&!opt.item;
        const tip=`${icon}<br><br>${tc('lore',opt.effect||opt.text)}`+
            (isRisky?`<br>${tc('warn','May cause '+opt.damage+' damage')}`:'')+
            (isRisky?`<br><br>${tc('good','✦ Bold reward — risk is never without return:')}<br>`+
                `${tc('good','· +50% bonus XP for choosing the harder path')}<br>`+
                `${tc('good','· Random bonus: item find (30%) · +1 stat (25%)')}<br>`+
                `${tc('good','· HP recovery 10% maxHP (20%) · Morality +1 (25%)')}`:'')+
            (isUncertain?`<br><br>${tc('lore','~ Uncertain paths are not empty:')}<br>`+
                `${tc('lore','· 35% chance of a hidden reward')}<br>`+
                `${tc('lore','· Possible: item find · +1 stat · gold coins')}`:'')+
            (opt.bonus?`<br>${tc('good','Grants a bonus')}`:'')+
            (opt.item?`<br>${tc('item','May yield an item')}`:'') +
            moralScenTip(opt.morality);
        return {label:`${moralScenIcon(opt.morality)}[${i+1}] ${opt.text}`,tooltip:tip,action:()=>resolveScenario(opt)};
    });
    if(ev.gated){ev.gated.forEach(g=>{const hero=party.find(h=>h.hp>0&&h[g.requires.stat]>=g.requires.min);if(hero){
            const gTip=`${tc('good','✦ Guaranteed success')}<br>${hero.name} meets the requirement (${g.requires.stat.toUpperCase()} ${hero[g.requires.stat]} ≥ ${g.requires.min})<br><br>${tc('lore',g.effect||g.text)}${g.bonus?'<br>'+tc('good','Grants a bonus'):''}${g.item?'<br>'+tc('item','Yields an item'):''}${moralScenTip(g.morality)}`;
            choices.push({label:`${moralScenIcon(g.morality)}[${choices.length+1}] [${g.requires.stat.toUpperCase()} ${g.requires.min}+] ${hero.name}: ${g.text}`,tooltip:gTip,action:()=>resolveGated(hero,g),isGated:true});
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
        // Bold reward — the risky path always carries potential
        const boldXpBonus=Math.floor((opt.xp??15)*0.50);
        const boldRoll=Math.random();
        if(boldRoll<0.30){giveLoot();log(`Fortune favours the bold — ${h.name} finds something useful amid the chaos!`);SFX.loot();}
        else if(boldRoll<0.55){const s=pick(['str','int','dex','cha','sta','lck']);h[s]+=1;log(`Adversity sharpens the mind. ${h.name} gains +1 ${s.toUpperCase()} from the ordeal.`);SFX.good();}
        else if(boldRoll<0.75){const hpR=Math.floor(h.maxHp*0.10);h.hp=Math.min(h.hp+hpR,h.maxHp);log(`${h.name} rallies after the ordeal, recovering ${hpR} HP.`);SFX.heal();}
        else{changeMorality(h,1);log(`${h.name} faces the hardship with dignity. (Morality +1)`);SFX.good();}
        log(`Bold path rewarded: +${boldXpBonus} bonus XP.`);
        grantXP(h,boldXpBonus);
    }
    if(opt.bonus?.hp)h.hp=Math.min(h.hp+(opt.bonus.hp||0),h.maxHp);
    if(opt.bonus?.str)h.str+=opt.bonus.str;if(opt.bonus?.int)h.int+=opt.bonus.int;
    if(opt.bonus?.dex)h.dex+=opt.bonus.dex;if(opt.bonus?.cha)h.cha+=opt.bonus.cha;
    if(opt.bonus?.sta)h.sta+=opt.bonus.sta;if(opt.bonus?.lck)h.lck+=opt.bonus.lck;
    if(opt.bonus&&!opt.damage)SFX.good();
    if(opt.item)giveLoot();
    if(!opt.damage&&!opt.bonus&&!opt.item){
        SFX.neutral();
        // Uncertain paths are not empty — 35% chance of a hidden reward
        if(Math.random()<0.35){
            const uRoll=Math.random();
            if(uRoll<0.45){giveLoot();log(`The uncertain path yields an unexpected find!`);SFX.loot();}
            else if(uRoll<0.80){const s=pick(['str','int','dex','cha','sta','lck']);h[s]+=1;log(`The uncertain path hones ${h.name}. +1 ${s.toUpperCase()}.`);SFX.good();}
            else{const g=rand(10,30);treasury.gold+=g;log(`The uncertain path leads past forgotten coin. +${g} gold.`);SFX.treasury();}
        }
    }
    if(opt.morality)changeMorality(h,opt.morality);
    log(`${h.name}: ${opt.effect}`);grantXP(h,opt.xp??15);setTimeout(nextTurn,40);
}
function resolveGated(hero,g){
    SFX.good();
    if(g.bonus?.hp)hero.hp=Math.min(hero.hp+(g.bonus.hp||0),hero.maxHp);
    if(g.bonus?.str)hero.str+=g.bonus.str;if(g.bonus?.int)hero.int+=g.bonus.int;
    if(g.bonus?.dex)hero.dex+=g.bonus.dex;if(g.bonus?.cha)hero.cha+=g.bonus.cha;
    if(g.bonus?.sta)hero.sta+=g.bonus.sta;if(g.bonus?.lck)hero.lck+=g.bonus.lck;
    if(g.item)giveLoot();
    if(g.morality)changeMorality(hero,g.morality||0);
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
    const isPack=Math.random()<0.10&&!base.special;
    battle.isPack=isPack;
    const cohMod=partyAlignmentMod();
    const order=[];
    party.filter(h=>h.hp>0).forEach(h=>{const r=rollInitiative(h);h.lastInitiative=r;order.push({entity:h,type:'hero',initiative:r});});
    if(isPack){
        const count=Math.random()<0.5?2:3;
        const lScale=scale*1.30;
        const leader={...base,currentHp:Math.round(base.hp*lScale),maxHp:Math.round(base.hp*lScale),str:Math.max(1,Math.round(base.str*lScale)),charmed:false,resistances:{},isPackLeader:true};
        const monsters=[leader];
        for(let i=1;i<count;i++){const fScale=scale*(0.60+Math.random()*0.10);monsters.push({...base,currentHp:Math.round(base.hp*fScale),maxHp:Math.round(base.hp*fScale),str:Math.max(1,Math.round(base.str*fScale)),charmed:false,resistances:{},isPackLeader:false});}
        battle.monsters=monsters;battle.targetIdx=0;battle.monster=leader;battle.active=true;
        const leaderInit=rand(8,16)+Math.floor(base.str/5);
        leader.initiative=leaderInit;
        order.push({entity:leader,type:'monster',initiative:leaderInit});
        monsters.slice(1).forEach(f=>{const fi=Math.max(1,rand(1,Math.max(1,leaderInit-3)));f.initiative=fi;order.push({entity:f,type:'monster',initiative:fi});});
        const packWord=packFlavour(base.name);
        const intros=[`${base.icon} A ${packWord} of ${count} ${base.name}s descends upon the fellowship! The largest steps forward as their alpha.`,`${base.icon} The fellowship is surrounded by ${count} ${base.name}s. One — scarred and battle-hardened — snarls the others into formation.`,`${base.icon} From the shadows emerge ${count} ${base.name}s. Their leader fixes you with cold eyes before signalling the assault.`];
        order.sort((a,b)=>b.initiative-a.initiative);
        battle.order=[...order];battle.turnIdx=0;battle.round=1;
        setMusicMood('battle');
        logPrompt(pick(intros));
        if(base.taunts&&Math.random()<0.30)log(pick(base.taunts));
        log(`Initiative: ${order.map(e=>`${e.entity.name||e.entity.name}(${e.initiative})`).join(' › ')}`);
        if(cohMod>0)log(`✦ Aligned fellowship — cohesion grants +${cohMod} to all initiative.`);
        else if(cohMod<0)log(`⚠ Divided fellowship — alignment conflict: ${cohMod} to all initiative.`,'blood');
        log(`Pack tactics: click a monster portrait to select your target.`);
    } else {
        battle.monster={...base,currentHp:Math.round(base.hp*scale),maxHp:Math.round(base.hp*scale),str:Math.max(1,Math.round(base.str*scale)),charmed:false,resistances:{},isPackLeader:false};
        battle.monsters=[battle.monster];battle.targetIdx=0;battle.active=true;
        const mi=rand(1,12)+Math.floor(battle.monster.maxHp/40);
        battle.monster.initiative=mi;
        order.push({entity:battle.monster,type:'monster',initiative:mi});
        order.sort((a,b)=>b.initiative-a.initiative);
        battle.order=[...order];battle.turnIdx=0;battle.round=1;
        setMusicMood('battle');
        logPrompt(`${battle.monster.icon} ${battle.monster.name} emerges from the shadows!`);
        if(battle.monster.taunts&&Math.random()<0.30)log(pick(battle.monster.taunts));
        log(`Initiative: ${order.map(e=>`${e.type==='hero'?e.entity.name:battle.monster.name}(${e.initiative})`).join(' › ')}`);
        if(cohMod>0)log(`✦ Aligned fellowship — cohesion grants +${cohMod} to all initiative.`);
        else if(cohMod<0)log(`⚠ Divided fellowship — alignment conflict: ${cohMod} to all initiative.`,'blood');
    }
    // Apply press-on morale boost if set
    const boosted=party.filter(h=>h&&h.pressOnMoralBoost);
    if(boosted.length){
        boosted.forEach(h=>{changeMorality(h,h.pressOnMoralBoost);delete h.pressOnMoralBoost;});
        logHTML(`<span style="color:#e8c45a">✦ The fellowship's resolve steels them — morale carries into the fray! (+5 Morality to all)</span>`);
    }
    log('━━━ Battle Round 1 ━━━');
    renderStats();
    processBattleTurn();
}

function rollInitiative(h){return rand(1,20)+Math.floor(h.dex/4)+(h.isLeader?2:0)+partyAlignmentMod();}
function allMonstersDead(){return battle.monsters.every(m=>m.currentHp<=0);}
function updateTarget(){
    if(battle.monster&&battle.monster.currentHp>0)return;
    const best=battle.order.filter(e=>e.type==='monster'&&e.entity.currentHp>0)
        .reduce((b,e)=>!b||e.initiative>b.initiative?e:b,null);
    if(best){battle.targetIdx=battle.monsters.indexOf(best.entity);battle.monster=best.entity;}
}
function handleMonsterDeath(){
    if(battle.monster&&battle.monster.currentHp>0)return false;
    if(allMonstersDead())return true;
    log(`${battle.monster.name} falls!`);updateTarget();renderStats();return false;
}
function selectTarget(idx){
    if(!battle.active)return;
    const m=battle.monsters[idx];if(!m||m.currentHp<=0)return;
    battle.targetIdx=idx;battle.monster=m;
    log(`The fellowship focuses their attack on ${m.name}!`);renderStats();
}
function packFlavour(n){
    const w={Wolf:'pack',Goblin:'gang',Skeleton:'horde',Zombie:'horde',Orc:'warband',Bandit:'gang',Spider:'nest',Bat:'colony',Rat:'swarm',Vampire:'coven',Troll:'mob',Kobold:'swarm'};
    return Object.entries(w).find(([k])=>n.includes(k))?.[1]||'group';
}

function processRoundEffects(){
    // DOTs
    battle.dotEffects=battle.dotEffects.filter(dot=>{
        if(allMonstersDead())return false;
        updateTarget();
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
    if(allMonstersDead())return endCombat(true);
    if(party.every(h=>h.hp<=0))return endGame(false);
    // Skip dead entities
    for(let a=0;a<battle.order.length;a++){
        if(!battle.active)return;
        const cur=battle.order[battle.turnIdx];
        const dead=cur.type==='hero'?cur.entity.hp<=0:cur.entity.currentHp<=0;
        if(!dead)break;
        advanceBattleTurn();
    }
    const cur=battle.order[battle.turnIdx];
    if(cur.type==='monster')setTimeout(()=>doMonsterTurn(cur.entity),550);
    else showHeroAction(cur.entity);
}

function advanceBattleTurn(){
    battle.currentRoll=null;
    battle.alignmentBonus=null;
    battle.turnIdx=(battle.turnIdx+1)%battle.order.length;
    if(battle.turnIdx===0){
        battle.round++;processRoundEffects();
        if(allMonstersDead()){endCombat(true);return;}
        if(party.every(h=>h.hp<=0)){endGame(false);return;}
        // Re-sort by current mutable initiative (heroes earn/spend throughout the battle)
        battle.order.sort((a,b)=>b.initiative-a.initiative);
        log(`━━━ Battle Round ${battle.round} ━━━`);
    }
}

function doMonsterTurn(actingMonster){
    if(!battle.active)return;
    if(actingMonster.currentHp<=0){advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);return;}
    if(battle.monsterSkipTurns>0){battle.monsterSkipTurns--;log(`${actingMonster.name} cannot act this turn!`);SFX.neutral();advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);return;}
    if(actingMonster.charmed){actingMonster.charmed=false;log(`${actingMonster.name} is charmed — hesitates!`);SFX.charm();advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);return;}
    const valid=party.filter((h,i)=>h.hp>0&&!(battle.heroPhaseShift[i]>0));
    if(!valid.length){log(`${actingMonster.name} finds no valid target!`);advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);return;}
    // Roll d20 for monster attack
    const mIdx=battle.monsters.indexOf(actingMonster);
    const result=rollD20();
    battle.currentRoll=result;
    logHTML(`${actingMonster.name} rolls — 🎲 `+
        `<span style="color:${result.color};font-weight:bold">${result.roll}</span> `+
        `<span style="color:${result.color}">${result.label}</span>`);
    showDiceRollOnCard(`monster-card-${mIdx}`,result,()=>{
        if(!battle.active)return;
        const target=valid[Math.floor(Math.random()*valid.length)],ti=party.indexOf(target);
        if(battle.heroPhaseShift[ti]>0)battle.heroPhaseShift[ti]--;
        // DEX-based dodge (nat 20 always hits)
        if(result.roll!==20){
            const dodgeChance=Math.min(0.22,target.dex/90);
            if(Math.random()<dodgeChance){
                logHTML(`${target.name} <span style="color:#88ccff">sidesteps</span> the blow! (DEX ${target.dex})`);
                SFX.dodge();battle.monsterAttackedLastRound=false;
                advanceBattleTurn();renderStats();setTimeout(processBattleTurn,500);return;
            }
        }
        const mDT=actingMonster.damageType||'physical',res=target.resistances?.[mDT]??0;
        const rawDmg=Math.max(1,Math.round((Math.round(actingMonster.str*battle.monsterAtkMult)+rand(-3,3))*result.mult));
        if(battle.heroShielded[ti]>0){battle.heroShielded[ti]--;log(`${target.name}'s shield absorbs the blow!`);SFX.shield();}
        else{
            if(result.roll===1) logHTML(`<span style="color:#cc2222">A fumble — the strike glances off!</span>`);
            else if(result.roll===20) logHTML(`<span style="color:#c9a227">✦ A devastating blow!</span>`);
            const dmg=Math.max(1,Math.round(rawDmg*(1-res/100)));
            target.hp-=dmg;
            log(`${actingMonster.name} strikes ${target.name}! ${dmg} damage${res>0?` (${res}% resisted)`:''}.`);
            actingMonster.str>24?SFX.heavyHit():SFX.strike();shake();
        }
        battle.monsterAttackedLastRound=true;
        advanceBattleTurn();renderStats();setTimeout(processBattleTurn,500);
    });
}

function showHeroAction(hero){
    const hi=party.indexOf(hero);
    Object.keys(hero.abilityCooldowns).forEach(id=>{if(hero.abilityCooldowns[id]>0)hero.abilityCooldowns[id]--;});
    if(battle.heroPhaseShift[hi]>0)battle.heroPhaseShift[hi]--;
    if(battle.heroRage[hi]>0)battle.heroRage[hi]--;
    const hpPct=battle.monster.currentHp/battle.monster.maxHp;
    const hpDesc=hpPct>0.75?'unharmed':hpPct>0.50?'wounded':hpPct>0.25?'badly hurt':'near death';
    const otherAlive=battle.monsters.filter(x=>x!==battle.monster&&x.currentHp>0);
    const packInfo=otherAlive.length?` · ${otherAlive.length} other${otherAlive.length>1?'s':''} nearby`:'';
    log(`${battle.monster.icon} ${battle.monster.name} is ${hpDesc}. (${battle.monster.currentHp}/${battle.monster.maxHp} HP)${packInfo}  ${hero.isLeader?'👑 ':''}${hero.name}'s turn.`);

    const sv=hero[hero.primaryStat];
    const minD=Math.max(1,Math.floor(sv*0.50)+1+hero.bonusDmg);
    const maxD=Math.max(1,Math.floor(sv*0.50)+Math.max(2,Math.floor(sv*0.15))+hero.bonusDmg);
    const critP=Math.round(Math.min(35,hero.dex/120*100));
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
        `${tc('good','✦ Choosing basic attack when stronger skills are available')} earns +1 Morality on a killing blow.<br>`+
        `${tc('lore','The weak path is its own kind of courage.')}`+DICE_TIP;
    choices.push({label:`[1] ${atkName}`,tooltip:atkTip,action:()=>{
        if(oe)oe.initiative=Math.max(1,oe.initiative-basicCost);
        withDiceRoll(hi,()=>executeAttackWithMorality(hero,hi,1.0,true));
    }});

    hero.abilities.forEach(ab=>{
        const cd=hero.abilityCooldowns[ab.id]||0,ready=cd===0;
        const abCost=ab.cooldown;
        const netInit=2-abCost; // recovery is always +2 on hit
        const costLabel=abCost<=2?'light':abCost<=4?'moderate':'heavy';
        const costCol=abCost<=2?'good':abCost<=4?'warn':'blood';
        const netCol=netInit>=0?'good':netInit>=-2?'warn':'blood';
        let tipColor=ready?'item':'warn';
        // Detect risk/cost category for contextual hint
        const isHighCost=abCost>=4;
        const isSacrificeSelf=(['arcane_surge','pact_of_blood','blood_surge','reckless_atk'].includes(ab.id));
        const isControlAbility=(['frost_nova','entangle','distracting_shot','smoke_bomb','ki_block','reality_tear','phase_shift','holy_aegis'].includes(ab.id));
        const riskHint=isSacrificeSelf
            ?`<br><br>${tc('warn','⚠ Costs own HP — but killing blow at low HP earns +1 Morality (sacrifice accepted)')}`
            :isControlAbility
            ?`<br><br>${tc('warn','⚠ Costs own HP to execute — control without cost is no choice at all')}`
            :isHighCost
            ?`<br><br>${tc('lore','Heavy ability — killing blow with mult ≥2× when at full HP costs Morality −1 (should have known better)')}`
            :'';
        const abAlign=ABILITY_ALIGNMENT[ab.id];
        const alignTip=abAlign==='good'
            ?`<br><br><span style="color:#e8c45a">✦ Good action</span> — <span style="color:#aaaaaa">Righteous heroes (morality >10) roll 1–5 bonus power. Corrupt heroes suffer a 1–5 morality penalty.</span>`
            :abAlign==='evil'
            ?`<br><br><span style="color:#cc3333">☠ Evil action</span> — <span style="color:#aaaaaa">Corrupt heroes (morality <−10) roll 1–5 bonus power. Righteous heroes suffer a 1–5 morality penalty.</span>`
            :'';
        const alignIcon=getAlignIcon(ab.id);
        const abTip=`${tc(tipColor,ab.name)}<br>`+
            `${tc('skill',ab.desc)}<br><br>`+
            (ready?`${tc('good','✓ Ready')}`:`${tc('warn','⏳ Cooldown: '+cd+' round(s) remaining')}`)+
            `<br>Cooldown: ${ab.cooldown} rounds after use<br>`+
            `Initiative cost: ${tc(costCol,abCost+' ('+costLabel+')')} · Recovery on hit: ${tc('good','+2')} · Net: ${tc(netCol,(netInit>=0?'+':'')+netInit)}<br>`+
            `Current initiative: ${tc('stat',curInit)}`+
            riskHint+alignTip+
            (battle.monster.name&&mData?`<br><br>${tc('lore',mData.name)}${mLore}`:'')+DICE_TIP;
        choices.push({
            label:`[${choices.length+1}] ${alignIcon}${ab.name}`+(ready?'':'  ('+cd+' rnd)')+`  — ${ab.desc}`,
            disabled:!ready,
            cooldown:!ready,
            tooltip:abTip,
            action:()=>{
                if(!ready){log(`${ab.name} is on cooldown (${cd} rounds).`);SFX.neutral();advanceBattleTurn();setTimeout(processBattleTurn,300);return;}
                if(oe)oe.initiative=Math.max(1,oe.initiative-abCost);
                hero.abilityCooldowns[ab.id]=ab.cooldown;
                const fn=ABILITY_EFFECTS[ab.id];
                if(!fn){log(`[Error: ability ${ab.id} not found — skipping turn]`);finishAbilityTurn();return;}
                withDiceRoll(hi,()=>fn(hero,hi),ab.id);
            },
        });
    });
    if(hero.isLeader){
        const fleeSuccessPct=Math.round(Math.min(80,40+hero.dex/90*100));
        const fleeTip=`${tc('warn','Attempt to escape combat')}<br>`+
            `~${fleeSuccessPct}% chance of success <span style="color:#aaaaaa">(DEX ${hero.dex})</span><br><br>`+
            `${tc('warn','⚠ Failure: battle continues')}<br>`+
            `${tc('warn','⚠ Success: −5 Morality (cowardice)')}<br>`+
            `Only the party leader may attempt this.`;
        choices.push({label:`[${choices.length+1}] Attempt to flee (leader only)`,isFlee:true,tooltip:fleeTip,action:()=>attemptFlee(hero)});
    }
    if(battle.isPack){
        const dRetTip=`${tc('warn','⚠ Guaranteed escape — but at great cost')}<br><br>`+
            `${tc('blood','All heroes reduced to 10% HP')}<br>`+
            `${tc('blood','All heroes\' initiative set to 1')}<br><br>`+
            `${tc('lore','Facing a pack is folly. Fleeing is wisdom — costly wisdom.')}`;
        choices.push({label:`[${choices.length+1}] Desperate Retreat (100% success — costs 90% HP)`,isFlee:true,tooltip:dRetTip,action:()=>desperateRetreat(hero)});
    }
    // Resurrection option — available to any hero when conditions are met
    const deadHeroesForRes=party.filter(h=>h.hp<=0);
    const aliveHeroesForRes=party.filter(h=>h.hp>0);
    if(deadHeroesForRes.length>0&&aliveHeroesForRes.length>=2){
        const totalInit=aliveHeroesForRes.reduce((sum,h)=>{const oe=battle.order.find(e=>e.type==='hero'&&e.entity===h);return sum+(oe?oe.initiative:(h.lastInitiative||0));},0);
        if(totalInit>=5){
            const rTarget=deadHeroesForRes[0];
            const resTip=`${tc('good','✦ Resurrect '+rTarget.name)}<br><br>`+
                `${tc('skill','Channels the collective life force of the fellowship to restore the fallen.')}<br><br>`+
                `${tc('warn','⚠ Requires: ≥5 total initiative in team')}<br>`+
                `${tc('warn','⚠ Requires: ≥2 heroes alive')}<br>`+
                `${tc('blood','Cost: all heroes\' initiative set to 1')}<br>`+
                `${tc('good','Effect: '+rTarget.name+' revived with 1 HP')}<br><br>`+
                `${tc('lore','Total team initiative: '+totalInit)}`;
            choices.push({label:`[${choices.length+1}] ✦ Resurrection — revive ${rTarget.name} (drains all initiative)`,tooltip:resTip,action:()=>performResurrection(rTarget)});
        }
    }
    setChoices(choices);
}

/* Basic attack with morality-on-kill reward for choosing weaker option */
function executeAttackWithMorality(hero,hi,mult,isBasic=false){
    resolveHeroHit(hero,hi,pick(hero.attackNames),mult);
    if(handleMonsterDeath()){
        if(isBasic){const hadAbility=hero.abilities.some(ab=>(hero.abilityCooldowns[ab.id]||0)===0);if(hadAbility){changeMorality(hero,1);log(`${hero.name} dispatched the foe with honour. (Morality +1)`);}}
        endCombat(true);return;
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
    if(handleMonsterDeath()){
        if(mult>=2.0&&hero.hp/hero.maxHp>=0.90){changeMorality(hero,-1);log(`${hero.name} — great power spent when restraint would have served. (Morality −1)`);}
        endCombat(true);return;
    }
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
    // Apply d20 dice roll modifier
    if(battle.currentRoll)dmg=Math.round(dmg*battle.currentRoll.mult);
    // Apply alignment bonus (flat, after dice scaling)
    if(battle.alignmentBonus?.aligned===true)dmg+=battle.alignmentBonus.roll;
    // DEX accuracy bonus — precision and reach in combat
    dmg+=Math.floor(hero.dex/8);
    // Ancient Wisdom — bonus from a morally divided fellowship
    const conflictBonus=conflictStatBonus(hero);
    if(conflictBonus>0)dmg+=conflictBonus;
    if(battle.heroRage[hi]>0)dmg=Math.round(dmg*1.70);
    if(battle.heroDmgMult[hi])dmg=Math.round(dmg*battle.heroDmgMult[hi].mult);
    if(battle.inspiredHero===hi){dmg=Math.round(dmg*2.0);battle.inspiredHero=null;log(`${hero.name} is Inspired — double damage!`);}
    if(battle.combustPrimed[hi]){dmg=Math.round(dmg*3.0);battle.combustPrimed[hi]=false;log(`Combustion triggers — 3×!`);}
    if(battle.judgmentPrimed[hi]){const jm=battle.monster.undead?2.0:1.5;dmg=Math.round(dmg*jm);battle.judgmentPrimed[hi]=false;log(`Judgment strikes! ×${jm}!`);}
    const critChance=Math.min(0.35,hero.dex/120);
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
    const dRoll=battle.currentRoll;
    if(dRoll?.roll===1) logHTML(`<span style="color:#cc2222">A fumble — the blow barely lands!</span>`);
    else if(dRoll?.roll===20) logHTML(`<span style="color:#c9a227">✦ A devastating strike!</span>`);
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
    if(allMonstersDead()){endCombat(true);return;}
    if(party.every(h=>h.hp<=0)){endGame(false);return;}
    advanceBattleTurn();renderStats();setTimeout(processBattleTurn,400);
}

function attemptFlee(hero){
    log(`${hero.name} rallies the fellowship to retreat...`);
    const fleeChance=Math.min(0.80,0.40+hero.dex/90);
    if(Math.random()<fleeChance){log(`${hero.name} leads the party to safety!`);SFX.flee();changeMorality(hero,-5);log(`${hero.name} bears a quiet shame at the retreat. (Morality -5)`);battle.active=false;setMusicMood('normal');setTimeout(nextTurn,500);}
    else{log(`The ${battle.monster.name} cuts off the retreat!`,'blood');SFX.bad();advanceBattleTurn();setTimeout(processBattleTurn,400);}
}

function performResurrection(deadHero){
    deadHero.hp=1;
    const alive=party.filter(h=>h.hp>0);
    alive.forEach(h=>{const oe=battle.order.find(e=>e.type==='hero'&&e.entity===h);if(oe)oe.initiative=1;});
    log(`✦ The fellowship channels a desperate Resurrection! ${deadHero.name} stirs from death — restored to 1 HP!`);
    log(`The tremendous effort drains the party to their last reserves — all heroes' initiative set to 1.`);
    SFX.spellHoly();
    finishAbilityTurn();
}
function desperateRetreat(hero){
    log(`${hero.name} calls a desperate retreat! The fellowship flees headlong, paying with blood and exhaustion.`);
    SFX.flee();
    party.filter(h=>h.hp>0).forEach(h=>{
        h.hp=Math.max(1,Math.floor(h.maxHp*0.10));
        const oe=battle.order.find(e=>e.type==='hero'&&e.entity===h);
        if(oe)oe.initiative=1;
    });
    log(`All heroes reduced to 10% HP and initiative drained to 1.`);
    battle.active=false;setMusicMood('normal');setTimeout(nextTurn,500);
}
function endCombat(won){
    if(!battle.active)return;   // guard against double-calls
    battle.active=false;
    if(party.every(h=>h.hp<=0))return endGame(false);
    if(won){
        setMusicMood('normal');
        const primary=battle.monsters[0];
        if(battle.isPack)log(`The ${packFlavour(primary.name)} of ${primary.name}s is defeated!`);
        else log(`${primary.name} is defeated!`);
        SFX.good();
        // Loot: full chance from leader, half from followers — LCK improves odds
        const lckHero=party.filter(h=>h.hp>0).reduce((b,h)=>h.lck>b.lck?h:b,{lck:10});
        const lootLuckMult=Math.min(1.5,1+Math.max(0,lckHero.lck-10)/50);
        battle.monsters.forEach((m,i)=>{if(Math.random()<m.loot*(i===0?1:0.50)*lootLuckMult)giveLoot();});
        // Boon from leader only
        if(primary.boon&&Math.random()<0.25){const h=aliveHero();if(h){if(primary.boon.hp)h.hp=Math.min(h.hp+primary.boon.hp,h.maxHp);if(primary.boon.int)h.int+=primary.boon.int;log(`Strange energy from ${primary.name} flows into ${h.name}!`);}}
        const ldr=party.find(h=>h&&h.isLeader&&h.hp>0);
        const inspireBonus=ldr?Math.ceil(ldr.leadership/5):0;
        if(ldr&&inspireBonus>0)log(`${ldr.name}'s inspiring presence grants +${inspireBonus} XP to all.`);
        const totalXP=battle.monsters.reduce((sum,m)=>{const bXP=m.xpValue??40;const baseStr=GAME_DATA.monsters.find(x=>x.name===m.name)?.str??m.str;const sf=m.str/baseStr||1;return sum+Math.round(bXP*(m.isPackLeader?sf:sf*0.60));},0);
        party.filter(h=>h.hp>0).forEach(h=>grantXP(h,totalXP+inspireBonus));
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
function showHeroesOfOld(){
    const scores=JSON.parse(localStorage.getItem('norrt_scores')||'[]');
    let existing=document.getElementById('heroes-of-old-overlay');
    if(existing){existing.remove();return;}
    const ov=document.createElement('div');
    ov.id='heroes-of-old-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;';
    const box=document.createElement('div');
    box.style.cssText='background:#0d0d0d;border:1px solid rgba(201,162,39,0.6);padding:22px 28px;max-width:520px;width:92%;max-height:80vh;overflow-y:auto;font-family:\'IM Fell English\',Georgia,serif;color:#fff;text-align:center;';
    const title=document.createElement('h2');
    title.textContent='✦ Heroes of Old ✦';
    title.style.cssText='color:var(--gold,#c9a227);margin:0 0 14px;font-size:1.15em;letter-spacing:.05em;';
    box.appendChild(title);
    if(!scores.length){
        const empty=document.createElement('p');empty.textContent='No fellowship hath yet completed the journey.';empty.style.color='#888';box.appendChild(empty);
    }else{
        scores.forEach((s,i)=>{
            const p=document.createElement('p');
            p.style.cssText=`color:${s.won?'var(--gold,#c9a227)':'#888'};margin:4px 0;font-size:.93em;`;
            const detail=s.won?`${s.turns} trials · ${s.wealth} gold · ${s.align||'Unknown'}`:`${s.turns} trials · ${s.align||'Unknown'}`;
            p.textContent=`${i+1}. ${s.won?'✦':'✧'} ${s.team} · ${detail} · ${s.date}`;
            box.appendChild(p);
        });
    }
    const close=document.createElement('button');
    close.textContent='Close';close.className='px-btn';
    close.style.cssText='margin-top:16px;';
    close.onclick=()=>ov.remove();
    box.appendChild(close);
    ov.appendChild(box);
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    document.body.appendChild(ov);
}
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
    updateLogFade();
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
    updateLogFade();
}

function updateLogFade(){
    const el=document.getElementById('game-log');
    if(!el)return;
    const kids=el.children;
    for(let i=0;i<kids.length;i++){
        kids[i].style.opacity=Math.max(0.12,1-i*0.055).toFixed(2);
    }
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
        btn.innerHTML=c.label;
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
