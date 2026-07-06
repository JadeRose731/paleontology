import { parseExtra, type ApiCmsEntry } from "@/lib/cms-api";
import { BRANCH_IDS, resolveBranchCodeFromCms } from "@shared/constants";
import { normalizeBranchId } from "@shared/branch-site";

export function entryBranchId(entry: ApiCmsEntry | null | undefined): string | null {
  if (!entry) return null;
  const ex = parseExtra<{ branchId?: string | null }>(entry.extraJson, {});
  return resolveBranchCodeFromCms(ex.branchId, entry.associationId ?? null);
}

export function matchesBranch(entry: ApiCmsEntry | null | undefined, branchId: string): boolean {
  if (!entry) return false;
  if ((entry.scope ?? "society") !== "branch") return false;
  const bid = entryBranchId(entry);
  return bid === branchId;
}

export function filterBranchEntries(entries: ApiCmsEntry[], branchId: string): ApiCmsEntry[] {
  const id = normalizeBranchId(branchId);
  if (!BRANCH_IDS.includes(id)) return [];
  return (entries ?? []).filter(
    e => e && e.status?.toLowerCase() === "published" && matchesBranch(e, id),
  );
}

export function entryShowOnHomepage(entry: ApiCmsEntry): boolean {
  const ex = parseExtra<{ showOnHomepage?: boolean }>(entry.extraJson, {});
  return !!ex.showOnHomepage;
}

export function pageForBranch(entries: ApiCmsEntry[], branchId: string, pageCode: string): ApiCmsEntry | undefined {
  return filterBranchEntries(entries, branchId).find(e => e.columnCode === pageCode);
}
