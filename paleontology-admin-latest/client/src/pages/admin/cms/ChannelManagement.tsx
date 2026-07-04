import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import {
  type ApiCmsChannel,
  type ApiCmsChannelTreeNode,
  listCmsChannelTree,
  createCmsChannel,
  updateCmsChannel,
  deleteCmsChannel,
  updateCmsChannelStatus,
} from "@/lib/cms-api";
import {
  LAYOUT_TYPE_OPTIONS,
  PAGE_TYPE_OPTIONS,
  SHELL_TYPE_OPTIONS,
  CONTENT_MODULE_OPTIONS,
  resolveAdminSection,
} from "@/lib/cms-channel-nav";
import LayoutParamsEditor from "@/pages/admin/cms/LayoutParamsEditor";
import { listCmsLayouts, type ApiCmsLayout } from "@/lib/cms-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, RefreshCw, ChevronRight } from "lucide-react";

const LAYOUT_LABELS: Record<string, string> = {
  list: "文章列表",
  "list-multi-column": "多栏列表",
  timeline: "时间线",
  "gallery-grid": "相册",
  "personnel-cards": "人员卡片",
  "richtext-single": "单页内容",
  "file-list": "文件列表",
  "hybrid-home": "首页",
  "party-hub": "党建首页",
  mixed: "混合内容",
};

const PAGE_TYPE_LABELS: Record<string, string> = {
  CMS: "内容页",
  CUSTOM: "定制页",
  HYBRID: "混合页",
};

const EMPTY_CHANNEL: ApiCmsChannel = {
  channelCode: "",
  parentId: 0,
  navName: "",
  routePath: "",
  title: "",
  subtitle: "",
  layoutType: "list",
  layoutParams: "{}",
  contentModule: "",
  pageType: "CMS",
  shellType: "standard",
  visible: "1",
  showInAdmin: "1",
  adminSection: "",
  status: "PUBLISHED",
  locked: "0",
  sortOrder: 0,
  adminRoles: '["super_admin"]',
};

type FlatChannel = ApiCmsChannel & { depth: number };

function flattenTree(nodes: ApiCmsChannelTreeNode[], depth = 0): FlatChannel[] {
  const rows: FlatChannel[] = [];
  for (const node of nodes) {
    rows.push({ ...node.channel, depth });
    if (node.children?.length) {
      rows.push(...flattenTree(node.children, depth + 1));
    }
  }
  return rows;
}

