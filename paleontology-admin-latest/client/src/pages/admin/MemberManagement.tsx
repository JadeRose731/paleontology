import { useState, useMemo, useEffect } from "react";
import { useAdmin, type MemberRecord, type MemberDetail } from "@/contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Eye, UserPlus, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { MEMBERSHIP_STATUS, MEMBERSHIP_STATUS_LABEL, CONFERENCE_STATUS_LABEL, CONFERENCE_STATUS_COLOR, BRANCH_MAP, getMemberCategoryLabel, getUserTypeLabel, formatBoundBranchLabel } from "@shared/constants";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { fetchUserMembershipPayments, filterVisibleMembershipPayments, mapApiPaymentStatus, type ApiMembershipPaymentRow } from "@/lib/membership-api";

const ITEMS_PER_PAGE = 10;

const SENTINEL_ALL = "__all__";

const STATUS_OPTIONS = [
  { value: SENTINEL_ALL, label: "全部状态" },
  ...Object.entries(MEMBERSHIP_STATUS)
    .filter(([, val]) => val !== MEMBERSHIP_STATUS.NOT_MEMBER)
    .map(([key, val]) => ({
      value: val,
      label: MEMBERSHIP_STATUS_LABEL[val] || key,
    })),
];

const BRANCH_OPTIONS = [
  { value: SENTINEL_ALL, label: "全部分会" },
  ...Object.entries(BRANCH_MAP).map(([id, name]) => ({
    value: id,
    label: name,
  })),
];

function StatusBadge({ status }: { status: string }) {
  const label = MEMBERSHIP_STATUS_LABEL[status] || status;
  const colorMap: Record<string, string> = {
    not_member: "bg-gray-50 text-gray-500 border border-gray-200",
    application_submitted: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    application_rejected: "bg-red-50 text-red-700 border border-red-200",
    application_approved: "bg-green-50 text-green-700 border border-green-200",
    voucher_submitted: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    voucher_rejected: "bg-red-50 text-red-700 border border-red-200",
    invoice_pending: "bg-blue-50 text-blue-700 border border-blue-200",
    invoice_overdue: "bg-orange-50 text-orange-700 border border-orange-200",
    invoice_submitted: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    invoice_rejected: "bg-red-50 text-red-700 border border-red-200",
    active: "bg-green-50 text-green-700 border border-green-200",
    withdrawal_submitted: "bg-orange-50 text-orange-700 border border-orange-200",
    withdrawal_rejected: "bg-red-50 text-red-700 border border-red-200",
    withdrawn: "bg-gray-50 text-gray-500 border border-gray-200",
    expired: "bg-gray-50 text-gray-500 border border-gray-200",
  };
  return (
    <Badge variant="outline" className={colorMap[status] || "bg-gray-50 text-gray-500 border border-gray-200"}>
      {label}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const label = status === "active" || status === "confirmed"
    ? "会员资格有效"
    : (CONFERENCE_STATUS_LABEL[status] || MEMBERSHIP_STATUS_LABEL[status] || status);
  const colorMap: Record<string, string> = {
    ...CONFERENCE_STATUS_COLOR,
    active: CONFERENCE_STATUS_COLOR.confirmed,
    confirmed: CONFERENCE_STATUS_COLOR.confirmed,
  };
  return (
    <Badge variant="outline" className={`text-[11px] font-normal ${colorMap[status] || "bg-gray-50 text-gray-500 border border-gray-200"}`}>
      {label}
    </Badge>
  );
}

function formatDateTime(value?: string): string {
  if (!value || value === "-") return "-";
  return value.replace("T", " ").slice(0, 19);
}

function BranchTags({ branches, branchNames }: { branches: string[]; branchNames?: string[] }) {
  const labels = branchNames?.length
    ? branchNames
    : branches.map(formatBoundBranchLabel);
  if (!labels.length) {
    return <span className="text-muted-foreground text-xs">无</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <Badge key={label} variant="outline" className="text-[10px] font-normal bg-slate-50 text-slate-700 border-slate-200">
          {label}
        </Badge>
      ))}
    </div>
  );
}

