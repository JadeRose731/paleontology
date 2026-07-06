import { useMemo, useState } from "react";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { formatDate, type ApiCmsEntry } from "@/lib/cms-api";
import { SCIENCE_FORMAT_LABELS, SCIENCE_FORMAT_ORDER } from "@shared/service-content-sections";

interface ScienceCommunicationPanelProps {
  className?: string;
}

function ScienceListItem({ item }: { item: ApiCmsEntry }) {
  return (
    <article className="py-4 flex flex-col gap-2 border-b border-[#E5E1DA] last:border-0 px-1 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 font-bold text-[10px] rounded-sm bg-blue-50 text-blue-700">
          {item.category ?? SCIENCE_FORMAT_LABELS[item.columnCode ?? "article"] ?? "科学传播"}
        </span>
        <time className="text-xs text-slate-500 font-medium">{formatDate(item)}</time>
      </div>
      <h4 className="font-bold text-[#002B49] text-sm">{item.title}</h4>
      {item.summary && <p className="text-slate-500 leading-relaxed">{item.summary}</p>}
      {item.bodyContent && (
        <CmsRichTextBody html={item.bodyContent} className="text-xs text-slate-600 line-clamp-3" />
      )}
      {item.linkUrl && (
        <a
          className="text-[#002B49] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all w-fit"
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          查看详情 <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
        </a>
      )}
    </article>
  );
}

export default function ScienceCommunicationPanel({ className = "" }: ScienceCommunicationPanelProps) {
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const { items, loading } = useCmsEntries({ moduleCode: "science", scope: "society" });

  const filteredItems = useMemo(() => {
    if (formatFilter === "all") return items;
    return items.filter(i => (i.columnCode ?? "article") === formatFilter);
  }, [items, formatFilter]);

  const bookItems = filteredItems.filter(i => (i.columnCode ?? "article") === "book");
  const baseItems = filteredItems.filter(i => (i.columnCode ?? "article") === "base");
  const listItems = filteredItems.filter(i => {
    const fmt = i.columnCode ?? "article";
    return fmt !== "book" && fmt !== "base";
  });

  return (
    <div className={`max-w-7xl mx-auto py-12 px-6 ${className}`}>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4 space-y-2">
          <h2 className="text-base font-bold text-[#002B49] mb-4 border-b border-[#E5E1DA] pb-2">科学传播大纲</h2>
          <button
            type="button"
            onClick={() => setFormatFilter("all")}
            className={`w-full text-left px-4 py-2 rounded font-bold flex justify-between items-center text-xs ${
              formatFilter === "all" ? "bg-[#002B49] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            全部内容
            <span className="material-symbols-outlined text-sm">{formatFilter === "all" ? "arrow_right_alt" : "chevron_right"}</span>
          </button>
          {SCIENCE_FORMAT_ORDER.map(fmt => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormatFilter(fmt)}
              className={`w-full text-left px-4 py-2 rounded font-bold flex justify-between items-center text-xs ${
                formatFilter === fmt ? "bg-[#002B49] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {SCIENCE_FORMAT_LABELS[fmt]}
              <span className="material-symbols-outlined text-sm">{formatFilter === fmt ? "arrow_right_alt" : "chevron_right"}</span>
            </button>
          ))}
        </div>

        <div className="w-full md:w-3/4 space-y-8 text-xs">
          {loading && <p className="text-sm text-slate-500">加载中…</p>}

          {!loading && filteredItems.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">暂无科学传播内容，请在管理后台「学会服务 → 科学传播」维护并发布。</p>
          )}

          {!loading && bookItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bookItems.map(item => (
                <div key={item.entryId} className="bg-white border border-[#E5E1DA] p-6 rounded-lg">
                  <h3 className="text-sm font-bold text-[#002B49] mb-2">{item.title}</h3>
                  <p className="text-slate-500 mb-4 min-h-16 leading-relaxed">{item.summary ?? ""}</p>
                  {item.category && (
                    <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">{item.category}</span>
                  )}
                  {item.linkUrl && (
                    <a className="mt-3 block text-[#002B49] font-bold text-[10px] hover:underline" href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                      访问链接
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && baseItems.length > 0 && (
            <div className="border-t border-[#E5E1DA] pt-6">
              <h3 className="font-bold text-[#002B49] text-sm mb-4">科普基地工作动态</h3>
              <div className="space-y-4">
                {baseItems.map(item => (
                  <div key={item.entryId} className="bg-white border border-[#E5E1DA] p-5 rounded-lg flex gap-4 items-start">
                    <span className="material-symbols-outlined text-4xl text-[#715a3e] shrink-0">explore</span>
                    <div>
                      <h4 className="font-bold text-[#002B49] text-xs">{item.title}</h4>
                      {item.summary && <p className="text-slate-500 mt-1 leading-relaxed">{item.summary}</p>}
                      {item.bodyContent && <CmsRichTextBody html={item.bodyContent} className="mt-2 text-slate-600" />}
                      {item.linkUrl && (
                        <a className="mt-2 inline-flex text-[#002B49] font-bold text-[10px] hover:underline" href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                          了解更多
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && listItems.length > 0 && (
            <div className={bookItems.length > 0 || baseItems.length > 0 ? "border-t border-[#E5E1DA] pt-6" : ""}>
              {(formatFilter === "all" && (bookItems.length > 0 || baseItems.length > 0)) && (
                <h3 className="font-bold text-[#002B49] text-sm mb-4">更多内容</h3>
              )}
              {listItems.map(item => (
                <ScienceListItem key={item.entryId} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
