/** AST for the expression language (docs/spec/expressions.md). `pos` is a 0-based character index. */
export type KeepMode = "kh" | "kl" | "dh" | "dl";
export type BinaryOp = "+" | "-" | "*" | "/" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "and" | "or";

export type Expr =
  | { kind: "int"; value: number; pos: number }
  | { kind: "bool"; value: boolean; pos: number }
  | { kind: "string"; value: string; pos: number }
  | { kind: "dice"; count: number; sides: number; keep?: { mode: KeepMode; n: number }; pos: number }
  | { kind: "ident"; name: string; pos: number }
  | { kind: "diceSugar"; count: Expr; sides: number; pos: number }
  | { kind: "unary"; op: "-" | "not"; arg: Expr; pos: number }
  | { kind: "binary"; op: BinaryOp; left: Expr; right: Expr; pos: number }
  | { kind: "call"; name: string; args: Expr[]; pos: number };

export class ParseError extends Error {
  constructor(message: string, public pos: number) {
    super(`${message} at column ${pos + 1}`);
    this.name = "ParseError";
  }
}
