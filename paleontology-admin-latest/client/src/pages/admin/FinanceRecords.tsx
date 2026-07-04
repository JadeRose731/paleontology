import { useState, useMemo } from "react";
import { useAdmin, type ReviewItem } from "@/contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye, FileText, CreditCard, AlertCircle, ChevronLeft, ChevronRight,
  Download, Building2, Calendar, Users, Receipt, FilterX, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  MEMBERSHIP_STATUS_LABEL, CONFERENCE_STATUS_LABEL, CONFERENCE_STATUS_COLOR,
  ALL_SOCIETY_UNITS, CONFERENCE_FEE_TYPE_LABEL, CONFERENCE_FEE_TYPE,
} from "@shared/constants";

const ITEMS_PER_PAGE = 10;
const COLOR_MAP = CONFERENCE_STATUS_COLOR;

function saveExportBlobs(blobs: Blob[], baseName: string) {
  if (blobs.length === 1) {
    saveAs(blobs[0], `${baseName}.zip`);
  } else {
    blobs.forEach((blob, i) => saveAs(blob, `${baseName}_part${i + 1}.zip`));
    toast.info(`数据量较大，已自动拆分为 ${blobs.length} 个 ZIP 包（每包 ≤1GB）`);
  }
}

function ExportStructurePreview({ scope }: { scope: "branch" | "conference" | "global" }) {
  const today = new Date().toISOString().split("T")[0];
  const root =
    scope === "global"
      ? `export_global_all_${today}/{学会名}/`
      : scope === "branch"
        ? `export_branch_{学会ID}_${today}/`
        : `export_conference_{会议ID}_${today}/`;

  return (
    <Card className="bg-slate-50 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ZIP 目录结构规范</CardTitle>
        <CardDescription className="text-xs">
          根目录 <code className="text-[11px]">{root}</code>，文件命名：<code className="text-[11px]">{"{姓名}_{身份}_{日期}_{流水号}.ext"}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground font-mono space-y-0.5 pb-4">
        <div>├── 学生会员/缴费凭证/</div>
        <div>├── 学生会员/电子发票/</div>
        <div>├── 非学生会员/…</div>
        <div>├── 学生（非会员）/…</div>
        <div>├── 非学生（非会员）/…</div>
        <div>└── 汇总台账.csv</div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const label = MEMBERSHIP_STATUS_LABEL[status] || CONFERENCE_STATUS_LABEL[status] || status;
  const color = COLOR_MAP[status] || "bg-gray-50 text-gray-500 border border-gray-200";
  return (
    <Badge variant="outline" className={color}>
      {label}
    </Badge>
  );
}

function RecordDetailDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ReviewItem | null;
}) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>记录详情</DialogTitle>
          <DialogDescription>{record.id}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">用户邮箱：</span>
              <span>{record.userEmail}</span>
            </div>
            <div>
              <span className="text-muted-foreground">用户名：</span>
              <span>{record.userName || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">费用类型：</span>
              <Badge variant="outline" className="text-xs">
                {record.type === "society_fee" ? "会员费" : "会议费"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">金额：</span>
              <span className="font-semibold">¥{record.amount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">目标名称：</span>
              <span>{record.targetName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">OCR金额：</span>
              <span>{record.ocrAmount !== undefined ? `¥${record.ocrAmount}` : "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">凭证提交时间：</span>
              <span>{record.submitTime || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">发票截止日：</span>
              <span>{record.invoiceDeadline || "-"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">当前状态：</span>
              <StatusBadge status={record.status} />
            </div>
            {record.rejectReason && (
              <div className="col-span-2">
                <span className="text-muted-foreground">驳回原因：</span>
                <span className="text-party-red">{record.rejectReason}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">凭证文件</h4>
            {record.voucherUrl ? (
              <img src={record.voucherUrl} alt="Voucher" className="max-h-48 rounded border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> 无凭证文件
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">发票文件</h4>
            {record.invoiceUrl ? (
              <img src={record.invoiceUrl} alt="Invoice" className="max-h-48 rounded border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> 无发票文件
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// VIEW 1: ALL RECORDS (existing view, slightly enhanced)
// ============================================================================

function AllRecordsView() {
  const { getAllPaymentRecords } = useAdmin();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<ReviewItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const records = useMemo(() => {
    let data = getAllPaymentRecords();
    if (typeFilter !== "all") data = data.filter((r) => r.type === typeFilter);
    if (statusFilter !== "all") data = data.filter((r) => r.status === statusFilter);
    if (dateFrom) data = data.filter((r) => r.submitTime >= dateFrom);
    if (dateTo) data = data.filter((r) => r.submitTime <= dateTo + "T23:59:59");
    return data;
  }, [getAllPaymentRecords, typeFilter, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(records.length / ITEMS_PER_PAGE));
  const paginatedRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTypeFilter = (value: string) => { setTypeFilter(value); setCurrentPage(1); };
  const handleStatusFilter = (value: string) => { setStatusFilter(value); setCurrentPage(1); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={handleTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="society_fee">会员费</SelectItem>
                <SelectItem value="conference_fee">会议费</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="voucher_submitted">凭证初审中</SelectItem>
                <SelectItem value="voucher_rejected">凭证被驳回</SelectItem>
                <SelectItem value="invoice_pending">待上传发票</SelectItem>
                <SelectItem value="invoice_submitted">发票终审中</SelectItem>
                <SelectItem value="invoice_rejected">发票被驳回</SelectItem>
                <SelectItem value="invoice_overdue">发票逾期</SelectItem>
                <SelectItem value="active">已开通</SelectItem>
                <SelectItem value="confirmed">已确认</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">提交日期：</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-[150px]" />
              <span className="text-muted-foreground">至</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-[150px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <AlertCircle className="h-8 w-8" />
              <span>暂无财务记录</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>记录ID</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>凭证提交</TableHead>
                    <TableHead>发票提交</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((r: ReviewItem) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate" title={r.id}>{r.id}</TableCell>
                      <TableCell className="font-medium">{r.userName || r.userEmail}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.type === "society_fee" ? "会员费" : "会议费"}</Badge></TableCell>
                      <TableCell><span className="font-medium">{r.amount ? `¥${r.amount}` : "-"}</span></TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{r.submitTime || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{r.invoiceDeadline || "-"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                          <Eye className="h-3 w-3 mr-1" />查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">共 {records.length} 条记录，第 {currentPage}/{totalPages} 页</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />上一页
                  </Button>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                    下一页<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <RecordDetailDialog open={detailOpen} onOpenChange={setDetailOpen} record={detailRecord} />
    </div>
  );
}

// ============================================================================
// VIEW 2: BY BRANCH (按学会查看)
// ============================================================================

function ByBranchView() {
  const { getAllPaymentRecords, getAllConferences, generateExportZip } = useAdmin();

  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const allRecords = getAllPaymentRecords();
  const allConfs = getAllConferences();

  const branchOptions = useMemo(() => {
    return Object.entries(ALL_SOCIETY_UNITS).map(([id, name]) => ({ value: id, label: name }));
  }, []);

  // Categorize records by the 4 population groups for the selected branch
  const categorizedRecords = useMemo(() => {
    if (!selectedBranch) return null;

    const branchConfs = allConfs.filter(c => c.branchId === selectedBranch);
    const branchConfIds = new Set(branchConfs.map(c => c.id));

    const categories: Record<string, { vouchers: ReviewItem[]; invoices: ReviewItem[] }> = {
      [CONFERENCE_FEE_TYPE.STUDENT_MEMBER]: { vouchers: [], invoices: [] },
      [CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER]: { vouchers: [], invoices: [] },
      [CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER]: { vouchers: [], invoices: [] },
      [CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER]: { vouchers: [], invoices: [] },
    };

    for (const record of allRecords) {
      // For conference fees, only include those matching this branch's conferences
      if (record.type === "conference_fee" && record.confId && !branchConfIds.has(record.confId)) {
        continue;
      }

      // Determine fee type based on user data
      const typeKey = `paleo_admin_user_type_${record.userEmail}`;
      const userType = localStorage.getItem(typeKey) || "regular";
      const allUsers: { email: string; role?: string }[] = JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
      const user = allUsers.find(u => u.email === record.userEmail);
      const isStudent = user?.role === "学生";
      let feeType: string;
      if (userType === "member") {
        feeType = isStudent ? CONFERENCE_FEE_TYPE.STUDENT_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER;
      } else {
        feeType = isStudent ? CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER;
      }

      if (!categories[feeType]) continue;

      // Categorize as voucher or invoice based on status
      const status = record.status;
      if (status === "voucher_submitted" || status === "voucher_rejected" || status === "active" || status === "confirmed") {
        categories[feeType].vouchers.push(record);
      }
      if (status === "invoice_submitted" || status === "invoice_rejected" || status === "invoice_pending" || status === "invoice_overdue" || status === "active" || status === "confirmed") {
        categories[feeType].invoices.push(record);
      }
    }

    return categories;
  }, [selectedBranch, allRecords, allConfs]);

  const handleExport = async () => {
    if (!selectedBranch) return;
    setIsExporting(true);
    try {
      const blobs = await generateExportZip({ scope: "branch", scopeId: selectedBranch });
      const branchName = ALL_SOCIETY_UNITS[selectedBranch] || selectedBranch;
      const fileName = `export_branch_${branchName}_${new Date().toISOString().split("T")[0]}`;
      saveExportBlobs(blobs, fileName);
      toast.success("导出成功");
    } catch (e) {
      toast.error("导出失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsExporting(false);
    }
  };

  const [detailRecord, setDetailRecord] = useState<ReviewItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="space-y-4">
      <ExportStructurePreview scope="branch" />
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium whitespace-nowrap">选择学会/分会：</label>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[380px]">
            <SelectValue placeholder="请选择学会或分会" />
          </SelectTrigger>
          <SelectContent>
            {branchOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBranch && (
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "导出中…" : "导出该学会全部"}
          </Button>
        )}
      </div>

      {!selectedBranch ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            请从上方下拉菜单中选择一个学会或分会以查看其凭证和发票分类
          </CardContent>
        </Card>
      ) : categorizedRecords ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {([
            { key: CONFERENCE_FEE_TYPE.STUDENT_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_MEMBER], icon: GraduationCap },
            { key: CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER], icon: Users },
            { key: CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER], icon: GraduationCap },
            { key: CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER], icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => {
            const cat = categorizedRecords[key];
            const totalVouchers = cat.vouchers.length;
            const totalInvoices = cat.invoices.length;

            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </CardTitle>
                  <CardDescription>
                    凭证 {totalVouchers} 条 · 发票 {totalInvoices} 条
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {totalVouchers === 0 && totalInvoices === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无记录</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Voucher section */}
                      {totalVouchers > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-strata-blue-deep mb-1.5 flex items-center gap-1">
                            <Receipt className="h-3 w-3" /> 缴费凭证 ({totalVouchers})
                          </h4>
                          <div className="space-y-1">
                            {cat.vouchers.slice(0, 5).map((r) => (
                              <div key={r.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                                <div>
                                  <span className="font-medium">{r.userName || r.userEmail}</span>
                                  <span className="text-muted-foreground ml-2">¥{r.amount}</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {totalVouchers > 5 && (
                              <p className="text-xs text-muted-foreground text-center">… 还有 {totalVouchers - 5} 条</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Invoice section */}
                      {totalInvoices > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-strata-blue-deep mb-1.5 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> 电子发票 ({totalInvoices})
                          </h4>
                          <div className="space-y-1">
                            {cat.invoices.slice(0, 5).map((r) => (
                              <div key={r.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                                <div>
                                  <span className="font-medium">{r.userName || r.userEmail}</span>
                                  <span className="text-muted-foreground ml-2">¥{r.amount}</span>
                                  <StatusBadge status={r.status} />
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {totalInvoices > 5 && (
                              <p className="text-xs text-muted-foreground text-center">… 还有 {totalInvoices - 5} 条</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <RecordDetailDialog open={detailOpen} onOpenChange={setDetailOpen} record={detailRecord} />
    </div>
  );
}

// ============================================================================
// VIEW 3: BY CONFERENCE (按会议查看)
// ============================================================================

function ByConferenceView() {
  const { getAllPaymentRecords, getAllConferences, generateExportZip } = useAdmin();

  const [selectedConf, setSelectedConf] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const allRecords = getAllPaymentRecords();
  const allConfs = getAllConferences();

  const conferenceOptions = useMemo(() => {
    return allConfs.map(c => ({ value: c.id, label: `${c.name} (${c.branchName})` }));
  }, [allConfs]);

  // Categorize records by the 4 population groups for the selected conference
  const categorizedRecords = useMemo(() => {
    if (!selectedConf) return null;

    const categories: Record<string, { vouchers: ReviewItem[]; invoices: ReviewItem[] }> = {
      [CONFERENCE_FEE_TYPE.STUDENT_MEMBER]: { vouchers: [], invoices: [] },
      [CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER]: { vouchers: [], invoices: [] },
      [CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER]: { vouchers: [], invoices: [] },
      [CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER]: { vouchers: [], invoices: [] },
    };

    for (const record of allRecords) {
      // Only conference fee records for this specific conference
      if (record.type !== "conference_fee" || record.confId !== selectedConf) continue;

      const typeKey = `paleo_admin_user_type_${record.userEmail}`;
      const userType = localStorage.getItem(typeKey) || "regular";
      const allUsers: { email: string; role?: string }[] = JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
      const user = allUsers.find(u => u.email === record.userEmail);
      const isStudent = user?.role === "学生";
      let feeType: string;
      if (userType === "member") {
        feeType = isStudent ? CONFERENCE_FEE_TYPE.STUDENT_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER;
      } else {
        feeType = isStudent ? CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER;
      }

      if (!categories[feeType]) continue;

      const status = record.status;
      if (status === "voucher_submitted" || status === "voucher_rejected" || status === "confirmed") {
        categories[feeType].vouchers.push(record);
      }
      if (status === "invoice_submitted" || status === "invoice_rejected" || status === "invoice_pending" || status === "invoice_overdue" || status === "confirmed") {
        categories[feeType].invoices.push(record);
      }
    }

    return categories;
  }, [selectedConf, allRecords]);

  const handleExport = async () => {
    if (!selectedConf) return;
    setIsExporting(true);
    try {
      const blobs = await generateExportZip({ scope: "conference", scopeId: selectedConf });
      const conf = allConfs.find(c => c.id === selectedConf);
      const fileName = `export_conference_${conf?.name?.slice(0, 20) || selectedConf}_${new Date().toISOString().split("T")[0]}`;
      saveExportBlobs(blobs, fileName);
      toast.success("导出成功");
    } catch (e) {
      toast.error("导出失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsExporting(false);
    }
  };

  const [detailRecord, setDetailRecord] = useState<ReviewItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="space-y-4">
      <ExportStructurePreview scope="conference" />
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium whitespace-nowrap">选择会议：</label>
        <Select value={selectedConf} onValueChange={setSelectedConf}>
          <SelectTrigger className="w-[420px]">
            <SelectValue placeholder="请选择会议" />
          </SelectTrigger>
          <SelectContent>
            {conferenceOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedConf && (
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "导出中…" : "导出该会议全部"}
          </Button>
        )}
      </div>

      {!selectedConf ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            请从上方下拉菜单中选择一场会议以查看其凭证和发票分类
          </CardContent>
        </Card>
      ) : categorizedRecords ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {([
            { key: CONFERENCE_FEE_TYPE.STUDENT_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_MEMBER], icon: GraduationCap },
            { key: CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER], icon: Users },
            { key: CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER], icon: GraduationCap },
            { key: CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER, label: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER], icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => {
            const cat = categorizedRecords[key];
            const totalVouchers = cat.vouchers.length;
            const totalInvoices = cat.invoices.length;

            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </CardTitle>
                  <CardDescription>
                    凭证 {totalVouchers} 条 · 发票 {totalInvoices} 条
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {totalVouchers === 0 && totalInvoices === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无记录</p>
                  ) : (
                    <div className="space-y-3">
                      {totalVouchers > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-strata-blue-deep mb-1.5 flex items-center gap-1">
                            <Receipt className="h-3 w-3" /> 缴费凭证 ({totalVouchers})
                          </h4>
                          <div className="space-y-1">
                            {cat.vouchers.slice(0, 5).map((r) => (
                              <div key={r.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                                <div>
                                  <span className="font-medium">{r.userName || r.userEmail}</span>
                                  <span className="text-muted-foreground ml-2">¥{r.amount}</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {totalVouchers > 5 && (
                              <p className="text-xs text-muted-foreground text-center">… 还有 {totalVouchers - 5} 条</p>
                            )}
                          </div>
                        </div>
                      )}
                      {totalInvoices > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-strata-blue-deep mb-1.5 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> 电子发票 ({totalInvoices})
                          </h4>
                          <div className="space-y-1">
                            {cat.invoices.slice(0, 5).map((r) => (
                              <div key={r.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                                <div>
                                  <span className="font-medium">{r.userName || r.userEmail}</span>
                                  <span className="text-muted-foreground ml-2">¥{r.amount}</span>
                                  <StatusBadge status={r.status} />
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {totalInvoices > 5 && (
                              <p className="text-xs text-muted-foreground text-center">… 还有 {totalInvoices - 5} 条</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <RecordDetailDialog open={detailOpen} onOpenChange={setDetailOpen} record={detailRecord} />
    </div>
  );
}

// ============================================================================
// MAIN FINANCE RECORDS PAGE
// ============================================================================

export default function FinanceRecords() {
  const [viewMode, setViewMode] = useState<"all" | "branch" | "conference">("all");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep">财务记录</h1>
        <p className="text-muted-foreground mt-1">查看所有会员费和会议费的缴费记录，支持按学会和会议分类查看与导出</p>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "all" | "branch" | "conference")}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            <Receipt className="h-4 w-4" />
            全部记录
          </TabsTrigger>
          <TabsTrigger value="branch" className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            按学会查看
          </TabsTrigger>
          <TabsTrigger value="conference" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            按会议查看
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllRecordsView />
        </TabsContent>

        <TabsContent value="branch" className="mt-4">
          <ByBranchView />
        </TabsContent>

        <TabsContent value="conference" className="mt-4">
          <ByConferenceView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
