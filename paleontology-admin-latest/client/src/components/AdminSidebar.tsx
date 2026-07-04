import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAdmin, type MenuItem } from "@/contexts/AdminContext";
import { cn } from "@/lib/utils";
import {
  LogOut, LayoutDashboard, ClipboardCheck, Users, User, UserCheck, Calendar, BarChart3,
  Receipt, Building2, ChevronDown, FileText, Image, Newspaper, Megaphone, Layout, FolderOpen,
  Settings, Flag, Award, Globe, BookOpen, Clock, Download, Images, Trophy, Handshake, FolderUp,
  SlidersHorizontal,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ClipboardCheck, Users, User, UserCheck, Calendar, BarChart3, Receipt,
  Building2, FileText, Image, Newspaper, Megaphone, Layout, FolderOpen, Settings, Flag,
  Award, Globe, BookOpen, Clock, Download, Images, Trophy, Handshake, FolderUp, SlidersHorizontal,
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "学会总管理员",
  branch_admin: "分会管理员",
  finance_reviewer: "财务审核员",
};

function menuContainsPath(item: MenuItem, location: string): boolean {
  if (location === item.path || location.startsWith(`${item.path}/`)) return true;
  return item.children?.some(child => menuContainsPath(child, location)) ?? false;
}

function collectExpandedPaths(items: MenuItem[], location: string): Set<string> {
  const expanded = new Set<string>();
  for (const item of items) {
    if (item.children?.length && menuContainsPath(item, location)) {
      expanded.add(item.path);
      collectExpandedPaths(item.children, location).forEach(p => expanded.add(p));
    }
  }
  return expanded;
}

export default function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { adminUser, adminRole, getAllowedMenuItems, adminLogout } = useAdmin();
  const menuItems = getAllowedMenuItems();

  const [expandedParents, setExpandedParents] = useState<Set<string>>(() =>
    collectExpandedPaths(getAllowedMenuItems(), location)
  );

  useEffect(() => {
    setExpandedParents(collectExpandedPaths(getAllowedMenuItems(), location));
  }, [location, getAllowedMenuItems]);

  const handleLogout = () => {
    adminLogout();
    setLocation("/admin/login");
  };

  const toggleParent = (path: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const Icon = ICON_MAP[item.icon];
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedParents.has(item.path);

    if (hasChildren) {
      const isParentActive = menuContainsPath(item, location);
      return (
        <div key={item.path}>
          <button
            onClick={() => toggleParent(item.path)}
            className={cn(
              "w-full flex items-center gap-3 py-2 text-sm transition-colors text-left",
              depth === 0 ? "px-4 py-2.5" : "px-4 pl-6 py-2",
              isParentActive ? "bg-white/10 text-accent-gold" : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            {Icon && depth === 0 && <Icon className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{item.label}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isExpanded && "rotate-180")} />
          </button>
          {isExpanded && (
            <div className={cn("border-l border-white/10", depth === 0 ? "ml-4" : "ml-6")}>
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = location === item.path;
    return (
      <button
        key={item.path}
        onClick={() => setLocation(item.path)}
        className={cn(
          "w-full flex items-center gap-3 py-2 text-sm transition-colors text-left border-l-[3px]",
          depth === 0 ? "px-4 py-2.5" : "px-4 pl-8 py-2",
          isActive
            ? "bg-white/10 border-accent-gold text-accent-gold"
            : "text-white/60 hover:bg-white/5 hover:text-white border-transparent"
        )}
      >
        {Icon && depth <= 1 && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="w-56 bg-strata-blue-deep text-white flex flex-col shrink-0 border-r border-white/10">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent-gold/30 flex items-center justify-center shrink-0">
            <span className="text-accent-gold font-bold text-sm">{adminUser?.name?.charAt(0) || "管"}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{adminUser?.name}</p>
            <Badge variant="outline" className="text-[10px] text-accent-gold border-accent-gold/30 mt-1 px-1.5 py-0">
              {ROLE_LABELS[adminRole]}
            </Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      <Separator className="bg-white/10" />

      <div className="p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-party-red hover:bg-white/5 rounded transition-colors"
        >
          <LogOut className="h-4 w-4" />
          安全退出
        </button>
      </div>
    </aside>
  );
}
