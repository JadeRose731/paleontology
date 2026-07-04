import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader, CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { formatDate } from "@/lib/cms-api";

const TYPE_LABELS: Record<string, string> = {
  news: "国际合作",
  report: "重要报告",
  policy: "政策解析",
  expedition: "科考动态",
  partner: "合作机构",
};

const TYPE_COLORS: Record<string, string> = {
  news: "bg-[#fadab7] text-[#765f42]",
  report: "bg-[#f5e0ba] text-[#241a03]",
  policy: "bg-[#E5E1DA] text-slate-700",
  expedition: "bg-[#fadab7] text-[#765f42]",
  partner: "bg-sky-100 text-sky-800",
};

export default function International() {
  const { channel } = useCmsChannel("/international");
  const { items, loading } = useCmsEntries({ moduleCode: "international" });

  return (
    <PartyLayout currentPageTitle={channel?.title ?? "国际交流"}>
      <div className="flex flex-col lg:flex-row gap-12">
        <aside className="w-full lg:w-1/4">
          <div className="sticky top-40 space-y-6">
            <div className="p-6 bg-slate-100 border-l-4 border-[#002B49] rounded">
              <h4 className="font-bold text-slate-800 mb-3">联系国际合作处</h4>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                如果您有关于国际会议、出访交流或合作办展的咨询，请联系我们。
              </p>
              <a className="text-[#002B49] font-bold text-xs flex items-center gap-2 hover:underline" href="mailto:intl@chinapsc.cn">
                <span className="material-symbols-outlined text-base">mail</span> intl@chinapsc.cn
              </a>
            </div>
          </div>
        </aside>

        <section className="w-full lg:w-3/4">
          <CmsPageHeader routePath="/international" fallbackTitle="国际交流动态" className="mb-8" />

          {loading && <p className="text-sm text-slate-500">加载中…</p>}

          {!loading && items.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">暂无国际交流动态，请在管理后台维护。</p>
          )}

          <div className="space-y-0 divide-y divide-[#E5E1DA] border-t border-[#E5E1DA]">
            {items.map(item => {
              const type = item.columnCode ?? "news";
              const label = TYPE_LABELS[type] ?? item.category ?? "国际交流";
              const tagColor = TYPE_COLORS[type] ?? "bg-[#fadab7] text-[#765f42]";
              return (
                <article key={item.entryId} className="py-6 flex flex-col md:flex-row gap-6 items-start hover:bg-slate-50 transition-all duration-200 group px-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-0.5 font-bold text-[10px] rounded-sm ${tagColor}`}>{label}</span>
                      <time className="text-xs text-slate-500 font-medium">{formatDate(item)}</time>
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-slate-800 group-hover:text-blue-800 transition-colors leading-snug">
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
                        <a className="text-[#002B49] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all" href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                          查看全文 <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                        </a>
                      </div>
                    )}
                  </div>
                  {item.coverUrl && (
                    <img src={item.coverUrl} alt={item.title} className="w-32 h-32 object-cover rounded border border-[#E5E1DA] shrink-0 hidden md:block" />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className="bg-[#002B49] py-12 relative overflow-hidden rounded-lg mt-16">
        <div className="relative z-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-8">全球学术伙伴</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-70 hover:opacity-100 transition-opacity duration-500 items-center justify-items-center max-w-4xl mx-auto">
            {["IPA", "UNESCO", "IUGS", "PALASS"].map(name => (
              <div key={name} className="text-xl font-bold border border-white/20 px-6 py-3 rounded w-36">{name}</div>
            ))}
          </div>
        </div>
      </section>
    </PartyLayout>
  );
}
