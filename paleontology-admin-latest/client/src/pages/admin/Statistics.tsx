import { useState, useMemo } from "react";
import { useAdmin, type GlobalStats, type SocietyStats, type ConferenceStats, type FeeBreakdown } from "@/contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Download, Users, CreditCard, Calendar, Building2, GraduationCap, BookOpen, TrendingUp, FileText, FilterX, Search, Archive } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import {
  ALL_SOCIETY_UNITS, TOTAL_SOCIETY_ID, BRANCH_IDS,
  CONFERENCE_FEE_TYPE_LABEL, CONFERENCE_FEE_TYPE,
  ACCOMMODATION_TYPE_LABEL, FIELD_TRIP_PHASE_LABEL,
  CONFERENCE_STATUS_LABEL,
} from "@shared/constants";
import type { ConferenceAttendee } from "@/contexts/AdminContext";
import type { FieldTripRoute } from "@shared/constants";

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = ["#002B49", "#C41E3A", "#D9C5A0", "#715a3e", "#406182", "#8B0000", "#2d6a4f", "#9b2226", "#ca6702", "#005f73", "#0b525b", "#ee9b00"];

const FEE_TYPE_CHART_COLORS: Record<string, string> = {
  student_member: "#002B49",
  non_student_member: "#C41E3A",
  student_non_member: "#D9C5A0",
  non_student_non_member: "#715a3e",
};

type StatLevel = "global" | "society" | "conference";

interface RouteFieldTripStat {
  routeId: string;
  routeName: string;
  phase: "pre" | "during" | "post";
  genderRestriction?: string;
  male: number;
  female: number;
  total: number;
}

function computeRouteFieldTripStats(
  attendees: ConferenceAttendee[],
  routes: FieldTripRoute[] | undefined
): RouteFieldTripStat[] {
  if (!routes?.length) return [];
  const statsMap = new Map<string, RouteFieldTripStat>();
  for (const route of routes) {
    statsMap.set(route.id, {
      routeId: route.id,
      routeName: route.name,
      phase: route.phase,
      genderRestriction: route.genderRestriction,
      male: 0,
      female: 0,
      total: 0,
    });
  }
  for (const a of attendees) {
    const sel = a.fieldTripSelections;
    if (!sel) continue;
    for (const phase of ["pre", "during", "post"] as const) {
      for (const routeId of sel[phase] || []) {
        const row = statsMap.get(routeId);
        if (!row) continue;
        row.total += 1;
        if (a.gender === "男") row.male += 1;
        if (a.gender === "女") row.female += 1;
      }
    }
  }
  return routes.map(r => statsMap.get(r.id)!).filter(Boolean);
}

