# Nimble recon: license, character model, tooling, community

Date: 2026-10-18. Sources: Scott's purchased PDFs (Core Rules 2.0.3, Heroes 2.0.3, the
second-printing playtest files labelled "3.0" dated Oct 2026 with the designer's Read Me),
the free Basic Rules PDF, nimblerpg.com, the official Foundry system's source and compendium
JSON, and fan references (Nimblenomicon, Nimble Nexus). Page cites: **CR3** = Core Rules
second printing, **CR2** = Core Rules 2.0.3, **H2** = Heroes 2.0.3, **M3**/**B3** = Mage /
Berserker second-printing class PDFs.

## 1. License (decides the business model)

Nimble 3rd Party Creator License v2.0 (nimblerpg.com/pages/creators). No SRD, no Creative
Commons. Operative clause for software:

> For free online tools/wikis/apps/VTT implementations (app), you may use any and all
> published Nimble text, provided the app is completely free to use (optional donations to
> defray development/hosting costs permitted) and you include this notice prominently:
> "This [app/tool/etc.] is free to use for anyone who already owns the content, is trying the
> system out, or cannot afford to buy it right now. If you enjoy Nimble and are able, please
> support the game by purchasing the official content at nimbleRPG.com."

Required attribution on any product: "[Product Name] is an independent product published
under the Nimble 3rd Party Creator License. Nimble TTRPG © Nimble Co." No art or logo; a
compatibility logo is available. Perpetual and irrevocable except on violation; Florida law.

Consequences: a Nimble character sheet that embeds rules text **must be free**. A paid or
freemium tier would fall back to the "original product" test, which rules text fails. The
rules data can be published under the Nimble notice but cannot be relicensed (no CC-BY
equivalent). Precedent: the official Foundry system is MIT code with content under the
Nimble license.

Draw Steel Creator License (mcdmproductions.com/draw-steel-creator-license, last edit June
2026): "allows anyone to make stuff for DRAW STEEL and either publish it for free or sell it";
reuse of text, mechanics, rules, proper names permitted; no pre-approval; no art or logos;
attribution "[Product Name] is an independent product published under the DRAW STEEL Creator
License and is not affiliated with MCDM Productions, LLC. DRAW STEEL © 2026 MCDM Productions,
LLC." Software is not singled out. A paid Draw Steel sheet is on solid ground.

## 2. Edition status

The "3.0" files are the **second printing**: the designer's Read Me calls them "the (very
nearly) complete files for the reprinted Nimble core books", "pretty close to FINAL", awaiting
minor art and text clarifications, with feedback via Discord before the final print pass. Title
page: "Nimble Core Rules, Second Printing, © 2026". Core mechanics, class formulas, and sheet
layout are unchanged from 2.0.3; see section 7 for the diff. Second-printing digital PDFs are
already sold on nimblerpg.com and first-printing owners get them free. Scott: treat as
playtest, not final.

## 3. Character model (what the sheet holds)

- **Stats**: STR, DEX, INT, WIL; signed small integers, typical max +5. No scores, no
  proficiency bonus: the modifier is the stat. Each class names two Key stats and two
  Secondary. Arrays at creation: Standard +2/+2/+0/−1, Balanced +2/+1/+1/+0, Min-Max
  +3/+1/−1/−1 (CR3 p.20). "KEY" in formulas = either Key stat; "WIL d8" = roll WIL dice.
- **Skills** (10): Arcana, Examination, Lore (INT); Finesse, Stealth (DEX); Might (STR);
  Influence, Insight, Naturecraft, Perception (WIL). Skill = stat + allocated points. 4 points
  at L1, +1 per level, 1 point may move per level. Cap +10 (second printing) / +12 (2.0.3).
  Check = d20 + skill; nat 1 fails, nat 20 succeeds.
- **Saves**: d20 + stat. Each class fixes one advantaged and one disadvantaged save; ancestries
  can flip flags. Hero-caused DC = 10 + KEY.
- **Hit Points**: max = class starting HP (Mage 10, Berserker 20, Oathsworn 17, Hunter 13) +
  per-level gains (roll Hit Die with advantage, or second-printing average d4+3, d6+4, d8+5,
  d10+7, d12+8). Max HP is therefore a **history of per-level choices**, not a formula of
  level. 0 HP → 1 Wound + **Dying** (actions capped at 1, Concentration ends, attacking costs
  a Wound unless DC 10 STR save, damage while Dying = 2 Wounds, crit 3). Temp HP absorbs
  first, doesn't stack, expires at Safe Rest. Bloodied = ≤ half HP.
- **Wounds**: max **6** by default; dead at max. Recovered **1 per Safe Rest** (variant: all).
  Max modifiers: Dwarf +1, Planarbeing −2, Mighty Endurance +4, Devoted Protector +3 *while
  a chosen ally is nearby* (CR3 p.28).
- **Hit Dice**: size fixed by class (Mage d6, Berserker d12); max = level (+2 Dwarf, +1
  Survivalist). Spent in Field Rests; all restored at Safe Rest. Multiclass mixes sizes.
- **Armor / Defense**: a flat **damage reduction applied only when you spend the Defend
  reaction**; crits ignore it. Called Armor in 2.0.3, **Defense** in the second printing.
  Unarmored = DEX. Cloth 2–5 + DEX; Leather 3–6 + DEX (STR reqs); **Mail 6/9/12/15 + DEX
  (max 2)** (STR 2–4); **Plate 10/14/18/22 flat** (STR 2–5); shields +2/4/6/8 (CR3 p.33).
  Non-proficient armor: Defend costs 2 actions; non-proficient weapon cannot crit.
- **Initiative**: d20 + DEX; result sets **starting actions** (1 digit → 1, 2 digits → 2,
  20+ → 3), not turn order. Modifiers: Human +1, Elf advantage.
- **Actions**: 3 per turn, refresh at **end** of turn; reactions cost 1 action each, max 1 per
  round each, and reduce the next turn.
- **Speed** 6 (ancestry ±1/−2). **Inventory** 10 + STR slots. **Languages** Common + INT.
- **Mana**: casters only; max is a per-class formula. Mage: unlocked L2, max **(INT×3) + LVL**,
  recharges at Safe Rest; Elemental Surge grants WIL temporary mana at Initiative that expires
  at end of combat (WIL+1d4 at L10, WIL+2d4 at L17). Oathsworn WIL + LVL. Spell cost = tier;
  cantrips free; upcast up to highest unlocked tier.
- **Spells known**: no list. "You know every spell in the spell schools you know, up to the
  tier you have unlocked." 6 schools, cantrips + 9 tiers; Mage unlocks tier N at level 2N.
- **Class pools**: Berserker Fury Dice (a d4 per Rage, max KEY dice, size d6/d8/d10/d12 at
  L6/9/13/17; added to STR attacks; spendable to reduce damage by STR+DEX each; zeroed when
  Rage ends). Hunter charges. Oathsworn healing pool 5 × LVL.

## 4. Rest cycle (the "between fights" loop Scott named)

Field Rest (CR3 p.17): **Catch Breath** (≥10 min): spend any number of Hit Dice one at a
time, each heals roll + STR (negative STR subtracts). **Make Camp** (≥8 h with food and
sleep): same but each die heals its max + STR. Nothing else refreshes: no HD, no mana, no
Wounds. Overrides: Oozeling always heals max; Wild One +KEY per die in the wild; Mountainheart
Berserker may convert 10 HP of healing into 1 Wound healed.

Safe Rest (a GM-designated safe location, not a camp): restore **all HP, all HD, all mana and
class resources**, heal **1 Wound**, temp HP and Inspiration expire, 1/Safe Rest abilities
reset, level-ups happen here.

Event-driven refreshes the sheet must also model: Elemental Surge (at Initiative, expires end
of combat); Dragonborn ability recharges "whenever you gain a Wound"; Gnome reroll resets at
full HP; Fury Dice zero when Rage ends; 1/encounter and 1/round abilities; Force of Will resets
at Initiative.

## 5. Choice points

Creation: class (11, plus Hexbinder later), ancestry (6 common / 8 uncommon / 13 exotic),
background (~25, some with stat prerequisites), stat array (3) and placement, 4 skill points,
starting kit or 50 gp. Every level: +1 skill point, move 1 point, HP roll-or-average.
Class skeleton shared by all classes: **subclass at L3**, subclass features L7/11/15,
**Key stat +1 at L4/8/12/16**, **Secondary +1 at L5/9/13/17**, Epic Boon L19, capstone L20.
Class pick lists: Mage Spellshaper choose 2 of 8 at L4 (+1 at 9, 13); Berserker Savage Arsenal
1 of 14 at 4/6/8/10/12/14/16. Retraining is a downtime activity, so choices are mutable.

Mage per-level table (M3 p.4–5):

| Lvl | Gains / choices |
|---|---|
| 1 | Fire, Ice, Lightning cantrips |
| 2 | Mana (INT×3+LVL); Tier 1; Talented Researcher |
| 3 | Subclass (Control or Chaos); Elemental Mastery: Utility Spells of 1 school |
| 4 | Spellshaper: choose 2 of 8; Tier 2; +1 INT or WIL |
| 5 | Elemental Surge; +1 STR or DEX; cantrips upgrade |
| 6 | Tier 3; Elemental Mastery (2nd school) |
| 7 | Subclass feature |
| 8 | Tier 4; +1 INT or WIL |
| 9 | Spellshaper +1; +1 STR or DEX |
| 10 | Surge → WIL+1d4; Tier 5; cantrips upgrade |
| 11 | Subclass feature |
| 12 | Tier 6; +1 INT or WIL |
| 13 | Spellshaper +1; +1 STR or DEX |
| 14 | Tier 7; Elemental Mastery (3rd school) |
| 15 | Subclass feature; cantrips upgrade |
| 16 | Tier 8; +1 INT or WIL |
| 17 | Surge → WIL+2d4; +1 STR or DEX |
| 18 | Tier 9 |
| 19 | Epic Boon |
| 20 | +1 to any 2 stats; first tiered spell per encounter −1 action, −5 mana; cantrips upgrade |

## 6. The ugly rules (torture-test candidates)

1. Mail "9 + DEX (max 2)" vs Plate flat vs Cloth full DEX: armor category changes the formula.
2. Hit Die healing branches: roll vs max by rest type, + STR (sign matters), Oozeling override,
   Wild One location bonus, Mountainheart HP-to-Wound conversion.
3. Mage mana: max from two live variables; Surge adds encounter-lifetime mana inside a
   Safe-Rest pool, scaling with level.
4. Fury Dice: a pool of dice whose cap is a stat, size scales by level, added to attacks,
   spendable for mitigation, zeroed on a state transition.
5. Conditional max Wounds (Devoted Protector +3 while an ally is nearby).
6. Initiative result mapped to starting action count by digit count.
7. Mana cost modifiers: upcast ceiling, Methodical Spellweaver −2 (min 1) for +1 action,
   Archmage −5 and −1 action on the first spell per encounter.
8. Event refreshes: "recharges whenever you gain a Wound", "resets at full HP".
9. Level-up HP as a per-level history (roll or average).
10. Proficiency alters an action's cost (Defend 2 actions) or a die rule (cannot crit).
11. Dying as a state machine with class overrides (Enduring Rage: 2 actions, no save;
    Unstoppable Force: 1 Wound instead of 2).
12. Spells known = schools × unlocked tier, plus bolt-on single spells.

## 7. Second printing vs 2.0.3 (sheet-relevant)

Armor → Defense; monster armor flat −10/−20; skill cap +12 → +10; level-up HP gains an
average option; leveling at Safe Rest; Help grants reroll instead of advantage; 1/round
resets at turn end instead of start; Hide DC 15 → 10; several Berserker Savage Arsenal
reworks (Death Blow, Dismantle new, Boundless Rage 6 → 5); Wild One rewritten; Mithril →
Adamantine Plate (same numbers). Mage formulas unchanged. New optional variants.

## 8. Existing tooling

Official: PDFs only (blank, form-fillable, premades). The official Tools page (community-built)
has a Monster Builder; the **"Heroes" tab is marked COMING SOON**. No Demiplane or Roll20.
Official Foundry system (Quest Luminary, MIT code, Nimble-Co org): v0.10.0, character
creation, multiclassing, rest automation, 172 open issues, level-up still the dev's focus. Its
compendium JSON (classes, ancestries, backgrounds, boons, mana formulas such as
`(max(@intelligence,0)*3)+@level`, rule types `conditionalBonus`, `maxWounds`, `combatMana`)
is the best public reference for a complete Nimble data model.
Community web sheets, all solo-dev and free: Nimble Sheets (browser-local storage, Owlbear
extension, "certainly issues"), Nimbound (mobile views "coming soon"), Nimble Nexus
(reference + login), NimbleRPG.app (GM tracker), Nimblenomicon (rules reference, the one Sly
Flourish links). Nothing cross-device, data-driven, and level-up-aware exists outside Foundry.
No indexed complaint threads; the gap is inferred from inventory.

## 9. Community and distribution

Discord "Nimble RPG": 7,477 members, 2,098 online (Oct 18, 2026); primary beta-feedback
channel; #homebrew-projects. Subreddit exists, size unknown. Homebrew via Discord, itch.io
(Nim+ zine), Nimble Nexus. Nimble Co. structurally supports tools: free-tools license clause,
community-built official Tools page with Ko-fi credit, third-party Foundry system under their
GitHub org. Kickstarter "Monsters & More" (Mar 2026): ~6,200 backers, ~$1.06M.
Sly Flourish: started Nimble June 2026, "First Thoughts" episode June 22, community-tool
spotlight July 20, "Mid-Campaign Thoughts on Nimble" Sep 28, lists Nimble as a supported
system in *Rise of the Lazy Gamemaster*. Actively running it. Views on sheets unverified.

## 10. For the engine designer: what not to assume from 5e

- No to-hit roll, no AC. The damage roll is the attack; Defense exists only when Defend is
  spent; crits bypass it.
- Three health layers: HP (churn, Hit-Dice-healed), Wounds (slow, 6-cap, lethal, modifiable
  max), Dying (a state with its own action cap and overrides).
- Hit Dice are a between-fight currency with branching heal formulas, not a long-rest footnote.
- Rests are gated by location, not time. Field Rest heals via HD only; Safe Rest restores all
  but only 1 Wound.
- Actions are a per-turn budget of 3, pre-spent by reactions; Initiative yields a count.
- Stats are tiny signed ints reused as dice counts, DCs, language counts, inventory, mana
  factors, mitigation. No proficiency bonus anywhere.
- Resources are per-class formulas with lifetimes (encounter-scoped mana inside a Safe-Rest
  pool) and **event-driven refresh triggers**, not just short/long rest.
- Stat increases are class-scheduled and constrained (Key vs Secondary pairs), subclass always
  L3, spells known by school and tier.
- Carry a rules-version tag (first vs second printing) from day one.
