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
    heal:()=>tone(440,'sine',0.18,0.03),
    crit:()=>{tone(550,'square',0.08,0.07);tone(880,'sine',0.18,0.06,0.06);tone(1100,'sine',0.12,0.05,0.16);},
    strike:()=>{tone(180,'sawtooth',0.10,0.07);tone(140,'sawtooth',0.20,0.06,0.06);},
    heavyHit:()=>{tone(100,'sawtooth',0.18,0.08);tone(70,'sawtooth',0.28,0.07,0.10);tone(50,'square',0.20,0.06,0.25);},
    ability:()=>{tone(660,'sine',0.12,0.05);tone(880,'sine',0.18,0.04,0.10);},
    shield:()=>{tone(330,'triangle',0.20,0.05);tone(440,'triangle',0.15,0.04,0.12);},
    dodge:()=>tone(660,'triangle',0.12,0.04),
    charm:()=>{tone(880,'sine',0.12,0.04);tone(1108,'sine',0.20,0.04,0.10);tone(660,'sine',0.18,0.03,0.25);},
    flee:()=>{tone(330,'triangle',0.08,0.04);tone(440,'triangle',0.12,0.04,0.08);},
    treasury:()=>{[660,784,880].forEach((f,i)=>tone(f,'sine',0.15,0.04,i*0.08));},
    victory:()=>{[[523,0],[659,.18],[784,.36],[1047,.54],[784,.80],[880,.96],[1047,1.18],[1397,1.40]].forEach(([f,t])=>tone(f,'sine',0.22,0.05,t));},
    death:()=>{[220,185,147,110].forEach((f,i)=>tone(f,'sawtooth',0.4+i*0.1,0.07,i*0.38));},
    honk:()=>{try{const ctx=actx(),o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(220,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(440,ctx.currentTime+0.25);o.frequency.exponentialRampToValueAtTime(330,ctx.currentTime+0.50);g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(0.14,ctx.currentTime+0.04);g.gain.setValueAtTime(0.14,ctx.currentTime+0.28);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.55);o.connect(g);g.connect(actx().destination);o.start();o.stop(ctx.currentTime+0.55);}catch(_){}},
    doubleHonk:()=>{SFX.honk();setTimeout(SFX.honk,620);},
};

/* ═══════════════════════════════════════════════════════════════
   3. MUSIC — 5 synthesised tracks
   ═══════════════════════════════════════════════════════════════ */
