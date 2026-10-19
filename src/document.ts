import YAML from "yaml";

export interface Document {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
  /** 1-based line number of the first body line. */
  bodyStartLine: number;
}

export class DocumentError extends Error {
  constructor(
    public path: string,
    message: string,
    public line?: number,
  ) {
    super(line === undefined ? `${path}: ${message}` : `${path}:${line}: ${message}`);
    this.name = "DocumentError";
  }
}

const DELIM = "---";

export function parseDocument(text: string, path: string): Document {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== DELIM) {
    throw new DocumentError(path, "missing frontmatter: file must start with a '---' line", 1);
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === DELIM) {
      end = i;
      break;
    }
  }
  if (end === -1) {
    throw new DocumentError(path, "unterminated frontmatter: no closing '---' line", 1);
  }
  const yamlText = lines.slice(1, end).join("\n");
  let frontmatter: unknown = {};
  if (yamlText.trim() !== "") {
    try {
      frontmatter = YAML.parse(yamlText);
    } catch (e) {
      const err = e as { linePos?: { line: number }[]; message: string };
      const line = err.linePos?.[0]?.line;
      throw new DocumentError(path, `invalid YAML in frontmatter: ${err.message.split("\n")[0]}`, line === undefined ? undefined : line + 1);
    }
  }
  if (frontmatter === null) frontmatter = {};
  if (typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    throw new DocumentError(path, "frontmatter must be a YAML mapping", 2);
  }
  return {
    path,
    frontmatter: frontmatter as Record<string, unknown>,
    body: lines.slice(end + 1).join("\n"),
    bodyStartLine: end + 2,
  };
}
