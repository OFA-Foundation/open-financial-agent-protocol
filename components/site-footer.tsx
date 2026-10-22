import { REPO_URL, SCHEMA_HREF, VERSION, repoFileUrl } from "../lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>
          OFAP draft {VERSION}. Licensed under the <a href={repoFileUrl("LICENSE")}>Apache License 2.0</a>. Companies in the examples are fictional.
        </p>
        <nav aria-label="Footer">
          <a href={SCHEMA_HREF}>schema.json</a>
          <a href="/llms.txt">llms.txt</a>
          <a href={repoFileUrl("SECURITY.md")}>Security</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
