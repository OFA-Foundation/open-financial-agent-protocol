// Reads what the site needs from the source files of the spec: schema.ts,
// schema.json, profiles.ts, README.md and examples/. The site copies nothing
// by hand, so it cannot drift from the source.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

export function readRepoJson<T>(path: string): T {
  return JSON.parse(readRepoFile(path)) as T;
}

/** The subset of JSON Schema that schema.json uses. */
export interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  pattern?: string;
  additionalProperties?: boolean | JsonSchema;
}

export function schemaDefinitions(): Record<string, JsonSchema> {
  return readRepoJson<{ definitions: Record<string, JsonSchema> }>("schema.json").definitions;
}

export interface SchemaSection {
  number: number;
  title: string;
  /** Exported type names, in file order. */
  types: string[];
}

/** The numbered sections of schema.ts, each with the types it exports. */
export function schemaSections(): SchemaSection[] {
  const sections: SchemaSection[] = [];
  for (const line of readRepoFile("schema.ts").split("\n")) {
    const header = /^\/\* (\d+)\. (.+?)\s*\*\/$/.exec(line);
    if (header?.[1] && header[2]) {
      sections.push({ number: Number(header[1]), title: header[2], types: [] });
      continue;
    }
    const declaration = /^export (?:interface|type) (\w+)/.exec(line);
    const current = sections.at(-1);
    if (declaration?.[1] && current) current.types.push(declaration[1]);
  }
  return sections;
}

/** Text of the declaration that starts with `start`, up to the first line that is exactly `end`. */
function declarationBlock(start: string, end: string): string {
  const source = readRepoFile("schema.ts");
  const from = source.indexOf(start);
  if (from < 0) throw new Error(`schema.ts has no "${start}"`);
  const to = source.indexOf(`\n${end}\n`, from);
  return source.slice(from, to < 0 ? undefined : to);
}

/** Params and result type of each tool, from `ToolSignatures`. */
export function toolSignatures(): Record<string, { params: string; result: string }> {
  const signatures: Record<string, { params: string; result: string }> = {};
  const block = declarationBlock("export interface ToolSignatures", "}");
  for (const match of block.matchAll(/^\s+(\w+): \{ params: (\w+); result: (\w+) \};$/gm)) {
    if (match[1] && match[2] && match[3]) signatures[match[1]] = { params: match[2], result: match[3] };
  }
  return signatures;
}

/** The name of each conformance level, from the comment on `ConformanceLevel`. */
export function levelNames(): Record<number, string> {
  const source = readRepoFile("schema.ts");
  const comment = source.slice(0, source.indexOf("export type ConformanceLevel"));
  const names: Record<number, string> = {};
  for (const match of comment.slice(comment.lastIndexOf("/**")).matchAll(/^ \* - (\d) (\w+):/gm)) {
    if (match[1] && match[2]) names[Number(match[1])] = match[2];
  }
  return names;
}

/** Each error code with the comment above it in `OfapErrorCode`. */
export function errorCodes(): { code: string; meaning: string }[] {
  const block = declarationBlock("export type OfapErrorCode =", "");
  const codes: { code: string; meaning: string }[] = [];
  let comment = "";
  for (const line of block.split("\n")) {
    const doc = /^\s*\/\*\*\s*(.+?)\s*\*\/$/.exec(line);
    if (doc?.[1]) {
      comment = doc[1];
      continue;
    }
    if (/^\s*\/\*\*/.test(line)) throw new Error("OfapErrorCode comments must fit on one line");
    const member = /^\s*\|\s*"(\w+)"/.exec(line);
    if (member?.[1]) {
      if (!comment) throw new Error(`OfapErrorCode "${member[1]}" has no comment`);
      codes.push({ code: member[1], meaning: comment });
      comment = "";
    }
  }
  return codes;
}

/** The body of a `## title` section of README.md. */
export function readmeSection(title: string): string {
  const readme = readRepoFile("README.md");
  const heading = `\n## ${title}\n`;
  const start = readme.indexOf(heading);
  if (start < 0) throw new Error(`README.md has no section "${title}"`);
  const body = readme.slice(start + heading.length);
  const end = body.indexOf("\n## ");
  return (end < 0 ? body : body.slice(0, end)).trim();
}
