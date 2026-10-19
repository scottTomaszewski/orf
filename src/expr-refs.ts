import { DocumentError } from "./document.js";

export interface InlineExpression { expr: string; display?: string; line: number }

const KEYWORDS = new Set(["and", "or", "not", "true", "false"]);
const DICE_RE = /\b\d*d\d+(?:(?:kh|kl|dh|dl)\d*)?\b/g;
const NUMBER_RE = /\b\d+(?:\.\d+)?\b/g;
const STRING_RE = /"[^"]*"/g;
const IDENT_RE = /[A-Za-z_][A-Za-z0-9_.]*/g;

/** Find every `{{ expr }}` / `{{ expr | display }}` in a body. Throws on unbalanced or nested braces. */
export function extractInlineExpressions(body: string, startLine: number): InlineExpression[] {
  const out: InlineExpression[] = [];
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
    if (pipe === -1) out.push({ expr: inner.trim(), line });
    else out.push({ expr: inner.slice(0, pipe).trim(), display: inner.slice(pipe + 1).trim(), line });
    i = close + 2;
  }
  return out;
}

export interface References {
  /** Every identifier token that is not a call name, in order of first appearance (call arguments included). */
  identifiers: string[];
  /** Every call with the identifier tokens and the quoted strings directly inside its parentheses. */
  calls: { name: string; args: string[]; strings: string[] }[];
}

export function extractReferences(expr: string): References {
  // Keep string positions (blanked) so call spans still line up with the original text.
  const cleaned = expr.replace(STRING_RE, (s) => " ".repeat(s.length)).replace(DICE_RE, (s) => " ".repeat(s.length)).replace(NUMBER_RE, (s) => " ".repeat(s.length));
  const identifiers: string[] = [];
  const calls: { name: string; args: string[]; strings: string[] }[] = [];
  const seen = new Set<string>();
  const scan = /[A-Za-z_][A-Za-z0-9_.]*/g;
  let m: RegExpExecArray | null;
  while ((m = scan.exec(cleaned)) !== null) {
    const tok = m[0];
    if (KEYWORDS.has(tok)) continue;
    const after = cleaned.slice(m.index + tok.length);
    const paren = after.match(/^\s*\(/);
    if (paren) {
      // find the matching close paren
      let depth = 0;
      let j = m.index + tok.length + paren[0].length - 1;
      let end = -1;
      for (; j < cleaned.length; j++) {
        if (cleaned[j] === "(") depth++;
        else if (cleaned[j] === ")") { depth--; if (depth === 0) { end = j; break; } }
      }
      const argStart = m.index + tok.length + paren[0].length;
      const argText = end === -1 ? cleaned.slice(argStart) : cleaned.slice(argStart, end);
      const rawArgText = end === -1 ? expr.slice(argStart) : expr.slice(argStart, end);
      const args = (argText.match(/[A-Za-z_][A-Za-z0-9_.]*/g) ?? []).filter((a) => !KEYWORDS.has(a) && !new RegExp(`${a.replace(/\./g, "\\.")}\\s*\\(`).test(argText));
      const strings = (rawArgText.match(/"[^"]*"/g) ?? []).map((q) => q.slice(1, -1));
      calls.push({ name: tok, args, strings });
      continue;
    }
    if (!seen.has(tok)) { seen.add(tok); identifiers.push(tok); }
  }
  return { identifiers, calls };
}
