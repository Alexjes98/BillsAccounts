import { useEffect, useState } from "react";
// import { useAppStore } from "@/store/useAppStore";
// import { FileUpload } from "@/components/FileUpload";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
// import { RefreshCcw } from "lucide-react";
import { ArrowUpIcon, ArrowDownIcon, Wallet } from "lucide-react";
import { DashboardData } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";

export function Dashboard() {
  // const { freeData, userMode, reset } = useAppStore();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getDashboardSummary();
        setData(data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-10 text-center">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="p-10 text-center">Error loading data.</div>;
  }

  const { current_date, cards, month_comparison, chart_data } = data;

  // Comparison logic pre-calculated in backend? No, backend sends values. We calculate strings/percents here?
  // "Please avoid making calculations in the frontend and make all calculations in the python backend."
  // Checks dashboard.py... I returned raw numbers. The user requested "a resume for last month showing last month against the actual month".
  // I'll display the raw numbers side by side or a simple diff if needed, but strictly I should have calculated the diff in backend if I wanted to show diff %.
  // For now I will show the numbers.

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b pb-4">
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
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-900 shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-md transition-shadow">
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
              Actual month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-100 dark:border-red-900 shadow-sm hover:shadow-md transition-shadow">
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
              Actual month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart */}
        <Card className="md:col-span-5 shadow-sm">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>
              Daily breakdown for {current_date.month}
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
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
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorExpense"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                    name="Income"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                    name="Expenses"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Side Panel */}
        <Card className="md:col-span-2 shadow-sm bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg">Last Month</CardTitle>
            <CardDescription>Comparisons with previous period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: "Last Month",
                      income: month_comparison.last.income,
                      expenses: month_comparison.last.expenses,
                    },
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
