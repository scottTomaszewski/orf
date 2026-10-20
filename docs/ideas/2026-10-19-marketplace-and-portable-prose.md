# Marketplace, piracy, and portable prose (notes, 2026-10-19)

Conclusions from Scott's Discord conversations, plus the ideas that came out of discussing them.
Nothing here is decided; it is the thinking to pick up from.

## What the community said

1. Tools and formats that ease getting homebrew into the community's hands (and its tools)
   likely have value. The burden is that new tools are a lot of work.
2. Serious concern that an open data format is an on-ramp to AI consumption. Existing
   containers (Google Docs, PDF, Markdown) do not protect anyone either, but the question
   stands: can we offer anything? Encryption, DRM and licensing are probably not it.
3. Doubt that the community will adopt a common rules format.

## The audience is wider than the table GM

The sheet's first audience was a GM homebrewing for their own table. The conversations say the
audience that makes this succeed is the creator who wants to **sell** a one-shot or a compendium
of magic items for a few dollars and give buyers something more valuable than a PDF. A
marketplace is likely essential, not optional.

## Marketplace ideas

Honest premise: nothing technical stops a model from reading content once a buyer holds the
file. DRM and encryption fail and punish buyers; do not spend there. Offer value piracy does not
capture, and raise the cost of bulk scraping without pretending to stop it.

- **Buyers get the living thing.** Errata and updates land in the buyer's sheet; a pirated copy
  is a snapshot. The format already supports this: a purchase is a folder of `.md` files, and
  reloading the folder is the update path.
- **Provenance travels with the file.** `author`, `source`, `license` (and an edition or
  version) in the header of every document, shown by the sheet wherever the document appears.
  Origin is provable and attribution survives copying, which a PDF loses on the first
  screenshot. The id namespace already carries `creator.collection.item`.
- **No public bulk listing of bodies.** The marketplace lists names, summaries and previews;
  bodies are delivered per purchase. This raises scraping cost; it is not a wall.
- **Norms as terms.** A no-training clause in the marketplace terms, plus a machine-readable
  reservation key in the header (the TDM-reservation idea) for crawlers that honor it. Say
  plainly that these are norms and costs, not protection.
- **Signed provenance (later).** A creator signature over the document so a marketplace or a
  tool can verify an unmodified original. Only worth it once there is a marketplace.
- **Shape of the project.** The sheet stays account-free and local. The marketplace is a
  separate service with accounts and payments; buyers never need an account to *use* what
  they bought, only to buy and to receive updates.
- **Adoption path.** Plugins for tools people already use (an Obsidian plugin first; the
  Draw Steel Elements framework knowledge in the workspace makes that days, not weeks), not new
  apps. Every plugin makes the format worth writing for.

## Portable prose: `{{ }}` in plain Markdown editors (open)

Goal: an ORF document renders as readable prose in any Markdown editor with no plugin, and a
plugin-aware renderer resolves the live value. `{{ 1 + level | 1 + your level }}` is not
Markdown, so plain renderers show the braces. CommonMark has no inline construct that hides
data and shows text except raw HTML, so the portable form has to be HTML.

Two candidates, both keeping `{{ expr | display }}` as the short **authoring** form (the Write
view, the CLI and any marketplace export emit the portable form; the engine reads both as the
same thing):

- `<span data-orf="1 + level">1 + your level</span>` — explicit boundaries, quoted attribute
  (so `--`, `|`, quotes are all fine), nests naturally, readable by an HTML parser rather than a
  regex. Renders as plain text everywhere inline HTML is allowed; where a sanitizer strips the
  attribute, the prose survives and only the live value is lost.
- `<!--{{ 1 + level | -->1 + your level<!-- }}-->` — invisible even where tags are shown
  with odd styling, but it still needs a closing marker, the expression may not contain `--`,
  and boundaries are found by regex. The "just a prefix" simplification does not work: the
  display text must still be delimited, and nesting would be confusing.

**Decided 2026-10-19: span.** Scott verified Obsidian: reading view shows the text; Live Preview
shows the tag only while the cursor is inside it. A prefix-only comment cannot work (the display
text still needs a closing delimiter, and nesting would be confusing), which makes the span the
simpler of the two. Implemented in `src/inline.ts`: both spellings parsed, `fmt --portable` /
`fmt --short` in the CLI, Download emits portable, the Write view's Text field shows short.
Still unverified: whether GitHub's sanitizer keeps `data-*` (the prose renders either way).

Either way the Markdown-superset guarantee (design §5.4) is strengthened: a portable ORF file
reads as prose in every renderer, and nothing is lost if ORF itself disappears.
