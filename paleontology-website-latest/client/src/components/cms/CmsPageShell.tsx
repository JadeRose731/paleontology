import PartyLayout from "@/components/PartyLayout";
import type { ApiCmsChannel } from "@/lib/cms-api";

interface CmsPageShellProps {
  channel: ApiCmsChannel;
  routePath: string;
  children: React.ReactNode;
}

/** 按频道 shellType 选择页面外壳 */
export function CmsPageShell({ channel, routePath, children }: CmsPageShellProps) {
  const pageTitle = channel.title ?? channel.navName ?? channel.channelCode;
  const isPartyShell = channel.shellType === "party";

  return (
    <PartyLayout
      currentPageTitle={pageTitle}
      fullWidth={!isPartyShell}
      showPartySidebar={isPartyShell}
      routePath={routePath}
    >
      {children}
    </PartyLayout>
  );
}