let bgStarted=false,bgMaster=null;
const N={A2:110,B2:123.5,C3:130.8,D3:146.8,E3:164.8,F3:174.6,Fs3:185,G3:196,A3:220,Bb3:233.1,B3:246.9,C4:261.6,Cs4:277.2,D4:293.7,E4:329.6,F4:349.2,Fs4:370,G4:392,A4:440,B4:493.9,C5:523.3,D5:587.3,E5:659.3,G5:784};
const MUSIC_TRACKS=[
    {bpm:78,melVol:1.0,bassVol:0.55,melType:'square',bassType:'triangle',mel:[[N.A3,1],[N.C4,.5],[N.D4,.5],[N.E4,1],[N.D4,1],[N.C4,1],[N.B3,.5],[N.A3,.5],[N.B3,1],[N.G3,1],[N.A3,1],[N.B3,.5],[N.C4,.5],[N.D4,1],[N.C4,1],[N.B3,1],[N.A3,.5],[N.G3,.5],[N.A3,2],[N.E4,1],[N.D4,.5],[N.E4,.5],[N.F4,1],[N.E4,1],[N.D4,1],[N.C4,.5],[N.B3,.5],[N.A3,1],[N.B3,1],[N.C4,1],[N.D4,1],[N.E4,.5],[N.D4,.5],[N.C4,1],[N.B3,1],[N.A3,1],[N.G3,1],[N.A3,.5],[N.B3,.5],[N.A3,3]],bass:[[N.A2,4],[N.E3,4],[N.G3,2],[N.A2,2],[N.A2,4],[N.G3,4],[N.E3,4],[N.A2,4]]},
    {bpm:62,melVol:0.85,bassVol:0.50,melType:'square',bassType:'triangle',mel:[[N.D4,2],[N.C4,1],[N.Bb3,1],[N.A3,2],[N.G3,1],[N.A3,1],[N.D4,2],[N.F3,1],[N.G3,1],[N.A3,4],[N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],[N.F3,2],[N.G3,2],[N.A3,2],[N.D3,4],[N.A3,1],[N.Bb3,1],[N.C4,2],[N.Bb3,1],[N.A3,1],[N.G3,2],[N.F3,2],[N.G3,1],[N.A3,1],[N.D3,4]],bass:[[N.D3,4],[N.C3,4],[N.Bb2,4],[N.A2,4],[N.D3,4],[N.A2,4],[N.Bb2,2],[N.C3,2],[N.D3,4]]},
    {bpm:96,melVol:0.90,bassVol:0.45,melType:'square',bassType:'triangle',mel:[[N.G3,.5],[N.A3,.5],[N.B3,1],[N.D4,1],[N.E4,.5],[N.D4,.5],[N.B3,1],[N.A3,1],[N.G3,.5],[N.B3,.5],[N.D4,1],[N.G4,2],[N.E4,1],[N.D4,1],[N.C4,.5],[N.D4,.5],[N.E4,1],[N.D4,1],[N.C4,.5],[N.B3,.5],[N.A3,1],[N.G3,1],[N.B3,.5],[N.A3,.5],[N.G3,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.G3,2],[N.D4,.5],[N.E4,.5],[N.Fs4,1],[N.G4,1],[N.E4,.5],[N.D4,.5],[N.B3,2],[N.A3,.5],[N.B3,.5],[N.C4,1],[N.D4,2],[N.C4,1],[N.B3,1],[N.A3,2]],bass:[[N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2],[N.G3,2],[N.C3,2],[N.D3,4],[N.G3,2],[N.D3,2],[N.C3,2],[N.G3,2]]},
    {bpm:55,melVol:0.80,bassVol:0.55,melType:'square',bassType:'triangle',mel:[[N.B3,2],[N.A3,1],[N.Fs3,1],[N.E3,2],[N.D3,1],[N.E3,1],[N.Fs3,2],[N.A3,2],[N.B3,4],[N.D4,2],[N.B3,1],[N.A3,1],[N.Fs3,2],[N.E3,2],[N.D3,2],[N.E3,1],[N.Fs3,1],[N.B2,4],[N.B3,1],[N.A3,1],[N.G3,1],[N.Fs3,1],[N.E3,2],[N.D3,2],[N.E3,2],[N.Fs3,2],[N.B2,4]],bass:[[N.B2,4],[N.A2,4],[N.Fs3,4],[N.B2,4],[N.B2,4],[N.E3,4],[N.Fs3,2],[N.B2,6]]},
    {bpm:70,melVol:0.90,bassVol:0.50,melType:'square',bassType:'triangle',mel:[[N.E4,1.5],[N.D4,.5],[N.E4,1],[N.Cs4,1],[N.B3,2],[N.A3,1],[N.B3,.5],[N.Cs4,.5],[N.D4,1],[N.E4,1],[N.Fs4,1],[N.G4,1],[N.A4,2],[N.G4,1],[N.Fs4,1],[N.E4,2],[N.D4,2],[N.B3,1],[N.Cs4,1],[N.D4,2],[N.B3,1],[N.A3,1],[N.E3,2],[N.Fs3,1],[N.G3,1],[N.A3,2],[N.B3,1],[N.Cs4,1],[N.D4,2],[N.E4,1],[N.D4,1],[N.Cs4,1],[N.B3,1],[N.A3,4]],bass:[[N.E3,4],[N.A3,4],[N.Fs3,4],[N.E3,4],[N.A2,4],[N.B2,4],[N.E3,4],[N.A2,4]]},
];
function startBgMusic(){if(bgStarted)return;bgStarted=true;bgMaster=actx().createGain();bgMaster.gain.value=0.0196;bgMaster.connect(actx().destination);playNextTrack();}
function playNextTrack(){const ctx=actx(),track=pick(MUSIC_TRACKS),B=60/track.bpm;function sv(notes,t0,type,vol,sus=0.78){let t=t0;notes.forEach(([freq,beats])=>{const dur=beats*B*sus,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.018);g.gain.setValueAtTime(vol*0.65,t+dur*0.55);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(bgMaster);o.start(t);o.stop(t+dur);t+=beats*B;});}const t0=ctx.currentTime+0.25,mb=track.mel.reduce((s,[,d])=>s+d,0),bb=track.bass.reduce((s,[,d])=>s+d,0);sv(track.mel,t0,track.melType,track.melVol,0.80);sv(track.bass,t0,track.bassType,track.bassVol,0.60);setTimeout(playNextTrack,(Math.max(mb,bb)*B-0.10)*1000);}

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
    divine_smite:(h,hi)=>{const isEvil=DAMAGE_TYPES[battle.monster.damageType]?.alignment==='evil'||battle.monster.undead;const mult=isEvil?2.5:2.0;log(`${h.name} calls Divine Smite!${isEvil?' Extra judgement against this evil foe!':''}`);executeAttack(h,hi,mult,false,'holy');},
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
    document.getElementById('btn-roll').addEventListener('click',()=>{SFX.roll();rollParty();});
    document.getElementById('btn-start').addEventListener('click',startGame);
    window.addEventListener('keydown',e=>{
        const k=e.key.toLowerCase();
        if(k==='r'&&!document.getElementById('ctrl-setup').classList.contains('hidden')){SFX.roll();rollParty();return;}
        if(['1','2','3','4'].includes(k)){const btns=document.querySelectorAll('#ctrl-play .px-btn');const idx=+k-1;if(btns[idx]&&!btns[idx].disabled)btns[idx].click();}
    });
});

