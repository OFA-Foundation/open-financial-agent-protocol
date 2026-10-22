import { readRepoFile } from "../../../../lib/schema-source";

export const dynamic = "force-static";

// Served at the $id of schema.json.
export function GET() {
  return new Response(readRepoFile("schema.json"), { headers: { "Content-Type": "application/schema+json" } });
}
