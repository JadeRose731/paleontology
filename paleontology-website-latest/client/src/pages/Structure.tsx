import { useMemo, useState } from "react";
import PartyLayout from "../components/PartyLayout";
import StructureSidebar from "@/components/structure/StructureSidebar";
import { CmsPageHeader, CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { STRUCTURE_PANELS, type StructurePanelId } from "@shared/branch-site";

function entryByCode(
  entries: ReturnType<typeof useCmsEntries>["items"],
  code: string,
) {
  return entries.find(
    e => e.columnCode === code && e.status?.toLowerCase() === "published" && (e.scope ?? "society") === "society",
  );
}

export default function Structure() {
  const { channel } = useCmsChannel("/structure");
  const { items: pages, loading } = useCmsEntries({ moduleCode: "pages" });
  const [activePanel, setActivePanel] = useState<StructurePanelId>("org-chart");

  const panel = STRUCTURE_PANELS.find(p => p.id === activePanel)!;
  const pageEntry = useMemo(
    () => entryByCode(pages, panel.pageCode),
    [pages, panel.pageCode],
  );

  return (
    <PartyLayout currentPageTitle={channel?.title ?? "组织机构"}>
      <div className="flex flex-col lg:flex-row gap-8">
        <StructureSidebar />

        <main className="flex-1 min-w-0 space-y-8">
          <CmsPageHeader
            routePath="/structure"
            fallbackTitle="组织机构"
            fallbackSubtitle="中国古生物学会设理事会、常务理事会及若干专业委员会。左侧选择总学会或专业分会，右侧查看组织机构与管理系列。"
            className="border-l-4 border-secondary pl-6"
          />

          <div className="flex flex-wrap gap-2 border-b border-fossil-stone pb-4">
            {STRUCTURE_PANELS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePanel(p.id)}
                className={`px-5 py-2 text-sm font-bold rounded transition-colors ${
                  activePanel === p.id
                    ? "bg-primary text-white"
                    : "bg-white border border-fossil-stone text-primary hover:bg-slate-50"
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-slate-500">加载中…</p>}

          {!loading && !pageEntry?.bodyContent && (
            <div className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 rounded shadow-sm text-center">
              <p className="text-sm text-slate-500">
                暂无「{panel.title}」内容，请在管理后台「组织机构 → {panel.title}」中维护。
              </p>
            </div>
          )}

          {pageEntry?.bodyContent && (
            <article className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-8 lg:p-10 rounded shadow-sm">
              <h2 className="text-2xl font-bold text-primary mb-6 pb-4 border-b border-fossil-stone">
                {panel.title}
              </h2>
              <CmsRichTextBody html={pageEntry.bodyContent} />
            </article>
          )}
        </main>
      </div>
    </PartyLayout>
  );
}
