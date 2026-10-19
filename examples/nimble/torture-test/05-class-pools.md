---
id: torture.nimble.05-class-pools
type: note
system: nimble
name: "Class pools: Lay on Hands, Judgment Dice, Sneak Attack dice, Bursts of Speed"
covers: [nimble.classes.oathsworn, nimble.classes.cheat, nimble.classes.zephyr, nimble.features.oathsworn.radiant-judgment]
---
## Rule
Oathsworn Lay on Hands 5×LVL per Safe Rest; Judgment Dice gained when attacked while holding none, spent on next melee attack, die grows 3/5/8/10; Cheat Sneak Attack 1d6 → 3d20; Zephyr DEX Bursts per Initiative (H2 p.14, 38, 68).

## Encoding notes
Lay on Hands: resource with `max: oathsworn.healing.max` (formula `5 * level(oathsworn)`). Judgment Dice: a resource holding 'one set' (max 1) refreshing to 0 at encounter end; die size and count are variables (`oathsworn.judgment.die` nested `if` by level; `oathsworn.judgment.count` default 2, Vengeance adds 1). Sneak Attack: a dice-typed variable with a seven-way nested `if`. Bursts: resource with max `max(dex, 0)` refreshing to max at `encounter-start`. **Gaps:** auto-spend on attack (no attack event), and nested `if` chains read badly; a `steps(level(cheat), {3: 1d8, 7: 2d8, ...})` table-lookup form would be friendlier.
