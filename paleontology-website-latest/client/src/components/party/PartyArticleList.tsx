import PartyLayout from "@/components/PartyLayout";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { formatDate, isPinned } from "@/lib/cms-api";

const FALLBACK_CARD_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663722696584/gysodoNdzXEVcwP48r3Ven/party_banner-jBQJTUqe4SJ4mSGKcYzD7A.webp";

export interface PartyArticleListProps {
  routePath: string;
  columnCode: string;
  layout?: "list" | "card";
  /** 列表标题后缀，默认「列表」；传空字符串则仅显示栏目标题 */
  listSuffix?: string;
  pinnedLabel?: string;
  emptyMessage?: string;
  /** 右侧统计文案，默认「共 N 条」 */
  countLabel?: (count: number) => string;
  /** 频道无 subtitle 时的兜底说明 */
  defaultSubtitle?: string;
  /** 标题行右侧徽章（如「图文报道 · 实时更新」），有值时替代统计文案 */
  headerBadge?: string;
}

/** 党建模块文章列表 — moduleCode=party + columnCode */
export function PartyArticleList({
  routePath,
  columnCode,
  layout = "list",
  listSuffix = "列表",
  pinnedLabel = "置顶",
  emptyMessage = "暂无内容，请在管理后台维护。",
  countLabel = (n) => `共 ${n} 条`,
  defaultSubtitle,
  headerBadge,
}: PartyArticleListProps) {
  const { channel } = useCmsChannel(routePath);
  const { items, loading } = useCmsEntries({ moduleCode: "party", columnCode });

  const pageTitle = channel?.title ?? columnCode;
  const headerTitle = listSuffix ? `${pageTitle}${listSuffix}` : pageTitle;
  const subtitle = channel?.subtitle ?? channel?.kicker ?? defaultSubtitle;

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <div className="flex flex-col gap-6">
        <div className="border-b border-fossil-stone pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span className="w-1 h-6 bg-party-red inline-block" />
              {headerTitle}
            </h2>
            {(channel?.subtitle ?? channel?.kicker ?? defaultSubtitle) && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {loading ? "加载中…" : headerBadge ?? countLabel(items.length)}
          </span>
        </div>

        {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
        )}

        {layout === "list" && (
          <div className="flex flex-col gap-4">
            {items.map(item => {
              const important = isPinned(item);
              return (
                <div
                  key={item.entryId}
                  className="bg-white border border-fossil-stone hover:border-party-red rounded p-4 transition-all shadow-sm hover:shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                >
                  <div className="flex items-start gap-3 flex-grow">
                    <span className="material-symbols-outlined text-party-red mt-0.5 group-hover:scale-110 transition-transform">
                      {important ? "campaign" : "description"}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.category && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${important ? "bg-party-red text-white" : "bg-accent text-primary"}`}>
                            {item.category}
                          </span>
                        )}
                        {important && (
                          <span className="text-[10px] bg-red-100 text-party-red px-1.5 py-0.5 rounded font-bold border border-party-red/20">
                            {pinnedLabel}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-primary group-hover:text-party-red transition-colors leading-relaxed">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {formatDate(item)}
                      </span>
                    </div>
                  </div>
                  {item.bodyContent && (
                    <CmsRichTextBody html={item.bodyContent} className="text-xs max-w-md hidden lg:block line-clamp-4" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {layout === "card" && (
          <div className="flex flex-col gap-8">
            {items.map(item => (
              <div
                key={item.entryId}
                className="bg-white border border-fossil-stone rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 md:grid-cols-12 gap-6 group"
              >
                <div className="md:col-span-4 h-48 md:h-full relative overflow-hidden">
                  <img
                    src={item.coverUrl || FALLBACK_CARD_IMG}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.category && (
                    <div className="absolute top-3 left-3 bg-party-red text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {item.category}
                    </div>
                  )}
                </div>
                <div className="md:col-span-8 p-6 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-primary group-hover:text-party-red transition-colors leading-relaxed">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{item.summary}</p>
                    )}
                    {item.bodyContent && (
                      <CmsRichTextBody html={item.bodyContent} className="text-xs line-clamp-3 hidden sm:block" />
                    )}
                  </div>
                  <div className="flex items-center border-t border-fossil-stone pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {formatDate(item)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PartyLayout>
  );
}