function enterWood(){startBgMusic();SFX.start();const inp=document.getElementById('team-name-input');teamName=(inp?.value.trim())||'The Unnamed Fellowship';showScreen('screen-setup');showCtrl('ctrl-setup');}

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
        isLeader:false,lastInitiative:0,
        level:1,xp:0,xpNext:xpThreshold(1),bonusDmg:0,
        primaryStat:cls.primaryStat,damageType:cls.damageType,
        attackNames:cls.attackNames,
        abilities:cls.abilities,
        abilityCooldowns:{},
        items:[],locked:false,
    };
}
function xpThreshold(l){return l*60;}
function detectPartyLeader(){const a=party.filter(h=>h&&h.hp>0);if(!a.length){party.forEach(h=>{if(h)h.isLeader=false;});return;}const eff=h=>h.leadership+(h.morality>50?2:h.morality<-50?-2:0);const lead=a.reduce((b,h)=>eff(h)>eff(b)?h:b);party.forEach(h=>{if(h)h.isLeader=(h===lead);});}
function toggleLock(i){SFX.lock();party[i].locked=!party[i].locked;renderSetup();}

function renderSetup(){
    const c=document.getElementById('party-slots');c.innerHTML='';
    party.forEach((h,i)=>{
        const d=document.createElement('div');d.className=`slot-card${h.locked?' locked':''}`;
        // Ability tooltip for setup card: each ability with full description
        const abilTip=h.abilities.map(a=>`<b>${a.name}</b> (CD:${a.cooldown}rnd)<br>${a.desc}`).join('<br>─<br>');
        const resLines=Object.entries(h.resistances).filter(([,v])=>v!==0).map(([k,v])=>`${k}: ${v>0?'+':''}${v}%`).join(', ')||'None';
        d.innerHTML=`
            <span class="slot-name">${h.isLeader?'👑 ':''}${h.name}</span>
            <span class="slot-sub">${h.race} · ${h.job}</span>
            <span class="slot-stats">HP:${h.hp} STR:${h.str} INT:${h.int} DEX:${h.dex}</span>
            <span class="slot-stats">CHA:${h.cha} STA:${h.sta} LCK:${h.lck}</span>
            <span class="slot-sub ability-hint setup-ability-hint">
                ⚡ ${h.abilities.map(a=>a.name).join(' · ')}
                <div class="stat-tooltip setup-tooltip">${abilTip}<br>─<br><b>Resistances:</b> ${resLines}</div>
            </span>
            <button class="bind-btn" onclick="toggleLock(${i})">${h.locked?'🔒 BOUND':'🔓 BIND'}</button>`;
        c.appendChild(d);
    });
    renderPortraitStrip();
}

