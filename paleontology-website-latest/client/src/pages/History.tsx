import { useMemo } from "react";
import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader, CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";

export default function History() {
  const { channel } = useCmsChannel("/history");
  const { items, loading } = useCmsEntries({ moduleCode: "timeline" });

  const nodes = useMemo(
    () => [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [items]
  );

  return (
    <PartyLayout currentPageTitle={channel?.title ?? "学会沿革"}>
      <div className="space-y-12">
        <CmsPageHeader
          routePath="/history"
          fallbackTitle="学会沿革"
          fallbackSubtitle="自1929年创立以来，中国古生物学会见证了近一个世纪中国地球科学的崛起。我们在此追溯学术脉络，致敬在深时探索中前行的先辈。"
        />

        {loading && <p className="text-sm text-slate-500">加载中…</p>}

        {!loading && nodes.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">暂无沿革节点，请在管理后台维护。</p>
        )}

        <section className="relative space-y-12 py-6 before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:bg-slate-200 before:hidden md:before:block">
          {nodes.map((node, idx) => {
            const reverse = idx % 2 === 1;
            const year = node.category ?? node.title;
            const nodeTitle = node.summary ?? "";
            return (
              <div
                key={node.entryId}
                className={`relative flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center justify-between w-full group`}
              >
                <div className="w-full md:w-[45%] bg-white p-6 border border-fossil-stone border-t-2 border-t-tertiary-fixed rounded shadow-sm hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-bold text-primary italic">{year}</span>
                  </div>
                  {nodeTitle && <h3 className="text-lg font-bold text-primary mb-3">{nodeTitle}</h3>}
                  <CmsRichTextBody html={node.bodyContent ?? ""} className="text-sm" />
                </div>
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-white z-10 hidden md:block"
                  style={{ backgroundColor: idx % 2 === 0 ? "#003358" : "#715a3e" }}
                />
                {node.coverUrl && (
                  <div className="w-full md:w-[45%] mt-6 md:mt-0">
                    <img
                      alt={nodeTitle || year}
                      className="rounded-lg border border-fossil-stone shadow-sm w-full object-cover"
                      src={node.coverUrl}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </PartyLayout>
  );
}