export default function ChannelManagement() {
  const { canAccess, refreshCmsMenu } = useAdmin();
  const [tree, setTree] = useState<ApiCmsChannelTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCmsChannel | null>(null);
  const [form, setForm] = useState<ApiCmsChannel>(EMPTY_CHANNEL);
  const [layoutOptions, setLayoutOptions] = useState<ApiCmsLayout[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, layouts] = await Promise.all([listCmsChannelTree(), listCmsLayouts().catch(() => [])]);
      setTree(data);
      setLayoutOptions(layouts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess("/admin/cms/channels")) load();
  }, [canAccess, load]);

  const flatRows = useMemo(() => flattenTree(tree), [tree]);
  const parentOptions = useMemo(
    () => flatRows.filter(row => !row.routePath || row.showInAdmin === "1"),
    [flatRows]
  );

  const openCreate = (parentId = 0) => {
    setEditing(null);
    setShowAdvanced(false);
    setForm({ ...EMPTY_CHANNEL, parentId, channelCode: `channel_${Date.now()}` });
    setDialogOpen(true);
  };

  const openEdit = (channel: ApiCmsChannel) => {
    setEditing(channel);
    setShowAdvanced(false);
    setForm({ ...EMPTY_CHANNEL, ...channel });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.channelCode.trim() || !form.navName?.trim()) {
      toast.error("请填写栏目标识与导航名称");
      return;
    }
    const payload: ApiCmsChannel = {
      ...form,
      channelCode: form.channelCode.trim(),
      navName: form.navName?.trim(),
      title: form.title?.trim() || form.navName?.trim(),
      adminSection: form.adminSection?.trim() || null,
      contentModule: form.contentModule?.trim() || null,
      routePath: form.routePath?.trim() || null,
      layoutParams: form.layoutParams?.trim() || null,
    };
    try {
      if (editing?.channelId) {
        await updateCmsChannel({ ...payload, channelId: editing.channelId });
        toast.success("栏目已更新");
      } else {
        await createCmsChannel(payload);
        toast.success("栏目已创建");
      }
      setDialogOpen(false);
      await load();
      await refreshCmsMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleDelete = async (channel: ApiCmsChannel) => {
    if (!channel.channelId) return;
    if (channel.locked === "1") {
      toast.error("此栏目不可删除");
      return;
    }
    if (!window.confirm(`确定删除「${channel.navName}」？`)) return;
    try {
      await deleteCmsChannel(channel.channelId);
      toast.success("已删除");
      await load();
      await refreshCmsMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleToggleStatus = async (channel: ApiCmsChannel) => {
    if (!channel.channelId) return;
    const next = channel.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await updateCmsChannelStatus(channel.channelId, next);
      toast.success(next === "PUBLISHED" ? "已发布" : "已下线");
      await load();
      await refreshCmsMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  if (!canAccess("/admin/cms/channels")) {
    return <div className="p-8 text-muted-foreground">无权访问此页面</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-strata-blue-deep">栏目管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理网站导航栏目与内容分类，修改后左侧菜单会自动更新
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button size="sm" onClick={() => openCreate(0)}>
            <Plus className="h-4 w-4 mr-1" />
            新增栏目
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>栏目结构</CardTitle>
          <CardDescription>
            以下栏目决定了网站导航菜单和管理后台「内容管理」左侧菜单的结构
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>栏目名称</TableHead>
                <TableHead>页面地址</TableHead>
                <TableHead>页面样式</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.map(row => (
                <TableRow key={row.channelId ?? row.channelCode}>
                  <TableCell>
                    <div className="flex items-center gap-1" style={{ paddingLeft: row.depth * 16 }}>
                      {row.depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      <span className="font-medium">{row.navName}</span>
                      {row.showInAdmin === "0" && (
                        <Badge variant="secondary" className="text-[10px]">仅前台</Badge>
                      )}
                      {row.visible === "0" && (
                        <Badge variant="secondary" className="text-[10px]">仅后台</Badge>
                      )}
                      {row.locked === "1" && (
                        <Badge variant="outline" className="text-[10px]">锁定</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.routePath || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {LAYOUT_LABELS[row.layoutType ?? ""] ?? row.layoutType ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.pageType === "CUSTOM" ? "default" : "outline"}>
                      {PAGE_TYPE_LABELS[row.pageType ?? "CMS"] ?? row.pageType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(row)}
                      className={`text-sm font-medium ${
                        row.status === "PUBLISHED"
                          ? "text-green-600 hover:underline"
                          : "text-slate-400 hover:underline"
                      }`}
                    >
                      {row.status === "PUBLISHED" ? "已发布" : "草稿"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="编辑">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={row.locked === "1"}
                      onClick={() => handleDelete(row)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openCreate(row.channelId ?? 0)}>
                      + 子栏目
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && flatRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无栏目
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑栏目" : "新增栏目"}</DialogTitle>
            <DialogDescription>
              设置栏目名称、页面地址和展示样式
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基本设置</TabsTrigger>
              <TabsTrigger value="style">样式编排</TabsTrigger>
            </TabsList>

            {/* 基本设置 */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>栏目名称 <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.navName ?? ""}
                    placeholder="如：学会动态"
                    onChange={e => setForm(f => ({ ...f, navName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>所属上级</Label>
                  <Select
                    value={String(form.parentId ?? 0)}
                    onValueChange={v => setForm(f => ({ ...f, parentId: Number(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">（顶级栏目）</SelectItem>
                      {parentOptions.map(p => (
                        <SelectItem key={p.channelId} value={String(p.channelId)}>
                          {p.navName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>页面标题</Label>
                  <Input
                    value={form.title ?? ""}
                    placeholder="浏览器标题栏显示，留空则使用栏目名称"
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>页面地址</Label>
                  <Input
                    value={form.routePath ?? ""}
                    disabled={editing?.locked === "1"}
                    placeholder="如：/news-center"
                    onChange={e => setForm(f => ({ ...f, routePath: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>页面描述</Label>
                  <Input
                    value={form.subtitle ?? ""}
                    placeholder="显示在页面标题下方的说明文字"
                    onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>显示顺序</Label>
                  <Input
                    type="number"
                    value={form.sortOrder ?? 0}
                    onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>页面类型</Label>
                  <Select value={form.pageType ?? "CMS"} onValueChange={v => setForm(f => ({ ...f, pageType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-6 pt-2 border-t">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.visible !== "0"}
                    onCheckedChange={v => setForm(f => ({ ...f, visible: v ? "1" : "0" }))}
                  />
                  在网站导航中显示
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.showInAdmin !== "0"}
                    onCheckedChange={v => setForm(f => ({ ...f, showInAdmin: v ? "1" : "0" }))}
                  />
                  在后台菜单中显示
                </label>
              </div>

              {/* 高级选项折叠区 */}
              <div className="border-t pt-3">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "▾ 收起高级选项" : "▸ 展开高级选项"}
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">栏目标识</Label>
                      <Input
                        value={form.channelCode}
                        disabled={editing?.locked === "1"}
                        className="text-xs"
                        onChange={e => setForm(f => ({ ...f, channelCode: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">内容模块</Label>
                      <Select
                        value={form.contentModule ?? ""}
                        onValueChange={v => setForm(f => ({ ...f, contentModule: v || null }))}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="自动" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">（自动）</SelectItem>
                          {CONTENT_MODULE_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">后台菜单区段</Label>
                      <Input
                        value={form.adminSection ?? ""}
                        className="text-xs"
                        onChange={e => setForm(f => ({ ...f, adminSection: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">菜单图标</Label>
                      <Input
                        value={form.navIcon ?? ""}
                        className="text-xs"
                        onChange={e => setForm(f => ({ ...f, navIcon: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 样式编排 */}
            <TabsContent value="style" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>页面样式</Label>
                  <Select value={form.layoutType ?? ""} onValueChange={v => setForm(f => ({ ...f, layoutType: v }))}>
                    <SelectTrigger><SelectValue placeholder="选择样式" /></SelectTrigger>
                    <SelectContent>
                      {(layoutOptions.length > 0
                        ? layoutOptions.map(l => ({ value: l.layoutCode, label: l.layoutName }))
                        : LAYOUT_TYPE_OPTIONS
                      ).map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {layoutOptions.find(l => l.layoutCode === form.layoutType)?.description && (
                    <p className="text-xs text-muted-foreground">
                      {layoutOptions.find(l => l.layoutCode === form.layoutType)?.description}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>页面外观</Label>
                  <Select value={form.shellType ?? "standard"} onValueChange={v => setForm(f => ({ ...f, shellType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHELL_TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LayoutParamsEditor
                layoutType={form.layoutType}
                value={form.layoutParams}
                onChange={json => setForm(f => ({ ...f, layoutParams: json }))}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