/* ═══════════════════════════════════════════════════════════════
   9. PORTRAIT STRIP
   Heroes left-aligned, active monster right-aligned.
   Status badges, HP colours, initiative, hover tooltips.
   ═══════════════════════════════════════════════════════════════ */

function heroStatusBadges(hi){
    const tags=[];
    if((battle.heroShielded[hi]||0)>0)   tags.push({label:'🛡 Shielded', col:'#88ccff'});
    if((battle.heroPhaseShift[hi]||0)>0) tags.push({label:'👁 Phased',   col:'#b47afe'});
    if(battle.heroRegen[hi])             tags.push({label:'💚 Regen',     col:'#6abf45'});
    if((battle.heroRage[hi]||0)>0)       tags.push({label:'🔥 Rage',      col:'#ff7733'});
    if(battle.heroDmgMult[hi])           tags.push({label:'⬆ Buffed',    col:'#ffe033'});
    if(battle.inspiredHero===hi)         tags.push({label:'🎵 Inspired',  col:'#e879f9'});
    if(battle.combustPrimed[hi])         tags.push({label:'💣 Primed',    col:'#ff7733'});
    if(battle.judgmentPrimed[hi])        tags.push({label:'⚖ Judged',    col:'#ffd700'});
    return tags;
}
function monsterStatusBadges(){
    const tags=[];
    if(battle.monsterSkipTurns>0)        tags.push({label:`❄ Stun(${battle.monsterSkipTurns})`, col:'#88eeff'});
    if(battle.monster?.charmed)          tags.push({label:'💕 Charmed',   col:'#e879f9'});
    if(battle.monsterResistNullified)    tags.push({label:'🕳 Nullified', col:'#7755dd'});
    if(battle.monsterAtkMultRounds>0){const pct=Math.round((1-battle.monsterAtkMult)*100);tags.push({label:`⬇ATK-${pct}%`,col:'#88ccff'});}
    if(battle.dotEffects.some(d=>!d.targetType||d.targetType==='monster')) tags.push({label:'☠ Poisoned',col:'#6abf45'});
    return tags;
}

