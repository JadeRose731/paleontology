export type FilePreviewKind = "pdf" | "image" | "office" | "unknown";

export function getFileExtension(url: string, fileName?: string): string {
  if (url.startsWith("data:")) {
    const mime = url.split(";")[0].split(":")[1] || "";
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("png")) return "png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    if (mime.includes("gif")) return "gif";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("msword")) return "doc";
    if (mime.includes("wordprocessingml")) return "docx";
    return "";
  }

  const extFrom = (value: string) => {
    const probe = value.split("?")[0];
    const dot = probe.lastIndexOf(".");
    return dot >= 0 ? probe.slice(dot + 1).toLowerCase() : "";
  };

  return extFrom(fileName || "") || extFrom(url);
}

export function getFilePreviewKind(url: string, fileName?: string): FilePreviewKind {
  const ext = getFileExtension(url, fileName);
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "tiff"].includes(ext)) return "image";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "office";
  return "unknown";
}
