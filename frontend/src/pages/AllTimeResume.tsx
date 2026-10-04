import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/context/ApiContext";
import { AllTimeResumeData, Account } from "@/api/repository";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Landmark,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  Percent,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export function AllTimeResume() {
  const api = useApi();
  const [data, setData] = useState<AllTimeResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<"flow" | "cumulative" | "savings">("flow");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (api.getAllTimeResume) {
        const resumeData = await api.getAllTimeResume();
        setData(resumeData);
      } else {
        setError("All-time resume feature is not available in the current environment.");
      }
    } catch (err) {
      console.error("Failed to fetch all-time resume:", err);
      setError("Failed to load all-time resume data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  // Derived metrics
  const yearlyCount = data?.years.length || 0;
  const avgAnnualIncome = yearlyCount > 0 && data?.totals.total_income ? data.totals.total_income / yearlyCount : 0;
  const avgAnnualExpense = yearlyCount > 0 && data?.totals.total_expense ? data.totals.total_expense / yearlyCount : 0;

  // Best year (highest net balance)
  const bestYear = useMemo(() => {
    if (!data?.years || data.years.length === 0) return null;
    return [...data.years].sort((a, b) => b.net_balance - a.net_balance)[0];
  }, [data]);

  // Chart dataset
  const chartData = useMemo(() => {
    if (!data?.yearly_trend) return [];
    return data.yearly_trend.map((item) => {
      const yearInfo = data.years.find((y) => y.year === item.year);
      return {
        year: item.year.toString(),
        income: item.income,
        expense: item.expense,
        net_flow: item.net_flow,
        cumulative_balance: item.cumulative_balance,
        savings_rate: yearInfo?.savings_rate || 0,
      };
    });
  }, [data]);

  const formatCurrency = (val: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatPreciseCurrency = (val: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(val);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm">
          Calculating all-time financial resume and account balances...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto my-12 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-destructive">Error Loading Resume</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    );
  }

  const { totals, accounts, years } = data || {
    totals: { total_income: 0, total_expense: 0, net_savings: 0, savings_rate: 0 },
    accounts: { total_balance: 0, total_assets: 0, total_liabilities: 0, net_worth: 0, account_list: [] },
    years: [],
  };

  const isNetPositive = accounts.net_worth >= 0;

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              Insights
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {years.length > 0
                ? `${years[0]?.year} - ${years[years.length - 1]?.year}`
                : "All Time"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1.5 flex items-center gap-3">
            All-Time Resume
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive historical overview of your accounts, balances, income, and expenses across multiple years.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2 shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Main Cards: Net Main Balance & All-Time Performance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Main Net Balance of Accounts */}
        <Card className="bg-gradient-to-br from-blue-500/10 via-background to-indigo-500/10 border-blue-500/20 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-foreground">
              Main Net Balance
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold tracking-tight ${
                isNetPositive ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(accounts.net_worth)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
              <span>Assets: <strong className="text-foreground">{formatCurrency(accounts.total_assets)}</strong></span>
              <span>Liab: <strong className="text-red-500 dark:text-red-400">{formatCurrency(accounts.total_liabilities)}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* All-Time Income */}
        <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 border-emerald-500/20 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-foreground">
              All-Time Income
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totals.total_income)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
              <span>Annual Avg</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(avgAnnualIncome)}/yr
              </span>
            </div>
          </CardContent>
        </Card>

        {/* All-Time Expenses */}
        <Card className="bg-gradient-to-br from-rose-500/10 via-background to-pink-500/10 border-rose-500/20 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-foreground">
              All-Time Expenses
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatCurrency(totals.total_expense)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
              <span>Annual Avg</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(avgAnnualExpense)}/yr
              </span>
            </div>
          </CardContent>
        </Card>

        {/* All-Time Net Savings & Rate */}
        <Card className="bg-gradient-to-br from-violet-500/10 via-background to-purple-500/10 border-violet-500/20 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-foreground">
              All-Time Net Savings
            </CardTitle>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
              <PiggyBank className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold tracking-tight ${
                totals.net_savings >= 0
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-red-500"
              }`}
            >
              {totals.net_savings >= 0 ? "+" : ""}
              {formatCurrency(totals.net_savings)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
              <span>Overall Savings Rate</span>
              <Badge
                variant="secondary"
                className={`font-semibold text-xs ${
                  totals.savings_rate >= 20
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : totals.savings_rate >= 0
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {totals.savings_rate.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Balances Breakdown Section */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              Accounts Net Main Balance Overview
            </CardTitle>
            <CardDescription className="text-sm">
              Current live balance and status for all active accounts.
            </CardDescription>
          </div>
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Net Worth: <strong>{formatPreciseCurrency(accounts.net_worth)}</strong></span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.account_list.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No accounts registered yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {accounts.account_list.map((acc: Account) => {
                const isLiability = acc.classification === "LIABILITY";
                const isAsset = acc.classification === "ASSET";
                const bal = acc.current_balance || 0;

                return (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <h4 className="font-semibold text-sm truncate text-foreground">
                          {acc.name}
                        </h4>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          {acc.type}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-5 font-medium ${
                          isLiability
                            ? "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10"
                            : isAsset
                              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              : "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                        }`}
                      >
                        {acc.classification || "ASSET"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Balance:</span>
                      <span
                        className={`font-bold text-base ${
                          bal < 0
                            ? "text-red-500"
                            : bal > 0
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {formatPreciseCurrency(bal, acc.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graphics & Multi-Year Visualizations */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Multi-Year Financial Trends & Comparison
            </CardTitle>
            <CardDescription className="text-sm">
              Visualize how your income, expenses, and actual balance evolved over the years.
            </CardDescription>
          </div>

          {/* Chart View Selector */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveChartTab("flow")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeChartTab === "flow"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income vs Expenses
            </button>
            <button
              onClick={() => setActiveChartTab("cumulative")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeChartTab === "cumulative"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cumulative Balance
            </button>
            <button
              onClick={() => setActiveChartTab("savings")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeChartTab === "savings"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Savings Rate
            </button>
          </div>
        </CardHeader>

        <CardContent className="h-[360px] pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No historical data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === "flow" ? (
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value) || 0),
                      name === "income"
                        ? "Income"
                        : name === "expense"
                          ? "Expense"
                          : "Net Balance Flow",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Line
                    type="monotone"
                    dataKey="net_flow"
                    name="Net Flow"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#3b82f6" }}
                  />
                </ComposedChart>
              ) : activeChartTab === "cumulative" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), "Cumulative Net Balance"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="cumulative_balance"
                    name="Cumulative Balance Trajectory"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#balanceGradient)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, "Savings Rate"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    dataKey="savings_rate"
                    name="Savings Rate (%)"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Multiple Year Resumes: Grid of Individual Year Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Multiple Year Resumes
            </h2>
            <p className="text-sm text-muted-foreground">
              Deep dive into each year's net financial results and performance metrics.
            </p>
          </div>
          {bestYear && (
            <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Highest Savings Year: {bestYear.year} ({formatCurrency(bestYear.net_balance)})
            </Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {years.map((y) => {
            const isYearPositive = y.net_balance >= 0;
            const expensePct = y.total_income > 0 ? Math.min(100, (y.total_expense / y.total_income) * 100) : 100;

            return (
              <Card
                key={y.year}
                className="hover:shadow-md transition-all duration-200 border-border/80 flex flex-col justify-between"
              >
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-foreground">
                      {y.year}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-5"
                    >
                      {y.month_count} {y.month_count === 1 ? "month" : "months"}
                    </Badge>
                  </div>
                  <Link to={`/free/year-resume?year=${y.year}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Net Flow</span>
                    <span
                      className={`text-lg font-extrabold ${
                        isYearPositive ? "text-blue-600 dark:text-blue-400" : "text-red-500"
                      }`}
                    >
                      {isYearPositive ? "+" : ""}
                      {formatCurrency(y.net_balance)}
                    </span>
                  </div>

                  {/* Income & Expense Breakdown */}
                  <div className="space-y-1.5 text-xs border-t border-border/60 pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Income:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(y.total_income)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expense:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(y.total_expense)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Savings Rate:</span>
                      <span className="font-bold text-violet-600 dark:text-violet-400">
                        {y.savings_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Visual expense ratio bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${Math.max(0, 100 - expensePct)}%` }}
                        title="Saved"
                      />
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${expensePct}%` }}
                        title="Spent"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Saved {(100 - expensePct).toFixed(0)}%</span>
                      <span>Spent {expensePct.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Action Link to Single Year Resume */}
                  <div className="pt-2">
                    <Link to={`/free/year-resume?year=${y.year}`} className="w-full block">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 font-medium">
                        View {y.year} Monthly Breakdown
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Comparative Multi-Year Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            All-Time Yearly Performance Table
          </CardTitle>
          <CardDescription className="text-sm">
            Side-by-side annual financial performance, growth, and cumulative balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/60 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-l-lg">Year</th>
                <th className="px-4 py-3 font-semibold">Total Income</th>
                <th className="px-4 py-3 font-semibold">Total Expense</th>
                <th className="px-4 py-3 font-semibold">Net Balance</th>
                <th className="px-4 py-3 font-semibold">Savings Rate</th>
                <th className="px-4 py-3 font-semibold">Cumulative Balance</th>
                <th className="px-4 py-3 font-semibold text-right rounded-r-lg">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {years.map((y, idx) => {
                const prevYear = idx > 0 ? years[idx - 1] : null;
                const incomeGrowth =
                  prevYear && prevYear.total_income > 0
                    ? ((y.total_income - prevYear.total_income) / prevYear.total_income) * 100
                    : null;

                return (
                  <tr key={y.year} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">
                      {y.year}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(y.total_income)}
                      {incomeGrowth !== null && (
                        <span
                          className={`ml-2 text-[10px] font-semibold ${
                            incomeGrowth >= 0 ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {incomeGrowth >= 0 ? "+" : ""}
                          {incomeGrowth.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">
                      {formatCurrency(y.total_expense)}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <span
                        className={
                          y.net_balance >= 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-red-500"
                        }
                      >
                        {y.net_balance >= 0 ? "+" : ""}
                        {formatCurrency(y.net_balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          y.savings_rate >= 20
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : y.savings_rate >= 0
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {y.savings_rate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatCurrency(y.closing_balance || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/free/year-resume?year=${y.year}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                          Inspect
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-border font-bold text-xs uppercase bg-muted/20">
              <tr>
                <td className="px-4 py-3">Total / All-Time</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.total_income)}
                </td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400">
                  {formatCurrency(totals.total_expense)}
                </td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400">
                  {totals.net_savings >= 0 ? "+" : ""}
                  {formatCurrency(totals.net_savings)}
                </td>
                <td className="px-4 py-3 text-violet-600 dark:text-violet-400">
                  {totals.savings_rate.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-foreground">
                  {formatCurrency(accounts.net_worth)} (Current Live)
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
