import { Suspense, use, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import Loading from "@/components/ui/loading";
import { ArrowUpIcon, ArrowDownIcon, Wallet, Scale } from "lucide-react";
import { DashboardData } from "@/api/repository";
import { useApi } from "@/context/ApiContext";
import { useMascot } from "@/context/MascotContext";
import { useAppStore } from "@/store/useAppStore";

function DashboardContent({
  dataPromise,
}: {
  dataPromise: Promise<DashboardData>;
}) {
  const data = use(dataPromise);
  const { loadMessageByContext } = useMascot();
  const { isSidebarAnimating } = useAppStore();

  useEffect(() => {
    if (Math.random() < 0.3) {
      loadMessageByContext("home");
    }
  }, [loadMessageByContext]);

  const { current_date, cards, month_comparison, chart_data } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b pb-4 animate-fade-in-up">
        <div>
          <h2 className="text-muted-foreground font-medium uppercase tracking-wider text-sm">
            Overview
          </h2>
          <h1 className="text-4xl font-extrabold tracking-tight mt-1">
            {current_date.month} {current_date.year}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-muted-foreground">
            Current Balance
          </div>
          <div className="text-3xl font-bold">
            ${cards.balance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-900 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up delay-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Total Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              ${cards.balance.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400 mt-1">
              Available funds
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-100 dark:border-purple-900 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up delay-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Month Balance
            </CardTitle>
            <Scale className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {cards.month_balance >= 0 ? "+" : ""}$
              {cards.month_balance.toLocaleString()}
            </div>
            <p className="text-xs text-purple-600/80 dark:text-purple-400 mt-1">
              Net flow this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up delay-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Income This Month
            </CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              +${cards.income.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400 mt-1">
              {month_comparison.income_trend > 0 ? "+" : ""}
              {month_comparison.income_trend.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-100 dark:border-red-900 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up delay-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Expenses This Month
            </CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900 dark:text-red-100">
              -${cards.expenses.toLocaleString()}
            </div>
            <p className="text-xs text-red-600/80 dark:text-red-400 mt-1">
              Daily Avg: ${cards.daily_expense_rate.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart */}
        <Card className="md:col-span-5 shadow-sm animate-fade-in-up delay-500">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>
              Daily breakdown for {current_date.month}
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[350px] w-full mt-4 transition-all duration-300 delay-150 ease-in-out origin-left">
              {isSidebarAnimating ? (
                <div className="w-full h-full bg-muted/20 animate-pulse rounded-md ml-4" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chart_data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorIncome"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorExpense"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      className="stroke-muted/40"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend iconType="circle" />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      name="Income Area"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorExpense)"
                      name="Expenses Area"
                      strokeWidth={2}
                    />
                    <Bar
                      dataKey="income"
                      barSize={20}
                      fill="#10b981"
                      opacity={0.3}
                      name="Income Bar"
                    />
                    <Bar
                      dataKey="expenses"
                      barSize={20}
                      fill="#ef4444"
                      opacity={0.3}
                      name="Expenses Bar"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Side Panel */}
        <Card className="md:col-span-2 shadow-sm bg-muted/20 animate-fade-in-up delay-300">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Comparison</CardTitle>
            <CardDescription>Income vs Expenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                This Month
              </h4>
              <div className="h-[180px] w-full transition-all duration-300 delay-150 ease-in-out origin-left">
                {isSidebarAnimating ? (
                  <div className="w-full h-full bg-muted/20 animate-pulse rounded-md" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "This Month",
                          income: month_comparison.current.income,
                          expenses: month_comparison.current.expenses,
                        },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-muted/40"
                      />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Last Month
              </h4>
              <div className="h-[180px] w-full transition-all duration-300 delay-150 ease-in-out origin-left">
                {isSidebarAnimating ? (
                  <div className="w-full h-full bg-muted/20 animate-pulse rounded-md" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Last Month",
                          income: month_comparison.last.income,
                          expenses: month_comparison.last.expenses,
                        },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-muted/40"
                      />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function Dashboard() {
  const api = useApi();
  const dataPromise = useMemo(() => api.getDashboardSummary(), [api]);

  return (
    <Suspense fallback={<Loading isPage />}>
      <DashboardContent dataPromise={dataPromise} />
    </Suspense>
  );
}