function MemberDetailSheet({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const { getMemberDetail } = useAdmin();
  const detail: MemberDetail | null = email ? getMemberDetail(email) : null;
  const [preview, setPreview] = useState<{ title: string; url: string; name?: string } | null>(null);
  const [apiPayments, setApiPayments] = useState<ApiMembershipPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    if (!open || !detail?.userId) {
      setApiPayments([]);
      return;
    }
    let cancelled = false;
    setPaymentsLoading(true);
    fetchUserMembershipPayments(detail.userId)
      .then((rows) => {
        if (!cancelled) setApiPayments(filterVisibleMembershipPayments(rows ?? []));
      })
      .catch(() => {
        if (!cancelled) setApiPayments([]);
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, detail?.userId, email]);

  const paymentRows = apiPayments.length > 0
    ? apiPayments.map((p) => ({
        id: String(p.paymentId),
        type: "society_fee" as const,
        targetName: "中国古生物学会会员费",
        amount: Number(p.amount ?? 0),
        memberCategory: p.memberCategory,
        voucherUrl: p.voucherUrl || "",
        invoiceUrl: p.invoiceUrl || "",
        submitTime: p.createTime || "-",
        auditTime: p.updateTime,
        status: (() => {
          const s = mapApiPaymentStatus(p.paymentStatus);
          return s === "confirmed" ? "active" : s;
        })(),
        reviewComment: p.reviewComment,
        validEndDate: p.validEndDate,
      }))
    : (detail?.paymentHistory ?? []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-2 border-b border-[#E5E1DA]">
          <SheetTitle className="text-lg text-[#002B49]">会员详情</SheetTitle>
          <SheetDescription className="text-sm">{email}</SheetDescription>
        </SheetHeader>
        {detail ? (
          <div className="space-y-5 py-5">
            <section className="rounded-lg border border-[#E5E1DA] bg-[#FCFAF7] p-4">
              <h4 className="font-semibold text-sm text-[#002B49] mb-3 pb-2 border-b border-[#E5E1DA]">基本信息</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><span className="text-muted-foreground">姓名</span><p className="mt-0.5 font-medium">{detail.name || "-"}</p></div>
                <div><span className="text-muted-foreground">性别</span><p className="mt-0.5 font-medium">{detail.gender || "-"}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">单位</span><p className="mt-0.5 font-medium">{detail.unit || "-"}</p></div>
                <div><span className="text-muted-foreground">角色</span><p className="mt-0.5 font-medium">{detail.role || "-"}</p></div>
                <div><span className="text-muted-foreground">会员类型</span><p className="mt-0.5 font-medium">{getMemberCategoryLabel(detail.memberType)}</p></div>
                <div><span className="text-muted-foreground">用户类型</span><p className="mt-0.5 font-medium">{getUserTypeLabel(detail.userType)}</p></div>
                <div><span className="text-muted-foreground">有效期至</span><p className="mt-0.5 font-medium">{detail.expiryDate || "-"}</p></div>
                <div>
                  <span className="text-muted-foreground">会员状态</span>
                  <div className="mt-1"><StatusBadge status={detail.membershipStatus} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">是否禁用</span>
                  <p className="mt-0.5 font-medium">{detail.disabled ? "是" : "否"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1.5">绑定分会</span>
                  <BranchTags branches={detail.boundBranches} branchNames={detail.boundBranchNames} />
                </div>
                {detail.membershipAppFileUrl && (
                  <div className="col-span-2 pt-1 border-t border-[#E5E1DA]">
                    <span className="text-muted-foreground">入会申请书</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-blue-600 text-xs"
                        onClick={() => setPreview({ title: "入会申请书预览", url: detail.membershipAppFileUrl!, name: detail.membershipAppFileName })}
                      >
                        {detail.membershipAppFileName || "查看文件"}
                      </Button>
                      {detail.membershipAppStatus && <StatusBadge status={detail.membershipAppStatus} />}
                    </div>
                    {detail.membershipAppRejectReason && (
                      <p className="text-red-500 text-xs mt-1">驳回原因：{detail.membershipAppRejectReason}</p>
                    )}
                  </div>
                )}
                {detail.withdrawalAppFileUrl && (
                  <div className="col-span-2 pt-1 border-t border-[#E5E1DA]">
                    <span className="text-muted-foreground">退会申请书</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-blue-600 text-xs"
                        onClick={() => setPreview({ title: "退会申请书预览", url: detail.withdrawalAppFileUrl!, name: detail.withdrawalAppFileName })}
                      >
                        {detail.withdrawalAppFileName || "查看文件"}
                      </Button>
                      {detail.withdrawalAppStatus && <StatusBadge status={detail.withdrawalAppStatus} />}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#E5E1DA] bg-white p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E1DA]">
                <h4 className="font-semibold text-sm text-[#002B49]">缴费记录</h4>
                {!paymentsLoading && paymentRows.length > 0 && (
                  <span className="text-xs text-muted-foreground">共 {paymentRows.length} 条</span>
                )}
              </div>
              {paymentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : paymentRows.length > 0 ? (
                <div className="rounded-md border border-[#E5E1DA] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#FCFAF7] hover:bg-[#FCFAF7]">
                        <TableHead className="text-xs h-9">类型</TableHead>
                        <TableHead className="text-xs h-9">金额</TableHead>
                        <TableHead className="text-xs h-9">状态</TableHead>
                        <TableHead className="text-xs h-9">提交时间</TableHead>
                        <TableHead className="text-xs h-9 text-right">附件</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRows.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs py-2.5 align-top">
                            <p className="font-medium text-[#002B49]">
                              {"memberCategory" in p && p.memberCategory
                                ? getMemberCategoryLabel(p.memberCategory as string)
                                : "会员费"}
                            </p>
                            {"validEndDate" in p && typeof p.validEndDate === "string" && p.validEndDate && (
                              <p className="text-muted-foreground mt-0.5">至 {p.validEndDate}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2.5 align-top font-semibold text-[#002B49]">¥{p.amount}</TableCell>
                          <TableCell className="text-xs py-2.5 align-top">
                            <PaymentStatusBadge status={p.status === "active" ? "active" : p.status} />
                            {"reviewComment" in p && typeof p.reviewComment === "string" && p.reviewComment && (
                              <p className="text-red-600 text-[10px] mt-1 max-w-[140px]">{p.reviewComment}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2.5 align-top text-muted-foreground">
                            <p>{formatDateTime(p.submitTime)}</p>
                            {p.auditTime && (p.status === "active" || p.status === "confirmed") && (
                              <p className="mt-0.5">确认 {formatDateTime(p.auditTime)}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2.5 align-top text-right">
                            <div className="flex flex-col items-end gap-1">
                              {p.voucherUrl && (
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-[11px] text-blue-600"
                                  onClick={() => setPreview({ title: "缴费凭证", url: p.voucherUrl, name: "凭证" })}
                                >
                                  凭证
                                </Button>
                              )}
                              {p.invoiceUrl && (
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-[11px] text-blue-600"
                                  onClick={() => setPreview({ title: "电子发票", url: p.invoiceUrl, name: "发票" })}
                                >
                                  发票
                                </Button>
                              )}
                              {!p.voucherUrl && !p.invoiceUrl && <span className="text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无缴费记录</p>
              )}
            </section>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            加载中...
          </div>
        )}
      </SheetContent>
      <FilePreviewDialog
        open={!!preview}
        onOpenChange={(o) => { if (!o) setPreview(null); }}
        title={preview?.title || "文件预览"}
        url={preview?.url || ""}
        fileName={preview?.name}
      />
    </Sheet>
  );
}

export default function MemberManagement() {
  const { getAllMembers, toggleMemberDisabled, manualActivateMember } = useAdmin();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(SENTINEL_ALL);
  const [branchFilter, setBranchFilter] = useState(SENTINEL_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailEmail, setDetailEmail] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [toggleEmail, setToggleEmail] = useState("");
  const [toggleOpen, setToggleOpen] = useState(false);
  const [activateEmail, setActivateEmail] = useState("");
  const [activateOpen, setActivateOpen] = useState(false);

  const filters = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== SENTINEL_ALL ? statusFilter : undefined,
    branchId: branchFilter !== SENTINEL_ALL ? branchFilter : undefined,
  }), [search, statusFilter, branchFilter]);

  const members = useMemo(() => {
    const all = getAllMembers(filters);
    // Always exclude non-members — they are managed on the NonMemberManagement page
    return all.filter(m => m.membershipStatus !== MEMBERSHIP_STATUS.NOT_MEMBER);
  }, [getAllMembers, filters]);

  const totalPages = Math.max(1, Math.ceil(members.length / ITEMS_PER_PAGE));
  const paginatedMembers = members.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleBranchFilter = (value: string) => {
    setBranchFilter(value);
    setCurrentPage(1);
  };

  const handleViewDetail = (email: string) => {
    setDetailEmail(email);
    setDetailOpen(true);
  };

  const handleToggleConfirm = () => {
    if (toggleEmail) {
      toggleMemberDisabled(toggleEmail);
      setToggleEmail("");
      setToggleOpen(false);
    }
  };

  const handleActivateConfirm = () => {
    if (activateEmail) {
      manualActivateMember(activateEmail);
      setActivateEmail("");
      setActivateOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep">会员用户管理</h1>
        <p className="text-muted-foreground mt-1">管理已入会会员的缴费状态、会员资格和权限</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索邮箱或姓名..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={handleBranchFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="全部分会" />
              </SelectTrigger>
              <SelectContent>
                {BRANCH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <AlertCircle className="h-8 w-8" />
              <span>暂无匹配的会员数据</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邮箱</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>绑定分会</TableHead>
                    <TableHead>有效期</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.map((m: MemberRecord) => (
                    <TableRow key={m.email}>
                      <TableCell className="font-medium max-w-[180px] truncate" title={m.email}>
                        {m.email}
                      </TableCell>
                      <TableCell>{m.name || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={m.unit}>
                        {m.unit || "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.membershipStatus} />
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <BranchTags branches={m.boundBranches} branchNames={m.boundBranchNames} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.expiryDate || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleViewDetail(m.email)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            查看详情
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => {
                              setToggleEmail(m.email);
                              setToggleOpen(true);
                            }}
                          >
                            禁用/启用
                          </Button>
                          {m.membershipStatus !== MEMBERSHIP_STATUS.ACTIVE && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs text-green-600"
                              onClick={() => {
                                setActivateEmail(m.email);
                                setActivateOpen(true);
                              }}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              手动开通
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  共 {members.length} 条记录，第 {currentPage}/{totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <MemberDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        email={detailEmail}
      />

      <AlertDialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认操作</AlertDialogTitle>
            <AlertDialogDescription>
              确定要{toggleEmail ? "切换该会员的启用/禁用状态" : "执行此操作"}吗？此操作将影响会员的使用权限。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToggleEmail("")}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleConfirm}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>手动开通会员</AlertDialogTitle>
            <AlertDialogDescription>
              确定要手动开通 {activateEmail} 的会员资格吗？开通后该用户将获得正式会员权限。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActivateEmail("")}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateConfirm} className="bg-green-600 hover:bg-green-700">
              确认开通
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
