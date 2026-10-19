# ORF prior-art survey: how existing engines let content modify sheet values

Date: 2026-10-18. Context: SC-451 (Open Rules Format kickoff). Question: how do mature
TTRPG tools let content (feats, spells, items, class features) modify character values
such as AC without the system knowing about that content in advance, including conditional
modifiers and stacking rules, and what expression language do they use?

Six parallel surveys: Foundry Active Effects + dnd5e, D&D Beyond homebrew Modifiers,
GURPS Character Sheet + PCGen, Dicecloud v2, expression/dice languages, and the ORF
prototype repo. Each full report follows the synthesis.

## Synthesis

### 1. Every engine converged on the same primitive: target + operation + value

| Engine | Operations | Fold |
|---|---|---|
| Foundry core | custom, multiply, add, downgrade, upgrade, override | sort by priority (default = mode × 10), apply in order; equal priority = last wins |
| Dicecloud v2 | base, add, mul, min, max, set, advantage, disadvantage, passiveAdd, fail, conditional | `(max(bases) + Σadd) × Πmul`, clamp to [largest min, smallest max], `set` wins outright, floor |
| D&D Beyond | bonus, set, set-base, stacking-bonus, + ~29 special-purpose types | bonus sums; set competes (highest); set-base is a floor; stacking-bonus adds after caps |
| PCGen | `BONUS:cat\|target\|formula\|TYPE=x[.STACK\|.REPLACE]` | typeless sums; same TYPE → highest only; `.STACK` stacks; `.REPLACE` group-sums then competes; game mode lists exempt types |
| GCS | typed feature records (attribute_bonus, skill_bonus, …) | plain sum, no stacking model (GURPS has none) |

Dicecloud's fold is the cleanest statement of what 5e needs: bases compete by max, adds
sum, set overrides. Nobody except PCGen models "same-type bonuses don't stack".

### 2. Conditions are the most-reinvented and most-broken feature

- **D&D Beyond:** the `restriction` field is free text the engine never evaluates. "While not
  wearing armor" is baked into subtype *names* (`unarmored-armor-class`). Anything the
  vocabulary didn't anticipate is unexpressible; importers regex official strings.
- **GCS:** `conditional_modifier.situation` is display text. Prereqs gate eligibility, not bonuses.
- **Foundry core:** no conditions at all. dnd5e Filters JSON, midi-qol/DAE expressions, SC
  Conditional AE (JS), and Rave5e (JSON `when`) are four independent reinventions.
- **Dicecloud:** conditions live on Toggles that gate subtrees; docs warn computed toggles
  "often create dependency loops". `equipped` is not globally referable, so "wearing armor"
  is a folk convention (a `wearingArmor` counter each armor item adds to).
- **PCGen:** `PRExxx` predicates attach directly to a bonus, compose with and/or/not, and
  are machine-evaluated. Right shape, hostile syntax.

Lesson: a `when:` predicate on the effect itself, machine-evaluable, with display text
derived from it. Expose equipment/state predicates (`equipped(armor)`) as first-class.

### 3. "Choose the highest base formula" needs a first-class construct

- dnd5e (new model): `ac.formulas` is a list of candidate `{formula, armored, shielded}`
  entries; filter by equipped state, take the max, add shield + bonus + cover. Shipped
  content still uses the legacy single-slot override, so Monk + Mage Armor = last wins.
- Dicecloud: `base` folds as max; armor items carry their own `base` effect, so unarmored
  formulas need no condition at all.
- D&D Beyond: works by accident because both are `set` subtypes; engine has `hack__` functions
  for Carapace and Integrated Protection that the schema couldn't express.
- PCGen: no construct; the 5e dataset falls back to a player-facing "AC method" chooser and
  the Pathfinder monk needs ~15 lines of boolean variable plumbing.

### 4. Open namespace beats closed vocabulary, but unknowns must fail loudly

- D&D Beyond's closed enum (33 types, 1900+ subtypes) rotted: dead entries, class-specific
  hooks (`kensei`, `eldritch-blast`), hidden context filters, no public list.
- PCGen `DEFINE`/`BONUS:VAR`, Dicecloud `variableName`, GCS `.attr` ids are open namespaces
  that let content invent derived quantities. All three resolve typos to 0 silently.
- Foundry's key discovery requires running console code against the data model.

Lesson: open, dotted variable namespace; system template publishes a registry of targetable
variables with type and allowed operations; unknown target or variable is a located error.

### 5. Stacking identity is missing everywhere

No engine implements 5e's "same-named effects don't stack". Foundry dedupes by UUID in a
UI component; Dicecloud authors avoid it structurally; DDB sums two +4 INT bonuses to 24.
PCGen's `TYPE=` is the only real stacking model. Effects need a stable `source`/stack key
and the system template needs a stacking policy (per type: sum, highest, or no-stack).

### 6. Expression language

