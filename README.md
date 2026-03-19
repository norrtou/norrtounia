Norrtounia - The Dark Forest
Javascript Dungeon Crawler with random encounters.

v2.0 - Bug fixes, reworked dext and luck stats. Gave conflicting moralities a bonus, changed morality aspects of several actions.

v1.8 - Dice rolls added. Finally. Corrected some display bugs as well. Added tool tip for certain monster types like undead.

v1.7 - Reworked some visuals. The Character selection box is now clearer. Added missing tool tips. Fixed a few bugs. 

v1.6 - Added resurrection and reworked the actions possible to more clearly state the risks and benefits. Very few actions should come without a cost or benefit.

v1.5 - Added a 10% chance to encounter more than one monster at a time, and the capability to select targeted monster.

v1.3 - Several fixes to tool tips, added a mute button ingame for music, a high score button, also overhauled the alignment and moral system of the game.

v1.1 - Small bug fixes

v1.0 Yes, finally! Way to many small fixes to list. And major UI overhaul. Tool tips everywhere. 

v0.95 - Fixed bugged music, sounds, effect icons and tooltip. 1.0 coming soon!

v0.9 - added Sprites for monsters and more tool tips

v0.81 - Fixed crashing bug
v0.8 - added class specific skills

v0.7 
Major core gameplay mechanics change. More stats, more resistances, individual control, initiative, morality and so on. Stats and resistances now show in tooltip. More variation in scenarios also.

v0.6
Added portraits from a sprite sheet. Moved charcters out from the text area. Will most likely create better sprites in the future.

v0.51
Added a sitemap to the repo
Fixed a typo

v0.5
Major updates

DEX added to all 10 races and all 24 classes. Each hero now has STR/INT/DEX visible on their stat card
Hero counter-attacks first in every fight using their class's named attack (e.g. "Dunstan uses Smite Evil!") with a coloured damage span (fire=orange, frost=cyan, shadow=purple, holy=gold, etc.)
DEX drives dodge chance: (DEX - 5) × 1.5%, capped at 40%. High-DEX Rogues and Shadow Dancers dodge frequently

Levelling (cap 100)

XP threshold per level = level × 60. Realistic runs end around level 13–16
On level-up: primary stat +1–3, HP +3–8, 40% chance of a secondary stat +1–2, every 5 levels bonusDmg +1
+X STAT floats up from the stat card with a gold animation for each gain
Level shown as Lv.4 Dunstan prominently on each card; XP progress shown below stats

10 new classes: Pyromancer (fire), Dark Rogue (poison), Blood Knight (blood), Arcane Archer (arcane), Shaman (lightning), Templar (holy), Shadow Dancer (shadow), Void Walker (void), Battle Mage (fire/STR), Warden (nature)
5 music tracks randomised and shuffled on each loop: Forest Path (A-minor), Dungeon Depths (D-minor), Tavern Ballad (G-major), Dark Omen (B-minor), Ancient Mystery (E-Dorian)
Treasury: 10% chance per turn of gold/gem find with flavour text. Only affects ranking if team survives all 100 turns (sorted by wealth value). Shown in the Turn X/100 · 💰 45g · 💎 2 bar below stat cards
Team naming: Input on intro screen, saved with every highscore entry
Log highlighting: Current prompt gets a gold left-border + white text; past events dim to grey
BIND button: Glows green with layered box-shadow when a hero is locked

v0.2-v0.4 
adds: level progression to your characters (xp-system)
adds: actual functionality to all stats
adds: a way to name your team
adds: more music
fixed: No more random game length
Fixed: Variety in font size for better readability.

v0.1 - Bugs removed, buttons changed, music added.

v0.05 - Up and running with graphics, incorrect size of fonts, out of bounds and no sound. 

v0.01 - First release, baseline trial, couldnt run as intended in browser window, graphics didnt load.

Start - 2026-03-13


Planned for the future:

Class-specific special abilities — passive bonuses that trigger in certain scenario types (e.g. Druids get better nature outcomes, Rogues can auto-succeed on stealth checks) Make some stronger skills take x turns to reload if used.
Party synergy — bonuses when certain race/class combos are in the same party
A proper death screen with the names of fallen heroes listed
Sound effects per damage type — fire crackle, frost tinkle, etc.
Mobile / touch support for the controls
Better visuals and clearer interface
Fix music bugging out and stopping
Fix icon to be better selected for each class
Add some concepts of strategy and planning, so its less just random
Add resistances to types of damage
Add team affecting spells (both positive and negative)
Add more graphics
Add steps of actions where nothing happens more than the team walking. Too much is going on now.
Maybe add a map that plots and redo the central screen to procedural svg graphics.
Add alignments because of actions - good neutral evil. This will affect new scenarios and also be shown in high score.
Increase the gameplay window or at least move some UI out from it.
Display in character box what skill it used or is affected by. Stat-icons.
Make icons and description for gold and gems better. Make Gems more valuable.
Make more tooltips, like for items
Add character screen for monster encounter
A better way to see initiative
A beter way to see text in text box
A way to choose a character skill and make this visible
Fix the great honk of death sprite (bugged)
Add more empty turns without monster encounters
add more choices of paths to go
big: add more static graphics like images of ruins, forests, trees, campfires connected to the events instead of icons 
More monster types, variety of same monster
Encounter more than one
More clearer choices on hard choices giving better bonuses but more danger. 
Need a resurrect action, with 10 turn cooldown
Need negative consequence on more actions and bonuses on other
Must show more clearer who has the turn by marking it with some icon. Maybe redo the concept of leadership.
