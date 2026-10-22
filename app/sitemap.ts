import type { MetadataRoute } from "next";
import { DOCS_PAGES } from "../lib/pages";
import { SITE_URL } from "../lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", ...DOCS_PAGES.map((page) => page.href)].map((href) => ({ url: `${SITE_URL}${href}` }));
}
