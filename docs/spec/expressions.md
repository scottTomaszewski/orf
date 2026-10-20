# Expression and condition language (draft, revised 2026-10-18)

Status: implemented in `src/expr/` (parser, evaluator, values); pinned by the language-neutral corpus
`conformance/expressions.json` (run by `src/expr/conformance.test.ts`). Changes go through the corpus first.
Design context: `../superpowers/specs/2026-10-18-open-rules-format-design.md` §7.

One grammar serves three places: `{{ }}` inline in prose and property values, effect operation
values (`add: 2 + str`) and lookup rows, and conditions (`when:`), which are the boolean subset.
Level ladders are not written in this grammar at all: use a lookup
(`effects-and-resources.md` §2).

ORF is a superset of Markdown (design §5.4): a `{{ expr | display }}` span in a plain Markdown tool
is just text, so the display form exists to keep documents readable there. Prefer it whenever the
raw expression would read badly.

## 1. Lexical

| token | form | notes |
|---|---|---|
| integer | `0`, `12` | no floats in this phase |
| dice | `1d6`, `2d4`, `d8`, `4d6kh3`, `4d6kl1`, `2d20dh1`, `2d20dl1` | `NdM` with optional keep-highest / keep-lowest / drop-highest / drop-lowest and a count |
| identifier | `dex`, `wounds.max`, `skill.stealth.points` | lowercase dotted: `[a-z][a-z0-9_]*(.[a-z][a-z0-9_]*)*` |
| alias | `DEX`, `KEY`, `LVL` | upper case, declared on a variable by the system template; resolves to its variable |
| scoped | `this.strength_requirement` | an instance property of the document the expression lives in (items) |
| current | `mana.current`, `wounds.current` | the current value of a resource |
| string | `"nimble.tables.starting-gold"`, `"gold"` | only as function arguments: table ids and column names |
| engine words | `key`, `secondary`, `choice`, `equipped`, `carried` | provided by the engine in the contexts that define them (§5) |
| keywords | `and`, `or`, `not`, `true`, `false` | |

Nimble's "WIL d8" (roll WIL dice of d8) is `dice(wil, 8)`; the grammar also accepts `wil d8` as
sugar for it.

## 2. Operators, lowest to highest precedence

1. `or`
2. `and`
3. `not` (unary)
4. `<  <=  >  >=  ==  !=`
5. `+  -`
6. `*  /`
7. unary `-`
8. call `f(a, b)`
9. parentheses

`/` on integers rounds per the **target variable's** `rounding`; where there is no target (`{{ }}`
in prose, a `when`), the system's default rounding applies (Nimble and 5e: floor). Division
where either operand contains dice is an error. Comparison of dice is an error. `and`/`or`
operate on booleans only; a number is not a boolean.

## 3. Functions

Built-in, always available:

| function | meaning |
|---|---|
| `floor(x)`, `ceil(x)`, `round(x)`, `abs(x)` | arithmetic |
| `max(a, b, ...)`, `min(a, b, ...)` | at least two arguments |
| `if(cond, a, b)` | both branches typed alike |
| `dice(count, sides)` | a dice value; `count` may be an expression (`dice(wil, 8)`) |
| `table("id", row_key, "column")` | lookup in a system table: the row whose first column equals `row_key`, returning `column`. Table id and column are quoted strings. Missing row = error. |

System templates may add **helpers** (`type: functions`), each defined as an expression over
this grammar with named arguments. Content documents cannot define functions.

## 4. Predicates

Boolean functions declared by the system template (`type: predicates`), each with a closed
argument vocabulary the linter checks:

| predicate | Nimble vocabulary |
|---|---|
| `equipped(kind)` | `armor shield weapon cloth leather mail plate` |
| `equipped`, `carried` (bare) | **item documents only**: this item is worn/wielded, or is in the inventory |
| `has("id")` | a quoted document id (ids contain hyphens, which identifiers cannot) |
| `level(class)` | a class short name; returns an integer, so `level(mage) >= 2` |
| `proficient(thing)` | `armor weapon` and armor categories |

State booleans are ordinary boolean variables readable anywhere: derived ones have a formula
(`bloodied`), engine-maintained ones are set by the system module (`dying`), and player-toggled
ones are plain state (`in_wilderness`, `ally_nearby`, `raging`, `concentrating`). Prefer a
formula to a flag whenever the state can be computed.

## 5. Where expressions live

