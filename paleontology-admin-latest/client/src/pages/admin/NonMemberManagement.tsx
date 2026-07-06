import { useState, useMemo } from "react";
import { useAdmin, type MemberRecord, type MemberDetail } from "@/contexts/AdminContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Eye, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { MEMBERSHIP_STATUS, MEMBERSHIP_STATUS_LABEL, BRANCH_MAP, getUserTypeLabel, formatBoundBranchLabel, isFormalMemberStatus } from "@shared/constants";

const ITEMS_PER_PAGE = 10;

const SENTINEL_ALL = "__all__";

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
    voucher_submitted: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    voucher_rejected: "bg-red-50 text-red-700 border border-red-200",
    invoice_pending: "bg-blue-50 text-blue-700 border border-blue-200",
    invoice_overdue: "bg-orange-50 text-orange-700 border border-orange-200",
    invoice_submitted: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    invoice_rejected: "bg-red-50 text-red-700 border border-red-200",
    active: "bg-green-50 text-green-700 border border-green-200",
    expired: "bg-gray-50 text-gray-500 border border-gray-200",
  };
  return (
    <Badge variant="outline" className={colorMap[status] || "bg-gray-50 text-gray-500 border border-gray-200"}>
      {label}
    </Badge>
  );
}

function BranchTags({ branches, branchNames }: { branches: string[]; branchNames?: string[] }) {
  const labels = branchNames?.length ? branchNames : branches.map(formatBoundBranchLabel);
  if (!labels.length) return <span className="text-muted-foreground text-xs">无</span>;
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

function NonMemberDetailSheet({
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>非会员详情</SheetTitle>
          <SheetDescription>{email}</SheetDescription>
        </SheetHeader>
        {detail ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-strata-blue-deep">基本信息</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">姓名：</span>{detail.name || "-"}</div>
                <div><span className="text-muted-foreground">性别：</span>{detail.gender || "-"}</div>
                <div><span className="text-muted-foreground">单位：</span>{detail.unit || "-"}</div>
                <div><span className="text-muted-foreground">角色：</span>{detail.role || "-"}</div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">用户类型：</span>
                  {getUserTypeLabel(detail.userType)}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">绑定分会：</span>
                  <BranchTags branches={detail.boundBranches} branchNames={detail.boundBranchNames} />
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">是否禁用：</span>{detail.disabled ? "是" : "否"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            加载中...
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function NonMemberManagement() {
  const { getAllMembers, toggleMemberDisabled } = useAdmin();

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(SENTINEL_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailEmail, setDetailEmail] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [toggleEmail, setToggleEmail] = useState("");
  const [toggleOpen, setToggleOpen] = useState(false);

  const filters = useMemo(() => ({
    search: search || undefined,
    branchId: branchFilter !== SENTINEL_ALL ? branchFilter : undefined,
  }), [search, branchFilter]);

  const members = useMemo(() => {
    const all = getAllMembers(filters);
    return all.filter(m => !isFormalMemberStatus(m.membershipStatus));
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep">非会员用户管理</h1>
        <p className="text-muted-foreground mt-1">管理非会员及入会办理中用户（申请书审核、会费凭证、发票审核未完成）</p>
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
              <span>暂无匹配的非会员用户</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邮箱</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>用户类型</TableHead>
                    <TableHead>绑定分会</TableHead>
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
                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border border-gray-200">
                          {getUserTypeLabel(m.userType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <BranchTags branches={m.boundBranches} branchNames={m.boundBranchNames} />
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

      <NonMemberDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        email={detailEmail}
      />

      <AlertDialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认操作</AlertDialogTitle>
            <AlertDialogDescription>
              确定要切换 {toggleEmail} 的启用/禁用状态吗？此操作将影响该用户的使用权限。
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
    </div>
  );
}
