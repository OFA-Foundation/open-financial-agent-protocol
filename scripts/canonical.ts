import { createHash } from "node:crypto";

/** Canonical JSON (RFC 8785): sorted keys, no whitespace, `undefined` members left out. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const members = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${members.join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Lower-case hex SHA-256 of a text. */
export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** SHA-256 of the canonical JSON of a value, as in `answers_sha256` and `terms_sha256`. */
export function canonicalSha256(value: unknown): string {
  return sha256(canonicalJson(value));
}
