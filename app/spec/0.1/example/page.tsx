import { DocPage, docMetadata } from "../../../../components/doc-page";
import { EXAMPLE_HREF } from "../../../../lib/site";

export const metadata = docMetadata(EXAMPLE_HREF);

export default function Page() {
  return <DocPage href={EXAMPLE_HREF} />;
}