function renderPortraitStrip(){
    const strip=document.getElementById('portrait-strip');
    if(!strip||strip.classList.contains('hidden'))return;

    const heroHTML=party.map((h,i)=>{
        const dead=h.hp<=0,spr=portraitStyle(h);
        const hpPct=h.maxHp>0?h.hp/h.maxHp*100:0;
        const hpCol=hpPct>55?'#6abf45':hpPct>25?'#c8a040':'#aa3333';
        const initMod=Math.floor((h.dex+h.lck)/4);
        const moralLabel=h.morality>30?'Righteous':h.morality>10?'Good':h.morality>-10?'Neutral':h.morality>-30?'Shadowed':'Corrupt';
        const resLines=Object.entries(h.resistances).filter(([,v])=>v!==0).map(([k,v])=>`${k}: ${v>0?'+':''}${v}%`).join('<br>')||'None';
        const abilityLines=h.abilities.map(a=>{const cd=h.abilityCooldowns[a.id]||0;return `<b>${a.name}</b>${cd>0?` (${cd}rnd)`:'  ✓'}: ${a.desc}`;}).join('<br>');
        const tip=[`<b>${h.name}</b> Lv.${h.level} ${h.race} ${h.job}`,`STR:${h.str} INT:${h.int} DEX:${h.dex}`,`CHA:${h.cha} STA:${h.sta} LCK:${h.lck}`,`INIT: +${initMod}${h.lastInitiative?' (rolled '+h.lastInitiative+')':''}`,`Leadership: ${h.leadership} · Morality: ${moralLabel}`,`<b>Resistances:</b><br>${resLines}`,`<b>Abilities:</b><br>${abilityLines}`].join('<br>');
        const badges=battle.active?heroStatusBadges(i):[];
        const badgeHTML=badges.map(b=>`<span class="status-badge" style="color:${b.col}">${b.label}</span>`).join('');
        return `<div class="portrait-card${dead?' portrait-dead':''}" id="portrait-card-${i}" role="listitem">
            <div class="portrait-sprite-wrap"><div class="portrait-sprite" style="${spr}"></div>${dead?'<div class="portrait-dead-x">✝</div>':''}${h.isLeader?'<div class="leader-crown">👑</div>':''}</div>
            <div class="portrait-info">
                <span class="pi-name"><span class="pi-lv">Lv.${h.level}</span>${h.name}</span>
                <span class="pi-sub">${h.race} · ${h.job}</span>
                ${dead?`<span class="pi-dead">✝ SLAIN</span>`:`<span class="pi-hp" style="color:${hpCol}">HP:${h.hp}/${h.maxHp}</span><span class="pi-init">INIT:+${initMod}${h.lastInitiative?' ('+h.lastInitiative+')':''}</span><span class="pi-item">${h.items.at(-1)??'—'}</span>${badgeHTML?`<span class="status-row">${badgeHTML}</span>`:''}`}
                <div class="stat-tooltip">${tip}</div>
            </div>
        </div>`;
    }).join('');

    let monsterHTML='<div class="strip-monster-empty"></div>';
    if(battle.active&&battle.monster&&battle.monster.currentHp>0){
        const m=battle.monster;
        const mIdx=GAME_DATA.monsters.findIndex(x=>x.name===m.name);
        const sIdx=m.spriteIdx??mIdx;
        const mSpr=monsterPortraitStyle(sIdx>=0?sIdx:0);
        const hpPct=m.maxHp>0?m.currentHp/m.maxHp*100:0;
        const hpCol=hpPct>66?'#c84040':hpPct>33?'#c87030':'#882020';
        const badges=monsterStatusBadges();
        const badgeHTML=badges.map(b=>`<span class="status-badge" style="color:${b.col}">${b.label}</span>`).join('');
        const dotInfo=battle.dotEffects.filter(d=>!d.targetType||d.targetType==='monster').map(d=>`${d.dmgType} ${d.dmgPerRound}/rnd×${d.rounds}`).join(', ')||'None';
        const tip=[`<b>${m.name}</b>`,`HP: ${m.currentHp} / ${m.maxHp}`,`ATK: ${m.str}${battle.monsterAtkMult!==1?' ×'+battle.monsterAtkMult.toFixed(2):''}`,`Initiative: ${m.initiative??'?'}`,`Battle round: ${battle.round}`,m.undead?'☠ Undead type':'',`DoT active: ${dotInfo}`,battle.monsterResistNullified?'⚠ Resistances nullified':''].filter(Boolean).join('<br>');
        monsterHTML=`<div class="portrait-card monster-card" id="monster-card" role="listitem">
            <div class="portrait-sprite-wrap"><div class="portrait-sprite" style="${mSpr}"></div></div>
            <div class="portrait-info">
                <span class="pi-name pi-monster-name">${m.icon} ${m.name}</span>
                <span class="pi-hp" style="color:${hpCol}">HP:${m.currentHp}/${m.maxHp}</span>
                <span class="pi-init">INIT:${m.initiative??'?'}  Rnd:${battle.round}</span>
                ${badgeHTML?`<span class="status-row">${badgeHTML}`+'</span>':''}
                <div class="stat-tooltip monster-tooltip">${tip}</div>
            </div>
        </div>`;
    }

    strip.innerHTML=`<div class="strip-heroes">${heroHTML}</div><div class="strip-monster">${monsterHTML}</div>`;
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

function doUneventfulTurn(){
    const ev=pick(GAME_DATA.uneventfulEvents);logPrompt(ev.text);
    setChoices([
        {label:'[1] Press on through the wood',action:()=>{log(ev.pressOn);SFX.neutral();setTimeout(nextTurn,40);}},
        {label:'[2] Rest and recover',action:()=>{party.forEach(h=>{if(h.hp<=0)return;const hl=Math.max(2,Math.floor(h.maxHp*(0.06+h.sta*0.003)));h.hp=Math.min(h.hp+hl,h.maxHp);log(`${h.name} rests. +${hl} HP`);});log(ev.restFlavour);SFX.heal();setTimeout(nextTurn,40);}},
        {label:'[3] Search the surroundings',action:()=>{const best=Math.max(...party.filter(h=>h.hp>0).map(h=>h.lck));if(Math.random()<0.12+best*0.008)giveLoot();else log('Naught of value is found here.');log(ev.searchFlavour);SFX.neutral();setTimeout(nextTurn,40);}},
    ]);
}

/* ═══════════════════════════════════════════════════════════════
   11. SCENARIO — with stat-gated bonus options
   ═══════════════════════════════════════════════════════════════ */
function doScenario(){
    const ev=pick(GAME_DATA.scenarios);logPrompt(ev.text);
    const choices=ev.options.map((opt,i)=>({label:`[${i+1}] ${opt.text}`,action:()=>resolveScenario(opt)}));
    if(ev.gated){ev.gated.forEach(g=>{const hero=party.find(h=>h.hp>0&&h[g.requires.stat]>=g.requires.min);if(hero)choices.push({label:`[${choices.length+1}] [${g.requires.stat.toUpperCase()} ${g.requires.min}+] ${hero.name}: ${g.text}`,action:()=>resolveGated(hero,g),isGated:true});});}
    setChoices(choices);
}
function resolveScenario(opt){
    const h=aliveHero();if(!h)return;
    if(opt.damage){h.hp-=opt.damage;SFX.bad();shake();}
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
    log('━━━ Battle Round 1 ━━━');
    processBattleTurn();
}

function rollInitiative(h){return rand(1,20)+Math.floor(h.dex/4)+Math.floor(h.lck/5)+(h.isLeader?2:0);}

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
    const choices=[];
    const atkName=pick(hero.attackNames);
    choices.push({label:`[1] ${atkName}`,action:()=>executeAttack(hero,hi,1.0)});
    hero.abilities.forEach(ab=>{
        const cd=hero.abilityCooldowns[ab.id]||0,ready=cd===0;
        choices.push({
            label:`[${choices.length+1}] ${ab.name}${ready?'':`  (${cd} rnd)`}  — ${ab.desc}`,
            disabled:!ready,
            action:()=>{
                if(!ready){log(`${ab.name} is on cooldown (${cd} rounds).`);SFX.neutral();advanceBattleTurn();setTimeout(processBattleTurn,300);return;}
                hero.abilityCooldowns[ab.id]=ab.cooldown;
                const fn=ABILITY_EFFECTS[ab.id];
                if(!fn){log(`[Error: ability ${ab.id} not found — skipping turn]`);finishAbilityTurn();return;}
                fn(hero,hi);
            },
        });
    });
    if(hero.isLeader)choices.push({label:`[${choices.length+1}] Attempt to flee (leader only)`,action:()=>attemptFlee(hero)});
    setChoices(choices);
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
    let res=0;
    if(!battle.monsterResistNullified&&battle.monster.resistances)res=battle.monster.resistances[dmgType]??0;
    if(res!==0)dmg=Math.max(1,Math.round(dmg*(1-res/100)));
    battle.monster.currentHp=Math.max(0,battle.monster.currentHp-dmg);
    const critSpan=isCrit?` <span style="color:#ffe033">✦ CRIT!</span>`:'';
    logHTML(`${hero.name} — ${atkName}: <span style="color:${dmgInfo.color}">${dmg} ${dmgInfo.label}</span>${critSpan}`);
    if(isCrit)SFX.crit();else(battle.monster.str>24?SFX.heavyHit():SFX.strike());
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
    if(Math.random()>0.45){log(`${hero.name} leads the party to safety!`);SFX.flee();battle.active=false;setTimeout(nextTurn,500);}
    else{log(`The ${battle.monster.name} cuts off the retreat!`,'blood');SFX.bad();advanceBattleTurn();setTimeout(processBattleTurn,400);}
}

