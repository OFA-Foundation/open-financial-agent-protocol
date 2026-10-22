import { renderMarkdown, type RenderedMarkdown } from "./markdown";
import { schemaDefinitions } from "./schema-source";
import { EXAMPLE_HREF, REFERENCE_HREF, SCHEMA_HREF, SITE_URL, SPEC_HREF } from "./site";
import { exampleMarkdown, referenceMarkdown, specMarkdown } from "./spec-content";

export interface DocsPage {
  href: string;
  navTitle: string;
  description: string;
  /** Deepest heading level in the sidebar outline. */
  outlineDepth: 2 | 3;
  markdown: () => string;
}

export const DOCS_PAGES: DocsPage[] = [
  {
    href: SPEC_HREF,
    navTitle: "Specification",
    description: "The OFAP draft 0.1 specification: discovery, conformance levels, tools, the quote loop, applications, evidence and the insurance module.",
    outlineDepth: 3,
    markdown: specMarkdown,
  },
  {
    href: REFERENCE_HREF,
    navTitle: "Schema reference",
    description: "Every type of OFAP draft 0.1, generated from schema.ts.",
    outlineDepth: 2,
    markdown: referenceMarkdown,
  },
  {
    href: EXAMPLE_HREF,
    navTitle: "Worked example",
    description: "A pet insurance flow from discovery to evidence, as the JSON that each tool sends and returns.",
    outlineDepth: 2,
    markdown: exampleMarkdown,
  },
];

export function docsPage(href: string): DocsPage {
  const page = DOCS_PAGES.find((candidate) => candidate.href === href);
  if (!page) throw new Error(`No docs page at ${href}`);
  return page;
}

const rendered = new Map<string, RenderedMarkdown>();

export function renderPage(href: string): RenderedMarkdown {
  const cached = rendered.get(href);
  if (cached) return cached;
  const definitions = new Set(Object.keys(schemaDefinitions()));
  const page = renderMarkdown(docsPage(href).markdown(), {
    definitions,
    referenceHref: href === REFERENCE_HREF ? "" : REFERENCE_HREF,
  });
  rendered.set(href, page);
  return page;
}

/** The page as Markdown for agents: links are absolute, and the licence closes it. */
export function agentMarkdown(href: string): string {
  const markdown = docsPage(href)
    .markdown()
    .replace(/\]\(\/(?!\/)/g, `](${SITE_URL}/`)
    .replace(/\]\(#/g, `](${SITE_URL}${href}#`);
  return `${markdown.trimEnd()}\n\n---\n\nLicensed under the [Apache License 2.0](https://github.com/OFA-Foundation/open-financial-agent-protocol/blob/main/LICENSE).\n`;
}

const OTHER_PATHS = new Set(["/", SCHEMA_HREF, "/llms.txt", ...DOCS_PAGES.map((page) => `${page.href}.md`)]);

/** Fails the build when a link between pages points to a page or a heading that does not exist. */
export function checkLinks(): void {
  const problems: string[] = [];
  for (const page of DOCS_PAGES) {
    for (const link of renderPage(page.href).links) {
      if (/^[a-z]+:/.test(link)) continue;
      const [path = "", hash] = link.split("#");
      const target = path === "" ? page.href : path;
      const targetPage = DOCS_PAGES.find((candidate) => candidate.href === target);
      if (!targetPage && !OTHER_PATHS.has(target)) problems.push(`${page.href}: no page at ${link}`);
      else if (hash && targetPage && !renderPage(targetPage.href).ids.has(hash)) problems.push(`${page.href}: no heading #${hash} in ${target}`);
    }
  }
  if (problems.length) throw new Error(`Broken links:\n${problems.join("\n")}`);
}
