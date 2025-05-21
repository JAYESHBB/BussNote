import { useState } from "react";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// RADIAN constant for pie chart calculations
const RADIAN = Math.PI / 180;

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow">
        <p className="font-medium">{payload[0].name}</p>
        <p>
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// Colors for pie and bar charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
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
      // Ensure we have dates to work with
      if (!fromDate || !toDate) {
        return { byStatus: [], topParties: [] };
      }
      
      const formattedFromDate = format(fromDate, "yyyy-MM-dd");
      const formattedToDate = format(toDate, "yyyy-MM-dd");

      const response = await fetch(
        `/api/analytics/brokerage?fromDate=${formattedFromDate}&toDate=${formattedToDate}`
      );
      return await response.json();
    },
    enabled: Boolean(fromDate) && Boolean(toDate), // Only run query when dates are available
  });

  // Party sales analytics query
  const {
    data: partySalesData,
    isLoading: partySalesLoading,
    refetch: refetchPartySales,
  } = useQuery({
    queryKey: ["/api/analytics/party-sales", fromDate, toDate],
    queryFn: async () => {
      // Ensure we have dates to work with
      if (!fromDate || !toDate) {
        return { bySeller: [], byBuyer: [] };
      }
      
      const formattedFromDate = format(fromDate, "yyyy-MM-dd");
      const formattedToDate = format(toDate, "yyyy-MM-dd");

      const response = await fetch(
        `/api/analytics/party-sales?fromDate=${formattedFromDate}&toDate=${formattedToDate}`
      );
      return await response.json();
    },
    enabled: Boolean(fromDate) && Boolean(toDate), // Only run query when dates are available
  });

  // Sales trends query
  const {
    data: salesTrendsData,
    isLoading: trendsLoading,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ["/api/analytics/sales-trends", fromDate, toDate, periodType],
    queryFn: async () => {
      // Ensure we have dates to work with
      if (!fromDate || !toDate) {
        return { data: [], comparison: { data: [] } };
      }
      
      const formattedFromDate = format(fromDate, "yyyy-MM-dd");
      const formattedToDate = format(toDate, "yyyy-MM-dd");

      console.log("Fetching with date range:", { formattedFromDate, formattedToDate, periodType });
      
      const response = await fetch(
        `/api/analytics/trends?fromDate=${formattedFromDate}&toDate=${formattedToDate}&periodType=${periodType}`
      );
      const data = await response.json();
      console.log("Received data:", data);
      return data;
    },
    enabled: Boolean(fromDate) && Boolean(toDate), // Only run query when dates are available
  });

  // Handle filter application
  const handleApplyFilters = () => {
    console.log("Applying filters with date range:", { 
      fromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : null, 
      toDate: toDate ? format(toDate, "yyyy-MM-dd") : null, 
      periodType 
    });
    
    // Force refetch with current date values
    refetchBrokerage();
    refetchPartySales();
    refetchTrends();
  };

  // Handle period type change
  const handlePeriodTypeChange = (value: string) => {
    setPeriodType(value);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View detailed analytics and insights about your business
            </p>
          </div>
          <div className="flex space-x-4 items-center">
            <div className="grid gap-2 min-w-[240px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : <span>From Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      console.log("From date selected:", date);
                      if (date) {
                        setFromDate(date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2 min-w-[240px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>To Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      console.log("To date selected:", date);
                      if (date) {
                        setToDate(date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </div>

        <Tabs defaultValue="sales">
          <TabsList className="mb-4">
            <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
            <TabsTrigger value="brokerage">Brokerage Analysis</TabsTrigger>
            <TabsTrigger value="party">Party Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Combined Sales & Brokerage Analysis</CardTitle>
                      <CardDescription>
                        Comparison of Sales, Brokerage, and Received Brokerage over time
                      </CardDescription>
                    </div>
                    <Select value={periodType} onValueChange={handlePeriodTypeChange}>
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
                </CardHeader>
                <CardContent>
                  {trendsLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : salesTrendsData?.data && salesTrendsData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart
                        data={salesTrendsData.data}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 10,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("en", {
                              notation: "compact",
                              compactDisplay: "short",
                            }).format(value)
                          }
                        />
                        <Tooltip
                          formatter={(value) =>
                            new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(Number(value))
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="totalSales"
                          name="Total Sales"
                          stroke="#0088FE"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="totalBrokerage"
                          name="Total Brokerage"
                          stroke="#FF8042"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="receivedBrokerage"
                          name="Received Brokerage"
                          stroke="#00C49F"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-[400px]">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="brokerage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brokerage by Status</CardTitle>
                  <CardDescription>
                    Distribution of brokerage by invoice status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {brokerageLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : brokerageData?.byStatus?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={brokerageData.byStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            return (
                              <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                              >
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                        >
                          {brokerageData.byStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-[400px]">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Parties by Brokerage</CardTitle>
                  <CardDescription>
                    Parties generating the most brokerage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {brokerageLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : brokerageData?.topParties?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={brokerageData.topParties}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 120,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("en", {
                              notation: "compact",
                              compactDisplay: "short",
                            }).format(value)
                          }
                        />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip
                          formatter={(value) =>
                            new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(Number(value))
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Brokerage Amount"
                          fill="#82ca9d"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-[400px]">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="party" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Parties by Sales Volume</CardTitle>
                  <CardDescription>
                    Parties with the highest sales volume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {partySalesLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : partySalesData?.bySalesVolume?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={partySalesData.bySalesVolume}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 120,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("en", {
                              notation: "compact",
                              compactDisplay: "short",
                            }).format(value)
                          }
                        />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip
                          formatter={(value) =>
                            new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(Number(value))
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Sales Volume"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-[400px]">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Parties by Invoice Count</CardTitle>
                  <CardDescription>
                    Parties with the most invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {partySalesLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : partySalesData?.byInvoiceCount?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={partySalesData.byInvoiceCount}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 120,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Invoice Count"
                          fill="#0088FE"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-[400px]">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}