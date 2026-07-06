import { useMemo, useState } from "react";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { formatDate } from "@/lib/cms-api";
import {
  INTL_SECTION_NAV,
  INTL_TYPE_ICONS,
  INTL_TYPE_LABELS,
} from "@shared/service-content-sections";

interface InternationalExchangePanelProps {
  className?: string;
}

export default function InternationalExchangePanel({ className = "" }: InternationalExchangePanelProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { items, loading } = useCmsEntries({ moduleCode: "international" });

  const filteredItems = useMemo(() => {
    if (typeFilter === "all") return items;
    return items.filter(i => (i.columnCode ?? "news") === typeFilter);
  }, [items, typeFilter]);

  const partnerItems = useMemo(
    () => items.filter(i => (i.columnCode ?? "news") === "partner"),
    [items],
  );

  return (
    <div className={`max-w-7xl mx-auto py-12 px-6 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
        <div className="lg:col-span-1">
          <div className="sticky top-40 space-y-6">
            <div className="bg-white border border-[#E5E1DA] rounded-lg overflow-hidden shadow-sm">
              <div className="bg-[#002B49] text-white px-6 py-4 font-bold">栏目导航</div>
              <nav className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`px-6 py-3 border-b border-[#E5E1DA] hover:bg-slate-50 transition-colors flex items-center justify-between group text-left ${
                    typeFilter === "all" ? "bg-slate-50" : ""
                  }`}
                >
                  <span className="text-sm">全部动态</span>
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#002B49] text-xs">arrow_forward_ios</span>
                </button>
                {INTL_SECTION_NAV.map(nav => (
                  <button
                    key={nav.code}
                    type="button"
                    onClick={() => setTypeFilter(nav.code)}
                    className={`px-6 py-3 border-b border-[#E5E1DA] last:border-b-0 hover:bg-slate-50 transition-colors flex items-center justify-between group text-left ${
                      typeFilter === nav.code ? "bg-slate-50" : ""
                    }`}
                  >
                    <span className="text-sm">{nav.label}</span>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-[#002B49] text-xs">arrow_forward_ios</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6 bg-slate-50 border-l-4 border-[#002B49] rounded-lg">
              <h4 className="font-bold text-[#002B49] mb-3 text-sm">联系国际合作处</h4>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">如有国际会议、学术访问或合作咨询，欢迎联系我们。</p>
              <a className="text-[#002B49] font-bold text-xs flex items-center gap-2 hover:underline" href="mailto:intl@chinapsc.cn">
                <span className="material-symbols-outlined text-base">mail</span> intl@chinapsc.cn
              </a>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="mb-8 flex justify-between items-center border-b-2 border-[#002B49] pb-4">
            <h2 className="text-2xl font-bold text-[#002B49]">国际交流动态</h2>
          </div>

          {loading && <p className="text-sm text-slate-500">加载中…</p>}

          {!loading && filteredItems.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">暂无国际交流动态，请在管理后台「学会服务 → 国际交流」维护并发布。</p>
          )}

          <div className="space-y-0 divide-y divide-[#E5E1DA] border-t border-[#E5E1DA]">
            {filteredItems.map(item => {
              const type = item.columnCode ?? "news";
              const label = INTL_TYPE_LABELS[type] ?? item.category ?? "国际交流";
              const icon = INTL_TYPE_ICONS[type] ?? "public";
              return (
                <article key={item.entryId} className="py-6 flex gap-6 items-start hover:bg-slate-50 transition-all duration-200 group px-2">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#002B49] rounded-lg flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-0.5 font-bold text-[10px] rounded-sm bg-[#f5e0ba] text-[#241a03]">{label}</span>
                      <time className="text-xs text-slate-500 font-medium">{formatDate(item)}</time>
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-slate-800 group-hover:text-[#002B49] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{item.summary}</p>
                    )}
                    {item.bodyContent && (
                      <div className="mt-3 hidden lg:block">
                        <CmsRichTextBody html={item.bodyContent} className="text-xs line-clamp-3" />
                      </div>
                    )}
                    {item.linkUrl && (
                      <div className="mt-4">
                        <a
                          className="text-[#002B49] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all"
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看全文 <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                        </a>
                      </div>
                    )}
                  </div>
                  {item.coverUrl && (
                    <img src={item.coverUrl} alt={item.title} className="w-24 h-24 object-cover rounded border border-[#E5E1DA] shrink-0 hidden md:block" />
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <section className="bg-[#002B49] py-12 rounded-lg mt-12">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-8">全球学术伙伴</h2>
          {partnerItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-90 hover:opacity-100 transition-opacity items-center justify-items-center max-w-4xl mx-auto px-4">
              {partnerItems.map(item => (
                item.linkUrl ? (
                  <a
                    key={item.entryId}
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
                  >
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="h-12 object-contain max-w-full" />
                    ) : (
                      <div className="text-sm font-bold border border-white/20 px-4 py-2 rounded">{item.title}</div>
                    )}
                  </a>
                ) : (
                  <div key={item.entryId} className="flex flex-col items-center gap-2">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="h-12 object-contain max-w-full" />
                    ) : (
                      <div className="text-sm font-bold border border-white/20 px-4 py-2 rounded">{item.title}</div>
                    )}
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-70 hover:opacity-100 transition-opacity items-center justify-items-center max-w-4xl mx-auto">
              {["IPA", "UNESCO", "IUGS", "PALASS"].map(name => (
                <div key={name} className="text-xl font-bold border border-white/20 px-6 py-3 rounded w-36">{name}</div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
