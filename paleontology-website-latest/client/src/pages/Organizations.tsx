import { PartyRichTextPage } from "@/components/party/PartyRichTextPage";

export default function Organizations() {
  return (
    <PartyRichTextPage
      routePath="/organizations"
      pageColumnCode="party_organizations"
      fallbackTitle="党群机构"
    />
  );
}
