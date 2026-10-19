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
Lay on Hands: resource `oathsworn.lay_on_hands` with `max: oathsworn.lay_on_hands.pool` (formula `5 * level(oathsworn)`). Judgment Dice: a resource holding 'one set' (max 1) refreshing to 0 at encounter end; die size is a lookup by level (`rows: {1: 6, 3: 8, 5: 10, 8: 12, 10: 20}`), count is a variable (default 2, Vengeance adds 1). Sneak Attack: a dice-typed lookup by level, seven rows, one line each. Bursts: resource with max `max(dex, 0)` refreshing to max at `encounter-start`. **Gap:** auto-spend on attack is an engine concern (no attack procedure yet).