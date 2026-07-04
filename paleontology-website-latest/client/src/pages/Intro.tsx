import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader, CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { useCmsEntries } from "@/hooks/useCmsEntries";

/** 学会简介 — CMS 驱动，无数据时保留静态兜底 */
export default function Intro() {
  const { channel, blocks, loading: channelLoading } = useCmsChannel("/intro");
  const { items: pages, loading: pagesLoading } = useCmsEntries({ moduleCode: "pages" });

  const introPages = pages.filter(p => p.columnCode?.startsWith("intro_"));
  const hasCms = !channelLoading && !pagesLoading && (introPages.length > 0 || blocks.length > 0);

  if (hasCms) {
    return (
      <PartyLayout currentPageTitle={channel?.title ?? "学会简介"}>
        <CmsPageHeader
          routePath="/intro"
          fallbackTitle="学会简介"
          fallbackSubtitle="中国古生物学会由地质学及古生物界前辈于1929年在北京正式成立，承载着推动中国地层古生物学研究与人才培养的使命。"
        />
        <div className="space-y-12">
          {blocks.map((block, i) => (
            <section key={i} className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 shadow-sm">
              {block.title && (
                <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-6 border-b-2 border-tertiary-fixed inline-block pb-1">
                  {block.title}
                </h2>
              )}
              <CmsRichTextBody html={block.bodyContent ?? ""} />
            </section>
          ))}
          {introPages.map(page => (
            <section key={page.entryId} id={page.columnCode ?? undefined} className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 shadow-sm">
              <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-6 border-b-2 border-tertiary-fixed inline-block pb-1">
                {page.title}
              </h2>
              <CmsRichTextBody html={page.bodyContent ?? ""} />
            </section>
          ))}
        </div>
      </PartyLayout>
    );
  }

  return (
    <PartyLayout currentPageTitle="学会简介">
      <div className="space-y-16">
        <section className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 relative shadow-sm" id="background">
          <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-8 border-b-2 border-tertiary-fixed inline-block pb-1">
            学会背景
          </h2>
          <div className="space-y-6 text-on-surface-variant text-sm lg:text-base leading-relaxed text-slate-700">
            <p>
              中国古生物学会由地质学及古生物界前辈丁文江、葛利普、孙云铸等学者于1929年8月在北京正式成立。作为中国最早建立的跨学科自然科学社团之一，学会始终承载着推动中国地层古生物学研究与人才培养的使命。
            </p>
            <p>
              在将近一个世纪的历程中，学会不仅见证了中国“恐龙之乡”的发现，更在澄江生物群、热河生物群以及早期人类进化研究中扮演了不可替代的协调与推动角色。
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 border border-fossil-stone rounded">
              <span className="text-3xl font-bold text-primary block mb-2">1929</span>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider text-slate-500">成立年份</span>
            </div>
            <div className="p-6 bg-slate-50 border border-fossil-stone rounded">
              <span className="text-3xl font-bold text-primary block mb-2">12,000+</span>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider text-slate-500">活跃会员</span>
            </div>
            <div className="p-6 bg-slate-50 border border-fossil-stone rounded">
              <span className="text-3xl font-bold text-primary block mb-2">25+</span>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider text-slate-500">专业委员会</span>
            </div>
          </div>
        </section>
      </div>
    </PartyLayout>
  );
}
