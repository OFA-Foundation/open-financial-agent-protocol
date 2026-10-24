import { DOCS_PAGES } from "../../lib/pages";
import { DESCRIPTION, REPO_URL, SCHEMA_HREF, SITE_NAME, SITE_URL } from "../../lib/site";

export const dynamic = "force-static";

export function GET() {
  const pages = DOCS_PAGES.map((page) => `- [${page.navTitle}](${SITE_URL}${page.href}.md): ${page.description}`);
  const body = [
    `# ${SITE_NAME} (AIP)`,
    "",
    `> ${DESCRIPTION}`,
    "",
    "## Docs",
    "",
    ...pages,
    "",
    "## Source",
    "",
    `- [schema.json](${SITE_URL}${SCHEMA_HREF}): JSON Schema of every AIP type, generated from schema.ts`,
    `- [Repository](${REPO_URL}): schema.ts, line profiles, worked example and checks`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
