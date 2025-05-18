import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  DownloadCloud,
  Filter,
  Calendar, 
  BarChart as BarChartIcon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("outstanding");
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setReportType(value);
  };
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  
  const { data: outstandingData } = useQuery({
    queryKey: ['/api/reports/outstanding', dateRange],
  });
  
  const { data: closedData } = useQuery({
    queryKey: ['/api/reports/closed', dateRange],
  });
  
  const { data: salesData } = useQuery({
    queryKey: ['/api/reports/sales', dateRange],
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Reports</h1>
            <p className="text-neutral-600">Generate and view financial reports</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <DatePickerWithRange 
              date={dateRange}
              setDate={setDateRange}
            />
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline">
              <DownloadCloud className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <Tabs 
        value={reportType} 
        onValueChange={setReportType}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding Dues</TabsTrigger>
          <TabsTrigger value="closed">Closed Bills</TabsTrigger>
          <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="outstanding">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-5">
              <CardTitle className="text-lg font-semibold">Outstanding Invoices</CardTitle>
              <div className="flex items-center space-x-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingData?.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`}>
                          <a className="text-primary-500 hover:underline">
                            #{invoice.invoiceNumber}
                          </a>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/parties/${invoice.partyId}`}>
                          <a className="hover:underline">
                            {invoice.partyName}
                          </a>
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell className={invoice.daysOverdue > 0 ? "text-destructive font-medium" : ""}>
                        {invoice.daysOverdue > 0 
                          ? `${invoice.daysOverdue} days`
                          : "Not overdue"
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}

                  {(!outstandingData || outstandingData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-neutral-500">
                        No outstanding invoices for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {outstandingData && outstandingData.length > 0 && (
                <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                  <div className="flex justify-end">
                    <div className="space-y-1 text-right">
                      <div className="flex justify-between space-x-8">
                        <span className="font-medium">Total Outstanding:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(
                            outstandingData.reduce((sum: number, invoice: any) => 
                              sum + Number(invoice.total || 0), 0)
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        For period: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="closed">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-5">
              <CardTitle className="text-lg font-semibold">Closed Invoices</CardTitle>
              <div className="flex items-center space-x-2">
                <Select defaultValue="paid">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="all">All Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Closed Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedData?.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`}>
                          <a className="text-primary-500 hover:underline">
                            #{invoice.invoiceNumber}
                          </a>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/parties/${invoice.partyId}`}>
                          <a className="hover:underline">
                            {invoice.partyName}
                          </a>
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(new Date(invoice.closedDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}

                  {(!closedData || closedData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                        No closed invoices for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {closedData && closedData.length > 0 && (
                <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                  <div className="flex justify-end">
                    <div className="space-y-1 text-right">
                      <div className="flex justify-between space-x-8">
                        <span className="font-medium">Total Closed Amount:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(
                            closedData.reduce((sum: number, invoice: any) => sum + Number(invoice.total || 0), 0)
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        For period: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-5">
              <CardTitle className="text-lg font-semibold">Sales Analysis</CardTitle>
              <div className="flex items-center space-x-2">
                <Select defaultValue="monthly">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Group By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {(!salesData?.periods || salesData.periods.length === 0) ? (
                  <div className="flex items-center justify-center h-full bg-neutral-50 rounded-md">
                    <div className="text-center p-6">
                      <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-neutral-700">No Sales Data</h3>
                      <p className="text-neutral-500 max-w-xs mx-auto mt-2">
                        There is no sales data available for the selected period
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesData.periods}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          maximumFractionDigits: 0,
                        }).format(Number(value))}
                      />
                      <Legend />
                      <Bar dataKey="grossSales" name="Gross Sales" fill="#8884d8" />
                      <Bar dataKey="brokerage" name="Brokerage" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              <div className="mt-6">
                <Table>
                  <TableHeader className="bg-neutral-50">
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Invoices</TableHead>
                      <TableHead>Gross Sales</TableHead>
                      <TableHead>Brokerage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData?.periods?.map((period: any) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.label}</TableCell>
                        <TableCell>{period.invoiceCount}</TableCell>
                        <TableCell>{formatCurrency(period.grossSales)}</TableCell>
                        <TableCell>{formatCurrency(period.brokerage)}</TableCell>
                      </TableRow>
                    ))}

                    {(!salesData?.periods || salesData.periods.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-neutral-500">
                          No sales data for the selected date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  
                  {salesData?.periods && salesData.periods.length > 0 && (
                    <TableRow className="bg-neutral-50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell>{salesData.totals.invoiceCount}</TableCell>
                      <TableCell>{formatCurrency(salesData.totals.grossSales)}</TableCell>
                      <TableCell>{formatCurrency(salesData.totals.brokerage)}</TableCell>
                    </TableRow>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
