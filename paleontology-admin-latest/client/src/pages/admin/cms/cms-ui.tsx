import { useState } from "react";
import { ALL_SOCIETY_UNITS } from "@shared/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadCmsMedia } from "@/lib/cms-api";
import { toast } from "sonner";
import { Plus, Edit, Eye, Pin, Archive, Trash2, ArrowUp, ArrowDown, Bold, Italic, Link2, Image, Code, EyeIcon } from "lucide-react";
import { type CmsArticle, type CmsContentStatus, CMS_STATUS_LABELS } from "./cms-data";

export function scopeLabel(branchId: string | null): string {
  if (!branchId) return "学会总站";
  return ALL_SOCIETY_UNITS[branchId] || branchId;
}

export function statusBadgeClass(status: CmsContentStatus): string {
  if (status === "published") return "text-green-700 border-green-300 bg-green-50";
  if (status === "draft") return "text-amber-700 border-amber-300 bg-amber-50";
  return "text-gray-600 border-gray-300 bg-gray-50";
}

export function RichTextEditor({
  value,
  onChange,
  label = "正文内容",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const wrapSelection = (before: string, after: string) => {
    const ta = document.getElementById("cms-richtext-area") as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || "文本";
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-1">
          <Button type="button" variant={mode === "edit" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setMode("edit")}>
            <Code className="h-3 w-3 mr-1" /> 源码
          </Button>
          <Button type="button" variant={mode === "preview" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setMode("preview")}>
            <EyeIcon className="h-3 w-3 mr-1" /> 预览
          </Button>
        </div>
      </div>
      {mode === "edit" && (
        <>
          <div className="flex flex-wrap gap-1 border rounded-md p-1 bg-muted/30">
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="加粗" onClick={() => wrapSelection("<strong>", "</strong>")}>
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="斜体" onClick={() => wrapSelection("<em>", "</em>")}>
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="链接" onClick={() => wrapSelection('<a href="https://" target="_blank">', "</a>")}>
              <Link2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="图片"
              onClick={() => wrapSelection('<img src="/media/" alt="" />', "")}
            >
              <Image className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => wrapSelection("<table><tr><td>", "</td></tr></table>")}>
              表格
            </Button>
          </div>
          <Textarea
            id="cms-richtext-area"
            rows={8}
            className="font-mono text-xs"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="支持 HTML 格式"
          />
        </>
      )}
      {mode === "preview" && (
        <div className="border rounded-md p-4 min-h-[160px] bg-white prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: value || "<p class='text-muted-foreground'>暂无内容</p>" }} />
      )}
    </div>
  );
}

export function DeleteButton({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600" title="删除">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除？</AlertDialogTitle>
          <AlertDialogDescription>确定删除「{title}」？此操作不可恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ArticleSection({
  title,
  description,
  items,
  onAdd,
  onEdit,
  onPreview,
  onTogglePin,
  onPublish,
  onArchive,
  onDelete,
}: {
  title: string;
  description: string;
  items: CmsArticle[];
  onAdd: () => void;
  onEdit: (item: CmsArticle) => void;
  onPreview: (item: CmsArticle) => void;
  onTogglePin: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> 新建
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>归属</TableHead>
              <TableHead>首页</TableHead>
              <TableHead>附件</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  暂无内容
                </TableCell>
              </TableRow>
            ) : (
              items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      {item.pinned && <Pin className="h-3 w-3 text-accent-gold shrink-0" />}
                      <span className="font-medium truncate">{item.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{scopeLabel(item.branchId)}</TableCell>
                  <TableCell>{item.showOnHomepage ? "是" : "—"}</TableCell>
                  <TableCell>{item.attachments.length > 0 ? `${item.attachments.length} 个` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass(item.status)}>
                      {CMS_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => onPreview(item)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onTogglePin(item.id)}><Pin className="h-3.5 w-3.5" /></Button>
                      {item.status !== "published" && (
                        <Button variant="ghost" size="sm" className="text-green-700 text-xs" onClick={() => onPublish(item.id)}>发布</Button>
                      )}
                      {item.status === "published" && (
                        <Button variant="ghost" size="sm" onClick={() => onArchive(item.id)}><Archive className="h-3.5 w-3.5" /></Button>
                      )}
                      <DeleteButton title={item.title} onConfirm={() => onDelete(item.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SortButtons({ onUp, onDown }: { onUp: () => void; onDown: () => void }) {
  return (
    <div className="flex gap-0.5">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onUp}><ArrowUp className="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDown}><ArrowDown className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

export function MemberOnlyBadge({ memberOnly }: { memberOnly: boolean }) {
  return memberOnly ? (
    <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">仅有效会员</Badge>
  ) : (
    <Badge variant="outline" className="text-xs text-muted-foreground">公开</Badge>
  );
}

export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const entry = await uploadCmsMedia(file, label, "image");
      const url = entry.mediaUrl ?? entry.fileUrl ?? entry.coverUrl ?? "";
      if (!url) throw new Error("上传成功但未返回地址");
      onChange(url);
      toast.success("图片已上传");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="图片 URL（https://…）或下方选择本地文件上传"
      />
      <Input
        type="file"
        accept="image/*"
        className="text-xs"
        disabled={uploading}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {uploading && <p className="text-xs text-muted-foreground">上传中…</p>}
      {value && !value.startsWith("data:") && (
        <img src={value} alt="" className="h-16 w-auto max-w-full object-cover rounded border" />
      )}
      {value.startsWith("data:") && (
        <p className="text-xs text-amber-700">
          检测到 Base64 内嵌图，保存可能失败。请重新选择文件上传，或改用 URL 链接。
        </p>
      )}
    </div>
  );
}

export function AttachmentEditor({
  attachments,
  onChange,
}: {
  attachments: CmsArticle["attachments"];
  onChange: (a: CmsArticle["attachments"]) => void;
}) {
  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label>附件</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() =>
            onChange([
              ...attachments,
              { id: `att-${Date.now()}`, name: "新附件.pdf", url: "/media/file.pdf", memberOnly: false },
            ])
          }
        >
          添加附件
        </Button>
      </div>
      {attachments.map((att, idx) => (
        <div key={att.id} className="grid grid-cols-12 gap-2 items-center">
          <Input
            className="col-span-3 text-xs"
            value={att.name}
            onChange={e => {
              const next = [...attachments];
              next[idx] = { ...att, name: e.target.value };
              onChange(next);
            }}
          />
          <Input
            className="col-span-5 text-xs"
            value={att.url}
            onChange={e => {
              const next = [...attachments];
              next[idx] = { ...att, url: e.target.value };
              onChange(next);
            }}
          />
          <label className="col-span-3 flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={att.memberOnly}
              onCheckedChange={v => {
                const next = [...attachments];
                next[idx] = { ...att, memberOnly: !!v };
                onChange(next);
              }}
            />
            仅有效会员
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="col-span-1 text-red-600"
            onClick={() => onChange(attachments.filter((_, i) => i !== idx))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