- Nothing off the shelf has dice literals + conditionals + matching Go and TS
  implementations. CEL has Go + partial TS but no dice and programmer syntax. Nunjucks/Liquid
  have no dice and silent undefineds. Spreadsheet formulas have no shared engine (HyperFormula
  is GPL-or-pay). JS-eval approaches (GCS/goja, Templater, mathjs) are not a sandbox for
  untrusted homebrew.
- Roll20 has no `max` and no conditional; Foundry core has no ternary or comparison, so
  conditions were forced out-of-band.
- Dicecloud's three resolve levels (compile / roll / reduce) cleanly separate sheet-time
  numbers from roll-time dice.
- 5eTools inline tags (`{@dice 1d8+2|display text}`, `{@dc 15}`, `{@scaledamage …}`) are an
  annotation grammar, not an expression grammar: every tag carries its literal. That is why
  it reads well. Keep the display-text override idea.
- Recommendation: purpose-built PEG grammar in TS and Go with a shared JSON conformance
  corpus. Dice literals first-class, `+ - * /`, dotted identifiers, fixed function set
  (`floor ceil max min if`), one lookup form. Conditions are the boolean subset of the same
  grammar. Unknown identifier is a hard, located error.

### 7. The ORF prototype (Go, 12 days in Jan 2023, ~1,000 lines)

- Keep: single dot-path namespace where inputs, defaults, and derived values are the same
  kind of node with layered deep-merge; the `total = sum(prefix.*)` contribution convention
  (make it first-class, empty set = 0); formula-level `conditions` separate from expression.
- Drop: hand-written `dependencies` (parse them from expressions); goval integer semantics
  (truncating division gives wrong modifiers for odd scores below 10); hardcoded helpers.
- Correction to memory: helper functions were **not** user-definable. Exactly three exist,
  hardcoded in Go (`sum`, `max`, `getFromAll`).
- Absent: stacking, provenance, choices, versioning, prose templating, error ergonomics
  (cycle errors name no participants; a missing ref aborts the run).

### 8. Authoring UX decides adoption

- GCS (GUI editor, one maintainer) keeps a healthy library; PCGen (hand-edited LST, most
  complete rules model in the hobby) has a chronic contributor shortage.
- D&D Beyond proves non-programmers will fill in "Bonus / Magic / 2" recipe rows by the
  thousand. Its top failure is silent no-ops: a modifier saves fine and does nothing.
- Every engine's forums are full of "which key/subtype do I pick" questions.
- Lesson: validate on save, autocomplete targets from the registry, and render provenance
  ("AC 15 = 10 + DEX 3 + Unarmored Defense WIS 2") so creators can see their effect land.

### Proposed shape (for the design doc)

```yaml
effects:
  - target: ac.base          # registered variable, open namespace
    set: 10 + DEX + WIS      # expression, same grammar as {{ }}
    when: not equipped(armor) and not equipped(shield)
    source: unarmored-defense  # stack key; system policy decides stacking
```

System template owns: variable registry (types, allowed ops), fold policy per variable
(`ac.base` = max, `ac.bonus` = sum), stacking policy per source type, predicate vocabulary
(`equipped`, `has`, `level`), and the torture test that any syntax must pass.

---

## Report A: Foundry VTT Active Effects + dnd5e

### 1. Data model

