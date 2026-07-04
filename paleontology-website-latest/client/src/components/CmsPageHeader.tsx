import { useCmsChannel } from "@/hooks/useCmsChannel";

interface CmsPageHeaderProps {
  routePath: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  className?: string;
}

/** 从 CMS 栏目读取页面主标题与副标题 */
export function CmsPageHeader({ routePath, fallbackTitle, fallbackSubtitle, className = "" }: CmsPageHeaderProps) {
  const { channel, loading } = useCmsChannel(routePath);
  const title = channel?.title ?? fallbackTitle;
  const subtitle = channel?.subtitle ?? channel?.kicker ?? fallbackSubtitle;

  return (
    <header className={`mb-8 ${className}`}>
      <h1 className="text-3xl font-bold text-primary mb-2">{loading ? "…" : title}</h1>
      <div className="h-1 w-24 bg-amber-200 mb-4" style={{ backgroundColor: "#d8c49f" }} />
      {subtitle && (
        <p className="text-base text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>
      )}
    </header>
  );
}

/** 渲染 CMS 富文本正文 */
export function CmsRichTextBody({ html, className = "" }: { html: string; className?: string }) {
  if (!html?.trim()) return null;
  return (
    <div
      className={`prose prose-sm max-w-none text-slate-700 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
