import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader, CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import type { ApiCmsEntry } from "@/lib/cms-api";

function groupPersonnel(items: ApiCmsEntry[]) {
  const groups = new Map<string, ApiCmsEntry[]>();
  for (const p of items) {
    const g = p.summary ?? "其他";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "zh"));
}

export default function Structure() {
  const { channel } = useCmsChannel("/structure");
  const { items, loading } = useCmsEntries({ moduleCode: "personnel" });
  const grouped = groupPersonnel(items);

  return (
    <PartyLayout currentPageTitle={channel?.title ?? "组织机构"}>
      <div className="space-y-12">
        <CmsPageHeader
          routePath="/structure"
          fallbackTitle="组织机构"
          fallbackSubtitle="中国古生物学会设理事会、常务理事会及若干专业委员会。致力于团结全国古生物学工作者，促进学科繁荣与科学普及。"
          className="mb-10 border-l-4 border-secondary pl-6"
        />

        {loading && <p className="text-sm text-slate-500">加载中…</p>}

        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">暂无人员信息，请在管理后台维护。</p>
        )}

        {grouped.map(([group, members]) => (
          <section key={group} className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-xl font-bold text-primary">{group}</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map(p => (
                <div
                  key={p.entryId}
                  className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-6 relative overflow-hidden group rounded shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {p.category && (
                    <span className="text-xs font-semibold text-secondary uppercase tracking-widest block mb-2" style={{ color: "#715a3e" }}>
                      {p.category}
                    </span>
                  )}
                  <h4 className="text-xl font-bold text-primary mb-1">{p.title}</h4>
                  {p.bodyContent && (
                    <CmsRichTextBody html={p.bodyContent} className="text-xs text-slate-600 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PartyLayout>
  );
}
