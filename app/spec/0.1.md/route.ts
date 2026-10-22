import { agentMarkdown } from "../../../lib/pages";
import { SPEC_HREF } from "../../../lib/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentMarkdown(SPEC_HREF), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
