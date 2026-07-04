import { useAdmin, type ReviewItem, type DashboardStats } from "@/contexts/AdminContext";
import { SocietyFeeMatrixTable } from "@/pages/admin/Statistics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, ClipboardCheck, Calendar, CreditCard, Clock, AlertCircle, FileText, GraduationCap, TrendingUp } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MEMBERSHIP_STATUS_LABEL, ALL_SOCIETY_UNITS, CONFERENCE_FEE_TYPE_LABEL, CONFERENCE_FEE_TYPE } from "@shared/constants";
import { useEffect, useState } from "react";
import { fetchDashboardStats, type ApiDashboardStats } from "@/lib/cms-api";

const CHART_COLORS = ["#002B49", "#C41E3A", "#D9C5A0", "#715a3e", "#406182", "#8B0000"];

const SOCIETY_CHART_COLORS = ["#002B49", "#C41E3A", "#D9C5A0", "#715a3e", "#406182", "#8B0000", "#2d6a4f", "#9b2226", "#ca6702", "#005f73", "#0b525b", "#ee9b00"];

const FEE_TYPE_COLORS: Record<string, string> = {
  student_member: "#002B49",
  non_student_member: "#C41E3A",
  student_non_member: "#D9C5A0",
  non_student_non_member: "#715a3e",
};

