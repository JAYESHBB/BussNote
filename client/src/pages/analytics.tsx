import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, BarChart4, TrendingUp, PieChart as PieChartIcon } from "lucide-react";

// Chart colors
const COLORS = [
  "#8884d8",
  "#83a6ed",
  "#8dd1e1",
  "#82ca9d",
  "#a4de6c",
  "#d0ed57",
  "#ffc658",
  "#ff8042",
  "#ff6361",
  "#bc5090",
];

// Currency formatter
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function AnalyticsPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>(
    subMonths(new Date(), 12)
  );
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [periodType, setPeriodType] = useState<string>("monthly");

  // Brokerage analytics query
  const {
    data: brokerageData,
    isLoading: brokerageLoading,
    refetch: refetchBrokerage,
  } = useQuery({
    queryKey: ["/api/analytics/brokerage", fromDate, toDate],
    queryFn: async () => {
      const formattedFromDate = fromDate
        ? format(fromDate, "yyyy-MM-dd")
        : undefined;
      const formattedToDate = toDate
        ? format(toDate, "yyyy-MM-dd")
        : undefined;

      const response = await fetch(
        `/api/analytics/brokerage?fromDate=${formattedFromDate}&toDate=${formattedToDate}`
      );
      return await response.json();
    },
  });

  // Party sales analytics query
  const {
    data: partySalesData,
    isLoading: partySalesLoading,
    refetch: refetchPartySales,
  } = useQuery({
    queryKey: ["/api/analytics/party-sales", fromDate, toDate],
    queryFn: async () => {
      const formattedFromDate = fromDate
        ? format(fromDate, "yyyy-MM-dd")
        : undefined;
      const formattedToDate = toDate
        ? format(toDate, "yyyy-MM-dd")
        : undefined;

      const response = await fetch(
        `/api/analytics/party-sales?fromDate=${formattedFromDate}&toDate=${formattedToDate}&limit=10`
      );
      return await response.json();
    },
  });

  // Sales trends query
  const {
    data: trendsData,
    isLoading: trendsLoading,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ["/api/analytics/trends", periodType],
    queryFn: async () => {
      const response = await fetch(
        `/api/analytics/trends?period=${periodType}`
      );
      return await response.json();
    },
  });

  // Handle date filter changes
  const handleApplyFilters = () => {
    refetchBrokerage();
    refetchPartySales();
  };

  // Handle period type change for trends
  useEffect(() => {
    refetchTrends();
  }, [periodType, refetchTrends]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
            Business Intelligence
          </h1>
          <p className="text-muted-foreground">
            Advanced analytics and insights for your business
          </p>
        </div>
        <div className="flex space-x-4 items-center">
          <div className="grid gap-2 min-w-[240px]">
            <DatePicker
              date={fromDate}
              setDate={setFromDate}
              placeholder="From Date"
            />
          </div>
          <div className="grid gap-2 min-w-[240px]">
            <DatePicker
              date={toDate}
              setDate={setToDate}
              placeholder="To Date"
            />
          </div>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </div>

      <Tabs defaultValue="brokerage">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="brokerage" className="flex items-center justify-center">
            <BarChart4 className="w-4 h-4 mr-2" /> Brokerage Analysis
          </TabsTrigger>
          <TabsTrigger value="parties" className="flex items-center justify-center">
            <PieChartIcon className="w-4 h-4 mr-2" /> Party Analysis
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center justify-center">
            <TrendingUp className="w-4 h-4 mr-2" /> Sales Trends
          </TabsTrigger>
        </TabsList>

        {/* Brokerage Analysis Tab */}
        <TabsContent value="brokerage" className="space-y-6">
          {brokerageLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : brokerageData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Brokerage (INR)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
                      {formatCurrency(brokerageData.totals?.total_brokerage_inr || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Received Brokerage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold bg-gradient-to-r from-green-500 to-green-700 text-transparent bg-clip-text">
                      {formatCurrency(brokerageData.totals?.total_received || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending Brokerage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-red-500 text-transparent bg-clip-text">
                      {formatCurrency(brokerageData.totals?.total_pending || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Brokerage %
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {brokerageData.totals?.average_brokerage_percentage
                        ? `${brokerageData.totals.average_brokerage_percentage}%`
                        : "0%"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Brokerage by Currency</CardTitle>
                    <CardDescription>
                      Breakdown of brokerage across different currencies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={brokerageData.byCurrency || []}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="currency" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                          <Legend />
                          <Bar
                            dataKey="total_brokerage"
                            name="Brokerage Amount"
                            fill="#8884d8"
                          />
                          <Bar
                            dataKey="total_brokerage_inr"
                            name="Brokerage in INR"
                            fill="#82ca9d"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Brokerage vs Sales Trend</CardTitle>
                    <CardDescription>
                      Monthly comparison of brokerage against sales
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={brokerageData.monthlyTrend || []}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "Sales") {
                                return formatCurrency(Number(value));
                              }
                              return [formatCurrency(Number(value)), name];
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="brokerage_inr"
                            name="Brokerage (INR)"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="received_brokerage"
                            name="Received"
                            stroke="#82ca9d"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="sales"
                            name="Sales"
                            stroke="#ff7300"
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p>No brokerage data available for the selected period.</p>
            </div>
          )}
        </TabsContent>

        {/* Party Analysis Tab */}
        <TabsContent value="parties" className="space-y-6">
          {partySalesLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : partySalesData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Parties by Sales</CardTitle>
                  <CardDescription>
                    Parties with highest sales volume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={partySalesData.topParties || []}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 70,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        <Bar
                          dataKey="total_sales"
                          name="Total Sales"
                          fill="#8884d8"
                        >
                          {(partySalesData.topParties || []).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Distribution by Party</CardTitle>
                  <CardDescription>
                    Percentage contribution to total sales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="contribution_percentage"
                          nameKey="name"
                          data={partySalesData.salesDistribution || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                        >
                          {(partySalesData.salesDistribution || []).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => `${value.toFixed(1)}%`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p>No party sales data available for the selected period.</p>
            </div>
          )}
        </TabsContent>

        {/* Sales Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {trendsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : trendsData ? (
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Trends Over Time</CardTitle>
                  <CardDescription>
                    {`Showing trends by ${periodType} period`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendsData.trends || []}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time_period" />
                        <YAxis yAxisId="left" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === "Sales") {
                              return formatCurrency(Number(value));
                            } else if (name === "Invoices") {
                              return [value, name];
                            }
                            return [formatCurrency(Number(value)), name];
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sales"
                          name="Sales"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="brokerage"
                          name="Brokerage"
                          stroke="#82ca9d"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="invoice_count"
                          name="Invoices"
                          stroke="#ff7300"
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {trendsData.comparison && (
                <Card>
                  <CardHeader>
                    <CardTitle>Period-over-Period Comparison</CardTitle>
                    <CardDescription>
                      {`Comparing ${trendsData.comparison.periodType}ly sales across years`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={trendsData.comparison.data || []}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                          <Legend />
                          {trendsData.comparison.data && 
                            trendsData.comparison.data.length > 0 && 
                            trendsData.comparison.data[0].yearly_sales && 
                            Object.keys(trendsData.comparison.data[0].yearly_sales).map((year, index) => (
                              <Bar
                                key={year}
                                dataKey={`yearly_sales.${year}`}
                                name={`Year ${year}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p>No trends data available.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}