function endCombat(won){
    if(!battle.active)return;   // guard against double-calls
    battle.active=false;
    if(party.every(h=>h.hp<=0))return endGame(false);
    if(won){
        log(`${battle.monster.name} is defeated!`);SFX.good();
        if(Math.random()<battle.monster.loot)giveLoot();
        if(battle.monster.boon&&Math.random()<0.25){const h=aliveHero();if(h){if(battle.monster.boon.hp)h.hp=Math.min(h.hp+battle.monster.boon.hp,h.maxHp);if(battle.monster.boon.int)h.int+=battle.monster.boon.int;log(`Strange energy from ${battle.monster.name} flows into ${h.name}!`);}}
        const bXP=battle.monster.xpValue??40;
        const sf=battle.monster.str/(GAME_DATA.monsters.find(m=>m.name===battle.monster.name)?.str??battle.monster.str)||1;
        party.filter(h=>h.hp>0).forEach(h=>grantXP(h,Math.round(bXP*sf)));
    }
    renderStats();setTimeout(nextTurn,700);
}

/* ═══════════════════════════════════════════════════════════════
   13. THE GREAT HONK OF DEATH
   ═══════════════════════════════════════════════════════════════ */
function doHonkEncounter(){clearChoices();SFX.doubleHonk();[{t:0,text:'The forest falleth utterly silent.',style:'pale'},{t:900,text:'A shadow crosseth the canopy overhead.',style:'pale'},{t:1900,text:'From the mists emergeth... THE GREAT HONK OF DEATH.',style:'blood'},{t:2900,text:'🪿 It regardeth thee with one terrible, ancient eye.',style:'blood'},{t:3800,text:'"Men have wept at its passing. Armies have broken and fled.',style:'dim'},{t:4600,text:'"Scholars who beheld it could not sleep for a fortnight."',style:'dim'}].forEach(({t,text,style})=>setTimeout(()=>log(text,style),t));setTimeout(()=>SFX.honk(),2800);setTimeout(()=>setChoices([{label:'[1] Stand thy ground and fight!',action:fightHonk},{label:'[2] Flee for thy very life!',action:fleeHonk}]),5400);}
function fightHonk(){log('Thou raisest thy weapon against the eternal goose...');SFX.honk();setTimeout(()=>{if(Math.random()<0.80){party.forEach(h=>{h.hp=0;});SFX.death();shake();shake();setTimeout(()=>{log('HONK.','blood');log('Thy fellowship is unmade. The Great Honk is eternal.','blood');setTimeout(()=>endGame(false),1800);},600);}else{party.forEach(h=>{if(h.hp>0)h.hp=Math.max(1,Math.floor(h.hp*0.08));});log('The Goose... tires of thee. A miracle known to no other.');party.forEach(h=>grantXP(h,500));SFX.victory();setTimeout(nextTurn,1200);}},1200);}
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
    const titleEl=document.getElementById('end-title'),flavourEl=document.getElementById('end-flavour');
    if(won){SFX.victory();titleEl.textContent='✦ VICTORY ✦';flavourEl.textContent=pick(GAME_DATA.victoryLines)+` Treasury: ${treasury.gold} gold · ${treasury.gems} gems · ${wealth} gold value.`;}
    else{SFX.death();titleEl.textContent='✧ DEFEAT ✧';flavourEl.textContent=pick(GAME_DATA.defeatLines);}
    const scores=JSON.parse(localStorage.getItem('norrt_scores')||'[]');
    scores.push({team:teamName,turns:turn,won,gold:treasury.gold,gems:treasury.gems,wealth,date:new Date().toLocaleDateString('sv-SE')});
    scores.sort((a,b)=>{if(a.won!==b.won)return a.won?-1:1;if(a.won)return b.wealth-a.wealth;return b.turns-a.turns;});
    localStorage.setItem('norrt_scores',JSON.stringify(scores.slice(0,50)));
    document.getElementById('highscore-list').innerHTML=scores.map((s,i)=>{const icon=s.won?'✦':'✧',colour=s.won?'var(--gold)':'var(--dim)';const detail=s.won?`${s.turns} trials · ${s.wealth} gold`:`${s.turns} trials`;return `<p style="color:${colour}">${i+1}. ${icon} ${s.team} · ${detail} · ${s.date}</p>`;}).join('');
}

