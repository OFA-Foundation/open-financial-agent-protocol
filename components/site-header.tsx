import Link from "next/link";
import { EXAMPLE_HREF, REFERENCE_HREF, REPO_URL, SPEC_HREF } from "../lib/site";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="OFAP home">
          <BrandMark />
          <span className="brand-name">OFAP</span>
          <span className="brand-full">Open Financial Agent Protocol</span>
        </Link>
        <nav className="site-nav" aria-label="Site">
          <Link href={SPEC_HREF}>Spec</Link>
          <Link href={REFERENCE_HREF}>Reference</Link>
          <Link href={EXAMPLE_HREF}>Example</Link>
          <a href={REPO_URL}>GitHub</a>
        </nav>
      </div>
    </header>
  );
}
