import { ParseError, type BinaryOp, type Expr, type KeepMode } from "./ast.js";
export { ParseError } from "./ast.js";

type Tok =
  | { t: "int"; v: number; pos: number }
  | { t: "dice"; count: number; sides: number; keep?: { mode: KeepMode; n: number }; pos: number }
  | { t: "ident"; v: string; pos: number }
  | { t: "string"; v: string; pos: number }
  | { t: "kw"; v: "and" | "or" | "not" | "true" | "false"; pos: number }
  | { t: "op"; v: string; pos: number }
  | { t: "eof"; pos: number };

const KEYWORDS = new Set(["and", "or", "not", "true", "false"]);
const DICE_RE = /^(\d*)d(\d+)(?:(kh|kl|dh|dl)(\d*))?(?![A-Za-z0-9_.])/;
const IDENT_RE = /^(?:[A-Z][A-Z0-9_]*|this\.[a-z][a-z0-9_]*|[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*)/;

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(DICE_RE))) {
      const keep = m[3] ? { mode: m[3] as KeepMode, n: m[4] ? Number(m[4]) : 1 } : undefined;
      out.push({ t: "dice", count: m[1] ? Number(m[1]) : 1, sides: Number(m[2]), keep, pos: i });
      i += m[0].length; continue;
    }
    if ((m = rest.match(/^\d+(?![A-Za-z_])/))) { out.push({ t: "int", v: Number(m[0]), pos: i }); i += m[0].length; continue; }
    if (/^\d/.test(rest)) throw new ParseError(`malformed number "${rest.match(/^\S+/)![0]}"`, i);
    if (ch === '"') {
      const end = src.indexOf('"', i + 1);
      if (end === -1) throw new ParseError("unterminated string", i);
      out.push({ t: "string", v: src.slice(i + 1, end), pos: i }); i = end + 1; continue;
    }
    if ((m = rest.match(IDENT_RE))) {
      const v = m[0];
      if (KEYWORDS.has(v)) out.push({ t: "kw", v: v as "and" | "or" | "not" | "true" | "false", pos: i });
      else out.push({ t: "ident", v, pos: i });
      i += v.length; continue;
    }
    if ((m = rest.match(/^(<=|>=|==|!=|[-+*/<>(),])/))) { out.push({ t: "op", v: m[0], pos: i }); i += m[0].length; continue; }
    throw new ParseError(`unexpected character "${ch}"`, i);
  }
  out.push({ t: "eof", pos: src.length });
  return out;
}

class Parser {
  private k = 0;
  constructor(private toks: Tok[]) {}
  private peek(): Tok { return this.toks[this.k]; }
  private next(): Tok { return this.toks[this.k++]; }
  private isOp(v: string): boolean { const t = this.peek(); return t.t === "op" && t.v === v; }
  private isKw(v: string): boolean { const t = this.peek(); return t.t === "kw" && t.v === v; }
  private expectOp(v: string): void {
    const t = this.next();
    if (t.t !== "op" || t.v !== v) throw new ParseError(`expected "${v}"${t.t === "eof" ? "" : ` but found ${describe(t)}`}`, t.pos);
  }

  parseExpr(): Expr { return this.parseOr(); }
  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.isKw("or")) { const { pos } = this.next(); left = { kind: "binary", op: "or", left, right: this.parseAnd(), pos }; }
    return left;
  }
  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.isKw("and")) { const { pos } = this.next(); left = { kind: "binary", op: "and", left, right: this.parseNot(), pos }; }
    return left;
  }
  private parseNot(): Expr {
    if (this.isKw("not")) { const { pos } = this.next(); return { kind: "unary", op: "not", arg: this.parseNot(), pos }; }
    return this.parseCmp();
  }
  private parseCmp(): Expr {
    const left = this.parseAdd();
    const t = this.peek();
    if (t.t === "op" && ["<", "<=", ">", ">=", "==", "!="].includes(t.v)) {
      this.next();
      return { kind: "binary", op: t.v as BinaryOp, left, right: this.parseAdd(), pos: t.pos };
    }
    return left;
  }
  private parseAdd(): Expr {
    let left = this.parseMul();
    while (this.isOp("+") || this.isOp("-")) { const t = this.next() as { v: string; pos: number }; left = { kind: "binary", op: t.v as BinaryOp, left, right: this.parseMul(), pos: t.pos }; }
    return left;
  }
  private parseMul(): Expr {
    let left = this.parseUnary();
    while (this.isOp("*") || this.isOp("/")) { const t = this.next() as { v: string; pos: number }; left = { kind: "binary", op: t.v as BinaryOp, left, right: this.parseUnary(), pos: t.pos }; }
    return left;
  }
  private parseUnary(): Expr {
    if (this.isOp("-")) { const { pos } = this.next(); return { kind: "unary", op: "-", arg: this.parseUnary(), pos }; }
    return this.parsePrimary();
  }
  private parsePrimary(): Expr {
    const t = this.next();
    switch (t.t) {
      case "int": return { kind: "int", value: t.v, pos: t.pos };
      case "string": return { kind: "string", value: t.v, pos: t.pos };
      case "dice": return { kind: "dice", count: t.count, sides: t.sides, keep: t.keep, pos: t.pos };
      case "kw":
        if (t.v === "true" || t.v === "false") return { kind: "bool", value: t.v === "true", pos: t.pos };
        throw new ParseError(`unexpected "${t.v}"`, t.pos);
      case "ident": {
        if (this.isOp("(")) {
          this.next();
          const args: Expr[] = [];
          if (!this.isOp(")")) {
            args.push(this.parseExpr());
            while (this.isOp(",")) { this.next(); args.push(this.parseExpr()); }
          }
          this.expectOp(")");
          return { kind: "call", name: t.v, args, pos: t.pos };
        }
        // dice sugar: `wil d8` — a bare d-dice token (count 1, no explicit count) right after an identifier
        const n = this.peek();
        if (n.t === "dice" && n.count === 1 && !n.keep && this.toks[this.k].pos > 0 && /^d\d+$/.test(sliceTok(n))) {
          this.next();
          return { kind: "diceSugar", count: { kind: "ident", name: t.v, pos: t.pos }, sides: n.sides, pos: t.pos };
        }
        return { kind: "ident", name: t.v, pos: t.pos };
      }
      case "op":
        if (t.v === "(") { const e = this.parseExpr(); this.expectOp(")"); return e; }
        throw new ParseError(`unexpected "${t.v}"`, t.pos);
      case "eof":
        throw new ParseError("unexpected end of expression", t.pos);
    }
  }
  finish(): void {
    const t = this.peek();
    if (t.t !== "eof") throw new ParseError(`unexpected ${describe(t)}`, t.pos);
  }
}

let currentSrc = "";
function sliceTok(t: Tok): string {
  // the raw text of a dice token, used to tell `d8` (sugar-eligible) from `1d8`
  const m = currentSrc.slice(t.pos).match(/^\d*d\d+(?:(?:kh|kl|dh|dl)\d*)?/);
  return m ? m[0] : "";
}
function describe(t: Tok): string {
  switch (t.t) {
    case "eof": return "end of expression";
    case "op": return `"${t.v}"`;
    case "kw": return `"${t.v}"`;
    case "ident": return `"${t.v}"`;
    case "int": return `"${t.v}"`;
    case "string": return `"${t.v}"`;
    case "dice": return `"${sliceTok(t)}"`;
  }
}

export function parse(text: string): Expr {
  if (text.trim() === "") throw new ParseError("empty expression", 0);
  currentSrc = text;
  const p = new Parser(tokenize(text));
  const e = p.parseExpr();
  p.finish();
  return e;
}
