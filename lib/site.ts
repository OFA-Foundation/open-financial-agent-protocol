import { PROTOCOL_VERSION } from "../schema";

export const SITE_URL = "https://openfinancialagent.org";
export const SITE_NAME = "Agentic Insurance Protocol";
export const REPO_URL = "https://github.com/OFA-Foundation/open-financial-agent-protocol";
export const ISSUES_URL = `${REPO_URL}/issues/new/choose`;

export const VERSION = PROTOCOL_VERSION;
export const SPEC_HREF = `/spec/${VERSION}`;
export const REFERENCE_HREF = `${SPEC_HREF}/reference`;
export const REGISTRY_HREF = `${SPEC_HREF}/registry`;
export const EXAMPLE_HREF = `${SPEC_HREF}/example`;
export const SCHEMA_HREF = `/schemas/${VERSION}/schema.json`;
export const CONTEXT_HREF = "/context";

export const DESCRIPTION =
  "How an AI agent finds, prices and subscribes to an insurance product, and what evidence each step leaves. An extension on top of MCP and PAP. Draft 0.1 covers the sale.";

export function repoFileUrl(path: string): string {
  return `${REPO_URL}/blob/main/${path}`;
}
