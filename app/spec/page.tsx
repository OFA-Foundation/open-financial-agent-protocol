import { redirect } from "next/navigation";
import { SPEC_HREF } from "../../lib/site";

// vercel.json redirects /spec first. This page covers hosts that ignore vercel.json.
export default function SpecIndex() {
  redirect(SPEC_HREF);
}
