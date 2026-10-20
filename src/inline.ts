/**
 * Inline expressions in prose, in their two spellings:
 *
 *   short     {{ expr | display }}                         what people type
 *   portable  <span data-orf="expr">display</span>         what plain Markdown renderers show as prose
 *
 * Both are the same construct. CommonMark has no inline syntax that hides data and shows text except
 * raw HTML, so the portable form is how an ORF document reads as prose in any Markdown tool with no
 * plugin (design §5.4). The Write view's Download, the CLI's `fmt --portable`, and exports emit it;
 * the engine reads either. Pure: no DOM.
 */
import { DocumentError } from "./document.js";

export interface InlineMatch { expr: string; display?: string; start: number; end: number; form: "short" | "span" }

const SPAN_RE = /<span data-orf="([^"]*)">([\s\S]*?)<\/span>/g;

const escapeAttr = (s: string): string => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeAttr = (s: string): string => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Every inline expression in `body`, in document order, with its span of the source text. Throws on unbalanced or nested short braces. */
export function findInline(body: string, startLine = 1): InlineMatch[] {
  const out: InlineMatch[] = [];
  const lineAt = (pos: number) => startLine + (body.slice(0, pos).match(/\n/g)?.length ?? 0);
  let i = 0;
  while (i < body.length) {
    const open = body.indexOf("{{", i);
    if (open === -1) break;
    const close = body.indexOf("}}", open + 2);
    const nextOpen = body.indexOf("{{", open + 2);
    const line = lineAt(open);
    if (close === -1) throw new DocumentError("<body>", `unbalanced "{{" at line ${line}`, line);
    if (nextOpen !== -1 && nextOpen < close) throw new DocumentError("<body>", `nested "{{" at line ${line}`, line);
    const inner = body.slice(open + 2, close);
    const pipe = inner.indexOf("|");
    out.push(pipe === -1 ? { expr: inner.trim(), start: open, end: close + 2, form: "short" } : { expr: inner.slice(0, pipe).trim(), display: inner.slice(pipe + 1).trim(), start: open, end: close + 2, form: "short" });
    i = close + 2;
  }
  SPAN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SPAN_RE.exec(body))) out.push({ expr: unescapeAttr(m[1]).trim(), display: m[2], start: m.index, end: m.index + m[0].length, form: "span" });
  return out.sort((a, b) => a.start - b.start);
}

/** Replace every match with `replacement(match)`, right to left so offsets stay valid. */
export function replaceInline(body: string, replacement: (m: InlineMatch) => string): string {
  let out = body;
  for (const m of [...findInline(body)].reverse()) out = out.slice(0, m.start) + replacement(m) + out.slice(m.end);
  return out;
}

/** The short spelling, everywhere. A display equal to the expression is dropped. */
export const toShort = (body: string): string => replaceInline(body, (m) => (m.display === undefined || m.display === m.expr ? `{{ ${m.expr} }}` : `{{ ${m.expr} | ${m.display} }}`));

/** The portable spelling, everywhere. Without a display, the expression text is what a plain renderer shows. */
export const toPortable = (body: string): string => replaceInline(body, (m) => `<span data-orf="${escapeAttr(m.expr)}">${m.display ?? m.expr}</span>`);

/** What a plain Markdown renderer shows: the display text, or the expression. */
export const renderDisplay = (body: string): string => replaceInline(body, (m) => m.display ?? m.expr);

/** Apply `fn` to a document's body only, leaving the frontmatter text byte-for-byte as it was. Text without a closing `---` is left alone. */
export function mapBody(text: string, fn: (body: string) => string): string {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") return text;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end === -1) return text;
  const head = lines.slice(0, end + 1).join("\n") + "\n";
  return head + fn(text.slice(head.length));
}
