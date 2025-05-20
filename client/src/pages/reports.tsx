import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { 
  DownloadCloud,
  Filter,
  Calendar, 
  BarChart as BarChartIcon,
  FileDown,
  FileSpreadsheet,
  Download
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
import { useToast } from "@/hooks/use-toast";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("outstanding");
  const { toast } = useToast();
  const [outstandingFilter, setOutstandingFilter] = useState("all");
  
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
  
  const { data: outstandingData } = useQuery<any[]>({
    queryKey: ['/api/reports/outstanding', dateRange],
  });
  
  const { data: closedData } = useQuery<any[]>({
    queryKey: ['/api/reports/closed', dateRange],
  });
  
  const { data: salesData } = useQuery({
    queryKey: ['/api/reports/sales', dateRange],
  });
  
  // Filter outstanding invoices based on status filter
  const filteredOutstandingData = outstandingData?.filter(invoice => {
    if (outstandingFilter === "all") return true;
    if (outstandingFilter === "pending") return invoice.status === "pending" && invoice.daysOverdue <= 0;
    if (outstandingFilter === "overdue") return invoice.daysOverdue > 0;
    return true;
  }) || [];
  
  // Prepare data for outstanding invoices export
  const prepareOutstandingExportData = () => {
    if (!filteredOutstandingData || filteredOutstandingData.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no outstanding invoices matching your current filters.",
        variant: "destructive"
      });
      return null;
    }
    
    // Map the data for export
    const exportData = filteredOutstandingData.map(invoice => ({
      "Invoice No": invoice.invoiceNo,
      "Party Name": invoice.partyName,
      "Invoice Date": format(new Date(invoice.invoiceDate), "MMM dd, yyyy"),
      "Due Date": format(new Date(invoice.dueDate), "MMM dd, yyyy"),
      "Days Overdue": invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : "Not overdue",
      "Amount": formatCurrency(invoice.total || invoice.subtotal || 0).replace('₹', ''), // Remove currency symbol
      "Status": invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
    }));
    
    return exportData;
  };
  
  // Export to CSV
  const exportOutstandingToCsv = () => {
    const data = prepareOutstandingExportData();
    if (!data) return;
    
    // Create headers
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          // Wrap each field in quotes to handle commas
          `"${row[header as keyof typeof row]}"`
        ).join(',')
      )
    ];
    
    // Join rows and create content
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    
    // Create download link
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `outstanding_invoices_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Exported ${data.length} outstanding invoices to CSV file.`
    });
  };
  
  // Export to Excel
  const exportOutstandingToExcel = () => {
    const data = prepareOutstandingExportData();
    if (!data) return;
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const maxWidths: Record<number, number> = {};
    const headers = Object.keys(data[0]);
    
    // Get max width from headers
    headers.forEach((header, index) => {
      maxWidths[index] = header.length;
    });
    
    // Check data for max width
    data.forEach(row => {
      headers.forEach((header, index) => {
        const value = String(row[header as keyof typeof row]);
        if (value.length > maxWidths[index]) {
          maxWidths[index] = value.length;
        }
      });
    });
    
    // Set column widths
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[parseInt(key)] + 2 }));
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outstanding Invoices");
    
    // Generate file
    XLSX.writeFile(workbook, `outstanding_invoices_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Export successful",
      description: `Exported ${data.length} outstanding invoices to Excel file.`
    });
  };
  
  // Export to PDF
  const exportOutstandingToPdf = () => {
    const data = prepareOutstandingExportData();
    if (!data) return;
    
    // Create a printable page
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "Export failed",
        description: "Please allow pop-ups to export as PDF.",
        variant: "destructive"
      });
      return;
    }
    
    // Get dates for the report
    const fromDate = format(dateRange.from, "dd MMM yyyy");
    const toDate = format(dateRange.to, "dd MMM yyyy");
    const currentDate = format(new Date(), "dd MMM yyyy, hh:mm a");
    
    // Calculate totals
    const totalAmount = filteredOutstandingData.reduce((sum, invoice) => 
      sum + Number(invoice.total || invoice.subtotal || 0), 0);
    
    // Generate HTML content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Outstanding Invoices Report - BussNote</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            :root {
              --primary-color: #7c3aed;
              --primary-light: #ede9fe;
              --secondary-color: #0ea5e9;
              --accent-color: #f59e0b;
              --text-dark: #1e293b;
              --text-light: #64748b;
              --background-light: #f8fafc;
              --border-color: #e2e8f0;
              --danger-color: #ef4444;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              color: var(--text-dark);
              background: white;
              line-height: 1.5;
            }
            
            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .report-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 1px solid var(--border-color);
            }
            
            .company-info {
              display: flex;
              flex-direction: column;
            }
            
            .company-name {
              font-size: 24px;
              font-weight: 700;
              color: var(--primary-color);
              margin: 0;
            }
            
            .report-name {
              font-size: 18px;
              font-weight: 600;
              margin: 5px 0 0 0;
            }
            
            .header-right {
              text-align: right;
            }
            
            .report-date {
              font-size: 14px;
              color: var(--text-light);
              margin-bottom: 5px;
            }
            
            .report-info {
              font-size: 14px;
              color: var(--text-light);
            }
            
            .highlight {
              color: var(--primary-color);
              font-weight: 500;
            }
            
            .badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
            }
            
            .badge-pending {
              background-color: var(--primary-light);
              color: var(--primary-color);
            }
            
            .badge-overdue {
              background-color: #fee2e2;
              color: var(--danger-color);
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0 30px 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            
            thead {
              background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
              color: white;
            }
            
            th {
              text-align: left;
              padding: 12px 15px;
              font-weight: 600;
              font-size: 14px;
            }
            
            td {
              padding: 12px 15px;
              border-bottom: 1px solid var(--border-color);
              font-size: 14px;
            }
            
            tr:last-child td {
              border-bottom: none;
            }
            
            tr:nth-child(even) {
              background-color: var(--background-light);
            }
            
            .days-overdue {
              color: var(--danger-color);
              font-weight: 500;
            }
            
            .table-container {
              overflow-x: auto;
              margin-bottom: 30px;
            }
            
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid var(--border-color);
              font-size: 12px;
              color: var(--text-light);
            }
            
            .report-summary {
              background-color: var(--primary-light);
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            
            .summary-title {
              font-weight: 600;
              font-size: 16px;
              margin-bottom: 10px;
              color: var(--primary-color);
            }
            
            .summary-item {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 14px;
            }
            
            .summary-total {
              font-weight: 600;
              font-size: 16px;
              color: var(--primary-color);
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px dashed var(--border-color);
            }
            
            .print-button {
              display: block;
              margin: 20px auto;
              padding: 10px 20px;
              background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 500;
              transition: all 0.2s ease;
            }
            
            .print-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
            }
            
            @media print {
              body { 
                margin: 0;
                padding: 15px; 
              }
              .no-print { 
                display: none; 
              }
              .container {
                padding: 0;
              }
              table {
                box-shadow: none;
              }
              thead {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <button class="print-button no-print" onclick="window.print(); setTimeout(() => window.close(), 500);">
              Print PDF
            </button>
            
            <div class="report-header">
              <div class="company-info">
                <h1 class="company-name">BussNote</h1>
                <p class="report-name">Outstanding Invoices Report</p>
              </div>
              <div class="header-right">
                <p class="report-date">Generated: ${currentDate}</p>
                <p class="report-info">Period: <span class="highlight">${fromDate} to ${toDate}</span></p>
                <p class="report-info">Status: <span class="highlight">
                  ${outstandingFilter === "all" 
                    ? "All Outstanding" 
                    : outstandingFilter === "pending" 
                      ? "Pending Only" 
                      : "Overdue Only"}
                </span></p>
              </div>
            </div>
            
            <div class="report-summary">
              <div class="summary-title">Summary</div>
              <div class="summary-item">
                <span>Total Invoices:</span>
                <span>${filteredOutstandingData.length}</span>
              </div>
              <div class="summary-item">
                <span>Period Range:</span>
                <span>${fromDate} - ${toDate}</span>
              </div>
              <div class="summary-item summary-total">
                <span>Total Outstanding Amount:</span>
                <span>${formatCurrency(totalAmount)}</span>
              </div>
            </div>
            
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Party Name</th>
                    <th>Invoice Date</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(invoice => `
                    <tr>
                      <td>${invoice["Invoice No"]}</td>
                      <td>${invoice["Party Name"]}</td>
                      <td>${invoice["Invoice Date"]}</td>
                      <td>${invoice["Due Date"]}</td>
                      <td class="${invoice["Days Overdue"] !== "Not overdue" ? "days-overdue" : ""}">
                        ${invoice["Days Overdue"]}
                      </td>
                      <td>₹${invoice["Amount"]}</td>
                      <td>
                        <span class="badge ${invoice["Status"].toLowerCase() === "pending" ? "badge-pending" : "badge-overdue"}">
                          ${invoice["Status"]}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} BussNote - All rights reserved</p>
              <p>This report was generated automatically and is valid as of the date shown above.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // Focus the window
    printWindow.focus();
    
    toast({
      title: "PDF Export prepared",
      description: "Your PDF is ready. Click the 'Print PDF' button in the new window."
    });
  };
  
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <DownloadCloud className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  if (reportType === "outstanding") {
                    exportOutstandingToCsv();
                  }
                }}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (reportType === "outstanding") {
                    exportOutstandingToExcel();
                  }
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (reportType === "outstanding") {
                    exportOutstandingToPdf();
                  }
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <Select 
                  value={outstandingFilter} 
                  onValueChange={setOutstandingFilter}
                >
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
                  {filteredOutstandingData.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`}>
                          <a className="text-primary-500 hover:underline">
                            #{invoice.invoiceNo}
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
                      <TableCell>{formatCurrency(invoice.total || invoice.subtotal || 0)}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredOutstandingData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-neutral-500">
                        {outstandingData && outstandingData.length > 0
                          ? `No invoices match the current "${outstandingFilter}" filter.`
                          : "No outstanding invoices for the selected date range"
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {filteredOutstandingData.length > 0 && (
                <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                  <div className="flex justify-end">
                    <div className="space-y-1 text-right">
                      <div className="flex justify-between space-x-8">
                        <span className="font-medium">Total Outstanding:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(
                            filteredOutstandingData.reduce((sum: number, invoice: any) => 
                              sum + Number(invoice.total || invoice.subtotal || 0), 0)
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        For period: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                        {outstandingFilter !== "all" && (
                          <span> • Filter: {outstandingFilter.charAt(0).toUpperCase() + outstandingFilter.slice(1)}</span>
                        )}
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
                            #{invoice.invoiceNo}
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
                    
                    {salesData?.periods && salesData.periods.length > 0 && (
                      <TableRow className="bg-neutral-50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell>{salesData.totals.invoiceCount}</TableCell>
                        <TableCell>{formatCurrency(salesData.totals.grossSales)}</TableCell>
                        <TableCell>{formatCurrency(salesData.totals.brokerage)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
