# Choices (draft, Phase 1)

Status: draft for the readability gate. Design context: design doc §11. Model borrowed from
Dicecloud's slots.

## 1. Class levels grant and offer

A `type: class-level` document says what reaching that level gives unconditionally
(`grants`) and what the player picks (`choices`).

```yaml
---
id: nimble.classes.mage.level-4
type: class-level
system: nimble
name: Mage, level 4
class: nimble.classes.mage
level: 4
grants: [nimble.features.mage.tier-2]
choices:
  - slot: spellshaper
    count: 2
    from: {type: feature, tags: [mage, spellshaper]}
    unique: character
  - slot: key-stat
    count: 1
    from: {options: [int, wil]}
    effect: {target: "{{ choice }}", add: 1}
---
At 4th level you learn two Spellshaper techniques and raise one Key stat.
```

| field | rule |
|---|---|
| `class` | the class document id |
| `level` | integer 1–20 |
| `grants` | document ids attached automatically when the character reaches this level |
| `choices[].slot` | a short name; the registered slot id is `<class-level id>.<slot>` |
| `choices[].count` | how many picks (integer ≥ 1) |
| `choices[].from` | either `{type, tags?}` (any document of that type carrying all the tags) or `{options: [...]}` (a literal list: stat names, school names, document ids) |
| `choices[].unique` | `slot` (no duplicates within this slot) or `character` (not picked anywhere else on the character); default `slot` |
| `choices[].effect` | an effect template applied once per pick with `choice` bound to the pick; used for stat bumps |
| `choices[].when` | optional boolean; the slot is offered only when true |

Subclass is a choice too: `{slot: subclass, count: 1, from: {type: subclass, tags: [mage]}, unique: character}` at level 3. Subclass features at 7/11/15 are `grants` on the **subclass**
document, keyed by level: `grants_by_level: {7: [...], 11: [...], 15: [...]}`.

## 2. The character records picks

```yaml
choices:
  nimble.classes.mage.level-3.subclass: [nimble.subclasses.mage.control]
  nimble.classes.mage.level-4.spellshaper: [nimble.features.mage.spellshaper.echo-casting, nimble.features.mage.spellshaper.stretch-time]
  nimble.classes.mage.level-4.key-stat: [int]
```

Picked documents are attached exactly like `grants`. A pick that is a stat name or school
name is not a document; it is consumed by the choice's `effect` or by predicates
(`knows(fire)`).

## 3. Validation

- Every key is a registered slot and belongs to a class level the character has reached.
- The list length equals `count` (fewer = incomplete character, a warning; more = error).
- Every pick satisfies `from` and `unique`.
- A document reachable only by a pick that no longer exists is not attached (retraining).

## 4. Retraining and history

Retraining is editing the character's `choices` map. The per-level `levels[]` history
(`{level, hp, source}`) is separate and append-only; it feeds `hp.max`.

## 5. Deferred

- Choices whose options depend on earlier choices beyond tag filtering (e.g. "a Utility Spell
  of a school you know"): Phase 1 encodes these with a `from.tags` that includes the school
  and notes that filtering by the character's known schools is an engine feature to add.
- Prerequisite chains between picks (Sunder Armor Heavy requires Medium): `requires: [id]` on
  the pick's document, enforced by the engine, not by the slot.
- Multiclassing UI.
