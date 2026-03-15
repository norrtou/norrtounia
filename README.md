Norrtounia - The Dark Forest
Javascript Dungeon Crawler with random encounters.

v0.01 - First release, baseline trial, couldnt run as intended in browser window, graphics didnt load.

v0.05 - Up and running with graphics, incorrect size of fonts, out of bounds and no sound. 

v0.1 - Bugs removed, buttons changed, music added.

v0.2-v0.4 
adds: level progression to your characters (xp-system)
adds: actual functionality to all stats
adds: a way to name your team
adds: more music
fixed: No more random game length
Fixed: Variety in font size for better readability.

v0.5 - 2026-03-14
New stats & combat

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

v0.51 - 2026-03-15
Added a sitemap to the repo

Planned for the future
More scenario variety — the 15 scenarios start repeating in a 100-turn run
Class-specific special abilities — passive bonuses that trigger in certain scenario types (e.g. Druids get better nature outcomes, Rogues can auto-succeed on stealth checks)
Party synergy — bonuses when certain race/class combos are in the same party
A proper death screen with the names of fallen heroes listed
Sound effects per damage type — fire crackle, frost tinkle, etc.
Mobile / touch support for the controls
Better visuals and clearer interface
Fix music bugging out and stopping
Add some concepts of strategy and planning, so its less just random
Add resistances to types of damage
Add team affecting spells (both positive and negative)
Add more graphics
Increase the gameplay window or at least move some UI out from it.