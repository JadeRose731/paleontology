import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getFilePreviewKind } from "@/lib/file-preview";

export function FilePreviewDialog({
  open,
  onOpenChange,
  url,
  fileName,
  title = "文件预览",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
  title?: string;
}) {
  const kind = url ? getFilePreviewKind(url, fileName) : "unknown";
  const displayName = fileName || "附件";
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (!open || kind !== "pdf" || !url) {
      setPdfPreviewUrl("");
      setPdfError(false);
      setPdfLoading(false);
      return;
    }

    if (url.startsWith("data:")) {
      setPdfPreviewUrl(url);
      setPdfError(false);
      setPdfLoading(false);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(false);
    setPdfPreviewUrl("");

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const pdfBlob = blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPdfError(true);
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, url, kind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {fileName ? <DialogDescription>{fileName}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-3">
          {!url ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
              <FileText className="h-12 w-12" />
              <span>暂无文件</span>
            </div>
          ) : kind === "pdf" ? (
            pdfLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>正在加载 PDF…</span>
              </div>
            ) : pdfError || !pdfPreviewUrl ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-12">
                <FileText className="h-12 w-12" />
                <p className="text-sm text-center">PDF 在线预览失败，请下载后查看或在浏览器新窗口打开。</p>
              </div>
            ) : (
              <iframe
                src={pdfPreviewUrl}
                title={displayName}
                className="w-full h-[60vh] border rounded bg-white"
              />
            )
          ) : kind === "image" ? (
            <div className="flex items-center justify-center overflow-auto">
              <img src={url} alt={displayName} className="max-w-full max-h-[60vh] object-contain rounded border" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground py-12">
              <FileText className="h-12 w-12" />
              <p className="text-sm text-center">
                {kind === "office"
                  ? "Word/Excel 等 Office 文档无法在浏览器内直接预览，请下载后查看。"
                  : "该文件类型暂不支持在线预览，请下载后查看。"}
              </p>
            </div>
          )}
          {url ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={url} download={fileName} target="_blank" rel="noopener noreferrer">
                  下载原件
                </a>
              </Button>
              {kind === "pdf" ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    新窗口打开
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
