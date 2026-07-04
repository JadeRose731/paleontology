import { useState, useMemo } from "react";
import { useAdmin, type ReviewItem, type MembershipAppRecord, type WithdrawalAppRecord } from "@/contexts/AdminContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Eye, Clock, FileText } from "lucide-react";
import { MEMBERSHIP_STATUS_LABEL, CONFERENCE_STATUS_LABEL, CONFERENCE_STATUS_COLOR } from "@shared/constants";

function StatusBadge({ status }: { status: string }) {
  const label = MEMBERSHIP_STATUS_LABEL[status] || CONFERENCE_STATUS_LABEL[status] || status;
  const color = CONFERENCE_STATUS_COLOR[status] || "bg-gray-50 text-gray-500 border border-gray-200";
  return (
    <Badge variant="outline" className={color}>
      {label}
    </Badge>
  );
}

function FilePreviewDialog({
  open,
  onOpenChange,
  url,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>文件预览</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center overflow-auto">
          {url ? (
            <img src={url} alt="Payment proof" className="max-w-full max-h-[60vh] object-contain rounded" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
              <FileText className="h-12 w-12" />
              <span>暂无文件</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  title: string;
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            请输入驳回原因，该原因将通知给用户。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="reject-reason">驳回原因</Label>
          <Textarea
            id="reject-reason"
            placeholder="请输入驳回原因..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setReason("")}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="bg-party-red hover:bg-party-red-dark"
          >
            确认驳回
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ExtendDeadlineDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newDeadline: string, reason: string) => void;
}) {
  const [newDeadline, setNewDeadline] = useState("");
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!newDeadline || !reason.trim()) return;
    onConfirm(newDeadline, reason);
    setNewDeadline("");
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>延长期限</DialogTitle>
          <DialogDescription>
            延长用户上传发票的截止日期。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-deadline">新截止日期</Label>
            <Input id="new-deadline" type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extend-reason">延期原因</Label>
            <Textarea
              id="extend-reason"
              placeholder="请输入延期原因..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNewDeadline("");
              setReason("");
              onOpenChange(false);
            }}
          >
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!newDeadline || !reason.trim()}>
            确认延期
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewTable({
  items,
  tabType,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onPreview,
  onApprove,
  onReject,
  onExtend,
}: {
  items: ReviewItem[];
  tabType: "voucher" | "invoice";
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onPreview: (url: string) => void;
  onApprove: (item: ReviewItem) => void;
  onReject: (item: ReviewItem) => void;
  onExtend?: (item: ReviewItem) => void;
}) {
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          暂无待审核项目
        </CardContent>
      </Card>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
          </TableHead>
          <TableHead>用户邮箱</TableHead>
          <TableHead>姓名</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>金额</TableHead>
          <TableHead>提交时间</TableHead>
          <TableHead>文件</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => onToggleSelect(item.id)}
              />
            </TableCell>
            <TableCell className="font-medium max-w-[150px] truncate" title={item.userEmail}>
              {item.userEmail}
            </TableCell>
            <TableCell>{item.userName}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {item.type === "society_fee" ? "会员费" : "会议费"}
              </Badge>
            </TableCell>
            <TableCell>¥{item.amount}</TableCell>
            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{item.submitTime}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreview(tabType === "voucher" ? item.voucherUrl : (item.invoiceUrl || ""))}
              >
                <Eye className="h-4 w-4 mr-1" />
                查看
              </Button>
            </TableCell>
            <TableCell>
              <StatusBadge status={item.status} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50 h-8 px-2 text-xs"
                  onClick={() => onApprove(item)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  通过
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 h-8 px-2 text-xs"
                  onClick={() => onReject(item)}
                >
                  <X className="h-3 w-3 mr-1" />
                  驳回
                </Button>
                {tabType === "invoice" && onExtend && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 h-8 px-2 text-xs"
                    onClick={() => onExtend(item)}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    延期
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function VoucherTab() {
  const {
    pendingVoucherReviews,
    approveVoucher,
    rejectVoucher,
    batchApproveVoucher,
    batchRejectVoucher,
  } = useAdmin();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<ReviewItem | null>(null);
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingVoucherReviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingVoucherReviews.map((i) => i.id)));
    }
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleApprove = (item: ReviewItem) => {
    approveVoucher(item.userEmail, item.type, item.confId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  };

  const handleReject = (reason: string) => {
    if (!rejectItem) return;
    rejectVoucher(rejectItem.userEmail, rejectItem.type, reason, rejectItem.confId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(rejectItem.id);
      return next;
    });
    setRejectItem(null);
  };

  const handleBatchApprove = () => {
    batchApproveVoucher(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchReject = () => {
    if (!batchRejectReason.trim()) return;
    batchRejectVoucher(Array.from(selectedIds), batchRejectReason);
    setSelectedIds(new Set());
    setBatchRejectReason("");
    setBatchRejectOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">凭证初审</CardTitle>
              <Badge variant="secondary" className="text-sm">{pendingVoucherReviews.length} 条待审</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingVoucherReviews.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === pendingVoucherReviews.length && pendingVoucherReviews.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm text-muted-foreground">全选</span>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-strata-blue-deep font-medium">
                    已选 {selectedIds.size} 项
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300"
                  disabled={selectedIds.size === 0}
                  onClick={handleBatchApprove}
                >
                  批量通过
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300"
                  disabled={selectedIds.size === 0}
                  onClick={() => setBatchRejectOpen(true)}
                >
                  批量驳回
                </Button>
              </div>
            </div>
          )}
          <ReviewTable
            items={pendingVoucherReviews}
            tabType="voucher"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onPreview={handlePreview}
            onApprove={handleApprove}
            onReject={(item) => setRejectItem(item)}
          />
        </CardContent>
      </Card>

      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={previewUrl} />

      <RejectDialog
        open={!!rejectItem}
        onOpenChange={(open) => { if (!open) setRejectItem(null); }}
        onConfirm={handleReject}
        title="驳回凭证"
      />

      <AlertDialog open={batchRejectOpen} onOpenChange={setBatchRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量驳回</AlertDialogTitle>
            <AlertDialogDescription>
              将对选中的 {selectedIds.size} 条记录进行驳回操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="batch-reject-reason">驳回原因</Label>
            <Textarea
              id="batch-reject-reason"
              placeholder="请输入驳回原因..."
              value={batchRejectReason}
              onChange={(e) => setBatchRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBatchRejectReason("")}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchReject}
              disabled={!batchRejectReason.trim()}
              className="bg-party-red hover:bg-party-red-dark"
            >
              确认驳回
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InvoiceTab() {
  const {
    pendingInvoiceReviews,
    approveInvoice,
    rejectInvoice,
    extendDeadline,
    batchApproveInvoice,
    batchRejectInvoice,
  } = useAdmin();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<ReviewItem | null>(null);
  const [extendItem, setExtendItem] = useState<ReviewItem | null>(null);
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingInvoiceReviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInvoiceReviews.map((i) => i.id)));
    }
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleApprove = (item: ReviewItem) => {
    approveInvoice(item.userEmail, item.type, item.confId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  };

  const handleReject = (reason: string) => {
    if (!rejectItem) return;
    rejectInvoice(rejectItem.userEmail, rejectItem.type, reason, rejectItem.confId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(rejectItem.id);
      return next;
    });
    setRejectItem(null);
  };

  const handleExtend = (newDeadline: string, reason: string) => {
    if (!extendItem) return;
    extendDeadline(extendItem.userEmail, extendItem.type, newDeadline, reason, extendItem.confId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(extendItem.id);
      return next;
    });
    setExtendItem(null);
  };

  const handleBatchApprove = () => {
    batchApproveInvoice(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchReject = () => {
    if (!batchRejectReason.trim()) return;
    batchRejectInvoice(Array.from(selectedIds), batchRejectReason);
    setSelectedIds(new Set());
    setBatchRejectReason("");
    setBatchRejectOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">发票终审</CardTitle>
              <Badge variant="secondary" className="text-sm">{pendingInvoiceReviews.length} 条待审</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingInvoiceReviews.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === pendingInvoiceReviews.length && pendingInvoiceReviews.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm text-muted-foreground">全选</span>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-strata-blue-deep font-medium">
                    已选 {selectedIds.size} 项
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300"
                  disabled={selectedIds.size === 0}
                  onClick={handleBatchApprove}
                >
                  批量通过
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300"
                  disabled={selectedIds.size === 0}
                  onClick={() => setBatchRejectOpen(true)}
                >
                  批量驳回
                </Button>
              </div>
            </div>
          )}
          <ReviewTable
            items={pendingInvoiceReviews}
            tabType="invoice"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onPreview={handlePreview}
            onApprove={handleApprove}
            onReject={(item) => setRejectItem(item)}
            onExtend={(item) => setExtendItem(item)}
          />
        </CardContent>
      </Card>

      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={previewUrl} />

      <RejectDialog
        open={!!rejectItem}
        onOpenChange={(open) => { if (!open) setRejectItem(null); }}
        onConfirm={handleReject}
        title="驳回发票"
      />

      <ExtendDeadlineDialog
        open={!!extendItem}
        onOpenChange={(open) => { if (!open) setExtendItem(null); }}
        onConfirm={handleExtend}
      />

      <AlertDialog open={batchRejectOpen} onOpenChange={setBatchRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量驳回</AlertDialogTitle>
            <AlertDialogDescription>
              将对选中的 {selectedIds.size} 条记录进行驳回操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="batch-invoice-reject-reason">驳回原因</Label>
            <Textarea
              id="batch-invoice-reject-reason"
              placeholder="请输入驳回原因..."
              value={batchRejectReason}
              onChange={(e) => setBatchRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBatchRejectReason("")}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchReject}
              disabled={!batchRejectReason.trim()}
              className="bg-party-red hover:bg-party-red-dark"
            >
              确认驳回
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Phase 6: 入会申请审核标签页
function MembershipAppTab() {
  const {
    pendingMembershipApps,
    approveMembershipApplication,
    rejectMembershipApplication,
  } = useAdmin();

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<MembershipAppRecord | null>(null);

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleReject = (reason: string) => {
    if (!rejectItem) return;
    rejectMembershipApplication(rejectItem.userEmail, reason);
    setRejectItem(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">入会申请审核</CardTitle>
              <Badge variant="secondary" className="text-sm">{pendingMembershipApps.length} 条待审</Badge>
            </div>
          </div>
          <CardDescription>审核用户提交的入会申请书，通过后用户可进入缴费阶段</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingMembershipApps.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              暂无待审核的入会申请
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申请人</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>申请书</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMembershipApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.userName}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={app.userEmail}>{app.userEmail}</TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{app.submitTime}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(app.applicationFileUrl)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50 h-8 px-2 text-xs"
                          onClick={() => approveMembershipApplication(app.userEmail)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 h-8 px-2 text-xs"
                          onClick={() => setRejectItem(app)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          驳回
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={previewUrl} />

      <RejectDialog
        open={!!rejectItem}
        onOpenChange={(open) => { if (!open) setRejectItem(null); }}
        onConfirm={handleReject}
        title="驳回入会申请"
      />
    </div>
  );
}

// Phase 6: 退会申请审核标签页
function WithdrawalAppTab() {
  const {
    pendingWithdrawalApps,
    approveWithdrawalApplication,
    rejectWithdrawalApplication,
  } = useAdmin();

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<WithdrawalAppRecord | null>(null);

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleReject = (reason: string) => {
    if (!rejectItem) return;
    rejectWithdrawalApplication(rejectItem.userEmail, reason);
    setRejectItem(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">退会申请审核</CardTitle>
              <Badge variant="secondary" className="text-sm">{pendingWithdrawalApps.length} 条待审</Badge>
            </div>
          </div>
          <CardDescription>审核用户提交的退会申请书，通过后会员资格即时终止</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingWithdrawalApps.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              暂无待审核的退会申请
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申请人</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>会员状态</TableHead>
                  <TableHead>有效期</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>申请书</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingWithdrawalApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.userName}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={app.userEmail}>{app.userEmail}</TableCell>
                    <TableCell>
                      <StatusBadge status={app.membershipStatus} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{app.expiryDate || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{app.submitTime}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(app.applicationFileUrl)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50 h-8 px-2 text-xs"
                          onClick={() => approveWithdrawalApplication(app.userEmail)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 h-8 px-2 text-xs"
                          onClick={() => setRejectItem(app)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          驳回
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={previewUrl} />

      <RejectDialog
        open={!!rejectItem}
        onOpenChange={(open) => { if (!open) setRejectItem(null); }}
        onConfirm={handleReject}
        title="驳回退会申请"
      />
    </div>
  );
}

export default function AuditWorkbench() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep">审核工作台</h1>
        <p className="text-muted-foreground mt-1">管理会员费和会议费的凭证初审与发票终审，以及入会/退会申请审核</p>
      </div>
      <Tabs defaultValue="voucher" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="voucher">凭证初审</TabsTrigger>
          <TabsTrigger value="invoice">发票终审</TabsTrigger>
          <TabsTrigger value="membership-app">入会申请</TabsTrigger>
          <TabsTrigger value="withdrawal-app">退会申请</TabsTrigger>
        </TabsList>
        <TabsContent value="voucher" className="mt-4">
          <VoucherTab />
        </TabsContent>
        <TabsContent value="invoice" className="mt-4">
          <InvoiceTab />
        </TabsContent>
        <TabsContent value="membership-app" className="mt-4">
          <MembershipAppTab />
        </TabsContent>
        <TabsContent value="withdrawal-app" className="mt-4">
          <WithdrawalAppTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
