import { useState, useMemo } from "react";
import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";

export default function Gallery() {
  const { channel } = useCmsChannel("/gallery");
  const { items, loading } = useCmsEntries({ moduleCode: "gallery" });
  const [activeFilter, setActiveFilter] = useState("全部瞬间");

  const photos = useMemo(
    () => [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [items]
  );

  const filters = useMemo(() => {
    const cats = new Set(photos.map(p => p.category).filter((c): c is string => Boolean(c)));
    return ["全部瞬间", ...Array.from(cats) as string[]];
  }, [photos]);

  const filteredItems = activeFilter === "全部瞬间"
    ? photos
    : photos.filter(item => item.category === activeFilter);

  return (
    <PartyLayout currentPageTitle={channel?.title ?? "历史相册"}>
      <div className="space-y-12">
        <CmsPageHeader
          routePath="/gallery"
          fallbackTitle="光影历程"
          fallbackSubtitle="记录中国古生物学百年足迹，从早期的艰苦探索到现代的卓越突破，每一帧影像都是科学精神的永恒传承。"
          className="mb-10 border-b-2 border-amber-200 pb-4"
        />

        {loading && <p className="text-sm text-slate-500">加载中…</p>}

        {filters.length > 1 && (
          <div className="flex flex-wrap gap-4 mb-8">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2 font-semibold text-xs tracking-wider uppercase rounded-lg transition-all duration-300 ${
                  activeFilter === filter
                    ? "bg-primary text-white shadow-sm"
                    : "border border-fossil-stone bg-white hover:bg-slate-100 text-slate-700"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">暂无相册内容，请在管理后台上传。</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {filteredItems.map(item => (
            <div
              key={item.entryId}
              className="group relative overflow-hidden rounded-lg border border-fossil-stone bg-white shadow-sm hover:shadow-md transition-all"
            >
              {(item.coverUrl || item.mediaUrl) && (
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={item.coverUrl ?? item.mediaUrl ?? ""}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-4">
                {item.category && (
                  <span className="text-[10px] font-bold text-primary bg-sky-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {item.category}
                  </span>
                )}
                <h3 className="text-base font-bold text-primary mt-2">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PartyLayout>
  );
}
