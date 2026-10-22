import { DocPage, docMetadata } from "../../../../components/doc-page";
import { REFERENCE_HREF } from "../../../../lib/site";

export const metadata = docMetadata(REFERENCE_HREF);

export default function Page() {
  return <DocPage href={REFERENCE_HREF} />;
}
