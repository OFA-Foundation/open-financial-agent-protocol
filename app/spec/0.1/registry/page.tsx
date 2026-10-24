import { DocPage, docMetadata } from "../../../../components/doc-page";
import { REGISTRY_HREF } from "../../../../lib/site";

export const metadata = docMetadata(REGISTRY_HREF);

export default function Page() {
  return <DocPage href={REGISTRY_HREF} />;
}
