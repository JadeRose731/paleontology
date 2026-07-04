import { useLocation } from "wouter";
import { useCmsPageResolve } from "@/hooks/useCmsPageResolve";
import { resolveLayoutComponent } from "@/components/cms/layout-registry";
import NotFound from "@/pages/NotFound";
import Services from "@/pages/Services";
import PublicDownloads from "@/pages/PublicDownloads";
import DownloadsCenter from "@/pages/DownloadsCenter";

/** 定制页：保留独立前端实现，由频道 page_type=CUSTOM 触发 */
const CUSTOM_PAGE_REGISTRY: Record<string, React.ComponentType> = {
  services: Services,
  public_files: PublicDownloads,
  downloads: DownloadsCenter,
};

interface CmsDynamicPageProps {
  routePath?: string;
}

export default function CmsDynamicPage({ routePath: routePathProp }: CmsDynamicPageProps) {
  const [location] = useLocation();
  const routePath = routePathProp ?? location;
  const { data, loading, error } = useCmsPageResolve(routePath);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500 text-sm">
        页面加载中…
      </div>
    );
  }

  if (error || !data?.channel) {
    return <NotFound />;
  }

  const { channel, entries, blocks, children } = data;

  if (channel.pageType === "CUSTOM") {
    const CustomPage = CUSTOM_PAGE_REGISTRY[channel.channelCode];
    if (CustomPage) return <CustomPage />;
    return <NotFound />;
  }

  const Layout = resolveLayoutComponent(channel.layoutType, channel.channelCode);
  if (!Layout) return <NotFound />;

  return (
    <Layout
      channel={channel}
      entries={entries}
      blocks={blocks}
      children={children}
      routePath={routePath}
    />
  );
}