/* ═══════════════════════════════════════════════════════════════
   16. RENDER & UTILITIES
   ═══════════════════════════════════════════════════════════════ */
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');const strip=document.getElementById('portrait-strip');const show=id!=='screen-intro';strip.classList.toggle('hidden',!show);if(show)renderPortraitStrip();}
function showCtrl(id){['ctrl-intro','ctrl-setup','ctrl-play','ctrl-end'].forEach(c=>document.getElementById(c).classList.toggle('hidden',c!==id));}
function logPrompt(text){document.querySelectorAll('#game-log .prompt-current').forEach(p=>p.classList.remove('prompt-current'));const el=document.getElementById('game-log'),p=document.createElement('p');p.className='prompt-current';p.textContent=text;el.insertAdjacentElement('afterbegin',p);}
function log(text,style='pale'){document.querySelectorAll('#game-log .log-recent').forEach(p=>p.classList.remove('log-recent'));const el=document.getElementById('game-log'),p=document.createElement('p');p.classList.add('log-recent');if(style==='blood')p.classList.add('log-blood');p.style.color=style==='blood'?'var(--blood)':style==='dim'?'var(--dim)':'var(--pale)';p.textContent=text;el.insertAdjacentElement('afterbegin',p);}
function logHTML(html){document.querySelectorAll('#game-log .log-recent').forEach(p=>p.classList.remove('log-recent'));const el=document.getElementById('game-log'),p=document.createElement('p');p.classList.add('log-recent');p.style.color='var(--pale)';p.innerHTML=html;el.insertAdjacentElement('afterbegin',p);}
function setChoices(choices){const el=document.getElementById('ctrl-play');el.innerHTML='';choices.forEach(c=>{const btn=document.createElement('button');btn.className=`px-btn${c.isGated?' gated-btn':''}`;btn.textContent=c.label;if(c.disabled)btn.classList.add('ability-cooldown');btn.addEventListener('click',()=>{el.querySelectorAll('button').forEach(b=>b.disabled=true);c.action();});el.appendChild(btn);});}
function clearChoices(){document.getElementById('ctrl-play').innerHTML='';}
function renderStats(){detectPartyLeader();renderPortraitStrip();}
function renderTreasury(){const bar=document.getElementById('treasury-bar');if(!bar)return;const v=treasury.gold+treasury.gems*20;bar.textContent=`⚔ Turn ${turn}/${MAX_TURNS}  ·  ${treasury.gold} gold  ·  ${treasury.gems} gems  ·  ${v} gold value`;}

const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function aliveHero(){const a=party.filter(h=>h.hp>0);return a.length?a[Math.floor(Math.random()*a.length)]:null;}
