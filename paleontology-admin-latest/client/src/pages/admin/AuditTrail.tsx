import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, FilterX, History, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ROLE_LABEL,
  fetchAuditLogs,
  formatAuditSummary,
  parseAuditDetail,
  type ApiAuditLogRow,
  type AuditCustomerDetail,
} from "@/lib/audit-api";

const ITEMS_PER_PAGE = 15;

const TARGET_TYPE_OPTIONS = [
  { value: "all", label: "全部目标" },
  { value: "membership", label: "会员" },
  { value: "conference", label: "会议" },
  { value: "cms", label: "CMS" },
  { value: "binding", label: "绑定" },
  { value: "recognition", label: "识别" },
];

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-strata-blue-deep border-b border-fossil-stone pb-1">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">{label}：</span>
      <span className="break-all">{value}</span>
    </div>
  );
}

function AuditDetailPanel({ row }: { row: ApiAuditLogRow }) {
  const detail: AuditCustomerDetail | null = parseAuditDetail(row.detailJson);
  const hasUserInfo = !!(detail?.userName || detail?.userEmail || detail?.userPhone || detail?.userUnit);
  const hasChangeInfo = !!(detail?.statusBefore || detail?.statusAfter || detail?.reviewComment);

  return (
    <div className="space-y-5 mt-4 text-sm">
      <DetailSection title="操作信息">
        <DetailRow label="操作时间" value={row.createTime} />
        <DetailRow label="审核人" value={row.operatorEmail} />
        <DetailRow label="审核角色" value={AUDIT_ROLE_LABEL[row.operatorRole] || row.operatorRole} />
        <DetailRow label="操作类型" value={AUDIT_ACTION_LABEL[row.action] || row.action} />
        <DetailRow label="操作摘要" value={formatAuditSummary(row.summary)} />
      </DetailSection>

      {hasUserInfo && (
        <DetailSection title="相关用户">
          <DetailRow label="姓名" value={detail?.userName} />
          <DetailRow label="邮箱" value={detail?.userEmail} />
          <DetailRow label="手机" value={detail?.userPhone} />
          <DetailRow label="单位" value={detail?.userUnit} />
          <DetailRow label="申请类型" value={detail?.applicationType} />
          <DetailRow label="会员类别" value={detail?.memberCategory} />
          <DetailRow label="相关会议" value={detail?.conferenceTitle} />
        </DetailSection>
      )}

      {hasChangeInfo && (
        <DetailSection title="变更说明">
          {(detail?.statusBefore || detail?.statusAfter) && (
            <div className="flex gap-2 items-center">
              <span className="text-muted-foreground shrink-0">处理结果：</span>
              <span>
                {detail?.statusBefore || "—"}
                <span className="mx-1.5 text-muted-foreground">→</span>
                {detail?.statusAfter || "—"}
              </span>
            </div>
          )}
          <DetailRow label="审核意见" value={detail?.reviewComment} />
        </DetailSection>
      )}

      {!hasUserInfo && !hasChangeInfo && row.detailJson && (
        <DetailSection title="变更说明">
          <DetailRow label="处理结果" value={formatAuditSummary(row.summary)} />
        </DetailSection>
      )}
    </div>
  );
}

export default function AuditTrail() {
  const [rows, setRows] = useState<ApiAuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiAuditLogRow | null>(null);

  const [action, setAction] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAuditLogs({
        pageNum: page,
        pageSize: ITEMS_PER_PAGE,
        action: action !== "all" ? action : undefined,
        targetType: targetType !== "all" ? targetType : undefined,
        operatorEmail: operatorEmail.trim() || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载审计日志失败");
    } finally {
      setLoading(false);
    }
  }, [page, action, targetType, operatorEmail, startTime, endTime]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const resetFilters = () => {
    setAction("all");
    setTargetType("all");
    setOperatorEmail("");
    setStartTime("");
    setEndTime("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep flex items-center gap-2">
          <History className="h-6 w-6" />
          审计追溯
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          关键管理操作历史记录（只读）。审核工作台处理待办，本页查询已落库的操作日志。
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>操作类型</Label>
              <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部操作</SelectItem>
                  {Object.entries(AUDIT_ACTION_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>目标类型</Label>
              <Select value={targetType} onValueChange={(v) => { setTargetType(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>操作者邮箱</Label>
              <Input
                placeholder="模糊搜索"
                value={operatorEmail}
                onChange={(e) => setOperatorEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), void load())}
              />
            </div>
            <div className="space-y-1.5">
              <Label>时间范围</Label>
              <div className="flex gap-2">
                <Input type="date" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <Input type="date" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => { setPage(1); void load(); }}>
              <Search className="h-4 w-4 mr-1" />查询
            </Button>
            <Button size="sm" variant="outline" onClick={resetFilters}>
              <FilterX className="h-4 w-4 mr-1" />重置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">操作日志</CardTitle>
          <CardDescription>共 {total} 条记录</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">暂无审计记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.logId}>
                    <TableCell className="text-xs whitespace-nowrap">{row.createTime}</TableCell>
                    <TableCell className="text-sm">{row.operatorEmail}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {AUDIT_ROLE_LABEL[row.operatorRole] || row.operatorRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {AUDIT_ACTION_LABEL[row.action] || row.action}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={formatAuditSummary(row.summary)}>
                      {formatAuditSummary(row.summary)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>详情</Button>
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

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>操作详情</SheetTitle>
            <SheetDescription>
              {selected ? formatAuditSummary(selected.summary) : ""}
            </SheetDescription>
          </SheetHeader>
          {selected && <AuditDetailPanel row={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