function StatCard({
  title,
  value,
  icon: Icon,
  delay,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-strata-blue-deep">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const label = MEMBERSHIP_STATUS_LABEL[status] || status;
  const colorMap: Record<string, string> = {
    voucher_submitted: "bg-yellow-50 text-yellow-700 border-yellow-200",
    voucher_rejected: "bg-red-50 text-red-700 border-red-200",
    invoice_pending: "bg-blue-50 text-blue-700 border-blue-200",
    invoice_submitted: "bg-yellow-50 text-yellow-700 border-yellow-200",
    invoice_rejected: "bg-red-50 text-red-700 border-red-200",
    invoice_overdue: "bg-orange-50 text-orange-700 border-orange-200",
    active: "bg-green-50 text-green-700 border-green-200",
    confirmed: "bg-green-50 text-green-700 border-green-200",
    not_member: "bg-gray-50 text-gray-500 border-gray-200",
    expired: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <Badge variant="outline" className={colorMap[status] || "bg-gray-50 text-gray-500 border-gray-200"}>
      {label}
    </Badge>
  );
}

function SuperAdminView({ stats }: { stats: DashboardStats }) {
  const { getGlobalStats, getAllConferences } = useAdmin();
  const localGlobalStats = getGlobalStats();
  const allConfs = getAllConferences();

  const [apiStats, setApiStats] = useState<ApiDashboardStats | null>(null);
  useEffect(() => {
    fetchDashboardStats().then(data => { if (data) setApiStats(data); });
  }, []);

  const globalStats = apiStats ? {
    ...localGlobalStats,
    studentMembers: apiStats.studentMembers,
    nonStudentMembers: apiStats.nonStudentMembers,
    studentNonMembers: apiStats.studentNonMembers,
    nonStudentNonMembers: apiStats.nonStudentNonMembers,
    totalMembershipFee: apiStats.totalMembershipFee,
    totalConferenceFee: apiStats.totalConferenceFee,
    studentMembershipFeeAmount: localGlobalStats.studentMembershipFeeAmount,
    nonStudentMembershipFeeAmount: localGlobalStats.nonStudentMembershipFeeAmount,
    perSocietyConferenceFee: localGlobalStats.perSocietyConferenceFee,
    perSocietyFeeBreakdown: localGlobalStats.perSocietyFeeBreakdown,
  } : localGlobalStats;

  const effectiveStats: DashboardStats = apiStats ? {
    ...stats,
    totalUsers: apiStats.totalUsers,
    memberCount: apiStats.memberCount,
    nonMemberCount: apiStats.nonMemberCount,
    activeMembers: apiStats.activeMembers,
    activeConferences: apiStats.activeConferences,
    branchMemberCounts: apiStats.branchMemberCounts.length > 0 ? apiStats.branchMemberCounts : stats.branchMemberCounts,
  } : stats;

  // 12-society conference fee bar chart data
  const societyFeeData = Object.entries(ALL_SOCIETY_UNITS).map(([id, name]) => ({
    name: name.length > 8 ? name.slice(0, 8) + "…" : name,
    fullName: name,
    amount: globalStats.perSocietyConferenceFee[id] || 0,
  }));

  // 4-class population pie chart data
  const populationPieData = [
    { name: "学生会员", value: globalStats.studentMembers, fill: FEE_TYPE_COLORS.student_member },
    { name: "非学生会员", value: globalStats.nonStudentMembers, fill: FEE_TYPE_COLORS.non_student_member },
    { name: "学生(非会员)", value: globalStats.studentNonMembers, fill: FEE_TYPE_COLORS.student_non_member },
    { name: "非学生(非会员)", value: globalStats.nonStudentNonMembers, fill: FEE_TYPE_COLORS.non_student_non_member },
  ].filter(d => d.value > 0);

  // Society attendee heat table: per society conference count + confirmed attendees
  const societyAttendeeData = Object.entries(ALL_SOCIETY_UNITS)
    .map(([id, name]) => {
      const socConfs = allConfs.filter(c => c.branchId === id);
      return {
        id,
        name,
        confCount: socConfs.length,
        totalRegs: socConfs.reduce((sum, c) => sum + c.registrations, 0),
      };
    })
    .filter(d => d.confCount > 0 || d.totalRegs > 0);

  const paymentTrendData = effectiveStats.paymentTrend.length > 0
    ? effectiveStats.paymentTrend
    : [{ month: new Date().toISOString().slice(0, 7), count: 0 }];

  return (
    <div className="space-y-6">
      {/* Row 1: Basic stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="用户总数" value={effectiveStats.totalUsers} icon={Users} delay={0} />
        <StatCard title="非会员" value={effectiveStats.nonMemberCount} icon={Users} delay={0.1} />
        <StatCard title="会员" value={effectiveStats.memberCount} icon={LayoutDashboard} delay={0.15} />
        <StatCard title="活跃会员" value={effectiveStats.activeMembers} icon={LayoutDashboard} delay={0.2} />
      </div>

      {/* Row 1b: Fee totals */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="会员费累计总额"
          value={`¥${globalStats.totalMembershipFee.toLocaleString()}`}
          icon={CreditCard}
          delay={0.22}
        />
        <StatCard
          title="会议费累计总额"
          value={`¥${globalStats.totalConferenceFee.toLocaleString()}`}
          icon={TrendingUp}
          delay={0.24}
        />
      </div>

      {/* Row 2: 4-class population cards */}
      <div>
        <h3 className="text-sm font-semibold text-strata-blue-deep mb-3 flex items-center gap-2">
          <GraduationCap className="h-4 w-4" /> 四类人群分布概览
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
            <Card className="border-l-4" style={{ borderLeftColor: FEE_TYPE_COLORS.student_member }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">学生会员</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-strata-blue-deep">{globalStats.studentMembers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  会员费 ¥{globalStats.studentMembershipFeeAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
            <Card className="border-l-4" style={{ borderLeftColor: FEE_TYPE_COLORS.non_student_member }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">非学生会员</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-strata-blue-deep">{globalStats.nonStudentMembers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  会员费 ¥{globalStats.nonStudentMembershipFeeAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
            <Card className="border-l-4" style={{ borderLeftColor: FEE_TYPE_COLORS.student_non_member }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">学生（非会员）</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-strata-blue-deep">{globalStats.studentNonMembers}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
            <Card className="border-l-4" style={{ borderLeftColor: FEE_TYPE_COLORS.non_student_non_member }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">非学生（非会员）</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-strata-blue-deep">{globalStats.nonStudentNonMembers}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Row 3: Branch distribution + Population pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">分会用户分布</CardTitle>
              <CardDescription>各分会绑定用户数量统计</CardDescription>
            </CardHeader>
            <CardContent>
              {effectiveStats.branchMemberCounts && effectiveStats.branchMemberCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(320, effectiveStats.branchMemberCounts.length * 52)}>
                  <BarChart data={effectiveStats.branchMemberCounts} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E1DA" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="用户数" fill="#002B49" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 14, fontWeight: 600 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">暂无数据</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">四类人群分布</CardTitle>
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
        </motion.div>
      </div>

      {/* Row 4: 12-Society conference fee mini chart + Society attendee heat table */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> 各学会会议费收入概览
              </CardTitle>
              <CardDescription>固定展示 12 学会（含金额为 0 的学会）</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(360, societyFeeData.length * 46)}>
                <BarChart data={societyFeeData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E1DA" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""} />
                  <Bar dataKey="amount" name="会议费" fill="#002B49" radius={[0, 4, 4, 0]}>
                    {societyFeeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={SOCIETY_CHART_COLORS[index % SOCIETY_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">各学会参会人数概览</CardTitle>
              <CardDescription>各学会发布会议数与确认参会人数（实收聚合）</CardDescription>
            </CardHeader>
            <CardContent>
              {societyAttendeeData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学会</TableHead>
                      <TableHead className="text-right">会议数</TableHead>
                      <TableHead className="text-right">确认参会</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {societyAttendeeData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-sm">{row.name}</TableCell>
                        <TableCell className="text-right">{row.confCount}</TableCell>
                        <TableCell className="text-right font-semibold">{row.totalRegs}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">暂无数据</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 4b: 12×4 society fee matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.58, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">各学会四类会议费统计矩阵（12×4）</CardTitle>
            <CardDescription>实收确认参会：笔数 / 金额</CardDescription>
          </CardHeader>
          <CardContent>
            <SocietyFeeMatrixTable breakdowns={globalStats.perSocietyFeeBreakdown} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 5: Payment trend + Recent reviews */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> 实收缴费趋势
              </CardTitle>
              <CardDescription>近 12 个月会员费/会议费确认笔数（实收聚合）</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentTrendData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={paymentTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E1DA" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="确认笔数" fill="#002B49" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">暂无实收缴费数据</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最近审核记录</CardTitle>
            </CardHeader>
            <CardContent>
              {effectiveStats.recentReviews && effectiveStats.recentReviews.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>提交时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effectiveStats.recentReviews.slice(0, 5).map((r: ReviewItem) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.userName || r.userEmail}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {r.type === "society_fee" ? "会员费" : "会议费"}
                          </Badge>
                        </TableCell>
                        <TableCell>¥{r.amount}</TableCell>
                        <TableCell><ReviewStatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.submitTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">暂无数据</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function BranchAdminView() {
  const { getBranchDashboardStats, adminBranchId } = useAdmin();
  if (!adminBranchId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          无法加载分会数据：未指定分会
        </CardContent>
      </Card>
    );
  }
  const stats = getBranchDashboardStats(adminBranchId);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="分会会议" value={stats.branchConferences} icon={Calendar} delay={0} />
        <StatCard title="确认参会" value={stats.branchRegistrations} icon={Users} delay={0.1} />
        <StatCard title="分会用户" value={stats.branchUserCount} icon={LayoutDashboard} delay={0.2} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">待审核</CardTitle>
            <CardDescription>当前待处理的审核数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <span className="text-3xl font-bold text-strata-blue-deep">{stats.branchPendingReviews}</span>
              <span className="text-muted-foreground">条审核待处理</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {stats.recentRegistrations && stats.recentRegistrations.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最近报名</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>会议</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentRegistrations.map((reg, i) => (
                    <TableRow key={i}>
                      <TableCell>{reg.userName}</TableCell>
                      <TableCell>{reg.conferenceName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{reg.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-32 text-muted-foreground">暂无数据</CardContent>
        </Card>
      )}
    </div>
  );
}

function FinanceReviewerView() {
  const { getFinanceDashboardStats } = useAdmin();
  const stats = getFinanceDashboardStats();

  const pieData = [
    { name: "待初审", value: stats.pendingVoucher },
    { name: "待终审", value: stats.pendingInvoice },
    { name: "已处理(今日)", value: stats.processedToday },
    { name: "逾期", value: stats.overdueCount },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="待初审" value={stats.pendingVoucher} icon={ClipboardCheck} delay={0} />
        <StatCard title="待终审" value={stats.pendingInvoice} icon={FileText} delay={0.1} />
        <StatCard title="今日已处理" value={stats.processedToday} icon={CreditCard} delay={0.2} />
        <StatCard title="逾期未上传" value={stats.overdueCount} icon={Clock} delay={0.3} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">审核分布</CardTitle>
            <CardDescription>当前审核任务分布概览</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={true} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">最近审核记录</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentReviews && stats.recentReviews.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>提交时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentReviews.slice(0, 10).map((r: ReviewItem) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.userName || r.userEmail}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.type === "society_fee" ? "会员费" : "会议费"}
                        </Badge>
                      </TableCell>
                      <TableCell>¥{r.amount}</TableCell>
                      <TableCell><ReviewStatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.submitTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">暂无数据</div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="py-12">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { adminRole, getDashboardStats } = useAdmin();

  if (!adminRole) {
    return <DashboardLoading />;
  }

  if (adminRole === "super_admin") {
    const stats = getDashboardStats();
    return <SuperAdminView stats={stats} />;
  }

  if (adminRole === "branch_admin") {
    return <BranchAdminView />;
  }

  if (adminRole === "finance_reviewer") {
    return <FinanceReviewerView />;
  }

  return <DashboardLoading />;
}
