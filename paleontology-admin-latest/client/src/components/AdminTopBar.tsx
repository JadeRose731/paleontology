import { LogOut, User } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "学会总管理员",
  branch_admin: "分会管理员",
  finance_reviewer: "财务审核员",
};

export default function AdminTopBar() {
  const { adminUser, adminRole, adminLogout } = useAdmin();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    adminLogout();
    setLocation("/admin/login");
  };

  return (
    <header className="h-14 bg-strata-blue-deep text-white flex items-center justify-between px-6 shrink-0 border-b border-white/10">
      <div className="flex items-center gap-3">
        <span className="text-accent-gold font-bold text-lg tracking-wide">
          中国古生物学会
        </span>
        <span className="text-white/60 text-sm">· 管理后台</span>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white hover:bg-white/10 flex items-center gap-2 px-2 h-auto py-1">
              <div className="h-8 w-8 rounded-full bg-accent-gold/30 flex items-center justify-center">
                <User className="h-4 w-4 text-accent-gold" />
              </div>
              <div className="flex flex-col items-start text-sm leading-tight">
                <span>{adminUser?.name || "管理员"}</span>
                <span className="text-[10px] text-white/50">{ROLE_LABELS[adminRole]}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{adminUser?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{adminUser?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <Badge variant="outline" className="text-[10px]">
                {ROLE_LABELS[adminRole]}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-party-red cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              安全退出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
