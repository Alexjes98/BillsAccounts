import { useEffect, useState } from "react";
import { MonthlySummary } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Loader2, RefreshCw } from "lucide-react";

export function YearResume() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculatingMonth, setRecalculatingMonth] = useState<number | null>(
    null,
  );

  // Generate last 5 years for selection
  const currentTotalDate = new Date();
  const currentYear = currentTotalDate.getFullYear();
  const currentMonthIndex = currentTotalDate.getMonth(); // 0-indexed
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Generate all 12 months for the selected year
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i; // 0-indexed
    const monthNum = i + 1; // 1-indexed
    const date = new Date(year, monthIndex, 1);
    const monthName = date.toLocaleString("default", { month: "short" });

    // Check if summary exists
    const hasSummary = summaries.some((s) => s.month === monthNum);

    // Determine status
    let status:
      | "present"
      | "missing-past"
      | "missing-current"
      | "missing-future" = "present";

    if (!hasSummary) {
      if (year < currentYear) {
        status = "missing-past";
      } else if (year > currentYear) {
        status = "missing-future";
      } else {
        // Same year
        if (monthIndex < currentMonthIndex) {
          status = "missing-past";
        } else if (monthIndex === currentMonthIndex) {
          status = "missing-current";
        } else {
          status = "missing-future";
        }
      }
    }

    return {
      monthNum,
      monthName,
      status,
      hasSummary,
    };
  });

  const fetchSummaries = async (selectedYear: number) => {
    setLoading(true);
    try {
      const data = await api.getMonthlySummaries(selectedYear);
      setSummaries(data);
    } catch (error) {
      console.error("Failed to fetch summaries", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.recalculateMonthlySummaries();
      await fetchSummaries(year);
    } catch (error) {
      console.error("Failed to recalculate", error);
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalculateMonth = async (month: number) => {
    setRecalculatingMonth(month);
    try {
      await api.recalculateSingleMonthSummary(year, month);
      await fetchSummaries(year);
    } catch (error) {
      console.error(`Failed to recalculate month ${month}`, error);
    } finally {
      setRecalculatingMonth(null);
    }
  };

  useEffect(() => {
    fetchSummaries(year);
  }, [year]);

  // Aggregate Yearly Totals
  const yearlyIncome = summaries.reduce(
    (acc, curr) => acc + curr.total_income,
    0,
  );
  const yearlyExpense = summaries.reduce(
    (acc, curr) => acc + curr.total_expense,
    0,
  );
  const yearlyBalance = yearlyIncome - yearlyExpense;

  // Enhance data for charts
  const chartData = summaries.map((s) => ({
    name: s.month_name,
    income: s.total_income,
    expense: s.total_expense,
    balance: s.closing_balance,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Year Resume</h1>
        <div className="flex items-center gap-2">
          <select
            autoComplete="off"
            className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRecalculate}
            disabled={recalculating || year < currentYear}
            className={
              year < currentYear ? "opacity-50 cursor-not-allowed hidden" : ""
            }
          >
            {recalculating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Yearly Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              $
              {yearlyIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              $
              {yearlyExpense.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Yearly Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${yearlyBalance >= 0 ? "text-blue-600" : "text-red-600"}`}
            >
              $
              {yearlyBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Balance Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Closing Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      {/* Month Status Indicators */}
      <div className="flex flex-wrap gap-2 pb-2">
        {allMonths.map((m) => {
          let badgeClass =
            "bg-secondary text-secondary-foreground hover:bg-secondary/80";
          let cursorClass = "cursor-default";
          let onClick = undefined;

          // Disable interaction for past years
          const isPastYear = year < currentYear;

          if (m.status === "present") {
            badgeClass =
              "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
          } else if (m.status === "missing-past") {
            badgeClass =
              "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/50";
            if (!isPastYear) {
              cursorClass = "cursor-pointer";
              onClick = () => handleRecalculateMonth(m.monthNum);
            } else {
              badgeClass =
                "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 opacity-70";
            }
          } else if (m.status === "missing-current") {
            badgeClass =
              "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50";
            if (!isPastYear) {
              cursorClass = "cursor-pointer";
              onClick = () => handleRecalculateMonth(m.monthNum);
            }
          } else if (m.status === "missing-future") {
            badgeClass =
              "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
          }

          const isLoading = recalculatingMonth === m.monthNum;

          return (
            <div
              key={m.monthNum}
              className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 transition-colors ${badgeClass} ${cursorClass}`}
              onClick={!isLoading && onClick ? onClick : undefined}
            >
              {m.monthName}
              {isLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
            </div>
          );
        })}
      </div>
      {/* Monthly Detail Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Monthly Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {summaries.map((summary) => {
            const daysInMonth = new Date(year, summary.month, 0).getDate();
            const avgDaily = summary.total_expense / daysInMonth;
            return (
              <Card key={`${summary.year}-${summary.month}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold">
                    {summary.month_name}
                  </CardTitle>
                  {year >= currentYear && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRecalculateMonth(summary.month)}
                      disabled={recalculatingMonth === summary.month}
                    >
                      {recalculatingMonth === summary.month ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="space-y-2 text-sm pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Income:</span>
                    <span className="font-medium text-green-600">
                      ${summary.total_income.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expense:</span>
                    <span className="font-medium text-red-600">
                      ${summary.total_expense.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Avg Daily:</span>
                    <span className="font-medium">${avgDaily.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Closing:</span>
                    <span
                      className={`font-bold ${summary.closing_balance >= 0 ? "text-blue-600" : "text-red-500"}`}
                    >
                      ${summary.closing_balance.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {summaries.length === 0 && !loading && (
            <div className="col-span-full text-center text-muted-foreground py-8">
              No data for this year. Try recalculating.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
