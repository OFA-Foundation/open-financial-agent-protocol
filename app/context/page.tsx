import type { Metadata } from "next";
import Link from "next/link";
import { Figures, News } from "../../components/context";
import { SPEC_HREF } from "../../lib/site";

export const metadata: Metadata = {
  title: "Context",
  description: "How fast AI agent traffic grows, and how insurers, marketplaces and banks reacted in September and October 2026.",
  alternates: { canonical: "/context" },
};

export default function Context() {
  return (
    <div className="home">
      <header className="page-head">
        <p className="label">Context</p>
        <h1 className="title-1">Agents have started to buy</h1>
        <p className="body-lg">
          Personal agents now search, compare and buy for people. Their traffic grows faster than human traffic, and each company decides alone how to
          answer it. Each figure and each news item links to its source.
        </p>
      </header>
      <Figures />
      <News />
      <div className="actions page-end">
        <Link className="button primary" href="/">
          Back to the home page
        </Link>
        <Link className="button" href={SPEC_HREF}>
          Read the spec
        </Link>
      </div>
    </div>
  );
}
