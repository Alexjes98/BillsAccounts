import { useAppStore } from "@/store/useAppStore";
import { FileUpload } from "@/components/FileUpload";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { RefreshCcw } from "lucide-react";

export function Dashboard() {
  const { freeData, userMode, reset } = useAppStore();

  //if (!freeData && userMode === "free") {
  //  return <FileUpload />;
  //}

  if (userMode === "paid") {
    return (
      <div className="p-10 text-center">Paid Mode Dashboard (Coming Soon)</div>
    );
  }

  // Prepare chart data
  const chartData = Object.entries(freeData!.category_breakdown).map(
    ([name, value]) => ({
      name,
      value: Math.abs(value), // Show absolute values for visual comparison
      originalValue: value,
    }),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Financial Overview
        </h1>
        <Button variant="outline" onClick={reset}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Reset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${freeData!.summary.balance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +${freeData!.summary.total_income.toLocaleString()}
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
              -${freeData!.summary.total_expenses.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Functionality: Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Income and Expenses by Category</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry: any, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.originalValue >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Processed {freeData!.transaction_count} transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Detailed list view would go here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