function FieldTripDetailPanel({
  attendees,
  routes,
}: {
  attendees: ConferenceAttendee[];
  routes: FieldTripRoute[] | undefined;
}) {
  const routeStats = computeRouteFieldTripStats(attendees, routes);
  const fieldTripAttendees = attendees.filter(
    a => a.fieldTripPre || a.fieldTripDuring || a.fieldTripPost
  );

  if (!routes?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> 野外报名详情
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          本场会议未配置野外路线（可在「会议管理」中配置最多 15 条路线）。
        </CardContent>
      </Card>
    );
  }

  const phases: Array<"pre" | "during" | "post"> = ["pre", "during", "post"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> 野外报名详情
        </CardTitle>
        <CardDescription>
          各路线报名人数（按性别）及每位参会者的具体路线选择
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {phases.map(phase => {
          const phaseRoutes = routeStats.filter(r => r.phase === phase);
          const withRegs = phaseRoutes.filter(r => r.total > 0);
          if (withRegs.length === 0) return null;
          return (
            <div key={phase}>
              <h4 className="text-sm font-semibold text-strata-blue-deep mb-2">
                {FIELD_TRIP_PHASE_LABEL[phase]}野外 — 各路线统计
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>路线</TableHead>
                    <TableHead>性别限制</TableHead>
                    <TableHead className="text-right">男</TableHead>
                    <TableHead className="text-right">女</TableHead>
                    <TableHead className="text-right">合计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withRegs.map(r => (
                    <TableRow key={r.routeId}>
                      <TableCell className="text-sm max-w-[280px]">{r.routeName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.genderRestriction === "male" ? "限男性" : r.genderRestriction === "female" ? "限女性" : "不限"}
                      </TableCell>
                      <TableCell className="text-right">{r.male}</TableCell>
                      <TableCell className="text-right">{r.female}</TableCell>
                      <TableCell className="text-right font-medium">{r.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })}

        <div>
          <h4 className="text-sm font-semibold text-strata-blue-deep mb-2">
            野外报名人员名单（{fieldTripAttendees.length} 人）
          </h4>
          {fieldTripAttendees.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无野外报名记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>所选路线</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldTripAttendees.map((a, idx) => (
                  <TableRow key={`${a.email}-${idx}`}>
                    <TableCell className="font-medium text-sm">
                      {a.name}
                      <span className="text-xs text-muted-foreground block">{a.email}</span>
                    </TableCell>
                    <TableCell className="text-sm">{a.gender || "—"}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate" title={a.unit}>{a.unit || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      {a.fieldTripSummary || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function saveExportBlobs(blobs: Blob[], baseName: string) {
  if (blobs.length === 1) {
    saveAs(blobs[0], `${baseName}.zip`);
  } else {
    blobs.forEach((blob, i) => saveAs(blob, `${baseName}_part${i + 1}.zip`));
    toast.info(`数据量较大，已自动拆分为 ${blobs.length} 个 ZIP 包（每包 ≤1GB）`);
  }
}

async function downloadAbstractsZip(
  abstracts: { name: string; abstractFileName?: string; abstractFileUrl?: string }[],
  conferenceName: string,
) {
  const zip = new JSZip();
  let count = 0;
  for (const a of abstracts) {
    if (!a.abstractFileUrl) continue;
    const fileName = a.abstractFileName || `${a.name}_摘要.docx`;
    if (a.abstractFileUrl.startsWith("data:")) {
      const base64 = a.abstractFileUrl.split(",")[1];
      if (base64) {
        zip.file(fileName, base64, { base64: true });
        count++;
      }
    } else {
      try {
        const res = await fetch(a.abstractFileUrl);
        zip.file(fileName, await res.blob());
        count++;
      } catch {
        // skip unreachable URLs in prototype
      }
    }
  }
  if (count === 0) {
    toast.error("没有可打包的摘要文件");
    return;
  }
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${conferenceName.replace(/[\\/:*?"<>|]/g, "_")}_摘要汇总.zip`);
  toast.success(`已打包 ${count} 份摘要`);
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-strata-blue-deep">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

/** 学会层：绑定注册用户 + 累计参会 两套统计 */
function SocietyLevelStatsBlocks({ stats }: { stats: SocietyStats }) {
  return (
    <>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-strata-blue-deep flex items-center gap-2">
          <Users className="h-4 w-4" /> 绑定注册用户统计
        </h4>
        <p className="text-xs text-muted-foreground">
          统计已绑定该学会/分会的注册用户身份（总学会为全站注册用户；不含仅参会未绑定用户）
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="绑定注册总人数" value={stats.registeredTotal} icon={Users} />
          <StatCard
            title="绑定会员"
            value={stats.registeredMembers}
            subtitle={`学生会员 ${stats.registeredStudentMembers} / 非学生会员 ${stats.registeredNonStudentMembers}`}
            icon={GraduationCap}
          />
          <StatCard
            title="绑定非会员"
            value={stats.registeredNonMembers}
            subtitle={`学生 ${stats.registeredStudentNonMembers} / 非学生 ${stats.registeredNonStudentNonMembers}`}
            icon={Users}
          />
          <StatCard
            title="会员占比"
            value={stats.registeredTotal > 0 ? `${Math.round((stats.registeredMembers / stats.registeredTotal) * 100)}%` : "0%"}
            subtitle={`非会员 ${stats.registeredNonMembers} 人`}
            icon={TrendingUp}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-strata-blue-deep flex items-center gap-2">
          <Calendar className="h-4 w-4" /> 累计参会与会议费统计
        </h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="累计参会总人数" value={stats.totalAttendees} icon={Users} />
          <StatCard
            title="会员参会"
            value={stats.totalMembers}
            subtitle={`学生会员 ${stats.studentMembers} / 非学生会员 ${stats.nonStudentMembers}`}
            icon={GraduationCap}
          />
          <StatCard
            title="非会员参会"
            value={stats.totalNonMembers}
            subtitle={`学生 ${stats.studentNonMembers} / 非学生 ${stats.nonStudentNonMembers}`}
            icon={Users}
          />
          <StatCard
            title="累计会议费"
            value={`¥${stats.totalConferenceFee.toLocaleString()}`}
            icon={CreditCard}
          />
        </div>
      </div>
    </>
  );
}

function FeeBreakdownTable({ breakdown }: { breakdown: FeeBreakdown }) {
  const feeTypes = [
    { key: "studentMember", type: CONFERENCE_FEE_TYPE.STUDENT_MEMBER },
    { key: "nonStudentMember", type: CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER },
    { key: "studentNonMember", type: CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER },
    { key: "nonStudentNonMember", type: CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER },
  ] as const;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>费用类型</TableHead>
          <TableHead className="text-right">笔数</TableHead>
          <TableHead className="text-right">金额 (¥)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {feeTypes.map(({ key, type }) => {
          const d = breakdown[key as keyof FeeBreakdown];
          return (
            <TableRow key={type}>
              <TableCell className="font-medium">{CONFERENCE_FEE_TYPE_LABEL[type]}</TableCell>
              <TableCell className="text-right">{d.count}</TableCell>
              <TableCell className="text-right">¥{d.amount.toLocaleString()}</TableCell>
            </TableRow>
          );
        })}
        <TableRow className="font-bold border-t-2">
          <TableCell>合计</TableCell>
          <TableCell className="text-right">
            {feeTypes.reduce((sum, { key }) => sum + (breakdown[key as keyof FeeBreakdown]?.count || 0), 0)}
          </TableCell>
          <TableCell className="text-right">
            ¥{feeTypes.reduce((sum, { key }) => sum + (breakdown[key as keyof FeeBreakdown]?.amount || 0), 0).toLocaleString()}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function SocietyFeeMatrixTable({ breakdowns }: { breakdowns: Record<string, FeeBreakdown> }) {
  const feeCols = [
    { key: "studentMember" as const, type: CONFERENCE_FEE_TYPE.STUDENT_MEMBER },
    { key: "nonStudentMember" as const, type: CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER },
    { key: "studentNonMember" as const, type: CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER },
    { key: "nonStudentNonMember" as const, type: CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER },
  ];

  const rows = Object.entries(ALL_SOCIETY_UNITS).map(([id, name]) => {
    const bd = breakdowns[id] || {
      studentMember: { count: 0, amount: 0 },
      nonStudentMember: { count: 0, amount: 0 },
      studentNonMember: { count: 0, amount: 0 },
      nonStudentNonMember: { count: 0, amount: 0 },
    };
    const rowTotal = feeCols.reduce((sum, { key }) => sum + bd[key].amount, 0);
    return { id, name, bd, rowTotal };
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px]">学会/分会</TableHead>
            {feeCols.map(({ type }) => (
              <TableHead key={type} className="text-right min-w-[100px] whitespace-nowrap">
                {CONFERENCE_FEE_TYPE_LABEL[type]}
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[80px]">小计</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ id, name, bd, rowTotal }) => (
            <TableRow key={id}>
              <TableCell className="font-medium text-sm">{name}</TableCell>
              {feeCols.map(({ key, type }) => (
                <TableCell key={type} className="text-right text-xs whitespace-nowrap">
                  {bd[key].count > 0 ? (
                    <span>{bd[key].count} 笔 / ¥{bd[key].amount.toLocaleString()}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold text-sm">¥{rowTotal.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FeeBreakdownBarChart({ breakdown }: { breakdown: FeeBreakdown }) {
  const data = [
    { name: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_MEMBER], count: breakdown.studentMember.count, amount: breakdown.studentMember.amount, fill: FEE_TYPE_CHART_COLORS.student_member },
    { name: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER], count: breakdown.nonStudentMember.count, amount: breakdown.nonStudentMember.amount, fill: FEE_TYPE_CHART_COLORS.non_student_member },
    { name: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER], count: breakdown.studentNonMember.count, amount: breakdown.studentNonMember.amount, fill: FEE_TYPE_CHART_COLORS.student_non_member },
    { name: CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER], count: breakdown.nonStudentNonMember.count, amount: breakdown.nonStudentNonMember.amount, fill: FEE_TYPE_CHART_COLORS.non_student_non_member },
  ].filter(d => d.count > 0 || d.amount > 0);

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground">暂无数据</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E1DA" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis />
        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
        <Legend />
        <Bar dataKey="amount" name="金额 (¥)" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// LEVEL 1: GLOBAL STATISTICS (super_admin)
// ============================================================================

function GlobalStatistics({ stats }: { stats: GlobalStats }) {
  const { getAllConferences, generateExportZip } = useAdmin();
  const [isExporting, setIsExporting] = useState(false);
  const allConfs = getAllConferences();

  // Per-society conference fee bar chart data
  const societyFeeData = useMemo(() => {
    return Object.entries(ALL_SOCIETY_UNITS).map(([id, name]) => ({
      name: name.length > 8 ? name.slice(0, 8) + "…" : name,
      fullName: name,
      amount: stats.perSocietyConferenceFee[id] || 0,
    }));
  }, [stats.perSocietyConferenceFee]);

  // Population distribution pie data
  const populationPieData = useMemo(() => {
    const data = [
      { name: "学生会员", value: stats.studentMembers, fill: FEE_TYPE_CHART_COLORS.student_member },
      { name: "非学生会员", value: stats.nonStudentMembers, fill: FEE_TYPE_CHART_COLORS.non_student_member },
      { name: "学生(非会员)", value: stats.studentNonMembers, fill: FEE_TYPE_CHART_COLORS.student_non_member },
      { name: "非学生(非会员)", value: stats.nonStudentNonMembers, fill: FEE_TYPE_CHART_COLORS.non_student_non_member },
    ].filter(d => d.value > 0);
    return data;
  }, [stats]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blobs = await generateExportZip({ scope: "global", scopeId: "all" });
      const fileName = `export_global_all_${new Date().toISOString().split("T")[0]}`;
      saveExportBlobs(blobs, fileName);
      toast.success("全局导出成功");
    } catch (e) {
      toast.error("导出失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Population Stats */}
      <div>
        <h3 className="text-base font-semibold text-strata-blue-deep mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> 人数统计
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="总注册人数" value={stats.totalUsers} icon={Users} />
          <StatCard
            title="总会员人数"
            value={stats.totalMembers}
            subtitle={`学生会员 ${stats.studentMembers} / 非学生会员 ${stats.nonStudentMembers}`}
            icon={GraduationCap}
          />
          <StatCard
            title="非会员总人数"
            value={stats.totalNonMembers}
            subtitle={`学生非会员 ${stats.studentNonMembers} / 非学生非会员 ${stats.nonStudentNonMembers}`}
            icon={Users}
          />
          <StatCard
            title="会员占比"
            value={`${stats.totalUsers > 0 ? Math.round((stats.totalMembers / stats.totalUsers) * 100) : 0}%`}
            subtitle={`${stats.totalMembers} / ${stats.totalUsers}`}
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Section 2: Membership Fee Stats */}
      <div>
        <h3 className="text-base font-semibold text-strata-blue-deep mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> 会员费统计
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="会员费累计总金额"
            value={`¥${stats.totalMembershipFee.toLocaleString()}`}
            icon={CreditCard}
          />
          <StatCard
            title="学生会员费"
            value={`¥${stats.studentMembershipFeeAmount.toLocaleString()}`}
            subtitle={`${stats.studentMembershipFeeCount} 笔`}
            icon={GraduationCap}
          />
          <StatCard
            title="非学生会员费"
            value={`¥${stats.nonStudentMembershipFeeAmount.toLocaleString()}`}
            subtitle={`${stats.nonStudentMembershipFeeCount} 笔`}
            icon={Users}
          />
        </div>
      </div>

      {/* Section 3: Conference Fee Stats */}
      <div>
        <h3 className="text-base font-semibold text-strata-blue-deep mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> 会议费统计
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="全部学会会议费累计"
            value={`¥${stats.totalConferenceFee.toLocaleString()}`}
            icon={Calendar}
          />
          <StatCard
            title="发布会议数"
            value={allConfs.length}
            subtitle={`已发布 ${allConfs.filter(c => c.status === "published").length} 场`}
            icon={BookOpen}
          />
        </div>
      </div>

      {/* Section 3b: 12×4 fee matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">各学会四类会议费统计矩阵（12×4）</CardTitle>
          <CardDescription>实收确认参会：笔数 / 金额（按学会 × 四类人群）</CardDescription>
        </CardHeader>
        <CardContent>
          <SocietyFeeMatrixTable breakdowns={stats.perSocietyFeeBreakdown} />
        </CardContent>
      </Card>

      {/* Section 4: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Per-society conference fee bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各学会会议费累计金额</CardTitle>
            <CardDescription>固定展示 12 个学会（含金额为 0 的学会）</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(360, societyFeeData.length * 52)}>
              <BarChart data={societyFeeData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1DA" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""} />
                <Bar dataKey="amount" name="会议费" fill="#002B49" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Population distribution pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">四类人群分布</CardTitle>
            <CardDescription>学生/非学生 × 会员/非会员</CardDescription>
          </CardHeader>
          <CardContent>
            {populationPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={populationPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {populationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">暂无数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conference fee table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">会议费汇总表</CardTitle>
            <CardDescription>所有会议的报名和费用情况</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "导出中…" : "导出"}
          </Button>
        </CardHeader>
        <CardContent>
          {allConfs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议名称</TableHead>
                  <TableHead>主办学会</TableHead>
                  <TableHead>学生会员价</TableHead>
                  <TableHead>非学生会员价</TableHead>
                  <TableHead>学生非会员价</TableHead>
                  <TableHead>非学生非会员价</TableHead>
                  <TableHead>确认参会</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allConfs.map((conf) => (
                  <TableRow key={conf.id}>
                    <TableCell className="font-medium max-w-[180px] truncate" title={conf.name}>
                      {conf.name}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{conf.branchName}</TableCell>
                    <TableCell>¥{conf.feeConfig?.studentMember || "—"}</TableCell>
                    <TableCell>¥{conf.feeConfig?.nonStudentMember || "—"}</TableCell>
                    <TableCell>¥{conf.feeConfig?.studentNonMember || "—"}</TableCell>
                    <TableCell>¥{conf.feeConfig?.nonStudentNonMember || "—"}</TableCell>
                    <TableCell>{conf.registrations}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={conf.status === "published" ? "text-green-600 border-green-300 bg-green-50" : "text-gray-500 border-gray-300 bg-gray-50"}>
                        {conf.status === "published" ? "已发布" : "草稿"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// LEVEL 2: SOCIETY STATISTICS
// ============================================================================

function SocietyStatistics({ onRequestGlobalView }: { onRequestGlobalView: () => void }) {
  const { getSocietyStats, getAllConferences, generateExportZip } = useAdmin();
  const [selectedSociety, setSelectedSociety] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const allConfs = getAllConferences();

  // 虚拟值：代表"全平台汇总"，选中后跳转总览 Tab
  const GLOBAL_AGGREGATE_VALUE = "__global__";

  const societyOptions = useMemo(() => {
    const options = [
      { value: GLOBAL_AGGREGATE_VALUE, label: "(全平台汇总)" },
      ...Object.entries(ALL_SOCIETY_UNITS).map(([id, name]) => ({
        value: id,
        label: name,
      })),
    ];
    return options;
  }, []);

  const handleSocietyChange = (value: string) => {
    if (value === GLOBAL_AGGREGATE_VALUE) {
      toast.info("已切换至全平台汇总（总览）");
      onRequestGlobalView();
      return;
    }
    setSelectedSociety(value);
  };

  const stats: SocietyStats | null = useMemo(() => {
    if (!selectedSociety) return null;
    return getSocietyStats(selectedSociety);
  }, [selectedSociety, getSocietyStats]);

  const societyConfs = useMemo(() => {
    if (!selectedSociety) return [];
    return allConfs.filter(c => c.branchId === selectedSociety);
  }, [selectedSociety, allConfs]);

  const handleExport = async () => {
    if (!selectedSociety) return;
    setIsExporting(true);
    try {
      const blobs = await generateExportZip({ scope: "branch", scopeId: selectedSociety });
      const societyName = ALL_SOCIETY_UNITS[selectedSociety] || selectedSociety;
      const fileName = `export_branch_${societyName.slice(0, 20)}_${new Date().toISOString().split("T")[0]}`;
      saveExportBlobs(blobs, fileName);
      toast.success("导出成功");
    } catch (e) {
      toast.error("导出失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium whitespace-nowrap">选择学会/分会：</label>
        <Select value={selectedSociety} onValueChange={handleSocietyChange}>
          <SelectTrigger className="w-[360px]">
            <SelectValue placeholder="请选择学会或分会" />
          </SelectTrigger>
          <SelectContent>
            {societyOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stats && (
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "导出中…" : "导出"}
          </Button>
        )}
      </div>

      {!selectedSociety ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 text-center px-4">
            <span>请从上方下拉菜单中选择一个分会以查看该学会累计统计</span>
            <span className="text-xs">选择「(全平台汇总)」将跳转至「总览」查看 12 学会汇总数据；选择「中国古生物学会（总学会）」查看总学会自身统计</span>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          {/* Basic info + attendee summary */}
          <div>
            <h3 className="text-base font-semibold text-strata-blue-deep mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> {stats.societyName}
            </h3>
            <SocietyLevelStatsBlocks stats={stats} />
          </div>

          {/* Fee breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">四类会议费分项</CardTitle>
                <CardDescription>笔数与金额汇总</CardDescription>
              </CardHeader>
              <CardContent>
                <FeeBreakdownTable breakdown={stats.feeBreakdown} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">会议费分布</CardTitle>
                <CardDescription>四类人群对比</CardDescription>
              </CardHeader>
              <CardContent>
                <FeeBreakdownBarChart breakdown={stats.feeBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Society conference list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">该学会历史会议</CardTitle>
              <CardDescription>各会议报名人数概览</CardDescription>
            </CardHeader>
            <CardContent>
              {societyConfs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>会议名称</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead>地点</TableHead>
                      <TableHead>确认参会</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {societyConfs.map(conf => (
                      <TableRow key={conf.id}>
                        <TableCell className="font-medium max-w-[200px] truncate" title={conf.name}>
                          {conf.name}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{conf.startDate} ~ {conf.endDate}</TableCell>
                        <TableCell>{conf.location}</TableCell>
                        <TableCell>{conf.registrations}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={conf.status === "published" ? "text-green-600 border-green-300 bg-green-50" : "text-gray-500 border-gray-300 bg-gray-50"}>
                            {conf.status === "published" ? "已发布" : "草稿"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">该学会暂无会议</div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            无法加载该学会的统计数据
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// LEVEL 3: CONFERENCE STATISTICS
// ============================================================================

function ConferenceStatistics() {
  const { getConferenceStats, getAllConferences, getConferenceAttendees, generateExportZip } = useAdmin();
  const [selectedConf, setSelectedConf] = useState<string>("");
  const [filterFeeType, setFilterFeeType] = useState<string>("all");
  const [filterReportType, setFilterReportType] = useState<string>("all");
  const [filterAccommodation, setFilterAccommodation] = useState<string>("all");
  const [filterFieldTrip, setFilterFieldTrip] = useState<string>("all");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const allConfs = getAllConferences();

  const conferenceOptions = useMemo(() => {
    return allConfs.map(c => ({
      value: c.id,
      label: `${c.name} (${c.branchName})`,
    }));
  }, [allConfs]);

  const stats: ConferenceStats | null = useMemo(() => {
    if (!selectedConf) return null;
    return getConferenceStats(selectedConf);
  }, [selectedConf, getConferenceStats]);

  const attendees: ConferenceAttendee[] = useMemo(() => {
    if (!selectedConf) return [];
    return getConferenceAttendees(selectedConf);
  }, [selectedConf, getConferenceAttendees]);

  // Filtered attendees
  const filteredAttendees = useMemo(() => {
    let list = attendees;
    if (filterFeeType !== "all") {
      list = list.filter(a => a.feeType === filterFeeType);
    }
    if (filterReportType !== "all") {
      list = list.filter(a => a.reportType === filterReportType);
    }
    if (filterAccommodation !== "all") {
      list = list.filter(a => a.accommodationType === filterAccommodation);
    }
    if (filterFieldTrip !== "all") {
      if (filterFieldTrip === "pre") list = list.filter(a => a.fieldTripPre);
      else if (filterFieldTrip === "during") list = list.filter(a => a.fieldTripDuring);
      else if (filterFieldTrip === "post") list = list.filter(a => a.fieldTripPost);
      else if (filterFieldTrip === "any") list = list.filter(a => a.fieldTripPre || a.fieldTripDuring || a.fieldTripPost);
      else if (filterFieldTrip === "none") list = list.filter(a => !a.fieldTripPre && !a.fieldTripDuring && !a.fieldTripPost);
    }
    if (attendeeSearch) {
      const s = attendeeSearch.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || a.unit.toLowerCase().includes(s));
    }
    return list;
  }, [attendees, filterFeeType, filterReportType, filterAccommodation, filterFieldTrip, attendeeSearch]);

  // Abstracts from attendees
  const abstracts = useMemo(() => {
    return attendees.filter(a => a.abstractFileName);
  }, [attendees]);

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

  // Count stats from actual attendees
  const attendeeFeeBreakdown = useMemo(() => {
    const breakdown = {
      studentMember: { count: 0, amount: 0 },
      nonStudentMember: { count: 0, amount: 0 },
      studentNonMember: { count: 0, amount: 0 },
      nonStudentNonMember: { count: 0, amount: 0 },
    };
    for (const a of attendees) {
      if (a.feeType === CONFERENCE_FEE_TYPE.STUDENT_MEMBER) {
        breakdown.studentMember.count++;
        breakdown.studentMember.amount += a.feeAmount;
      } else if (a.feeType === CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER) {
        breakdown.nonStudentMember.count++;
        breakdown.nonStudentMember.amount += a.feeAmount;
      } else if (a.feeType === CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER) {
        breakdown.studentNonMember.count++;
        breakdown.studentNonMember.amount += a.feeAmount;
      } else if (a.feeType === CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER) {
        breakdown.nonStudentNonMember.count++;
        breakdown.nonStudentNonMember.amount += a.feeAmount;
      }
    }
    return breakdown;
  }, [attendees]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium whitespace-nowrap">选择会议：</label>
        <Select value={selectedConf} onValueChange={(v) => { setSelectedConf(v); setFilterFeeType("all"); setFilterReportType("all"); setFilterAccommodation("all"); setFilterFieldTrip("all"); setAttendeeSearch(""); }}>
          <SelectTrigger className="w-[400px]">
            <SelectValue placeholder="请选择会议" />
          </SelectTrigger>
          <SelectContent>
            {conferenceOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stats && (
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "导出中…" : "导出ZIP"}
          </Button>
        )}
      </div>

      {!selectedConf ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            请从上方下拉菜单中选择一场会议以查看其详细统计
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          {/* Conference basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{stats.confName}</CardTitle>
              <CardDescription>
                主办：{stats.societyName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="参会总人数" value={attendees.length || stats.totalAttendees} icon={Users} />
                <StatCard title="会议费总收入" value={`¥${attendeeFeeBreakdown.studentMember.amount + attendeeFeeBreakdown.nonStudentMember.amount + attendeeFeeBreakdown.studentNonMember.amount + attendeeFeeBreakdown.nonStudentNonMember.amount || stats.totalConferenceFee.toLocaleString()}`} icon={CreditCard} />
                <StatCard title="报告总数" value={stats.totalReports || "—"} subtitle={stats.totalReports > 0 ? `口头 ${stats.oralReports} / 展板 ${stats.posterReports}` : undefined} icon={BookOpen} />
                <StatCard title="摘要提交" value={abstracts.length} subtitle={abstracts.length > 0 ? `${abstracts.length} 份` : "暂无"} icon={FileText} />
              </div>
            </CardContent>
          </Card>

          {/* Attendee breakdown */}
          <div>
            <h3 className="text-base font-semibold text-strata-blue-deep mb-3">参会人员结构</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="会员参会"
                value={attendeeFeeBreakdown.studentMember.count + attendeeFeeBreakdown.nonStudentMember.count || stats.totalMembers}
                subtitle={`学生 ${attendeeFeeBreakdown.studentMember.count || stats.studentMembers} / 非学生 ${attendeeFeeBreakdown.nonStudentMember.count || stats.nonStudentMembers}`}
                icon={GraduationCap}
              />
              <StatCard
                title="非会员参会"
                value={attendeeFeeBreakdown.studentNonMember.count + attendeeFeeBreakdown.nonStudentNonMember.count || stats.totalNonMembers}
                subtitle={`学生 ${attendeeFeeBreakdown.studentNonMember.count || stats.studentNonMembers} / 非学生 ${attendeeFeeBreakdown.nonStudentNonMember.count || stats.nonStudentNonMembers}`}
                icon={Users}
              />
              <Card className="flex flex-col justify-center p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">会员占比</div>
                <div className="text-2xl font-bold text-strata-blue-deep">
                  {attendees.length > 0
                    ? Math.round(((attendeeFeeBreakdown.studentMember.count + attendeeFeeBreakdown.nonStudentMember.count) / attendees.length) * 100)
                    : (stats.totalAttendees > 0 ? Math.round((stats.totalMembers / stats.totalAttendees) * 100) : 0)}%
                </div>
              </Card>
              <Card className="flex flex-col justify-center p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">学生占比</div>
                <div className="text-2xl font-bold text-strata-blue-deep">
                  {attendees.length > 0
                    ? Math.round(((attendeeFeeBreakdown.studentMember.count + attendeeFeeBreakdown.studentNonMember.count) / attendees.length) * 100)
                    : (stats.totalAttendees > 0 ? Math.round(((stats.studentMembers + stats.studentNonMembers) / stats.totalAttendees) * 100) : 0)}%
                </div>
              </Card>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">会议费明细（实际数据）</CardTitle>
                <CardDescription>四类费用笔数与金额</CardDescription>
              </CardHeader>
              <CardContent>
                <FeeBreakdownTable breakdown={attendees.length > 0 ? attendeeFeeBreakdown : stats.feeBreakdown} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">会议费分布</CardTitle>
              </CardHeader>
              <CardContent>
                <FeeBreakdownBarChart breakdown={attendees.length > 0 ? attendeeFeeBreakdown : stats.feeBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* ── PHASE 5: 📋 参会人员列表 ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> 参会人员列表
                </CardTitle>
                <CardDescription>
                  共 {filteredAttendees.length} 人 {attendees.length > 0 && filteredAttendees.length !== attendees.length && `（筛选自 ${attendees.length} 人）`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名/邮箱/单位…"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={filterFeeType} onValueChange={setFilterFeeType}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="费用类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部费用类型</SelectItem>
                    <SelectItem value={CONFERENCE_FEE_TYPE.STUDENT_MEMBER}>{CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_MEMBER]}</SelectItem>
                    <SelectItem value={CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER}>{CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER]}</SelectItem>
                    <SelectItem value={CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER}>{CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER]}</SelectItem>
                    <SelectItem value={CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER}>{CONFERENCE_FEE_TYPE_LABEL[CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER]}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterReportType} onValueChange={setFilterReportType}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="报告类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部报告类型</SelectItem>
                    <SelectItem value="口头报告">口头报告</SelectItem>
                    <SelectItem value="展板报告">展板报告</SelectItem>
                    <SelectItem value="仅参会">仅参会</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAccommodation} onValueChange={setFilterAccommodation}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="住宿类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部住宿</SelectItem>
                    <SelectItem value="male_single">{ACCOMMODATION_TYPE_LABEL.male_single}</SelectItem>
                    <SelectItem value="male_double">{ACCOMMODATION_TYPE_LABEL.male_double}</SelectItem>
                    <SelectItem value="female_single">{ACCOMMODATION_TYPE_LABEL.female_single}</SelectItem>
                    <SelectItem value="female_double">{ACCOMMODATION_TYPE_LABEL.female_double}</SelectItem>
                    <SelectItem value="self_arranged">{ACCOMMODATION_TYPE_LABEL.self_arranged}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterFieldTrip} onValueChange={setFilterFieldTrip}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="野外参与" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="any">有野外</SelectItem>
                    <SelectItem value="pre">会前野外</SelectItem>
                    <SelectItem value="during">会中野外</SelectItem>
                    <SelectItem value="post">会后野外</SelectItem>
                    <SelectItem value="none">无野外</SelectItem>
                  </SelectContent>
                </Select>
                {(filterFeeType !== "all" || filterReportType !== "all" || filterAccommodation !== "all" || filterFieldTrip !== "all" || attendeeSearch) && (
                  <Button variant="ghost" size="sm" className="h-9" onClick={() => { setFilterFeeType("all"); setFilterReportType("all"); setFilterAccommodation("all"); setFilterFieldTrip("all"); setAttendeeSearch(""); }}>
                    <FilterX className="h-4 w-4 mr-1" />
                    清除筛选
                  </Button>
                )}
              </div>

              {attendees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <Users className="h-8 w-8" />
                  <span className="text-sm">暂无参会人员数据（需用户在前台报名后才会显示）</span>
                </div>
              ) : filteredAttendees.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  未找到匹配的参会人员
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">姓名</TableHead>
                        <TableHead className="whitespace-nowrap">身份类型</TableHead>
                        <TableHead className="whitespace-nowrap">费用类型</TableHead>
                        <TableHead className="whitespace-nowrap text-right">金额</TableHead>
                        <TableHead className="whitespace-nowrap">缴费状态</TableHead>
                        <TableHead className="whitespace-nowrap">报告类型</TableHead>
                        <TableHead className="whitespace-nowrap">住宿</TableHead>
                        <TableHead className="whitespace-nowrap">野外</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendees.map((a, idx) => {
                        const fieldTripText = a.fieldTripSummary && a.fieldTripSummary !== "—"
                          ? a.fieldTripSummary
                          : (() => {
                              const fieldTripParts: string[] = [];
                              if (a.fieldTripPre) fieldTripParts.push("会前");
                              if (a.fieldTripDuring) fieldTripParts.push("会中");
                              if (a.fieldTripPost) fieldTripParts.push("会后");
                              return fieldTripParts.length > 0 ? fieldTripParts.join("/") : "—";
                            })();

                        const statusLabel = CONFERENCE_STATUS_LABEL[a.paymentStatus] || a.paymentStatus;
                        const statusColor = a.paymentStatus === "confirmed"
                          ? "text-green-600 bg-green-50 border-green-200"
                          : a.paymentStatus === "voucher_submitted" || a.paymentStatus === "invoice_submitted"
                          ? "text-yellow-600 bg-yellow-50 border-yellow-200"
                          : a.paymentStatus === "voucher_rejected" || a.paymentStatus === "invoice_rejected"
                          ? "text-red-600 bg-red-50 border-red-200"
                          : "text-blue-600 bg-blue-50 border-blue-200";

                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              <div>
                                <span>{a.name}</span>
                                <span className="text-xs text-muted-foreground block">{a.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              <Badge variant="outline" className="text-xs">
                                {a.userType === "member" ? "会员" : "非会员"} · {a.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {CONFERENCE_FEE_TYPE_LABEL[a.feeType]}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              ¥{a.feeAmount}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${statusColor}`}>
                                {statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{a.reportType || "—"}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{a.accommodationLabel || "—"}</TableCell>
                            <TableCell className="text-sm max-w-[220px] whitespace-normal" title={fieldTripText}>
                              {fieldTripText}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── PHASE 5: 📄 摘要管理 ── */}
          {abstracts.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> 摘要管理
                  </CardTitle>
                  <CardDescription>
                    {abstracts.length} 份摘要文件
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => downloadAbstractsZip(abstracts, stats.confName)}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  打包下载全部摘要
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>提交人</TableHead>
                      <TableHead>报告题目</TableHead>
                      <TableHead>报告类型</TableHead>
                      <TableHead>摘要文件</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abstracts.map((a, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          <div>
                            <span>{a.name}</span>
                            <span className="text-xs text-muted-foreground block">{a.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={a.reportTitle}>
                          {a.reportTitle || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{a.reportType || "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-xs">
                          {a.abstractFileName || "—"}
                        </TableCell>
                        <TableCell>
                          {a.abstractFileUrl ? (
                            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                              <a href={a.abstractFileUrl} download={a.abstractFileName} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3 mr-1" />
                                下载
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Report, Accommodation, Field Trip Stats */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Report stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> 报告统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">总报告数</span>
                    <span className="text-xl font-bold text-strata-blue-deep">{stats.totalReports || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">口头报告</span>
                    <span className="text-lg font-semibold">{stats.oralReports || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">展板报告</span>
                    <span className="text-lg font-semibold">{stats.posterReports || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accommodation stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> 住宿统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">总房间数</span>
                    <span className="text-xl font-bold text-strata-blue-deep">{stats.accommodation.totalRooms || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{ACCOMMODATION_TYPE_LABEL.male_single}</span>
                    <span className="text-lg font-semibold">{stats.accommodation.maleSingle || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{ACCOMMODATION_TYPE_LABEL.male_double}</span>
                    <span className="text-lg font-semibold">{stats.accommodation.maleDouble || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{ACCOMMODATION_TYPE_LABEL.female_single}</span>
                    <span className="text-lg font-semibold">{stats.accommodation.femaleSingle || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{ACCOMMODATION_TYPE_LABEL.female_double}</span>
                    <span className="text-lg font-semibold">{stats.accommodation.femaleDouble || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{ACCOMMODATION_TYPE_LABEL.self_arranged}</span>
                    <span className="text-lg font-semibold">{stats.accommodation.selfArranged || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Field trip stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> 野外统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(["pre", "during", "post"] as const).map(phase => {
                    const d = stats.fieldTrips[phase];
                    const hasData = d.total > 0;
                    return (
                      <div key={phase}>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {FIELD_TRIP_PHASE_LABEL[phase]}野外
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>总人数: <strong>{d.total || 0}</strong></span>
                          <span>男: <strong>{d.male || 0}</strong></span>
                          <span>女: <strong>{d.female || 0}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <FieldTripDetailPanel
            attendees={attendees}
            routes={allConfs.find(c => c.id === selectedConf)?.fieldTripRoutes}
          />
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            无法加载该会议的统计数据
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// BRANCH ADMIN STATISTICS (default view for branch_admin)
// ============================================================================

function BranchAdminStatisticsView() {
  const { adminBranchId, getSocietyStats, getAllConferences, generateExportZip } = useAdmin();
  const [level, setLevel] = useState<"society" | "conference">("society");
  const [isExporting, setIsExporting] = useState(false);
  const branchId = adminBranchId || "";
  const stats = getSocietyStats(branchId);
  const allConfs = getAllConferences();
  const branchConfs = useMemo(() => allConfs.filter(c => c.branchId === branchId), [allConfs, branchId]);

  const handleExport = async () => {
    if (!branchId) return;
    setIsExporting(true);
    try {
      const blobs = await generateExportZip({ scope: "branch", scopeId: branchId });
      const societyName = ALL_SOCIETY_UNITS[branchId] || branchId;
      const fileName = `export_branch_${societyName.slice(0, 20)}_${new Date().toISOString().split("T")[0]}`;
      saveExportBlobs(blobs, fileName);
      toast.success("导出成功");
    } catch (e) {
      toast.error("导出失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsExporting(false);
    }
  };

  if (!adminBranchId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          无法加载分会统计数据：未指定分会
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={level} onValueChange={(v) => setLevel(v as "society" | "conference")}>
        <TabsList>
          <TabsTrigger value="society">学会累计</TabsTrigger>
          <TabsTrigger value="conference">单次会议</TabsTrigger>
        </TabsList>

        <TabsContent value="society" className="mt-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-strata-blue-deep">{ALL_SOCIETY_UNITS[branchId] || branchId} - 数据统计</h2>
          <p className="text-sm text-muted-foreground">绑定注册用户 + 累计参会与会议费（基于实收确认记录）</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "导出中…" : "导出凭证/发票"}
        </Button>
      </div>

      {/* Summary cards */}
      <SocietyLevelStatsBlocks stats={stats} />

      {/* Fee breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">四类会议费分项</CardTitle>
            <CardDescription>笔数与金额</CardDescription>
          </CardHeader>
          <CardContent>
            <FeeBreakdownTable breakdown={stats.feeBreakdown} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">会议费分布</CardTitle>
          </CardHeader>
          <CardContent>
            <FeeBreakdownBarChart breakdown={stats.feeBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Branch conference list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">分会会议列表</CardTitle>
          <CardDescription>各会议确认参会人数（实收聚合）</CardDescription>
        </CardHeader>
        <CardContent>
          {branchConfs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议名称</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>地点</TableHead>
                  <TableHead>确认参会</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchConfs.map(conf => (
                  <TableRow key={conf.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={conf.name}>
                      {conf.name}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{conf.startDate} ~ {conf.endDate}</TableCell>
                    <TableCell>{conf.location}</TableCell>
                    <TableCell>{conf.registrations}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={conf.status === "published" ? "text-green-600 border-green-300 bg-green-50" : "text-gray-500 border-gray-300 bg-gray-50"}>
                        {conf.status === "published" ? "已发布" : "草稿"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground">暂无会议数据</div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="conference" className="mt-4">
          <ConferenceStatistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// MAIN STATISTICS PAGE
// ============================================================================

export default function Statistics() {
  const { adminRole, getGlobalStats } = useAdmin();
  const [level, setLevel] = useState<StatLevel>(adminRole === "branch_admin" ? "society" : "global");

  if (adminRole === "super_admin" || adminRole === "finance_reviewer") {
    const globalStats = getGlobalStats();

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-strata-blue-deep">数据统计</h1>
          <p className="text-muted-foreground mt-1">
            {adminRole === "finance_reviewer"
              ? "全平台运营数据汇总（财务视角）"
              : "学会运营数据的可视化统计与分析"}
          </p>
        </div>

        {/* Level selector */}
        <Tabs value={level} onValueChange={(v) => setLevel(v as StatLevel)}>
          <TabsList>
            <TabsTrigger value="global">总览</TabsTrigger>
            <TabsTrigger value="society">按学会查看</TabsTrigger>
            <TabsTrigger value="conference">按会议查看</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4">
            <GlobalStatistics stats={globalStats} />
          </TabsContent>

          <TabsContent value="society" className="mt-4">
            <SocietyStatistics onRequestGlobalView={() => setLevel("global")} />
          </TabsContent>

          <TabsContent value="conference" className="mt-4">
            <ConferenceStatistics />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Branch admin: show branch stats by default
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep">数据统计</h1>
        <p className="text-muted-foreground mt-1">分会运营数据的可视化统计与分析</p>
      </div>
      <BranchAdminStatisticsView />
    </div>
  );
}
