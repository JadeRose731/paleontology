import PartyLayout from "@/components/PartyLayout";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { useCmsEntries } from "@/hooks/useCmsEntries";

export interface PartyRichTextPageProps {
  routePath: string;
  pageColumnCode: string;
  fallbackTitle?: string;
}

/** 党建富文本页 — pages 模块按 columnCode 读取 */
export function PartyRichTextPage({ routePath, pageColumnCode, fallbackTitle }: PartyRichTextPageProps) {
  const { channel, blocks, loading: channelLoading } = useCmsChannel(routePath);
  const { items, loading: pagesLoading } = useCmsEntries({
    moduleCode: "pages",
    columnCode: pageColumnCode,
  });

  const page = items[0];
  const pageTitle = channel?.title ?? fallbackTitle ?? pageColumnCode;
  const loading = channelLoading || pagesLoading;

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <div className="flex flex-col gap-6">
        <div className="border-b border-fossil-stone pb-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="w-1 h-6 bg-party-red inline-block" />
            {pageTitle}
          </h2>
          {(channel?.subtitle ?? channel?.kicker) && (
            <p className="text-xs text-muted-foreground mt-1">{channel?.subtitle ?? channel?.kicker}</p>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">加载中…</p>}

        {blocks.map((block, i) => (
          <section key={i} className="bg-white border border-fossil-stone rounded p-6 shadow-sm">
            {block.title && <h3 className="text-base font-bold text-primary mb-4">{block.title}</h3>}
            <CmsRichTextBody html={block.bodyContent ?? ""} />
          </section>
        ))}

        {!loading && page && (
          <section className="bg-white border border-fossil-stone rounded p-6 shadow-sm">
            {page.title && page.title !== pageTitle && (
              <h3 className="text-base font-bold text-primary mb-4">{page.title}</h3>
            )}
            <CmsRichTextBody html={page.bodyContent ?? ""} />
          </section>
        )}

        {!loading && !page && blocks.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无页面内容，请在管理后台维护。</p>
        )}
      </div>
    </PartyLayout>
  );
}
