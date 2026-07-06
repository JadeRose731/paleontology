import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Save } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminAccounts,
  fetchAdminAssociationBindings,
  fetchAdminBranchAssociations,
  replaceAdminAssociationBindings,
  type ApiAdminAccountRow,
  type ApiAdminBindingRow,
  type ApiBranchAssociation,
} from "@/lib/membership-api";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "总管理员",
  branch_admin: "分会管理员",
  finance_reviewer: "财务审核员",
};

export default function ScopeManagement() {
  const [admins, setAdmins] = useState<ApiAdminAccountRow[]>([]);
  const [branches, setBranches] = useState<ApiBranchAssociation[]>([]);
  const [bindings, setBindings] = useState<ApiAdminBindingRow[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRows, branchRows, bindingRows] = await Promise.all([
        fetchAdminAccounts(),
        fetchAdminBranchAssociations(),
        fetchAdminAssociationBindings(),
      ]);
      setAdmins(adminRows ?? []);
      setBranches(branchRows ?? []);
      setBindings(bindingRows ?? []);
      if (!selectedAdminId && adminRows?.length) {
        const firstBranch = adminRows.find((a) => a.role === "branch_admin");
        if (firstBranch?.userId) setSelectedAdminId(firstBranch.userId);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }, [selectedAdminId]);

  useEffect(() => {
    void load();
  }, [load]);

  const bindingMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const b of bindings) {
      if (b.bindingStatus !== "BOUND") continue;
      if (!map.has(b.adminUserId)) map.set(b.adminUserId, new Set());
      map.get(b.adminUserId)!.add(b.associationId);
    }
    return map;
  }, [bindings]);

  useEffect(() => {
    if (selectedAdminId == null) {
      setCheckedIds(new Set());
      return;
    }
    const bound = bindingMap.get(selectedAdminId) ?? new Set();
    setCheckedIds(new Set(bound));
  }, [selectedAdminId, bindingMap]);

  const selectedAdmin = admins.find((a) => a.userId === selectedAdminId);

  const toggleBranch = (associationId: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(associationId)) next.delete(associationId);
      else next.add(associationId);
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedAdminId == null) return;
    setSaving(true);
    try {
      await replaceAdminAssociationBindings(selectedAdminId, Array.from(checkedIds));
      toast.success("分会绑定已保存，目标管理员重新登录后生效");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const branchAdmins = admins.filter((a) => a.role === "branch_admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep flex items-center gap-2">
          <Shield className="h-6 w-6" />
          数据权限配置
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          配置分会管理员的数据范围（管理员 ↔ 分会绑定）。总学会无需绑定，拥有全站权限。
        </p>
        <Badge variant="outline" className="mt-2 text-party-red border-party-red/30">仅总管理员可访问</Badge>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[420px]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">管理员列表</CardTitle>
              <CardDescription>选择要配置的分会管理员</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[360px] overflow-y-auto">
              {branchAdmins.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无分会管理员账号</p>
              ) : (
                branchAdmins.map((admin) => (
                  <button
                    key={admin.userId}
                    type="button"
                    onClick={() => setSelectedAdminId(admin.userId)}
                    className={`w-full text-left px-3 py-2.5 rounded text-sm transition-colors border-l-[3px] ${
                      selectedAdminId === admin.userId
                        ? "bg-strata-blue-deep/5 border-party-red text-strata-blue-deep"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium">{admin.displayName || admin.email}</div>
                    <div className="text-xs text-muted-foreground">{admin.email}</div>
                  </button>
                ))
              )}
              <div className="pt-3 border-t mt-3">
                <p className="text-xs text-muted-foreground mb-2">其他角色（只读参考）</p>
                {admins.filter((a) => a.role !== "branch_admin").map((admin) => (
                  <div key={admin.userId} className="px-3 py-2 text-xs text-muted-foreground">
                    {admin.email} — {ROLE_LABELS[admin.role ?? ""] || admin.role}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                分会绑定
                {selectedAdmin && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    — {selectedAdmin.email}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                勾选该管理员可管理的分会（共 {branches.length} 个分会）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedAdmin ? (
                <p className="text-sm text-muted-foreground py-8 text-center">请从左侧选择分会管理员</p>
              ) : selectedAdmin.role !== "branch_admin" ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  仅分会管理员需要配置分会绑定；总管理员拥有全站权限，财务审核员拥有全站只读权限。
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {branches.map((branch) => (
                      <label
                        key={branch.associationId}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-muted/30 cursor-pointer"
                      >
                        <Checkbox
                          checked={checkedIds.has(branch.associationId)}
                          onCheckedChange={() => toggleBranch(branch.associationId)}
                        />
                        <div>
                          <div className="text-sm font-medium">{branch.associationName}</div>
                          {branch.branchCode && (
                            <div className="text-xs text-muted-foreground">{branch.branchCode}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    说明：中国古生物学会（总学会）无需绑定，总管理员自动拥有全站 CMS 与数据权限。
                  </p>
                  <Button onClick={() => void handleSave()} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "保存中…" : "保存绑定"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
