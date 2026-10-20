/** Render a document body: paragraphs, **bold**, *italic*, ## headings; `{{ expr | display }}` resolved by `resolve` or shown symbolically. */
import type { ComponentChildren } from "preact";

import { renderDisplay } from "../../src/inline.js";

/** What a plain Markdown renderer shows: display text for both spellings ({{ }} and <span data-orf>). */
export const renderSymbolic = (text: string): string => renderDisplay(text);
function inline(s: string): ComponentChildren {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith("*") ? <i key={i}>{p.slice(1, -1)}</i> : p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : p);
}
export function Prose({ text, resolve, hideSources = true }: { text: string; resolve?: (t: string) => string; hideSources?: boolean }) {
  const resolved = (resolve ?? renderSymbolic)(text);
  const blocks = resolved.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out: ComponentChildren[] = [];
  let skipping = false;
  for (const [i, b] of blocks.entries()) {
    const h = /^(#{1,3})\s+(.*)$/.exec(b.split("\n")[0]);
    if (h) {
      skipping = hideSources && /^sources$/i.test(h[2]);
      if (skipping) continue;
      out.push(<h3 key={i}>{h[2]}</h3>);
      const rest = b.split("\n").slice(1).join("\n").trim();
      if (rest) out.push(<p key={`${i}b`}>{inline(rest)}</p>);
      continue;
    }
    if (skipping) continue;
    if (b.split("\n").every((l) => /^[-•]\s/.test(l))) out.push(<ul key={i}>{b.split("\n").map((l, j) => <li key={j}>{inline(l.replace(/^[-•]\s/, ""))}</li>)}</ul>);
    else out.push(<p key={i}>{inline(b.replace(/\n/g, " "))}</p>);
  }
  return <div class="prose">{out}</div>;
}