| place | extra words available | result type |
|---|---|---|
| `{{ }}` in body or property | none | number, dice, or text |
| effect `base/add/mul/at_least/at_most/set`, lookup `by` and row values | `choice` (the picked option, in a choice's `effect`) | number or dice |
| effect `when`, resource `when`, choice `when` | `equipped`, `carried` on item documents | boolean |
| variable `formula` (or lookup) | none | number, dice, or boolean |
| resource `max` | none | number |

## 6. Rendering `{{ }}`

- **Symbolic** (reader): each identifier is replaced by its registry display name
  (`{{ 1d6 + str }}` → "1d6 + your Strength"); dice and literals print as written; operators
  print with spaces; `floor(x / 2)` prints as "half of x, rounded down" via a fixed phrase table
  for the built-ins.
- **Resolved** (sheet, compile phase): identifiers are substituted with the character's values,
  arithmetic between literals folds, dice stay symbolic (`{{ dice(wil, 8) }}` → `2d8`), and the
  result carries provenance.
- **Display override**: `{{ expr | text }}` renders `text` symbolically and the resolved value
  on a sheet. Use it when the generated phrase would read badly.
- **Portable spelling** (decision, Scott, 2026-10-19): the same construct may be written as
  `<span data-orf="expr">display</span>`. CommonMark has no inline syntax that hides data and
  shows text except raw HTML, so this is how a document reads as prose in any Markdown tool with
  no plugin: Obsidian's reading view and GitHub show `display`; Obsidian's Live Preview shows the
  tag only while the cursor is inside it. The two spellings are equivalent everywhere: the engine
  resolves both, the linter checks both, `fmt --short` / `fmt --portable` convert a file either
  way (`src/inline.ts`), and the sheet's Download emits the portable form while its Text field
  shows the short one. Quotes in the expression are attribute-escaped (`&quot;`). Without a
  display the expression text stands in. Spans do not nest.

## 7. Evaluation phases

**Compile**: variables → values, contributions folded, dice kept symbolic. Sheets display this.
**Roll**: a consumer rolls the remaining dice when the player acts. The engine never rolls on
its own; where a system procedure needs a roll (Catch Breath), the system module asks the
consumer for it.

## 8. Errors

All carry document path and, where the expression came from a body, the line.

- unknown identifier / alias / predicate argument / function / table
- type mismatch (`dice < 3`, `"x" + 1`, `and` on a number)
- division involving dice
- cycle between variable formulas (every member named)
- unknown op on a target; op not allowed by the variable
- `set` shadowing other contributions (warning, with the shadowed sources)

Unknown names never resolve to zero.

## 9. Deliberately absent

Loops, assignment, user-defined functions in content, event handlers or any other
sequencing, string manipulation, regular expressions, host-language escape hatches, floats,
implicit boolean coercion.

## 10. PEG (draft)

```peg
Expr        <- OrExpr
OrExpr      <- AndExpr ( __ "or" !IdChar __ AndExpr )*
AndExpr     <- NotExpr ( __ "and" !IdChar __ NotExpr )*
NotExpr     <- "not" !IdChar __ NotExpr / CmpExpr
CmpExpr     <- AddExpr ( _ CmpOp _ AddExpr )?
CmpOp       <- "<=" / ">=" / "==" / "!=" / "<" / ">"
AddExpr     <- MulExpr ( _ ("+" / "-") _ MulExpr )*
MulExpr     <- Unary ( _ ("*" / "/") _ Unary )*
Unary       <- "-" _ Unary / Primary
Primary     <- Call / DiceSugar / Dice / Integer / String / Bool / Ident / "(" _ Expr _ ")"
# Word operators and keywords end at a word boundary: `nothing` is an identifier, not `not hing`;
# `true_damage` is an identifier, not `true` + junk. Word operators require surrounding whitespace.
Call        <- Name _ "(" _ Args? _ ")"
Args        <- Expr ( _ "," _ Expr )*
DiceSugar   <- Ident _ "d" Digits                 # wil d8  ==  dice(wil, 8)
Dice        <- Digits? "d" Digits KeepDrop?
KeepDrop    <- ("kh" / "kl" / "dh" / "dl") Digits?
Integer     <- Digits
Digits      <- [0-9]+
String      <- '"' [^"]* '"'
Bool        <- ("true" / "false") !IdChar
Ident       <- Alias / Scoped / Name
Alias       <- [A-Z] [A-Z0-9_]*
Scoped      <- "this." Name
Name        <- [a-z] [a-z0-9_]* ( "." [a-z] [a-z0-9_]* )*
_           <- [ \t]*
__          <- [ \t]+
IdChar      <- [A-Za-z0-9_.]
```

Keywords (`and or not true false`) are excluded from `Name`.
