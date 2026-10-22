import { DocPage, docMetadata } from "../../../components/doc-page";
import { SPEC_HREF } from "../../../lib/site";

export const metadata = docMetadata(SPEC_HREF);

export default function Page() {
  return <DocPage href={SPEC_HREF} />;
}
