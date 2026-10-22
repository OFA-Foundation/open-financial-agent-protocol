import { agentMarkdown } from "../../../../lib/pages";
import { EXAMPLE_HREF } from "../../../../lib/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentMarkdown(EXAMPLE_HREF), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
