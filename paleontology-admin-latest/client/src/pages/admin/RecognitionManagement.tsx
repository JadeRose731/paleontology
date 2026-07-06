import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Eye, ScanSearch, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AUTO_STATUS_LABEL,
  FILE_ROLE_LABEL,
  MANUAL_STATUS_LABEL,
  TARGET_TYPE_LABEL,
  fetchRecognitionList,
  reviewRecognition,
  type ApiRecognitionRow,
} from "@/lib/recognition-api";
import { openFilePreview } from "@/lib/file-preview";

const ITEMS_PER_PAGE = 12;

function StatusBadge({ status, map }: { status: string; map: Record<string, string> }) {
  const label = map[status] || status;
  const color =
    status === "passed" || status === "confirmed"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "failed" || status === "disputed"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-gray-50 text-gray-600 border-gray-200";
  return <Badge variant="outline" className={color}>{label}</Badge>;
}

export default function RecognitionManagement() {
  const [rows, setRows] = useState<ApiRecognitionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [manualFilter, setManualFilter] = useState("all");

  const [reviewTarget, setReviewTarget] = useState<ApiRecognitionRow | null>(null);
  const [reviewMode, setReviewMode] = useState<"confirmed" | "disputed" | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<ApiRecognitionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRecognitionList({
        pageNum: page,
        pageSize: ITEMS_PER_PAGE,
        status: statusFilter !== "all" ? statusFilter : undefined,
        targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
        manualStatus: manualFilter !== "all" ? manualFilter : undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载识别结果失败");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, targetTypeFilter, manualFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const handleReview = async () => {
    if (!reviewTarget || !reviewMode) return;
    setSubmitting(true);
    try {
      await reviewRecognition(reviewTarget.resultId, reviewMode, reviewComment);
      toast.success(reviewMode === "confirmed" ? "已标记为确认无误" : "已标记为存疑");
      setReviewTarget(null);
      setReviewMode(null);
      setReviewComment("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "复核失败");
    } finally {
      setSubmitting(false);
    }
  };

  const parseAutoDetail = (json?: string | null) => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep flex items-center gap-2">
          <ScanSearch className="h-6 w-6" />
          识别结果
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          凭证/发票智能识别（模拟 OCR）结果复核。上传后自动生成识别记录，可人工确认或标记存疑。
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5 min-w-[140px]">
              <Label>自动结果</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="passed">识别通过</SelectItem>
                  <SelectItem value="failed">识别失败</SelectItem>
                  <SelectItem value="pending">待识别</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label>费用类型</Label>
              <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="membership">会员费</SelectItem>
                  <SelectItem value="conference">会议费</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label>人工状态</Label>
              <Select value={manualFilter} onValueChange={(v) => { setManualFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="none">未复核</SelectItem>
                  <SelectItem value="confirmed">确认无误</SelectItem>
                  <SelectItem value="disputed">存疑</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">识别记录</CardTitle>
          <CardDescription>共 {total} 条</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">暂无识别记录（用户上传凭证/发票后将自动生成）</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>文件</TableHead>
                  <TableHead>自动结果</TableHead>
                  <TableHead>人工状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.resultId}>
                    <TableCell>
                      <div className="text-sm font-medium">{row.userName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {TARGET_TYPE_LABEL[row.targetType] || row.targetType}
                      <span className="text-muted-foreground"> / {FILE_ROLE_LABEL[row.fileRole] || row.fileRole}</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={row.fileName}>{row.fileName || "—"}</TableCell>
                    <TableCell><StatusBadge status={row.autoStatus} map={AUTO_STATUS_LABEL} /></TableCell>
                    <TableCell>
                      {row.manualStatus
                        ? <StatusBadge status={row.manualStatus} map={MANUAL_STATUS_LABEL} />
                        : <span className="text-xs text-muted-foreground">未复核</span>}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.createTime}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openFilePreview(row.fileUrl)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDetailTarget(row)}>详情</Button>
                      {!row.manualStatus && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-700" onClick={() => { setReviewTarget(row); setReviewMode("confirmed"); }}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />确认
                          </Button>
                          <Button size="sm" variant="outline" className="text-orange-700" onClick={() => { setReviewTarget(row); setReviewMode("disputed"); }}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />存疑
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">第 {page} / {totalPages} 页</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewTarget && !!reviewMode} onOpenChange={(open) => !open && (setReviewTarget(null), setReviewMode(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewMode === "confirmed" ? "确认无误" : "标记存疑"}</DialogTitle>
            <DialogDescription>
              {reviewTarget?.userEmail} — {TARGET_TYPE_LABEL[reviewTarget?.targetType ?? ""]} {FILE_ROLE_LABEL[reviewTarget?.fileRole ?? ""]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>备注（可选）</Label>
            <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="人工复核说明…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewTarget(null); setReviewMode(null); }}>取消</Button>
            <Button onClick={() => void handleReview()} disabled={submitting}>
              {submitting ? "提交中…" : "确认提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>识别详情</DialogTitle>
            <DialogDescription>结果 ID：{detailTarget?.resultId}</DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">用户：</span>{detailTarget.userName} ({detailTarget.userEmail})</div>
              <div><span className="text-muted-foreground">类型：</span>{TARGET_TYPE_LABEL[detailTarget.targetType]} / {FILE_ROLE_LABEL[detailTarget.fileRole]}</div>
              <div><span className="text-muted-foreground">自动结果：</span>{AUTO_STATUS_LABEL[detailTarget.autoStatus]}</div>
              {detailTarget.autoDetail && (
                <div>
                  <p className="text-muted-foreground mb-1">识别详情：</p>
                  <pre className="bg-slate-50 border rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(parseAutoDetail(detailTarget.autoDetail), null, 2)}
                  </pre>
                </div>
              )}
              {detailTarget.manualStatus && (
                <div>
                  <span className="text-muted-foreground">人工复核：</span>
                  {MANUAL_STATUS_LABEL[detailTarget.manualStatus]}
                  {detailTarget.manualComment && ` — ${detailTarget.manualComment}`}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => openFilePreview(detailTarget.fileUrl)}>
                <Eye className="h-4 w-4 mr-1" />查看原文件
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
