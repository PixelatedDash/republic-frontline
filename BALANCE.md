# Balance

How the numbers are meant to work. Every value lives in `src/data/` (towers, enemies, rules, balance, levels); the bot results are in `BALANCE_REPORT.md`.

## Economy

- **Kill bounties** are the main income. Bounty is roughly 5 credits per threat point (a Trooper Droid is 1 point and pays 5; a Heavy Tank is 11 points and pays 28, so armor pays less per point than infantry).
- **Interest:** 5% of banked credits at every wave end, capped per wave at 60 on Kamino, rising by 5 per planet to 80 on Mustafar. The cap stops "bank everything" play from snowballing; it is worth about one Rifle Squad upgrade every two waves.
- **Early call:** up to 30 credits for calling the next wave immediately, falling linearly over the level to a 30% floor on the last waves. Good for tempo early, nearly worthless late.
- **Supply Depots** (max 3): 30 / 48 / 68 credits per wave end (Credit Exchange 105; Command Relay pays nothing and gives +15% fire rate in range instead). A tier-1 depot pays back in 5 waves, so depots are a bet made in the first third of a level; the bots build at most two and only with 8+ waves left.
- **Selling** refunds 70%, or 100% before the tower's first shot (depots: before the next wave end).

## Threat curve

Each wave is a hand-written recipe (which droids, in what proportions, in what order) turned into counts by the level's strength curve:

`threat points of wave w = b0 * (1 + 0.3 w) ^ 1.3`

- `b0` rises gently through the campaign (6 on Kamino 2 to 9 on Mustafar). Wave sizes therefore grow a little faster than linear inside a level, so towers bought with earlier bounties do not trivialize the last waves.
- Counts never exceed 30 per group (40 for Scuttler swarms), so late waves get tougher droids rather than endless streams.
- **Difficulty knob:** each level has an `hp` scale (droid HP and shields) tuned by `tools/sim/tune.mjs`. It is the highest value at which the balanced bot still wins Jedi in at least 3 of 5 seeds and Padawan in 5 of 5. Bounties do not change with `hp`, so it is a pure difficulty dial (raising wave counts instead is not: more droids also pay more).
- Difficulty modes multiply on top: Padawan 0.8x HP and 1.2x credits, Jedi Master 1.35x HP and +20% droids.

## Expected build by wave (Jedi, balanced play)

| Point in a level | Towers | Typical tiers |
|---|---|---|
| Waves 1-3 | 3-4 (starting credits) | tier I, one tier II |
| Waves 4-8 | 5-7, first anti-air, maybe a depot | tier II, first tier III |
| Waves 9-14 | 7-10 | tier III, first tier-4 branch |
| Last waves / boss | 9-12 | 2-4 tier-4 branches, mixed damage types |

## Damage-type pressure

Damage types decide most fights (`src/data/rules.js`): Blaster is cheap and fast but halved by armor and shields; Explosive splashes and does 150% to armor; Ion does 250% to shields and stuns; Piercing does 175% to armor at long range but fires slowly. Every planet from Geonosis on mixes armor, shields, air and swarms, so no single tower type covers a level (the spam bots must lose from Geonosis 3 on).

**Sharpshooter is a specialist, not a backbone.** Piercing is the best type against armor and the post reaches air, so it is priced as a premium tower (240 to build) with slow, heavy shots. Its counter is volume: Scuttler swarms, Carriers and infantry escorts waste its shots. Spamming it alone loses every level from Geonosis 3 on (see the report).

## What each planet tests

- **Kamino** (tutorial planet): placement, upgrades, targeting, the first shields and the first air lane. New towers: Repeater (K2), Ion (K3), Artillery (K4). Boss: Tidebreaker, armored and slow, rewards explosive coverage along the whole route.
- **Geonosis**: armor (Commando, Heavy Tank) and armored air (Bomber Gunship). Blasters alone stop working here. Sharpshooter (G1) and Supply Depot (G2) complete the arsenal. Boss: Foundry Colossus, which keeps producing droids until its vents die, so it tests target priority.
- **Kashyyyk**: swarms and splitters (Droid Carrier spills Scuttlers), shielded multi-leg Crawlers, and Repair Drones that undo slow damage. Tests splash placement and shooting the healer first. Boss: Timber Reaper, whose phase-2 shell punishes blaster/ion-heavy defenses.
- **Umbara**: support droids (Shield Walker bubbles, Tactical speed aura) and heavy air from three directions. The night is visual only: towers see everything in range. Boss: Night Dreadnought, an air boss that drops bombers and switches off tower lights (range -20% for 4 s), so anti-air must be spread out.
- **Mustafar**: everything at once plus Siege Walkers (lifeCost 5). The longest levels. Boss: The Warlord Engine with three phases (armor, then a 2000-point shield that wants ion, then an enraged, faster, unarmored phase with minions that wants splash).

## Bosses

| Boss | HP (Jedi, before level scale) | Body | Leak |
|---|---|---|---|
| Tidebreaker | 3000 | armored | difficulty boss leak (Padawan -10, Jedi -15, Master: loss) |
| Foundry Colossus | 3800 + 3 vents x 450 | armored (vents unarmored) | same |
| Timber Reaper | 4500 | unarmored, then shell below 60% | same |
| Night Dreadnought | 3600 | armored, air | same |
| The Warlord Engine | 9000 (+2000 shield in phase 2) | armored, unarmored in phase 3 | same |

Bosses take 25% stun duration (spec §6).
