import { useMemo } from "react";
import PartyLayout from "@/components/PartyLayout";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { parseExtra } from "@/lib/cms-api";

/** 党建下载中心 — downloads 模块 */
export function PartyDownloadsList({ routePath = "/downloads" }: { routePath?: string }) {
  const { channel } = useCmsChannel(routePath);
  const { items, loading } = useCmsEntries({ moduleCode: "downloads", scope: "party" });

  const pageTitle = channel?.title ?? "下载中心";

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const cat = item.category ?? "其他资料";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <div className="flex flex-col gap-6">
        <div className="border-b border-fossil-stone pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span className="w-1 h-6 bg-party-red inline-block" />
              {pageTitle}
            </h2>
            {(channel?.subtitle ?? channel?.kicker) && (
              <p className="text-xs text-muted-foreground mt-1">{channel?.subtitle ?? channel?.kicker}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">标准化 · 便捷下载</span>
        </div>

        {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无下载资源，请在管理后台维护。</p>
        )}

        <div className="flex flex-col gap-8">
          {grouped.map(([category, files]) => (
            <section key={category}>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4 pb-2 border-b border-fossil-stone">
                <span className="material-symbols-outlined text-party-red text-[20px]">folder</span>
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {files.map(file => {
                  const ex = parseExtra<{ fileName?: string }>(file.extraJson);
                  const fileName = ex.fileName ?? file.summary ?? file.title;
                  const ext = fileName.split(".").pop()?.toUpperCase() ?? "FILE";
                  return (
                    <a
                      key={file.entryId}
                      href={file.fileUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-fossil-stone p-4 rounded flex items-start gap-3 hover:border-party-red hover:shadow-sm transition-all group"
                    >
                      <span className="material-symbols-outlined text-party-red text-[28px] shrink-0">description</span>
                      <div className="flex flex-col gap-1 min-w-0">
                        <h4 className="text-xs font-bold text-primary group-hover:text-party-red line-clamp-2">{file.title}</h4>
                        <span className="text-[10px] text-muted-foreground">{ext} · {fileName}</span>
                      </div>
                      <span className="material-symbols-outlined text-muted-foreground ml-auto shrink-0 group-hover:text-party-red">download</span>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PartyLayout>
  );
}
