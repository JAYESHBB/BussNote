import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

type BrokerageAnalytics = {
  byCurrency: {
    currency: string;
    total_brokerage: string;
    total_brokerage_inr: string;
    total_received: string;
    total_pending: string;
    invoice_count: number;
    total_sales: string;
    brokerage_percentage: string;
  }[];
  totals: {
    total_brokerage_inr: string;
    total_received: string;
    total_pending: string;
    invoice_count: number;
    total_sales: string;
    average_brokerage_percentage: string;
  };
  monthlyTrend: {
    month: string;
    brokerage_inr: string;
    received_brokerage: string;
    sales: string;
  }[];
  fromDate: string;
  toDate: string;
};

type PartySalesAnalytics = {
  topParties: {
    id: number;
    name: string;
    invoice_count: number;
    total_sales: string;
    last_invoice_date: string;
    currencies: string;
  }[];
  salesDistribution: {
    id: number;
    name: string;
    sales_amount: string;
    contribution_percentage: string;
  }[];
  fromDate: string;
  toDate: string;
};

type SalesTrends = {
  trends: {
    time_period: string;
    sales: string;
    invoice_count: number;
    brokerage: string;
    avg_exchange_rate: string;
  }[];
  comparison: {
    data: {
      period: string;
      period_num: number;
      yearly_sales: Record<string, string>;
    }[];
    periodType: string;
  };
  period: string;
  fromDate: string;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Analytics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();
  const [tab, setTab] = useState("brokerage");
  const [fromDate, setFromDate] = useState<Date | undefined>(
    new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  );
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [period, setPeriod] = useState("yearly");
  
  // Brokerage Analytics Query
  const { data: brokerageData, isLoading: brokerageLoading } = useQuery<BrokerageAnalytics>({
    queryKey: ["/api/analytics/brokerage", fromDate?.toISOString(), toDate?.toISOString()],
    enabled: tab === "brokerage",
  });
  
  // Party Sales Analytics Query
  const { data: partySalesData, isLoading: partySalesLoading } = useQuery<PartySalesAnalytics>({
    queryKey: ["/api/analytics/party-sales", fromDate?.toISOString(), toDate?.toISOString()],
    enabled: tab === "parties",
  });
  
  // Sales Trends Query
  const { data: trendsData, isLoading: trendsLoading } = useQuery<SalesTrends>({
    queryKey: ["/api/analytics/trends", period],
    enabled: tab === "trends",
  });
  
  // Format currency helper
  const formatCurrency = (value: string | number, currency: string = "INR") => {
    if (!value) return currency === "INR" ? "₹0" : "$0";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    
    return currency === "INR" 
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(numValue)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(numValue);
  };
  
  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Loading indicator
  const Loader = () => (
    <div className="flex justify-center items-center p-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
  
  // Transforms data for the charts
  const transformMonthlyTrendData = (data?: BrokerageAnalytics["monthlyTrend"]) => {
    if (!data) return [];
    
    return data.map(item => ({
      month: item.month.substring(5), // Show only MM part
      brokerage: parseFloat(item.brokerage_inr || '0'),
      received: parseFloat(item.received_brokerage || '0'),
      sales: parseFloat(item.sales || '0') / 100, // Scale down for better visualization
    }));
  };
  
  const transformPartySalesData = (data?: PartySalesAnalytics["salesDistribution"]) => {
    if (!data) return [];
    
    return data.map(item => ({
      name: item.name,
      value: parseFloat(item.contribution_percentage || '0'),
    }));
  };
  
  const transformTrendsData = (data?: SalesTrends["trends"]) => {
    if (!data) return [];
    
    return data.map(item => ({
      period: item.time_period,
      sales: parseFloat(item.sales || '0'),
      invoices: item.invoice_count,
      brokerage: parseFloat(item.brokerage || '0'),
    }));
  };
  
  return (
    <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Business Analytics &amp; Intelligence
            </h1>
            
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">From Date</span>
                <DatePicker date={fromDate} setDate={setFromDate} />
              </div>
              
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">To Date</span>
                <DatePicker date={toDate} setDate={setToDate} />
              </div>
              
              {tab === "trends" && (
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Period</span>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[140px]">
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
              )}
            </div>
          </div>
          
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="brokerage">Brokerage Analysis</TabsTrigger>
              <TabsTrigger value="parties">Party Analysis</TabsTrigger>
              <TabsTrigger value="trends">Sales Trends</TabsTrigger>
            </TabsList>
            
            <TabsContent value="brokerage" className="space-y-6">
              {brokerageLoading ? (
                <Loader />
              ) : (
                <>
                  {/* Brokerage Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Brokerage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(brokerageData?.totals?.total_brokerage_inr || '0')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {brokerageData?.totals?.average_brokerage_percentage}% of sales
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Received</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(brokerageData?.totals?.total_received || '0')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From {brokerageData?.totals?.invoice_count || 0} invoices
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Pending</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                          {formatCurrency(brokerageData?.totals?.total_pending || '0')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Outstanding collection
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Sales</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(brokerageData?.totals?.total_sales || '0')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From {formatDate(brokerageData?.fromDate || '')} - {formatDate(brokerageData?.toDate || '')}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Brokerage Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Brokerage vs Sales Trend</CardTitle>
                      <CardDescription>Monthly comparison of brokerage earned against sales</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={transformMonthlyTrendData(brokerageData?.monthlyTrend)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip
                              formatter={(value: number, name: string) => {
                                if (name === 'sales') return [formatCurrency(value * 100), 'Sales'];
                                return [formatCurrency(value), name === 'brokerage' ? 'Brokerage' : 'Received'];
                              }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="brokerage" name="Brokerage" fill="#8884d8" />
                            <Bar yAxisId="left" dataKey="received" name="Received" fill="#82ca9d" />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="sales"
                              name="Sales (÷100)"
                              stroke="#ff7300"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Currency-wise Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Currency-wise Breakdown</CardTitle>
                      <CardDescription>Brokerage earned by currency</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3">Currency</th>
                              <th className="text-right py-3">Total Sales</th>
                              <th className="text-right py-3">Brokerage</th>
                              <th className="text-right py-3">Received</th>
                              <th className="text-right py-3">Pending</th>
                              <th className="text-center py-3">Rate %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {brokerageData?.byCurrency.map((item, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="py-3">{item.currency}</td>
                                <td className="text-right py-3">
                                  {formatCurrency(item.total_sales, item.currency)}
                                </td>
                                <td className="text-right py-3">
                                  {item.currency === 'INR' 
                                    ? formatCurrency(item.total_brokerage_inr)
                                    : formatCurrency(item.total_brokerage, item.currency)
                                  }
                                </td>
                                <td className="text-right py-3">
                                  {formatCurrency(item.total_received)}
                                </td>
                                <td className="text-right py-3 text-amber-600">
                                  {formatCurrency(item.total_pending)}
                                </td>
                                <td className="text-center py-3">
                                  {item.brokerage_percentage}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="parties" className="space-y-6">
              {partySalesLoading ? (
                <Loader />
              ) : (
                <>
                  {/* Party Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Party Sales Distribution</CardTitle>
                      <CardDescription>Sales contribution by party</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row">
                      <div className="flex-1 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={transformPartySalesData(partySalesData?.salesDistribution)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={(entry) => `${entry.name}: ${entry.value}%`}
                            >
                              {transformPartySalesData(partySalesData?.salesDistribution).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Contribution']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Party</th>
                              <th className="text-right py-2">Sales Amount</th>
                              <th className="text-right py-2">Contribution</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partySalesData?.salesDistribution.map((item, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="py-2">{item.name}</td>
                                <td className="text-right py-2">
                                  {formatCurrency(item.sales_amount)}
                                </td>
                                <td className="text-right py-2">
                                  {item.contribution_percentage}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Top Parties */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Parties</CardTitle>
                      <CardDescription>Based on sales volume</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3">Party Name</th>
                              <th className="text-right py-3">Total Sales</th>
                              <th className="text-center py-3">Invoices</th>
                              <th className="text-right py-3">Last Invoice</th>
                              <th className="text-center py-3">Currencies</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partySalesData?.topParties.map((party, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="py-3">{party.name}</td>
                                <td className="text-right py-3">
                                  {formatCurrency(party.total_sales)}
                                </td>
                                <td className="text-center py-3">{party.invoice_count}</td>
                                <td className="text-right py-3">
                                  {formatDate(party.last_invoice_date)}
                                </td>
                                <td className="text-center py-3">{party.currencies}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-6">
              {trendsLoading ? (
                <Loader />
              ) : (
                <>
                  {/* Sales Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales Trend Analysis</CardTitle>
                      <CardDescription>
                        {period.charAt(0).toUpperCase() + period.slice(1)} sales and brokerage trends
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={transformTrendsData(trendsData?.trends)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip 
                              formatter={(value: number, name: string) => {
                                if (name === 'invoices') return [value, 'Invoices'];
                                return [formatCurrency(value), name === 'sales' ? 'Sales' : 'Brokerage'];
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
                              dataKey="invoices"
                              name="Invoice Count"
                              stroke="#ff7300"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Period Comparison Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Year-over-Year Comparison</CardTitle>
                      <CardDescription>
                        Comparing sales across different {trendsData?.comparison.periodType}s by year
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3">{trendsData?.comparison.periodType}</th>
                              {trendsData?.comparison.data[0]?.yearly_sales && 
                                Object.keys(trendsData.comparison.data[0].yearly_sales).sort().map(year => (
                                  <th key={year} className="text-right py-3">{year}</th>
                                ))
                              }
                            </tr>
                          </thead>
                          <tbody>
                            {trendsData?.comparison.data.map((item, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="py-3">{item.period}</td>
                                {Object.keys(item.yearly_sales || {}).sort().map(year => (
                                  <td key={year} className="text-right py-3">
                                    {formatCurrency(item.yearly_sales[year] || '0')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}