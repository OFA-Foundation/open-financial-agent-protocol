import type { Metadata } from "next";
import Link from "next/link";
import { checkLinks, DOCS_PAGES, docsPage, renderPage } from "../lib/pages";
import { SITE_NAME, VERSION } from "../lib/site";
import { CopyMarkdown } from "./copy-markdown";

let linksChecked = false;

export function docMetadata(href: string): Metadata {
  const page = docsPage(href);
  const title = renderPage(href).title;
  return {
    title,
    description: page.description,
    alternates: { canonical: href, types: { "text/markdown": `${href}.md` } },
    openGraph: { title, description: page.description, url: href, siteName: SITE_NAME, type: "article" },
  };
}

export function DocPage({ href }: { href: string }) {
  if (!linksChecked) {
    checkLinks();
    linksChecked = true;
  }
  const page = docsPage(href);
  const { title, html, outline } = renderPage(href);
  const items = outline.filter((item) => item.depth <= page.outlineDepth);
  const outlineList = (
    <ol className="outline">
      {items.map((item) => (
        <li key={item.id} className={`depth-${item.depth}`}>
          <a href={`#${item.id}`}>{item.label}</a>
        </li>
      ))}
    </ol>
  );
  const pagesList = (
    <ul className="docs-pages">
      {DOCS_PAGES.map((candidate) => (
        <li key={candidate.href}>
          <Link href={candidate.href} aria-current={candidate.href === href ? "page" : undefined}>
            {candidate.navTitle}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="docs">
      <aside className="docs-nav">
        <nav aria-label="Docs">
          <p className="label">Draft {VERSION}</p>
          {pagesList}
        </nav>
        <nav aria-label="On this page">
          <p className="label">On this page</p>
          {outlineList}
        </nav>
      </aside>
      <article className="doc" id="article">
        <header className="doc-head">
          <p className="label">Draft {VERSION}</p>
          <h1>{title}</h1>
          <div className="doc-actions">
            <CopyMarkdown href={`${href}.md`} />
            <a href={`${href}.md`}>View as Markdown</a>
          </div>
          <details className="toc-mobile">
            <summary>Pages and sections</summary>
            {pagesList}
            {outlineList}
          </details>
        </header>
        <div className="doc-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
