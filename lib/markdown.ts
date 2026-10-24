import type { Element, ElementContent, Root, RootContent } from "hast";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { definitionAnchor } from "./spec-content";

export interface OutlineItem {
  id: string;
  label: string;
  depth: 2 | 3;
}

export interface RenderedMarkdown {
  title: string;
  html: string;
  outline: OutlineItem[];
  ids: Set<string>;
  links: string[];
}

export interface RenderOptions {
  /** Definition names of schema.json. Inline code that names one links to the reference. */
  definitions: Set<string>;
  /** Href of the reference page, or "" on the reference page itself. */
  referenceHref: string;
}

type Parent = Root | Element;

function textOf(node: Root | RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element" || node.type === "root") return node.children.map(textOf).join("");
  return "";
}

function element(tagName: string, className: string, children: ElementContent[]): Element {
  return { type: "element", tagName, properties: { className: [className] }, children };
}

/** Calls `visit` on every element, depth first, with its ancestors. */
function walk(node: Parent, visit: (element: Element, ancestors: Element[]) => void, ancestors: Element[] = []): void {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    visit(child, ancestors);
    walk(child, visit, [...ancestors, child]);
  }
}

/** Replaces some text nodes of an element tree, outside code. */
function mapText(node: Parent, map: (value: string) => ElementContent[] | null): void {
  node.children = node.children.flatMap((child): RootContent[] => {
    if (child.type === "text") return map(child.value) ?? [child];
    if (child.type === "element" && child.tagName !== "code" && child.tagName !== "pre") mapText(child, map);
    return [child];
  }) as typeof node.children;
}

function slug(text: string): string {
  return text
    .replace(/^\d+(\.\d+)*\.?\s+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const HEADINGS = new Set(["h2", "h3", "h4"]);
const REQUIREMENT = /\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|MAY|OPTIONAL)\b/g;
const JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

function highlightJson(code: string): ElementContent[] {
  const out: ElementContent[] = [];
  let last = 0;
  for (const match of code.matchAll(JSON_TOKEN)) {
    if (match.index > last) out.push({ type: "text", value: code.slice(last, match.index) });
    if (match[1]) {
      out.push(element("span", match[2] ? "tok-key" : "tok-string", [{ type: "text", value: match[1] }]));
      if (match[2]) out.push({ type: "text", value: match[2] });
    } else {
      const value = match[3] ?? match[4] ?? "";
      out.push(element("span", match[3] ? "tok-number" : "tok-literal", [{ type: "text", value }]));
    }
    last = match.index + match[0].length;
  }
  out.push({ type: "text", value: code.slice(last) });
  return out;
}

/** Resolves a type name in inline code, such as `Offer` or `AipSettings.lines`, to its definition. */
function definitionFor(code: string, definitions: Set<string>): string | null | undefined {
  const base = code.split(".")[0] ?? "";
  if (!/^[A-Z][A-Za-z0-9]*$/.test(base)) return undefined;
  if (definitions.has(base)) return base;
  return [...definitions].find((name) => name.startsWith(`${base}<`)) ?? null;
}

function transform(tree: Root, options: RenderOptions, result: Omit<RenderedMarkdown, "html">): void {
  const unknownTypes = new Set<string>();

  walk(tree, (node, ancestors) => {
    if (HEADINGS.has(node.tagName)) {
      const only = node.children.length === 1 ? node.children[0] : undefined;
      const label = textOf(node);
      const id = only?.type === "element" && only.tagName === "code" ? definitionAnchor(label) : slug(label);
      if (result.ids.has(id)) throw new Error(`Duplicate heading id "${id}" in "${result.title}"`);
      node.properties["id"] = id;
      result.ids.add(id);
      if (node.tagName === "h2" || node.tagName === "h3") {
        result.outline.push({ id, label, depth: node.tagName === "h2" ? 2 : 3 });
      }
      const first = node.children[0];
      const number = first?.type === "text" ? /^(\d+(?:\.\d+)*\.?)\s+/.exec(first.value) : null;
      if (first?.type === "text" && number?.[1]) {
        first.value = first.value.slice(number[0].length);
        node.children.unshift(element("span", "secnum", [{ type: "text", value: number[1] }]));
      }
    }

    if (node.tagName === "a" && typeof node.properties["href"] === "string") {
      const href = node.properties["href"];
      result.links.push(href);
      if (/^https?:\/\//.test(href)) {
        node.properties["target"] = "_blank";
        node.properties["rel"] = ["noopener", "noreferrer"];
      }
    }

    const inCode = ancestors.some((ancestor) => ancestor.tagName === "pre");
    const inLinkOrHeading = ancestors.some((ancestor) => ancestor.tagName === "a" || HEADINGS.has(ancestor.tagName));
    if (node.tagName === "code" && !inCode && !inLinkOrHeading) {
      const name = definitionFor(textOf(node), options.definitions);
      if (name === null) unknownTypes.add(textOf(node));
      if (name) {
        const code: Element = { ...node };
        node.tagName = "a";
        node.properties = { href: `${options.referenceHref}#${definitionAnchor(name)}`, className: ["type-link"] };
        node.children = [code];
      }
    }

    if (node.tagName === "pre") {
      const code = node.children[0];
      const classes = code?.type === "element" ? code.properties["className"] : undefined;
      if (code?.type === "element" && Array.isArray(classes) && classes.includes("language-json")) {
        code.children = highlightJson(textOf(code));
      }
    }
  });

  if (unknownTypes.size) {
    throw new Error(`"${result.title}" names types that schema.json does not define: ${[...unknownTypes].join(", ")}`);
  }

  mapText(tree, (value) => {
    if (!REQUIREMENT.test(value)) return null;
    REQUIREMENT.lastIndex = 0;
    const parts: ElementContent[] = [];
    let last = 0;
    for (const match of value.matchAll(REQUIREMENT)) {
      if (match.index > last) parts.push({ type: "text", value: value.slice(last, match.index) });
      parts.push(element("span", "req", [{ type: "text", value: match[0] }]));
      last = match.index + match[0].length;
    }
    parts.push({ type: "text", value: value.slice(last) });
    return parts;
  });

  tree.children = tree.children.map((child) =>
    child.type === "element" && child.tagName === "table" ? element("div", "table-scroll", [child]) : child,
  );
}

/** Renders a docs page. The first line of the Markdown is its `# Title`. */
export function renderMarkdown(markdown: string, options: RenderOptions): RenderedMarkdown {
  const [firstLine = "", ...rest] = markdown.split("\n");
  if (!firstLine.startsWith("# ")) throw new Error("A docs page starts with a # title");
  const result: Omit<RenderedMarkdown, "html"> = { title: firstLine.slice(2).trim(), outline: [], ids: new Set(), links: [] };
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
  const tree = processor.runSync(processor.parse(rest.join("\n"))) as Root;
  transform(tree, options, result);
  const html = unified().use(rehypeStringify).stringify(tree);
  return { ...result, html };
}

/** Highlighted HTML of a JSON text, for code outside the docs pages. */
export function highlightJsonHtml(code: string): string {
  return unified().use(rehypeStringify).stringify({ type: "root", children: highlightJson(code) });
}
