import { Link, useLocation } from "wouter";
import { TOTAL_SOCIETY_ID } from "@shared/constants";
import {
  BRANCH_META,
  STRUCTURE_SIDEBAR_ITEMS,
  branchSitePath,
  normalizeBranchId,
} from "@shared/branch-site";

interface StructureSidebarProps {
  activeBranchId?: string | null;
}

export default function StructureSidebar({ activeBranchId }: StructureSidebarProps) {
  const [location] = useLocation();

  const isStructureRoot = location === "/structure" || location.startsWith("/structure#");
  const normalizedActive = activeBranchId ? normalizeBranchId(activeBranchId) : null;

  return (
    <aside className="lg:w-64 shrink-0">
      <nav className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed rounded shadow-sm overflow-hidden sticky top-28">
        <div className="px-4 py-3 bg-primary text-white">
          <h2 className="text-sm font-bold tracking-wide">组织机构</h2>
          <p className="text-[10px] text-white/70 mt-0.5">总学会及 11 个专业分会</p>
        </div>
        <ul className="divide-y divide-fossil-stone max-h-[70vh] overflow-y-auto">
          {STRUCTURE_SIDEBAR_ITEMS.map(item => {
            const isSociety = item.id === TOTAL_SOCIETY_ID;
            const isActive = isSociety
              ? isStructureRoot && !normalizedActive
              : normalizedActive === item.id;
            const href = isSociety ? "/structure" : branchSitePath(item.id);
            const meta = !isSociety ? BRANCH_META[item.id] : null;

            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-secondary/10 text-primary font-bold border-l-4 border-secondary"
                      : "text-slate-700 hover:bg-slate-50 border-l-4 border-transparent"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg shrink-0 ${
                      isActive ? "text-secondary" : "text-slate-400"
                    }`}
                  >
                    {isSociety ? "account_balance" : meta?.icon ?? "hub"}
                  </span>
                  <span className="leading-snug">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
