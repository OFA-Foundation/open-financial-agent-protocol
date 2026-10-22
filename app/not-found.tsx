import type { Metadata } from "next";
import Link from "next/link";
import { SPEC_HREF } from "../lib/site";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="not-found">
      <p className="label">404</p>
      <h1 className="title-1">This page does not exist.</h1>
      <div className="actions">
        <Link className="button primary" href={SPEC_HREF}>
          Read the spec
        </Link>
        <Link className="button" href="/">
          Home
        </Link>
      </div>
    </div>
  );
}
