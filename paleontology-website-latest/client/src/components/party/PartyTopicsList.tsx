import PartyLayout from "@/components/PartyLayout";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { useCmsEntries } from "@/hooks/useCmsEntries";

const STATUS_STYLE: Record<string, string> = {
  published: "bg-green-100 text-green-800 border-green-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  archived: "bg-blue-100 text-blue-800 border-blue-200",
};

/** 党建专题 — party 模块 columnCode=party_topic */
export function PartyTopicsList({ routePath = "/special-topics" }: { routePath?: string }) {
  const { channel } = useCmsChannel(routePath);
  const { items, loading } = useCmsEntries({ moduleCode: "party", columnCode: "party_topic" });

  const pageTitle = channel?.title ?? "党建专题";

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <div className="flex flex-col gap-6">
        <div className="border-b border-fossil-stone pb-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="w-1 h-6 bg-party-red inline-block" />
            {pageTitle}
          </h2>
          {(channel?.subtitle ?? channel?.kicker) && (
            <p className="text-xs text-muted-foreground mt-1">{channel?.subtitle ?? channel?.kicker}</p>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无专题内容，请在管理后台维护。</p>
        )}

        <div className="flex flex-col gap-8">
          {items.map(item => {
            const statusKey = (item.status ?? "PUBLISHED").toLowerCase();
            const statusLabel = statusKey === "published" ? "进行中" : statusKey === "archived" ? "已归档" : "草稿";
            const statusColor = STATUS_STYLE[statusKey] ?? STATUS_STYLE.published;
            return (
              <div
                key={item.entryId}
                className="bg-white border border-fossil-stone rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6"
              >
                {item.coverUrl && (
                  <div className="lg:col-span-4 h-48 lg:h-full min-h-[200px] relative overflow-hidden rounded border border-fossil-stone">
                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded font-bold border shadow-sm ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                )}
                <div className={`${item.coverUrl ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-4`}>
                  <div>
                    {item.category && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{item.category}</span>
                      </div>
                    )}
                    <h3 className="text-base font-bold text-primary">{item.title}</h3>
                    {item.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2">{item.summary}</p>
                    )}
                  </div>
                  {item.bodyContent && (
                    <div className="bg-paper-bright border border-fossil-stone p-4 rounded">
                      <CmsRichTextBody html={item.bodyContent} className="text-xs" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PartyLayout>
  );
}
