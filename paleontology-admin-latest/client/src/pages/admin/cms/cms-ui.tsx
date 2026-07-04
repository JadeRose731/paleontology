import { useCallback, useEffect, useRef, useState } from "react";
import { ALL_SOCIETY_UNITS } from "@shared/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus, Edit, Eye, Pin, Archive, Trash2, ArrowUp, ArrowDown,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Link2, Image, EyeIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Indent, Outdent,
  Undo2, Redo2, RemoveFormatting, Minus, Table as TableIcon,
  Heading1, Heading2, Heading3, Quote, Code, Palette, Type,
} from "lucide-react";
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

function ToolbarBtn({ title, onClick, children, active }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" title={title} onClick={onClick}>
      {children}
    </Button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
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
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const lastHtmlRef = useRef(value);

  const syncFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || showPreview) return;
    if (value !== lastHtmlRef.current) {
      lastHtmlRef.current = value;
      const sel = window.getSelection();
      const hadFocus = document.activeElement === el;
      let savedRange: Range | null = null;
      if (hadFocus && sel && sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
      el.innerHTML = value;
      if (hadFocus && savedRange) {
        try {
          sel?.removeAllRanges();
          sel?.addRange(savedRange);
        } catch { /* range may be invalid after innerHTML reset */ }
      }
    }
  }, [value, showPreview]);

  const execCmd = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    syncFromEditor();
  };

  const handleFormatBlock = (tag: string) => {
    execCmd("formatBlock", tag);
  };

  const handleInsertLink = () => {
    const url = window.prompt("请输入链接地址", "https://");
    if (url) execCmd("createLink", url);
  };

  const handleInsertImage = () => {
    const url = window.prompt("请输入图片地址", "https://");
    if (url) execCmd("insertImage", url);
  };

  const handleForeColor = () => {
    const color = window.prompt("请输入颜色值（如 #ff0000、red）", "#002B49");
    if (color) execCmd("foreColor", color);
  };

  const handleBackColor = () => {
    const color = window.prompt("请输入背景色值（如 #ffff00）", "#f5e0ba");
    if (color) execCmd("hiliteColor", color);
  };

  const handleFontSize = (size: string) => {
    execCmd("fontSize", size);
  };

  const handleInsertTable = () => {
    const rows = window.prompt("行数", "3");
    const cols = window.prompt("列数", "3");
    if (!rows || !cols) return;
    const r = parseInt(rows, 10) || 3;
    const c = parseInt(cols, 10) || 3;
    let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0"><tbody>';
    for (let i = 0; i < r; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) {
        html += '<td style="border:1px solid #ddd;padding:8px;min-width:60px">&nbsp;</td>';
      }
      html += "</tr>";
    }
    html += "</tbody></table><p></p>";
    execCmd("insertHTML", html);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant={showPreview ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowPreview(!showPreview)}
        >
          <EyeIcon className="h-3 w-3 mr-1" /> {showPreview ? "继续编辑" : "预览"}
        </Button>
      </div>
      {!showPreview && (
        <>
          <div className="flex flex-wrap items-center gap-0.5 border rounded-md p-1.5 bg-muted/30">
            {/* Undo / Redo */}
            <ToolbarBtn title="撤销" onClick={() => execCmd("undo")}><Undo2 className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="重做" onClick={() => execCmd("redo")}><Redo2 className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Headings */}
            <ToolbarBtn title="标题1" onClick={() => handleFormatBlock("h1")}><Heading1 className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="标题2" onClick={() => handleFormatBlock("h2")}><Heading2 className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="标题3" onClick={() => handleFormatBlock("h3")}><Heading3 className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="正文" onClick={() => handleFormatBlock("p")}><Type className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Font size */}
            <select className="h-7 text-xs border rounded px-1 bg-background" onChange={e => { if (e.target.value) handleFontSize(e.target.value); e.target.value = ""; }} defaultValue="">
              <option value="" disabled>字号</option>
              <option value="1">小</option>
              <option value="2">较小</option>
              <option value="3">正常</option>
              <option value="4">较大</option>
              <option value="5">大</option>
              <option value="6">很大</option>
              <option value="7">超大</option>
            </select>
            <ToolbarSep />
            {/* Text formatting */}
            <ToolbarBtn title="加粗" onClick={() => execCmd("bold")}><Bold className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="斜体" onClick={() => execCmd("italic")}><Italic className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="下划线" onClick={() => execCmd("underline")}><UnderlineIcon className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="删除线" onClick={() => execCmd("strikeThrough")}><Strikethrough className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Colors */}
            <ToolbarBtn title="文字颜色" onClick={handleForeColor}><Palette className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="背景色" onClick={handleBackColor}>
              <span className="h-3.5 w-3.5 border border-current rounded-sm bg-yellow-200 block" />
            </ToolbarBtn>
            <ToolbarSep />
            {/* Alignment */}
            <ToolbarBtn title="左对齐" onClick={() => execCmd("justifyLeft")}><AlignLeft className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="居中" onClick={() => execCmd("justifyCenter")}><AlignCenter className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="右对齐" onClick={() => execCmd("justifyRight")}><AlignRight className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="两端对齐" onClick={() => execCmd("justifyFull")}><AlignJustify className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Lists */}
            <ToolbarBtn title="无序列表" onClick={() => execCmd("insertUnorderedList")}><List className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="有序列表" onClick={() => execCmd("insertOrderedList")}><ListOrdered className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="增加缩进" onClick={() => execCmd("indent")}><Indent className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="减少缩进" onClick={() => execCmd("outdent")}><Outdent className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Block elements */}
            <ToolbarBtn title="引用块" onClick={() => handleFormatBlock("blockquote")}><Quote className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="代码块" onClick={() => handleFormatBlock("pre")}><Code className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="分隔线" onClick={() => execCmd("insertHorizontalRule")}><Minus className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Insert */}
            <ToolbarBtn title="插入链接" onClick={handleInsertLink}><Link2 className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="插入图片" onClick={handleInsertImage}><Image className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn title="插入表格" onClick={handleInsertTable}><TableIcon className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarSep />
            {/* Clear */}
            <ToolbarBtn title="清除格式" onClick={() => execCmd("removeFormat")}><RemoveFormatting className="h-3.5 w-3.5" /></ToolbarBtn>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="border rounded-md p-4 min-h-[320px] bg-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 prose prose-sm max-w-none [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic"
            onInput={syncFromEditor}
            onBlur={syncFromEditor}
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </>
      )}
      {showPreview && (
        <div className="border rounded-md p-6 min-h-[320px] bg-white prose prose-sm max-w-none [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2" dangerouslySetInnerHTML={{ __html: value || "<p class='text-muted-foreground'>暂无内容</p>" }} />
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
