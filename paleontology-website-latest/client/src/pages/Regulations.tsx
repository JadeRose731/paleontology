import { useState, useMemo } from "react";
import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader, CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";

function isRegulationPage(code?: string | null) {
  if (!code) return false;
  return code.includes("regulation") || code.includes("charter");
}

export default function Regulations() {
  const { channel } = useCmsChannel("/regulations");
  const { items: allPages, loading } = useCmsEntries({ moduleCode: "pages" });

  const pages = useMemo(
    () => allPages.filter(p => isRegulationPage(p.columnCode)),
    [allPages]
  );

  const [activeTab, setActiveTab] = useState<string>(() => pages[0]?.columnCode ?? "constitution");

  const handleScrollTo = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PartyLayout currentPageTitle={channel?.title ?? "规章条例"}>
      <CmsPageHeader routePath="/regulations" fallbackTitle="规章条例" className="mb-8" />

      {loading && <p className="text-sm text-slate-500">加载中…</p>}

      {!loading && pages.length === 0 && (
        <p className="text-sm text-slate-500 py-8 text-center">暂无规章条例内容，请在管理后台维护。</p>
      )}

      {pages.length > 0 && (
        <div className="grid grid-cols-12 gap-10">
          <aside className="col-span-12 lg:col-span-3">
            <div className="sticky top-32 space-y-6">
              <div className="bg-white shadow-sm border border-[#E5E1DA] overflow-hidden rounded">
                <div className="bg-[#001d36] px-6 py-4">
                  <h3 className="text-white font-bold text-lg">栏目导航</h3>
                </div>
                <ul className="divide-y divide-[#E5E1DA]">
                  {pages.map(page => {
                    const id = page.columnCode ?? String(page.entryId);
                    return (
                      <li key={page.entryId}>
                        <button
                          onClick={() => handleScrollTo(id)}
                          className={`w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-all group ${
                            activeTab === id
                              ? "bg-slate-100 border-l-4 border-[#001d36] font-bold text-[#001d36]"
                              : "text-slate-700"
                          }`}
                        >
                          <span className="font-medium">{page.title}</span>
                          <span className="material-symbols-outlined text-[#001d36] group-hover:translate-x-1 transition-transform text-sm">
                            chevron_right
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="bg-slate-100 p-6 border-l-4 border-[#001d36] rounded">
                <h4 className="font-bold text-[#001d36] mb-2">资料索取</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  如需更多历史性法规文件或纸质版材料，请联系学会秘书处。
                </p>
                <a className="text-[#001d36] font-bold text-xs inline-flex items-center gap-1 hover:underline" href="mailto:contact@chinapsc.cn">
                  联系我们 <span className="material-symbols-outlined text-xs">mail</span>
                </a>
              </div>
            </div>
          </aside>

          <article className="col-span-12 lg:col-span-9">
            <div className="space-y-16">
              {pages.map(page => {
                const id = page.columnCode ?? String(page.entryId);
                return (
                  <section key={page.entryId} className="scroll-mt-32" id={id}>
                    <div className="flex items-end justify-between border-b-2 border-[#001d36] pb-4 mb-8">
                      <h2 className="text-2xl font-bold text-[#001d36]">{page.title}</h2>
                    </div>
                    <div className="bg-white border border-[#E5E1DA] p-8 rounded shadow-sm">
                      <CmsRichTextBody html={page.bodyContent ?? ""} />
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        </div>
      )}
    </PartyLayout>
  );
}