An `ActiveEffect` is a child document of an Actor or Item. Fields per the API (`ActiveEffectData`, https://foundryvtt.com/api/interfaces/foundry.documents.types.ActiveEffectData.html): `name`, `img`, `description`, `changes[]`, `disabled` (default false), `duration` (`startTime/seconds/combat/rounds/turns/startRound/startTurn`), `origin` ("A UUID reference to the document from which this ActiveEffect originated"), `transfer` ("Does this ActiveEffect automatically transfer from an Item to an Actor?"), `statuses` ("Special status IDs that pertain to this effect"), `tint`, `sort`, `type`, `system`, `flags`. Each change (`EffectChangeData`, https://foundryvtt.com/api/interfaces/foundry.documents.types.EffectChangeData.html) is `{key, value, mode|type, priority, phase}`. `key` is "The attribute path in the Actor or Item data which the change modifies" (dot-notation, case-sensitive, `system.` prefix, https://foundryvtt.com/article/active-effects/); `value` is always a **string**; `priority: null` means "initialized to its default priority". V14 renamed `mode` to `type` (with `CHANGE_TYPES`/`CHANGE_PHASES` registries) and deprecated `ACTIVE_EFFECT_MODES`.

Real example, dnd5e's shipped Mage Armor (https://github.com/foundryvtt/dnd5e/blob/6.1.x/packs/_source/spells/1st-level/mage-armor.yml):

```yaml
- _id: cfwMU7LuOJ619Lny
  name: Mage Armor
  type: base
  disabled: true
  transfer: false
  origin: Compendium.dnd5e.spells.CKZTpZlxj7hjjo2H
  duration: {value: 28800, units: seconds, expiry: turnStart, expired: false}
  statuses: []
  flags: {dnd5e: {riders: {statuses: []}}}
  system:
    changes:
      - {key: system.attributes.ac.calc, value: mage, priority: null, type: override}
```

Monk Unarmored Defense and Draconic Resilience are identical except `value: unarmoredMonk` / `draconic` and `transfer: true`.

### 2. Modes / fold semantics

Constants: CUSTOM=0 ("handling provided by a system or module"), MULTIPLY=1, ADD=2 ("adds or concatenates strings"), DOWNGRADE=3 ("keeps the lower"), UPGRADE=4 ("keeps the greater"), OVERRIDE=5 ("directly replaces"). V14 adds SUBTRACT.

Precedence: all changes from all applicable effects are pooled and sorted ascending by `priority`; **default priority = mode × 10** (CUSTOM 0, MULTIPLY 10, ADD 20, DOWNGRADE 30, UPGRADE 40, OVERRIDE 50), so by default multiply runs before add, and override runs last (https://foundryvtt.wiki/en/development/guides/active-effects). Equal priorities fall back to effect order; two OVERRIDEs on one key means last wins. MULTIPLY/UPGRADE/DOWNGRADE "must be numeric"; OVERRIDE "Numeric data is overridden by numbers, while other data types are overridden by any value"; ADD on arrays appends. Core infers types heuristically from the current value and template.json. dnd5e: "Custom: Not used by dnd5e".

### 3. Conditions

**Core Foundry: none.** Only `disabled`, `isSuppressed` (system-defined, e.g. unequipped item), and `statuses` tags exist. Conditions were added at three layers:

- **dnd5e native (5.x/6.x)**: effect-level and per-change conditions using the system's Filters JSON (https://github.com/foundryvtt/dnd5e/wiki/Filters). Shape `{k, v, o}` with comparators `exact|contains|startswith|has|hasany|hasall|in|gt|gte|lt|lte` and combinators `AND|NAND|OR|NOR|XOR|NOT`. Roll-time "Rule" changes use `roll.*` keys.
- **DAE/midi-qol**: string expressions against roll data, e.g. `applyCondition=@attributes.hp.value < @attributes.hp.max`.
- **Third-party**: SC Conditional AE (JS conditions) and Rave5e, which embeds `when` JSON in the value: `{"op":"override","value":"custom","when":{"all":[{"path":"attributes.ac.equippedArmor","exists":false}]}}`.

Three independent reinventions is the tell that core lacks this.

### 4. Stacking / dedupe

- **Same spell twice**: dnd5e's chat-card applier matches an existing effect by compendium source and updates it rather than duplicating. Effects dropped manually do stack; no name-based dedupe anywhere in core.
- **Bonuses from multiple sources**: all ADD; stack additively. 5e's "same-name doesn't stack" rule is not modelled.
- **Competing AC bases**: dnd5e's `armorClass` schema has `calcs` (enabled base-formula IDs), `formulas` (list of `{formula, armored, shielded, label}`), `flat`, `bonus`, `cover`, `min`, `override`. `prepareArmorClass` filters candidates by equipped state, evaluates each, picks the greatest, then `ac.value = max(ac.min, ac.base + ac.shield + ac.bonus + ac.cover)`; `override` trumps all. Config formulas: `mage`/`draconic` `"13 + @abilities.dex.mod"`, `unarmoredMonk` `"10 + @abilities.dex.mod + @abilities.wis.mod"`. **Caveat**: shipped content still uses the legacy single-slot `ac.calc` OVERRIDE, so Monk + Mage Armor = last override wins.

### 5. Expression language

Values are strings; evaluation depends on the target field (dnd5e marks fields "Roll Data? Yes/No"). Grammar (peggy): dice `NdX` with modifiers (`kh/kl/dh/dl/r/rr/x/xo/min/max/cs/cf`), pools `{…}`, parentheses incl. `(1d20*2)d(1d10)`, `+ - * / %`, JS `Math.*` functions, `@path.to.data` substitution, `[flavor]`, `# comment`. **No ternary, comparison or boolean operators**; the Better Roll Formulas module exists to add them. dnd5e adds `@scale.<class>.<id>`, `@statuses.*`, `@prof`, `@classes.X.levels`.

### 6. Authoring UX

Sheet → Effects tab → rows of (Attribute Key, Change Mode, Effect Value). Key discovery is the headline pain: the KB tells users to run console code over the data model. Documented gotchas: formulas invisible on sheet; "Never change hp.value"; overridden scores revert on reopen; priority not exposed in the core sheet. The remedial-module ecosystem (DAE field dropdown, Autocomplete Inline Properties, DFreds Convenient Effects, SC/Rave conditions) is the clearest evidence of the gaps.

### 7. Lessons

- Right: key-path + mode + value is tiny, system-agnostic, lets content modify anything without the schema knowing; the mode×10 priority ladder gives a deterministic fold.
- Right: `transfer` + `origin` + `disabled` + suppression-by-equip separate "attached to item" from "currently in force".
- Right (dnd5e): AC as a list of candidate base formulas with applicability flags resolved by max.
- Wrong: no conditions in core, the single most-reinvented feature.
- Wrong: opaque string values whose evaluation semantics depend on the target field.
- Wrong: no identity/stacking model.
- Wrong: key discovery requires reading code; a format needs a published registry of targetable paths.
- Wrong: formula grammar lacks comparison/ternary, forcing conditions out-of-band.

---

## Report B: D&D Beyond homebrew Modifiers

### 1. Data model

A Modifier is one flat record attached to a component (feat, class feature, racial trait, item, spell). Fields (from DDB's own `character-rules-engine` and importers): `id`, `type`, `subType`, `friendlyTypeName`, `friendlySubtypeName`, `modifierTypeId`, `modifierSubTypeId`, `value`, `fixedValue`, `dice`, `statId`, `bonusTypes`, `restriction`, `duration`, `requiresAttunement`, `isGranted`, `availableToMulticlass`, `entityId`/`entityTypeId`, `componentId`/`componentTypeId`, `tagConstraints`.

```json
{ "type": "expertise", "subType": "performance",
  "friendlyTypeName": "Expertise", "friendlySubtypeName": "Performance",
  "modifierTypeId": 12, "modifierSubTypeId": 442,
  "value": null, "fixedValue": null, "dice": null, "statId": null,
  "bonusTypes": [], "restriction": "", "duration": null,
  "requiresAttunement": false, "isGranted": false,
  "availableToMulticlass": true,
  "componentId": 342, "componentTypeId": 12168134,
  "entityId": 18, "entityTypeId": 1958004211, "id": "1447" }
```

The homebrew form has ten fields: Modifier Type (dropdown), Modifier Subtype (dropdown, filtered by type), Ability Score, Dice Count, Die Type, Fixed Value, Additional Bonus Types (Proficiency Bonus, Attuned Item Count), Details (free text), Duration Interval, Duration Type. Recipe: "+2 attack & damage" = Bonus / Magic / Fixed Value 2. (Sources: https://www.dndbeyond.com/forums/dungeons-dragons-discussion/homebrew-house-rules/76031-demystifying-homebrew-updated-with-pact-hex, https://www.dndbeyond.com/posts/1103-how-to-create-a-homebrew-magic-item-using-d-d)

### 2. Modifier types

33 values: `bonus`, `set`, `set-base`, `stacking-bonus`, `resistance`, `immunity`, `vulnerability`, `proficiency`, `half-proficiency`, `half-proficiency-round-up`, `twice-proficiency`, `expertise`, `damage`, `advantage`, `disadvantage`, `sense`, `language`, `ignore`, `size`, `speed-reduction`, `carrying-capacity`, `natural-weapon`, `eldritch-blast`, `replace-damage-type`, `replace-weapon-ability`, `weapon-property`, `ignore-weapon-property`, `monk-weapon`, `kensei`, `protection`, `stealth-disadvantage`, `weapon-mastery`, `enable-feature`.

Semantics: Bonus adds; Set fixes a value and competes with other Sets (highest wins); Set Base is a floor bonuses can exceed; Stacking Bonus adds after the ability-score cap; Ignore has a tiny fixed menu (`unarmored-dex-ac-bonus`, `unarmored-while-armored`, etc.). Several dropdown entries do nothing (Favored Enemy, Protection, Speed Reduction). Staff rationale: "there aren't modifiers for options that dont exist officially".

### 3. Subtypes

Closed, enumerated, not user-extensible. Engine enum has 164 constants but live IDs run past 1900 (every skill, tool, weapon, language, damage type is its own subtype). Naming compounds the condition into the target: `armor-class`, `unarmored-armor-class`, `armored-armor-class`, `dual-wield-armor-class`, `minimum-base-armor`, `ac-max-dex-modifier`. No public list: "There is, but we do not have access to it as basic Users."

### 4. Restrictions / conditions

**`restriction` is free text the engine displays but never evaluates.** DDB's own engine uses it only for tooltip strings and as a tiebreak sort key. ddb-importer's `RestrictionRules.ts` header: "DDB carries the 'when' of a modifier in a free-text `restriction` string. The generator drops every restricted modifier by default." Community: "There's no way to enforce that." So "13 + DEX while not wearing armor" is expressed by the subtype `set/unarmored-armor-class`, not by a condition. Heavy-armor-only or concentration-only conditions are unexpressible.

### 5. Stacking rules

`ArmorClass.js` builds AC from suppliers per branch; branch-creating modifiers are `set/minimum-base-armor`, `set/unarmored-armor-class`, `ignore/unarmored-dex-ac-bonus`, `ignore/unarmored-while-armored`. Within the unarmored branch: 10 + DEX (capped) + only the single highest `set/unarmored-armor-class` + all `bonus/unarmored-armor-class`. Highest branch wins. Monk + Mage Armor resolve correctly by accident of both being Sets. Same-type `bonus` modifiers always sum (two +4 INT = 24). Engine has `hack__getSetUnarmoredModifierValue` (Integrated Protection) and `hack__deriveBonusArmorModifierValue` (Carapace) because the vocabulary couldn't express them.

### 6. Authoring UX

Dropdown-first, no preview, propagation "up to 20 minutes". Confusion: which type/subtype pair means what; Set→Armor Class silently does nothing (right answer is Set→Unarmored Armor Class + Ignore→Unarmored Dex AC Bonus). Cannot-do list: no base classes; no mundane weapons/armor; no extra spell slots; no temporary/activated effects; no per-attack-type conditional bonuses; no custom languages/proficiencies; no level-scaled magic items.

### 7. Lessons

- Target + operator + operand is a good primitive; recipe tables are learnable.
- Operator semantics must be explicit and few; confusion arises where subtype secretly changes the operator.
- Conditions must be first-class, not a string.
- Closed vocabularies rot into leaky enums.
- Branch/formula, not override, for AC-style values.
- Named-exception hacks in the engine are a smell.
- Silent no-op on save is the top UX failure; validate and preview.
- Keep display strings alongside machine form, derived from it.

---

## Report C: GURPS Character Sheet (GCS) and PCGen

### 1. GCS data model

Every trait/modifier/skill/equipment row carries a `features` array of tagged JSON objects. Types: `attribute_bonus`, `conditional_modifier`, `dr_bonus`, `reaction_bonus`, `skill_bonus`, `skill_point_bonus`, `spell_bonus`, `trait_bonus`, `weapon_bonus` and ~20 `weapon_*_bonus` variants, `cost_reduction`, etc. Shared: `LeveledAmount{amount, per_level}` and `FeatureSwitch{switchable, switched_on}`.

Targeting: attribute bonuses target by attribute id string (`"attribute": "dodge"`). Skill/spell/weapon bonuses by `selection_type` plus `{compare, qualifier}` text criteria (`is, is_not, contains, starts_with, ...`). Attribute ids are open: any library can add attributes via a `.attr` file.

Example (Combat Reflexes):
```json
"features": [
  {"type":"skill_bonus","selection_type":"skills_with_name","name":{"compare":"starts_with","qualifier":"fast-draw"},"amount":1},
  {"type":"attribute_bonus","attribute":"dodge","amount":1},
  {"type":"conditional_modifier","situation":"on all IQ rolls to wake up or to recover from surprise or mental stun","amount":6}]
```
`conditional_modifier.situation` is **free text**; GCS prints it, never evaluates it.

Expressions: attribute `base` strings, e.g. `"basic_speed": "($dx + $ht) / 4"`. Since v5.36.0 this is JavaScript (goja), with a legacy-to-JS converter (`if→iff`, `has_trait→entity.hasTrait`, `dice/roll→dice.*`, `Math.*`). Prereqs: nested `prereq_list{all, prereqs[]}` with `trait_prereq`, `attribute_prereq`, `skill_prereq`, `equipped_equipment_prereq`, `script_prereq`. Prereqs gate eligibility, not individual features. (https://github.com/richardwilkes/gcs/wiki/Scripting-Guide)

### 2. PCGen data model

Grammar: `BONUS:<category>|<group>|<formula>[|TYPE=<type>][|PRExxx]`. Categories: COMBAT (AC, TOHIT, DAMAGE), STAT, VAR, SKILL, CHECKS, HP.

Stacking: typeless bonuses always add. `TYPE=name`: only the highest of the same type counts, unless listed in the game mode's `BONUSSTACKS` (Pathfinder: `Defense.Dodge.Circumstance.Racial.NotRanged.NotFlatFooted`). `TYPE=name.REPLACE`: group-summed, then competes with the best standard bonus of that type. `TYPE=name.STACK`: stacks with itself and adds to normal types.

Conditions: any `PRExxx` appended to a BONUS gates it; `!` negates; `PREMULT:N,[a],[b]` is N-of. Example: `BONUS:COMBAT|AC|1|PRECLASS:1,Shaper=10`; `PREEQUIP:1,TYPE=Armor.Heavy`.

Variables: `DEFINE:Var|0` declares; `BONUS:VAR|Var|formula` adjusts; `PREVAREQ/LT/GTEQ` tests. Undefined variable references have no effect (silent).

Formulas (JEP): `+ - * /`, comparisons, `&& ||`, `min max floor ceil if(x,y,z) roll() var() classlevel() skillinfo() count()`; every formula truncates to integer.

Pathfinder Monk AC (cr_abilities_class.lst):
```
BONUS:COMBAT|AC|MonkACBonus|TYPE=MonkAC|PREVAREQ:MonkRestricted,0
DEFINE:MonkACBonus|0  DEFINE:MonkRestricted|0  DEFINE:MonkHasArmor|0
BONUS:VAR|MonkACBonus|min((MonkACLVL)/4,5)|TYPE=level
BONUS:VAR|MonkRestricted|MonkHasArmor+MonkIsEncumbered+MonkHasShield|TYPE=Boolean
BONUS:VAR|MonkHasArmor|1|PREVARGTEQ:var("COUNT[EQTYPE.ARMOR.EQUIPPED]"),1
```
5e Unarmored Defense is a player-chosen "Armor Class Method" ability category; the default method is `BONUS:VAR|AC_Total|AC_Base+AC_Armor+AC_Shield`.

### 3. Comparison

- Extensible targets: both open string ids. PCGen more extensible (new derived quantities via DEFINE).
- Conditions: PCGen machine-evaluated `PRExxx` on every bonus (right shape). GCS none evaluated.
- Stacking: GCS none. PCGen full typed model, the most faithful d20 stacking implementation.
- Set-base overrides: neither has one. PCGen's 5e data falls back to a manual chooser.

### 4. Authoring UX

GCS: GUI Detail Editor; friction centers on free-text conditionals and the old expression syntax. PCGen: tab-delimited text, "daunting to look at"; chronic contributor shortage; parser hazards ("avoid MIN and MAX in variable names"; `CHAMIN3` parsed as `min(CHA,3)`).

### 5. Lessons

- Typed bonuses + explicit stacking policy are worth it.
- Conditions must be data, not prose.
- Open variable namespaces are the real extensibility mechanism, but undefined must not be silent 0.
- "Choose the highest base calculation" needs a first-class construct.
- Pick a real, documented expression grammar from the start; both projects had painful migrations.
- Specify evaluation order and types up front (PCGen truncates per tag).
- Target by stable id, match by criteria.
- Sandbox and bound scripts if allowed.
- Authoring tooling decides adoption.

---

## Report D: Dicecloud v2

### 1. Property tree model

A creature is one forest of properties. 29 types including action, attribute, buff, class, classLevel, constant, container, damage, effect, feature, folder, item, note, pointBuy, proficiency, propertySlot, reference, roll, savingThrow, skill, spell, toggle, trigger. Only attribute, skill, constant, class/classLevel, toggle, and action carry a `variableName`.

The tree does not scope effects: an active Effect applies sheet-wide to every variable it names. The tree governs activeness only: a subtree is inactive if an ancestor is disabled, an unequipped item, or an action/spell (children apply only when it fires). Duplicate `variableName`s: the last in tree order defines; earlier ones become base-value contributors.

Monk Unarmored Defense: Feature → child Effect `{operation: 'base', stats: ['armor'], calculation: '10 + dexterity.modifier + wisdom.modifier'}`. No condition needed: armor items carry their own `base` effect, which goes inactive when unequipped, and `base` folds as max.

### 2. Effect operations and fold order

Operations: `base, add, mul, min, max, set, advantage, disadvantage, passiveAdd, fail, conditional`.

```
result = (max(definingBase, effectBase) + Σadd) × Πmul
result = clamp(result, largestMin, smallestMax)
if any set: result = largestSet
floor() unless attribute.decimal
```
No named-source dedup; two `+2 armor` adds both apply.

### 3. Conditions and toggles

A Toggle has `enabled`/`disabled` or a `condition` calculation; all descendants deactivate when falsy. Toggles can `targetByTags`. Items have `equipped` but no variableName, so `equipped` is not globally referable; the idiom is a `wearingArmor` utility attribute each armor item adds to. Docs: calculated toggles "often create dependency loops that can be difficult to troubleshoot".

### 4. Calculation language

Nearley grammar. Precedence low to high: `?:`, `||`, `&&`, equality, comparison, `+ -`, `%`, `* /`, `NdM` (either side an expression), `^`, unary, calls, 1-indexed arrays, dotted paths. Functions: `abs sqrt max min round floor ceil trunc sign tableLookup resolve dropLowest dropHighest reroll explode`. Undefined names resolve to 0 silently. Prefixes: `#type` nearest ancestor, `~name` action-scoped locals. Three resolve levels `compile | roll | reduce`: sheet fields compile with dice kept symbolic (`{monk.level}d8` → `4d8`), rolled when an action fires. Dependency graph DFS; back-edge reported as `dependencyLoop` with shortest path.

### 5. Choices (Slots)

A Slot has `slotType`, `slotTags` + `extraTags[{OR|NOT}]`, `quantityExpected` (calc; 0 = unlimited), `slotCondition`, `unique: uniqueInSlot|uniqueInCreature`, `hideWhenFull`. Library nodes set `fillSlots`, `libraryTags`, `slotFillerType`, `slotQuantityFilled`, `slotFillerCondition` (UI filter only). Filling deep-copies the library subtree; nothing stays linked. Fighting Style: ClassLevel 1 contains Slot `{slotType:'feature', slotTags:['fightingStyle'], quantityExpected:1, unique:'uniqueInCreature'}`; library Feature "Defense" `{fillSlots, libraryTags:['fightingStyle','fighter']}` with Effect `add 1 → armor` under Toggle `condition: wearingArmor`.

### 6. Authoring UX

Per-property forms; no text format. Library creation requires Patreon. Author: setup "takes a little longer than just filling it in on a paper character sheet". Player blog: "I don't know what most of it means." Library authors evolved folk interop norms (compatibility tags, `*_installed` constants, README variable lists).

### 7. Lessons

- Open variable namespace + typed operations is the right core.
- `base = max` elegantly solves "choose highest AC formula" without conditions.
- No source-identity dedup is a real gap.
- Activeness-as-tree-position is readable but makes "is X equipped?" unreferable; expose it.
- Computed toggles are the loop factory; prefer declarative conditions on the effect.
- Three resolve levels cleanly separate sheet-time from roll-time.
- Undefined → 0 silently hides typos.
- Full genericity costs: per-creature recompute, deep-copied content with no upgrade path, no textual serialization.
- Slots are a strong, portable choice model; weakness is filler conditions as UI hints.

---

## Report E: Expression and dice languages

### Comparison table

Readability = how a non-programmer 5e homebrewer reads a `floor(level/2)`-class expression, 1 (hostile) to 5 (obvious).

| Candidate | Arithmetic | Conditionals | Dice | Lookups | Go | TS/JS | License | Read |
|---|---|---|---|---|---|---|---|---|
| Jinja2 / Nunjucks | inline | `a if cond else b` | no | attr access | pongo2 (Django-syntax) | Nunjucks BSD-2 | BSD-3 | 4 |
| Liquid | filters only | `{% if %}` blocks | no | attr access | osteele/liquid MIT | LiquidJS | MIT | 3 |
| Mustache / Handlebars | none | truthiness only | no | path access | ports | yes | MIT | 2 |
| Roll20 formulas | `+ - * /`, floor/ceil/round/abs; no `max` | none | full | `@{attr}` | no | dice-roller-parser MIT | proprietary | 3 |
| Foundry | all `Math.*` | none in core | full | `@path` | no | core | proprietary | 3 |
| Dice notation | basic | no | yes; no published standard | no | several MIT | rpg-dice-roller | MIT | 4 / 2 |
| Spreadsheet | yes | `IF()` | no | `VLOOKUP` | nothing shared | HyperFormula GPL-or-pay | mixed | 4 |
| CEL | yes | `?:` | no | map/list | cel-go Apache-2 | cel-js MIT, partial | Apache-2 | 3 |
| expr-lang/expr | yes | `?:`, `if/else` | no | `get()` | MIT | none | MIT | 3 |
| govaluate | yes | `?:` | no | fns | archived 2025 | no | MIT | 3 |
| Jexl | yes | `?:` | no | filters | no | MIT | MIT | 3 |
| mathjs | rich | `?:` | no | matrices | no | Apache-2, sandbox caveats | Apache-2 | 4 |
| JSONata / jq | yes | `?:` | no | path queries | MIT | yes | MIT | 2 / 1 |
| Dataview inline | yes | `choice()` | no | inline fields | no | Obsidian-only | MIT | 3 |
| Obsidian Dice Roller | `+ - * / ^` | no | full | tables via block refs | no | plugin MIT | MIT | 4 |
| GCS | full JS via goja | JS | no | JS | Go host | n/a | MPL-2 | 2 |
| pf2e rule elements | `floor max min clamp` | `ternary()`, `match/when` | Foundry dice | `@` paths | no | TS | Apache-2 | 2 |

Other purpose-built formats: Lancer Comp/Con and Datasworn are static JSON; RPGXchange is unreleased with no formula syntax; Fantasy Statblocks regex-scans prose for `+15 to hit`; Templater is arbitrary JS; Obsidian Properties are flat typed YAML.

### 5eTools inline tags

Shape: `{@tag arg|arg|...}`, pipe-separated positional args, braces nest. Computational tags: `{@dice 1d20+2|display text|roller name}` (display defaults to the roll; `1d6;2d6` offers alternatives); `{@damage 1d12+3}`; `{@hit +7}` / `{@d20 -4}`; `{@dc 15|display}`; `{@chance 50|…}`; `{@scaledamage 2d6;3d6|2-9|1d6}` and `{@scaledice …}` (the only lookup-like construct, hard-coded to spell-level scaling); `{@recharge 4|m}`, `{@hitYourSpellAttack}`, `{@dcYourSpellSave}`; content links `{@spell tiny servant|xge|text}`. 5eTools never computes from character state; every tag carries its literal. It is an annotation grammar, not an expression grammar, which is why it reads well.

### Roll20 and Foundry dialects

Roll20: `[[1d8+@{strength_mod}]]`, `?{Bonus|0}` queries, `%{ability}`; modifiers `kh dl r ro ! !! !p >N f dF`, grouped `{1d20,10}kh1`; math `floor ceil round abs` only. Foundry: `@data.path` substitution, all `Math` methods, pools `{4d6,3d8}kh`, modifiers `r rr x xo k kh kl d dh dl min max cs cf df sf ms even odd`, inline `[[2d12]]`, deferred `[[/r 1d10]]`, labels `{text}`. Core has no ternary; pf2e bolts on `ternary()/gte()/match()` and a JSON predicate language that authors find opaque.

### Recommendation

1. **Purpose-built mini-language (pick).** PEG grammar in TS and Go: dice literals first-class (`1d10`, `4d6kh3`), `+ - * /`, dotted identifiers, fixed function set `floor ceil max min if(cond, a, b)`, one lookup form `table.spell_slots[level][3]`. Conditions are the boolean subset. Unknown identifier is a hard, located error. Against: you own two parsers and a conformance suite forever. Mitigate with a shared JSON test-vector corpus and a frozen spec.
2. **CEL plus a dice extension.** Ternary, typed checking, Go reference impl. Against: dice aren't literals; programmer syntax; the only mature TS implementation covers "most of the CEL spec".
3. **Spreadsheet-function dialect.** Against: no shared engine exists so you write the parser anyway; nested IF is unreadable; SHOUTING names look wrong mid-sentence.

Don't use Nunjucks/Liquid for `{{ }}` (no dice, silent undefineds, no Go twin) and don't use JS-eval approaches as the sandbox for untrusted homebrew.

---

## Report F: The ORF prototype (github.com/scottTomaszewski/orf)

### 1. Shape

Go 1.19 module; deps `maja42/goval` (expressions), `philopon/go-toposort`, zap, yaml.v3, testify. No README, no CI, MIT. 48 commits over 12 days (2023-01-21 to 2023-02-01), nothing since. ~1,000 lines Go (340 logging boilerplate), ~600 lines rules data, a 2.8 MB compiled binary accidentally committed. Implemented end to end: load → merge → toposort → evaluate → dump JSON.

### 2. Data format

JSON or YAML files with a `variables` nested map and a `formulas` list of `{ref, dependencies[], conditions[], expression}`, all in one dot-path namespace.

```yaml
formulas:
   -  ref: armor_class.unarmored
      dependencies:
         - ability.modifier.dexterity
      expression: 10 + ability.modifier.dexterity
   -  ref: armor_class.modifier.barbarian
      dependencies:
         - ability.modifier.constitution
         - class.barbarian.level
      conditions:
         - class.barbarian.level > 0
      expression: ability.modifier.constitution
```

Load order: formulas dir → defaults dir → character file, deep-merge last wins. Wildcards `*` allowed in dependencies, including mid-path (`class.*.level`). goval expressions, integer-only in practice. **Helper functions are not user-definable**: exactly three, hardcoded in Go (`sum`, `max`, `getFromAll`).

### 3. Engine

Edges come only from hand-written `dependencies`, not parsed from expressions. One global toposort, one linear pass. Cycle → opaque error naming no participants. Dependency on a nonexistent ref is silently dropped; the expression then fails at eval time, aborting the whole run. Conditionals: inline ternary, or formula-level `conditions` (all must be true, else the formula is skipped and its ref never exists).

Contributions from other files: the one real idea. Convention `total = sum(<prefix>)` depending on `<prefix>.*`; any file can add `<prefix>.<source>`. Skills use it. Skipped-by-condition contributors vanish cleanly. But `armor_class.total` was never written (author stopped mid-experiment); had it been, it would crash when no contributor exists because the map is never created. No stacking/typed-bonus semantics.

Footgun: Go integer division truncates toward zero, so score 9 gives modifier 0, not -1.

### 4. Templating

None. No `{{ }}`, no prose, no rendering.

### 5. Choices / mutable state

Confirmed absent.

### 6. Tests

One golden test (`TestBob`). D&D 5e fixtures: ability modifiers, multiclass level via wildcard + `getFromAll`, proficiency, saves, 18 skills, passives, speeds (`max` of variants), unarmored AC contributors.

### 7. Verdict

- Keep: single dot-path namespace with layered deep-merge overrides; the open-contribution pattern (make first-class, empty = 0); formula-level `conditions` separate from expression.
- Drop: hand-written `dependencies`; goval/Go-int semantics; hardcoded helpers; one-shot global toposort.
- Missing: typed bonuses, provenance, max-vs-sum policy per variable, stacking rules, choice modeling, versioning, prose annotation, error ergonomics (partial results with per-variable diagnostics).
