import { useEffect, useState, useMemo } from "react";
import { useApi } from "@/contexts/ApiContext";
import { MonthCategorySummary } from "@/api/repository";
import {
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Receipt,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

export function FreeMonthlySummaryPage() {
  const api = useApi();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [summary, setSummary] = useState<MonthCategorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (api.getMonthTransactionsByCategory) {
          const data = await api.getMonthTransactionsByCategory(year, month);
          if (active) {
            setSummary(data);
          }
        } else {
          setError("API method not initialized properly.");
        }
      } catch (err) {
        if (active) setError("Failed to load monthly summary");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchSummary();
    return () => {
      active = false;
    };
  }, [api, year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });

  // Calculate percentages for bars
  const categoriesList = useMemo(() => {
    if (!summary) return [];
    return Object.values(summary.categories).sort(
      (a, b) => b.total_amount - a.total_amount,
    );
  }, [summary]);

  const expenses = categoriesList.filter((c) => c.type === "EXPENSE");
  const incomes = categoriesList.filter((c) => c.type === "INCOME");

  const expenseChartData = expenses.map((cat) => ({
    name: cat.category_name,
    value: Math.abs(cat.total_amount),
  }));

  const incomeChartData = incomes.map((cat) => ({
    name: cat.category_name,
    value: cat.total_amount,
  }));

  const renderCategoryCard = (
    cat: any,
    totalReference: number,
    isExpense: boolean,
    colorOverride?: string,
  ) => {
    const percentage =
      totalReference > 0 ? (cat.total_amount / totalReference) * 100 : 0;

    return (
      <div
        key={cat.category_id}
        className="p-4 bg-muted/30 rounded-lg flex flex-col space-y-2 border border-border/50"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{cat.icon || "🏷️"}</span>
            <span className="font-medium text-sm">{cat.category_name}</span>
          </div>
          <span
            className={`font-semibold ${!colorOverride ? (isExpense ? "text-red-500" : "text-green-500") : ""}`}
            style={colorOverride ? { color: colorOverride } : undefined}
          >
            $
            {Math.abs(cat.total_amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{cat.transaction_count} transactions</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>

        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${!colorOverride ? (isExpense ? "bg-red-500/80" : "bg-green-500/80") : ""}`}
            style={{
              width: `${Math.min(100, percentage)}%`,
              backgroundColor: colorOverride,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Summary</h1>
          <p className="text-muted-foreground mt-1">Category breakdown</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center space-x-4 bg-card px-4 py-2 rounded-lg border shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center font-medium min-w-[120px]">
            {monthName} {year}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-full"
            disabled={
              year === today.getFullYear() && month === today.getMonth() + 1
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">
            Analyzing transactions...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20 text-center">
          {error}
        </div>
      ) : summary ? (
        <>
          {/* Top Indicator Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-6 border shadow-sm flex flex-col space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm font-medium">Total Income</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-2xl font-bold text-green-500">
                $
                {summary.total_income.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="bg-card rounded-xl p-6 border shadow-sm flex flex-col space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm font-medium">Total Expenses</span>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-2xl font-bold text-red-500">
                $
                {Math.abs(summary.total_expenses).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="bg-card rounded-xl p-6 border shadow-sm flex flex-col space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm font-medium">Net Balance</span>
                <PieChartIcon className="h-4 w-4 text-primary" />
              </div>
              <span
                className={`text-2xl font-bold ${summary.total_income - Math.abs(summary.total_expenses) >= 0 ? "text-primary" : "text-red-500"}`}
              >
                $
                {(
                  summary.total_income - Math.abs(summary.total_expenses)
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="bg-card rounded-xl p-6 border shadow-sm flex flex-col space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm font-medium">Activity</span>
                <Receipt className="h-4 w-4 text-orange-500" />
              </div>
              <span className="text-2xl font-bold">
                {summary.total_transactions}
              </span>
              <span className="text-xs text-muted-foreground">
                Transactions
              </span>
            </div>
          </div>

          {/* Detailed Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Expenses Column */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b bg-muted/20">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" /> Expenses
                  Breakdown
                </h2>
              </div>
              <div className="p-6 space-y-4 flex-1">
                {expenses.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No expenses this month.
                  </div>
                ) : (
                  <>
                    <div className="h-48 md:h-64 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {expenseChartData.map((_entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) =>
                              `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid hsl(var(--border))",
                              backgroundColor: "hsl(var(--card))",
                              color: "hsl(var(--card-foreground))",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {expenses.map((cat, index) =>
                      renderCategoryCard(
                        cat,
                        Math.abs(summary.total_expenses),
                        true,
                        COLORS[index % COLORS.length],
                      ),
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Income Column */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b bg-muted/20">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" /> Income
                  Breakdown
                </h2>
              </div>
              <div className="p-6 space-y-4 flex-1">
                {incomes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No income this month.
                  </div>
                ) : (
                  <>
                    <div className="h-48 md:h-64 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {incomeChartData.map((_entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  COLORS[
                                    (index + COLORS.length / 2) % COLORS.length
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) =>
                              `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid hsl(var(--border))",
                              backgroundColor: "hsl(var(--card))",
                              color: "hsl(var(--card-foreground))",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {incomes.map((cat, index) =>
                      renderCategoryCard(
                        cat,
                        summary.total_income,
                        false,
                        COLORS[(index + COLORS.length / 2) % COLORS.length],
                      ),
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
