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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("outstanding");
  const { toast } = useToast();
  const [outstandingFilter, setOutstandingFilter] = useState("all");
  const [closedFilter, setClosedFilter] = useState("all");
  const [salesGroupBy, setSalesGroupBy] = useState("monthly");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  // Create a single filter state that changes based on active report type
  const getFilterValue = () => {
    if (reportType === "outstanding") return outstandingFilter;
    if (reportType === "closed") return closedFilter;
    return salesGroupBy;
  };
  
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
  
  // Function to apply filters
  const handleOpenFilterDialog = () => {
    setIsFilterDialogOpen(true);
  };
  
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
  
  // Filter closed invoices based on status filter
  const filteredClosedData = closedData?.filter(invoice => {
    if (closedFilter === "all") return true;
    return invoice.status === closedFilter;
  }) || [];
  
  // Helper function to get currency symbol
  const getCurrencySymbol = (currencyCode: string | null): string => {
    if (!currencyCode) return '₹'; // Default to INR
    
    switch(currencyCode.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'INR': 
      default: return '₹';
    }
  };
  
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
      "Amount": formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency).replace(getCurrencySymbol(invoice.currency), ''), // Remove currency symbol
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
                <span>${formatCurrency(totalAmount, 'INR')}</span>
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
                  ${filteredOutstandingData.map(invoice => `
                    <tr>
                      <td>${invoice.invoiceNo}</td>
                      <td>${invoice.partyName}</td>
                      <td>${format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</td>
                      <td>${format(new Date(invoice.dueDate), "MMM dd, yyyy")}</td>
                      <td class="${invoice.daysOverdue > 0 ? 'days-overdue' : ''}">
                        ${invoice.daysOverdue > 0 
                          ? `${invoice.daysOverdue} days` 
                          : "Not overdue"}
                      </td>
                      <td>${formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency)}</td>
                      <td>
                        <span class="badge ${invoice.status === 'pending' ? 'badge-pending' : 'badge-overdue'}">
                          ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="footer">
              <p>This is a computer-generated report from BussNote. No signature is required.</p>
              <p>© ${new Date().getFullYear()} BussNote. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // Wait for window to load then trigger print
    printWindow.document.close();
    
    toast({
      title: "PDF ready",
      description: "Your PDF is ready. Click the 'Print PDF' button in the new window."
    });
  };
  
  // Helper function to determine if a value represents zero
  const isZero = (value: any): boolean => {
    if (!value) return true;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return parsed === 0 || isNaN(parsed);
    }
    return value === 0;
  };

  // Enhanced formatCurrency function with currency parameter
  const formatCurrency = (amount: number | string, currency: string | null = null, subtotal?: number | string) => {
    try {
      // If amount is zero and we have a subtotal, use the subtotal instead
      let actualAmount = amount;
      if (isZero(amount) && subtotal && !isZero(subtotal)) {
        actualAmount = subtotal;
        console.log("Using subtotal instead of zero total:", subtotal);
      }
      
      // Convert to number if it's a string
      const numericAmount = typeof actualAmount === 'string' ? parseFloat(actualAmount) : actualAmount;
      
      // Choose appropriate currency symbol
      let symbol = '₹'; // Default to INR
      
      if (currency) {
        const code = currency.toUpperCase();
        switch (code) {
          case 'USD': symbol = '$'; break;
          case 'EUR': symbol = '€'; break;
          case 'GBP': symbol = '£'; break;
          case 'JPY': symbol = '¥'; break;
          // Default is INR (₹)
        }
      }
      
      // Format the number with 2 decimal places
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numericAmount);
      
      // Return the formatted currency
      return `${symbol}${formattedAmount}`;
    } catch (error) {
      console.error("Currency formatting error:", error);
      return `₹${Number(amount || 0).toFixed(2)}`;
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          View and analyze your invoice data with detailed reports
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Report Settings</CardTitle>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpenFilterDialog}
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              
              {reportType === "outstanding" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      <DownloadCloud className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportOutstandingToCsv} className="cursor-pointer">
                      <FileDown className="h-4 w-4 mr-2" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportOutstandingToExcel} className="cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportOutstandingToPdf} className="cursor-pointer">
                      <Download className="h-4 w-4 mr-2" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Options</DialogTitle>
            <DialogDescription>
              Set filter criteria for your report view
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {reportType === "outstanding" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="col-span-1">Status</Label>
                <Select 
                  value={outstandingFilter}
                  onValueChange={setOutstandingFilter}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {reportType === "closed" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="col-span-1">Status</Label>
                <Select 
                  value={closedFilter}
                  onValueChange={setClosedFilter}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {reportType === "sales" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="groupBy" className="col-span-1">Group By</Label>
                <Select 
                  value={salesGroupBy}
                  onValueChange={setSalesGroupBy}
                >
                  <SelectTrigger className="col-span-3">
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
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dateRange" className="col-span-1">Date Range</Label>
              <div className="col-span-3">
                <DatePickerWithRange
                  dateRange={dateRange}
                  setDateRange={(range: any) => setDateRange(range)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit">Apply Filters</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Tabs defaultValue="outstanding" value={reportType} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="outstanding">Outstanding Bills</TabsTrigger>
          <TabsTrigger value="closed">Closed Bills</TabsTrigger>
          <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="outstanding">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Outstanding Bills</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredOutstandingData.length} {outstandingFilter !== "all" 
                      ? `${outstandingFilter} invoices` 
                      : "invoices"}
                  </span>
                </div>
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
                        <Link href={`/invoices/${invoice.id}`} className="text-primary-500 hover:underline">
                          #{invoice.invoiceNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/parties/${invoice.partyId}`} className="hover:underline">
                          {invoice.partyName}
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
                      <TableCell>{formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency)}</TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="closed">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Closed Bills</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredClosedData.length} {closedFilter !== "all" 
                      ? `${closedFilter} invoices` 
                      : "invoices"}
                  </span>
                </div>
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
                  {filteredClosedData.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="text-primary-500 hover:underline">
                          #{invoice.invoiceNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/parties/${invoice.partyId}`} className="hover:underline">
                          {invoice.partyName}
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{invoice.closedDate ? format(new Date(invoice.closedDate), "MMM dd, yyyy") : "N/A"}</TableCell>
                      <TableCell>{formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency)}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredClosedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                        {closedData && closedData.length > 0
                          ? `No invoices match the current "${closedFilter}" filter.`
                          : "No closed invoices for the selected date range"
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sales">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <div className="flex items-center justify-between">
                <CardTitle>Sales Report</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {salesGroupBy.charAt(0).toUpperCase() + salesGroupBy.slice(1)} View
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {salesData && salesData.periods && salesData.periods.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData.periods}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${formatCurrency(value, 'INR')}`, 'Sales']}
                      />
                      <Legend />
                      <Bar 
                        name="Sales" 
                        dataKey="amount" 
                        fill="hsl(262,80%,50%)" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  No sales data available for the selected period
                </div>
              )}
              
              {salesData && salesData.periods && salesData.periods.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <h4 className="text-lg font-semibold mb-4">Summary</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <div className="text-sm text-neutral-500 mb-1">Total Sales</div>
                      <div className="text-2xl font-bold">{formatCurrency(salesData.totals.totalAmount, 'INR')}</div>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <div className="text-sm text-neutral-500 mb-1">Invoice Count</div>
                      <div className="text-2xl font-bold">{salesData.totals.invoiceCount}</div>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <div className="text-sm text-neutral-500 mb-1">Average Invoice Value</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(salesData.totals.averageAmount, 'INR')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}