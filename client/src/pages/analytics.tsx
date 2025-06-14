import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, subDays, subYears } from "date-fns";
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
import { AlertCircle, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    queryKey: ["/api/analytics/trends", fromDate, toDate, periodType],
    queryFn: async () => {
      // Ensure we have dates to work with
      if (!fromDate || !toDate) {
        return { data: [], comparison: { data: [] } };
      }
      
      const formattedFromDate = format(fromDate, "yyyy-MM-dd");
      const formattedToDate = format(toDate, "yyyy-MM-dd");

      console.log("Fetching with date range:", { formattedFromDate, formattedToDate, periodType });
      
      // Use the server's expected parameter names
      const response = await fetch(
        `/api/analytics/trends?from=${formattedFromDate}&to=${formattedToDate}&periodType=${periodType}`
      );
      const data = await response.json();
      console.log("Received data:", data);
      return data;
    },
    enabled: Boolean(fromDate) && Boolean(toDate), // Only run query when dates are available
  });

  // Handle filter application
  const handleApplyFilters = () => {
    // Ensure we have dates even if user couldn't select from calendar
    if (!fromDate) {
      const defaultFromDate = subMonths(new Date(), 12);
      setFromDate(defaultFromDate);
      console.log("Using default fromDate:", format(defaultFromDate, "yyyy-MM-dd"));
    }
    
    if (!toDate) {
      const defaultToDate = new Date();
      setToDate(defaultToDate);
      console.log("Using default toDate:", format(defaultToDate, "yyyy-MM-dd"));
    }
    
    const actualFromDate = fromDate || subMonths(new Date(), 12);
    const actualToDate = toDate || new Date();
    
    console.log("Applying filters with date range:", { 
      fromDate: format(actualFromDate, "yyyy-MM-dd"), 
      toDate: format(actualToDate, "yyyy-MM-dd"), 
      periodType 
    });
    
    // Force refetch with current date values
    setTimeout(() => {
      refetchBrokerage();
      refetchPartySales();
      refetchTrends();
    }, 100); // Small delay to ensure state updates
  };

  // Handle period type change
  const handlePeriodTypeChange = (value: string) => {
    setPeriodType(value);
  };

  // Set default date range on component mount
  useEffect(() => {
    // Set default dates (last 12 months to today)
    const now = new Date();
    setFromDate(subMonths(now, 12));
    setToDate(now);
    
    // Apply filters automatically after a short delay
    const timer = setTimeout(() => {
      handleApplyFilters();
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

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
          
          <div className="mt-4 md:mt-0">
            <div>
              <Select value={periodType} onValueChange={(value) => {
                setPeriodType(value);
                setTimeout(handleApplyFilters, 100);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="अवधि प्रकार" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">मासिक</SelectItem>
                  <SelectItem value="quarterly">त्रैमासिक</SelectItem>
                  <SelectItem value="yearly">वार्षिक</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length > 0) {
                              return (
                                <div className="custom-tooltip bg-white p-3 border rounded-md shadow-md">
                                  <p className="font-semibold mb-2">{`Period: ${label}`}</p>
                                  <div className="space-y-1">
                                    {payload.map((entry, index) => {
                                      const dataKey = entry.dataKey as string;
                                      let currencySymbol = "₹";
                                      
                                      // Determine currency based on data key name
                                      if (dataKey.includes("USD")) {
                                        currencySymbol = "$";
                                      } else if (dataKey.includes("EUR")) {
                                        currencySymbol = "€";
                                      }
                                      
                                      return (
                                        <div key={`item-${index}`} style={{ color: entry.color }} className="text-sm flex items-center">
                                          <span className="inline-block w-3 h-3 mr-2" style={{ backgroundColor: entry.color }}></span>
                                          <span className="mr-2">{entry.name}:</span>
                                          <span className="font-medium">{currencySymbol}
                                            {Number(entry.value).toLocaleString('en-IN', {
                                              maximumFractionDigits: 0
                                            })}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
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
                        {salesTrendsData.data.some(item => item.sales_USD) && (
                          <Line
                            type="monotone"
                            dataKey="sales_USD"
                            name="Sales (USD)"
                            stroke="#8884d8"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                        )}
                        {salesTrendsData.data.some(item => item.sales_EUR) && (
                          <Line
                            type="monotone"
                            dataKey="sales_EUR"
                            name="Sales (EUR)"
                            stroke="#82ca9d"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                        )}
                        {salesTrendsData.data.some(item => item.sales_INR) && (
                          <Line
                            type="monotone"
                            dataKey="sales_INR"
                            name="Sales (INR)"
                            stroke="#d4af37"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                        )}
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