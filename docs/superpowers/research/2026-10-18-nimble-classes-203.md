# Nimble 2.0.3: Mage, The Cheat, Oathsworn, Zephyr (data-encoding extraction)

Date: 2026-10-18. Source: Heroes 2.0.3 PDF (Scott's copy); page cites are printed page
numbers. Shared conventions (Core Rules 2.0.3): spell cost = tier, cantrips 0, upcast up to
highest unlocked tier (p13, p45). Safe Rest restores all HP, Hit Dice, mana "and other
class-specific resources", heals 1 Wound (p17). Field Rest = Catch Breath / Make Camp (p17).
Six schools: Fire, Ice, Lightning, Necrotic, Radiant, Wind; cantrips + 9 tiers (p45). Every
class has a retrain rider (swap any class option during a Safe Rest).

## 1. Header numbers

| | Mage (p32) | The Cheat (p14) | Oathsworn (p38) | Zephyr (p68) |
|---|---|---|---|---|
| Key stats | INT, WIL | DEX, INT | STR, WIL | DEX, STR |
| Hit Die / Start HP | 1d6 / 10 | 1d6 / 10 | 1d10 / 17 | 1d8 / 13 |
| Saves | INT+, STR− | DEX+, WIL− | STR+, DEX− | DEX+, INT− |
| Armor | Cloth | Leather | All | None |
| Weapons | Blades, Staves, Wands | DEX weapons | STR weapons | Melee |
| Starting gear | Adventurer's Garb, Staff, Soap | 2 Daggers, Sling, Cheap Hides, Chalk | Mace, Rusty Mail, Wooden Buckler, Manacles | Staff, Traveling Robes & Sandals |
| Key / Secondary bumps | Key 4,8,12,16 (INT/WIL); Sec 5,9,13,17 (STR/DEX) | Key (DEX/INT); Sec (WIL/STR) | Key (STR/WIL); Sec (DEX/INT) | Key (DEX/STR); Sec (INT/WIL) |
| L19 / L20 | Epic Boon / +1 to any 2 stats | same | same | same |

## 2. Resources

| Class | Pool | Unlock | Max | Spent on | Refresh | Temporary additions |
|---|---|---|---|---|---|---|
| Mage | Mana | L2 (p32) | (INT×3)+LVL | tiered spells, upcasting, Spellshaper surcharges | Safe Rest | Elemental Surge: on Initiative regain WIL (L5), WIL+1d4 (L10), WIL+2d4 (L17); surplus expires end of combat (p32-33) |
| Oathsworn | Mana | L2 (p38) | WIL+LVL | Radiant spells; Zealot (per mana: +5 radiant or target armor −1 step, max mana/attack = highest unlocked tier) | Safe Rest | none |
| Oathsworn | Lay on Hands pool | L1 (p38) | 5×LVL | Action: touch, spend any amount, heal that many HP | Safe Rest | Oathbreaker L7 Torment: spend as damage |
| Oathsworn | Judgment Dice | L1 (p38) | 2d6 → d8 (L3) → d10 (L5) → d12 (L8) → d20 (L10); +1 die L14; +1 die Vengeance L3 | auto-expended on next melee attack this encounter, hit or miss | gained when attacked while holding none; expire end of encounter | Reliable Justice (advantage), Explosive Judgment (AoE) |
| Oathsworn | Radiant Aura uses | decree | WIL uses | end a condition in aura | Safe Rest (p40) | |
| Cheat | Sneak Attack dice | L1 | 1d6 → 1d8 (3) → 2d8 (7) → 2d10 (9) → 2d12 (11) → 2d20 (15) → 3d20 (17) (p14-15) | rides on crits, 1/turn | n/a | Twist the Blade sets one die |
| Cheat | Use-counters | various | 1/day skill→10+INT (L2); 1/enc Assess adv + 1/day Examination adv (L5); THAT'S Not What Happened 1/Safe Rest (L6); Cunning Strike 2/enc (refund on save); Pocket Sand 2/enc; Escape Plan 1/Safe Rest; Heads I Win 1/enc | | per listed cadence | |
| Zephyr | Bursts of Speed | L2 (p68) | DEX on Initiative; +1 at L20 | 1/turn, one of 4 maneuvers free | Initiative | Kinetic Momentum L3: +1 burst per Wound gained |
| Zephyr | Hit Dice as resource | L6 Infuse Strength | normal HD | spend to heal an ally as a Field Rest | Safe Rest | Enduring Soul: on Initiative gain HD = first-turn actions, expire end of combat (p70) |
| Zephyr | Unyielding Resolve | L4 | ignore first 1 / 2 (L10) / 3 (L17) Wounds per encounter | | per encounter | |
| Zephyr | Ethereal Projection | L3 | 1/day | | daily | |

## 3. Per-level tables

### Mage (p32-33)
| Lvl | Grants | Choice |
|---|---|---|
| 1 | Elemental Spellcasting: Fire, Ice, Lightning cantrips | |
| 2 | Mana ((INT×3)+LVL), Tier 1; Talented Researcher | |
| 3 | Subclass; Elemental Mastery (Utility Spells of 1 known school); Study! | subclass (2); school (3) |
| 4 | Spellshaper; Tier 2; Key +1 | 2 of 8; INT/WIL |
| 5 | Elemental Surge (WIL mana on Initiative); Upgraded Cantrips; Sec +1 | STR/DEX |
| 6 | Tier 3; Elemental Mastery (2) | 2nd school |
| 7 | Subclass feature | |
| 8 | Tier 4; Key +1 | |
| 9 | Spellshaper (2); Sec +1 | 1 more |
| 10 | Surge WIL+1d4; Tier 5; Upgraded Cantrips | |
| 11 | Subclass feature | |
| 12 | Tier 6; Key +1 | |
| 13 | Spellshaper (3); Sec +1 | 1 more |
| 14 | Tier 7; Elemental Mastery (3) | 3rd school |
| 15 | Subclass feature; Upgraded Cantrips | |
| 16 | Tier 8; Key +1 | |
| 17 | Surge WIL+2d4; Sec +1 | |
| 18 | Tier 9 | |
| 19 | Epic Boon | |
| 20 | Archmage: +1 to any 2 stats; first tiered spell each encounter −1 action, −5 mana; Upgraded Cantrips | 2 stats |

Spellshaper (8, 1/turn, p34): Dimensional Compression (1+ mana, +4 range each), Echo Casting (2×mana, min 1), Elemental Destruction (1+ mana up to WIL, reroll 1 die each), Elemental Transmutation (1), Extra-Dimensional Vision (2), Methodical Spellweaver (−2 mana for +1 action, min 1), Precise Casting (1+), Stretch Time (2 mana, −1 action, min 1).

### The Cheat (p14-15)
| Lvl | Grants | Choice |
|---|---|---|
| 1 | Sneak Attack +1d6 on crit (1/turn); Vicious Opportunist; Distracted | |
| 2 | Cheat (free Move/Hide 1/round; 1/day skill→10+INT; Initiative floor 10; adv when gambling) | |
| 3 | Subclass; Sneak Attack 1d8; Thieves' Cant | subclass (2) |
| 4 | Underhanded Ability; Key +1; Trade Secrets | 1 of 10 |
| 5 | Twist the Blade (Action); Quick Read; Sec +1 | |
| 6 | Underhanded (2); THAT'S Not What Happened! (1/Safe Rest) | 2nd |
| 7 | Subclass feature; Sneak Attack 2d8 | |
| 8 | Underhanded (3); Key +1 | 3rd |
| 9 | Sneak Attack 2d10; Sec +1 | |
| 10 | Underhanded (4) | 4th |
| 11 | Subclass feature; Sneak Attack 2d12 | |
| 12 | Underhanded (5); Key +1 | 5th |
| 13 | Twist the Blade (2): free, 1/turn; Sec +1 | |
| 14 | Underhanded (6) | 6th |
| 15 | Subclass feature; Sneak Attack 2d20 | |
| 16 | Underhanded (7); Key +1 | 7th |
| 17 | Sneak Attack 3d20; Sec +1 | |
| 18 | Underhanded (8) | 8th |
| 19 | Epic Boon | |
| 20 | Supreme Execution: +1 to any 2 stats; blades need no Distracted | |

Underhanded Abilities (10, p16): "Creative" Accounting, Exploit Weakness, Feinting Attack, How'd YOU get here?!, I'm Outta Here!, Misdirection (+INT armor), Steal Tempo, Sunder Armor (Medium), Sunder Armor (Heavy) [requires Medium], Trickshot.

### Oathsworn (p38-39)
| Lvl | Grants | Choice |
|---|---|---|
| 1 | Radiant Judgment (2d6); Lay on Hands (5×LVL) | |
| 2 | Mana (WIL+LVL), Radiant cantrips + Tier 1; Zealot; Paragon of Virtue | |
| 3 | Subclass; Judgment d8; Sacred Decree; Serve Selflessly | subclass (2); 1 of 10 |
| 4 | My Life, for My Friends (free Interpose); Tier 2; Key +1 | |
| 5 | Judgment d10; Upgraded Cantrips; Sec +1 | |
| 6 | Tier 3; Sacred Decree (2) | 2nd |
| 7 | Subclass feature; Master of Radiance | 1 Radiant Utility |
| 8 | Tier 4; Judgment d12; Key +1 | |
| 9 | Sacred Decree (3); Sec +1 | 3rd |
| 10 | Tier 5; Upgraded Cantrips; Judgment d20 | |
| 11 | Subclass feature; Master of Radiance (2) | 2nd Utility |
| 12 | Sacred Decree (4); Key +1 | 4th |
| 13 | Tier 6; Sec +1 | |
| 14 | Sacred Decree (5); Judgment +1 die | 5th |
| 15 | Subclass feature; Upgraded Cantrips | |
| 16 | Sacred Decree (6); Key +1 | 6th |
| 17 | Tier 7; Sec +1 | |
| 18 | Unending Judgment: +5 melee while no Judgment Dice | |
| 19 | Epic Boon | |
| 20 | Glorious Paragon: +1 to any 2 stats; Defend free on Interpose; Upgraded Cantrips | |

Oathsworn tops out at Tier 7. Sacred Decrees (10, p40): Blinding Aura (1/Safe Rest), Courage! (1/enc), Explosive Judgment (1/enc, 2 actions), Improved Aura (+2 Reach), Radiant Aura (WIL/Safe Rest), Reliable Justice, Shining Mandate, Stand Fast Friends!, Unstoppable Protector (+1 speed), Well Armored (STR temp HP on Interpose).

### Zephyr (p68-69)
| Lvl | Grants | Choice |
|---|---|---|
| 1 | Iron Defense (armor = DEX+STR unarmored); Swift Fists (unarmed 1d4+STR) | |
| 2 | Swift Feet (+2 speed, +LVL Initiative, unarmored); Burst of Speed (DEX bursts on Initiative; 4 maneuvers) | |
| 3 | Subclass; Kinetic Momentum; Ethereal Projection (1/day) | subclass (2) |
| 4 | Unyielding Resolve (1 Wound/enc); Key +1; Martial Master; Focus | 1 of 11 |
| 5 | Reverberating Strikes (+LVL bludgeoning to all melee); Sec +1 | |
| 6 | Martial Master (2); Infuse Strength | 2nd |
| 7 | Subclass feature | |
| 8 | Martial Master (3); Key +1 | 3rd |
| 9 | Swift Feet (2): another +2 speed; Sec +1 | |
| 10 | Martial Master (4); Unyielding Resolve (2) | 4th |
| 11 | Subclass feature | |
| 12 | Martial Master (5); Key +1 | 5th |
| 13 | Iron Defense (2): armor doubled while unarmored; Sec +1 | |
| 14 | Martial Master (6) | 6th |
| 15 | Subclass feature | |
| 16 | Martial Master (7); Key +1 | 7th |
| 17 | Unyielding Resolve (3); adv on STR saves while Dying; Sec +1 | |
| 18 | Martial Master (8) | 8th |
| 19 | Epic Boon | |
| 20 | Windborne: +1 to any 2 stats; +1 Burst on Initiative; permanent +1 action (max 2 while Dying) | |

Martial Arts (11, p70): Airshift, Blur (1/enc), Bodily Discipline, Enduring Soul, I Jump On His Back!, Kinetic Barrage, Mighty Soul, Quickstrike, Use Momentum, Vital Rejuvenation, Windstrider.

## 4. Subclasses (features at 3/7/11/15)

| Class | Subclass | Gist |
|---|---|---|
| Mage | Invoker of Control (p35) | Demand Control from a 4-row table, forced on misses/saves |
| Mage | Invoker of Chaos (p35) | Spend 1 less mana and roll on GM's Chaos Table |
| Cheat | Tools of the Silent Blade (p17) | invisibility kills, stealth, instant kill |
| Cheat | Tools of the Scoundrel (p17) | dirty fighting, taunts, escape |
| Oathsworn | Oath of Vengeance (p41) | Judgment-dice damage amplifier, aura Reach 4 |
| Oathsworn | Oath of Refuge (p41) | shield tank, Interpose anywhere in aura |
| Oathsworn | Oathbreaker (p75) | fallen variant |
| Zephyr | Way of Pain (p71) | turn hits on you into crits and reflect |
| Zephyr | Way of Flame (p71) | self-Wound for AoE fire |

## 5. Ugly rules

**Mage**: Elemental Surge is a mana top-up with its own expiry and dice-valued amount (p32-33). Archmage: first tiered spell per encounter −1 action, −5 mana (p33). Spellshaper costs are formulas (Echo Casting 2×mana min 1; Methodical Spellweaver −2 mana for +1 action, min 1; Elemental Destruction capped at WIL) (p34). Force of Will: 1/round draw-without-replacement from a 4-row table resetting on Initiative (p35).

**The Cheat**: Initiative floor "If you roll less than 10 on Initiative, you may change it to 10" (p14). Vicious Opportunist / Feinting Attack / THAT'S Not What Happened! rewrite the Primary Die after rolling (p14-16). Distracted is a target-state predicate gating the core feature. "Creative" Accounting borrows up to INT actions from next turn with a cooldown. Cunning Strike 2/encounter with refund on save (p17). Sneak Attack scaling irregular.

**Oathsworn**: Judgment Dice are a conditionally gained, auto-spent, encounter-scoped dice pool (p38); size scales at 3/5/8/10, count at 14 and Vengeance 3. Lay on Hands is a 5×LVL variable-spend healing pool. Zealot per-attack mana spend capped at highest unlocked tier. Unending Judgment (+5 melee while no Judgment Dice) and Unerring Judgment are state-conditional. Glorious Reprieve: allies cannot drop below 1 HP, take a Wound instead; Stand Fast, Friends! grants STR+WIL temp HP on Initiative (p40-41).

**Zephyr**: Iron Defense armor = DEX+STR while unarmored, doubled at L13 (p68-69). Swift Feet +LVL Initiative while unarmored. Bursts of Speed: DEX per Initiative, +1 per Wound, +1 at L20. Unyielding Resolve ignores first N Wounds per encounter but when-Wounded triggers still fire. Reverberating Strikes +LVL to all melee; Kinetic Barrage cumulative +STR per miss per encounter; Mighty Soul buys +STR on a failed save for 1 Wound each.

## 6. Spell schools

| Class | Schools | Tier ladder |
|---|---|---|
| Mage | Fire, Ice, Lightning cantrips L1; tiered L2; Utility Spells of 1/2/3 schools at L3/6/14; subclass adds 1 Necrotic or Wind cantrip + 1 tiered at L7 | T1 L2, T2 L4, T3 L6, T4 L8, T5 L10, T6 L12, T7 L14, T8 L16, T9 L18; cantrip upgrades 5, 10, 15, 20 |
| Oathsworn | Radiant cantrips + T1 at L2; Radiant Utility picks L7, L11 | T2 L4, T3 L6, T4 L8, T5 L10, T6 L13, T7 L17 (max); upgrades 5, 10, 15, 20 |
| Cheat | none | |
| Zephyr | none; Ethereal Projection (1/day) and Infuse Strength (Hit Dice) | |

## 7. What moves in the second-printing ("3.0") playtest

Global: armor → Defense; options get Passive/N-action tags. **Mage**: no numeric changes. **Cheat**: skill swap 1/day → 1/Safe Rest; THAT'S Not What Happened becomes a Reaction; L18 gains a Key Stat Increase; Underhanded list reworked (Sunder Armor collapses to one ability; new Tangling Wire, The Setup); Cunning Strike flat +2×INT on crit. **Oathsworn**: Judgment Dice expend on next Reach attack; Zealot just +5/mana; Unstoppable Protector +2 Speed; Glorious Reprieve reworked. **Zephyr**: heaviest rework: new Momentum resource at L1; Bursts cut to 3 maneuvers; Swift Fists to L6; Iron Defense (2) at L4 = (3×STR)+DEX replacing the L13 doubling; Swift Feet to L9/L16 as +2 Speed/+2 Initiative; Reverberating Strikes, Ethereal Projection gone; Unyielding Resolve L10/13/17; Martial Master picks 8 → 5; both subclasses rebuilt on Momentum.
