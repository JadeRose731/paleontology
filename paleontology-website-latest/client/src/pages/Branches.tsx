import { Redirect } from "wouter";
import { normalizeBranchId, branchSitePath } from "@shared/branch-site";

/** 旧 /branches 路由兼容重定向 */
export default function Branches() {
  return <Redirect to="/structure" />;
}

/** 旧 /branches/:id 深链兼容 */
export function BranchesLegacyRedirect({ branchId }: { branchId: string }) {
  const id = normalizeBranchId(branchId);
  return <Redirect to={branchSitePath(id)} />;
}
