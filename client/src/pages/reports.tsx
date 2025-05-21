import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("outstanding");
  const { toast } = useToast();
  const [outstandingFilter, setOutstandingFilter] = useState("all");
  const [closedFilter, setClosedFilter] = useState("all");
  const [salesGroupBy, setSalesGroupBy] = useState("monthly");
  
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
  
  // Set fixed period - always showing last 12 months
  const fixedPeriod = {
    period: "last12months"
  };
  
  const { data: outstandingData = [] } = useQuery<any[]>({
    queryKey: ['/api/reports/outstanding'],
    queryFn: async () => {
      const res = await fetch('/api/reports/outstanding');
      if (!res.ok) throw new Error('Failed to fetch outstanding invoices');
      return res.json();
    }
  });
  
  const { data: closedData = [] } = useQuery<any[]>({
    queryKey: ['/api/reports/closed'],
    queryFn: async () => {
      const res = await fetch('/api/reports/closed');
      if (!res.ok) throw new Error('Failed to fetch closed invoices');
      return res.json();
    }
  });
  
  const { data: salesData = { periods: [], totals: { invoiceCount: 0, totalSales: 0, totalBrokerage: 0 } } } = useQuery({
    queryKey: ['/api/reports/sales'],
    queryFn: async () => {
      const res = await fetch('/api/reports/sales');
      if (!res.ok) throw new Error('Failed to fetch sales data');
      return res.json();
    }
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
  
  // Helper to format currency
  const formatCurrency = (amount: number | string, currencyCode: string | null = null): string => {
    let numAmount = 0;
    
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount);
    } else {
      numAmount = amount;
    }
    
    if (isNaN(numAmount)) {
      numAmount = 0;
    }
    
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${numAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
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
    const fromDate = format(new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()), "dd MMM yyyy");
    const toDate = format(new Date(), "dd MMM yyyy");
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
              <div class="summary-item">
                <span>Filter:</span>
                <span>${outstandingFilter === "all" 
                  ? "All Outstanding" 
                  : outstandingFilter === "pending" 
                    ? "Pending Only" 
                    : "Overdue Only"}</span>
              </div>
              <div class="summary-total">
                <span>Total Outstanding Amount:</span>
                <span>${formatCurrency(totalAmount)}</span>
              </div>
            </div>
            
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No</th>
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
                        ${invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : "Not overdue"}
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
              <p>© ${new Date().getFullYear()} BussNote. All rights reserved.</p>
              <p>This report was generated automatically and is valid as of ${currentDate}.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
    
    toast({
      title: "PDF export prepared",
      description: "Print dialog should open shortly. Save as PDF to complete the export."
    });
  };
  
  // Closed reports export
  const prepareClosedExportData = () => {
    if (!filteredClosedData || filteredClosedData.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no closed invoices matching your current filters.",
        variant: "destructive"
      });
      return null;
    }
    
    // Map the data for export
    const exportData = filteredClosedData.map(invoice => ({
      "Invoice No": invoice.invoiceNo,
      "Party Name": invoice.partyName,
      "Invoice Date": format(new Date(invoice.invoiceDate), "MMM dd, yyyy"),
      "Closed Date": invoice.paymentDate ? format(new Date(invoice.paymentDate), "MMM dd, yyyy") : "N/A",
      "Amount": formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency).replace(getCurrencySymbol(invoice.currency), ''),
      "Status": invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
    }));
    
    return exportData;
  };
  
  const exportClosedToCsv = () => {
    const data = prepareClosedExportData();
    if (!data) return;
    
    // Create headers
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          `"${row[header as keyof typeof row]}"`
        ).join(',')
      )
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `closed_invoices_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Exported ${data.length} closed invoices to CSV file.`
    });
  };
  
  const exportClosedToExcel = () => {
    const data = prepareClosedExportData();
    if (!data) return;
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const maxWidths: Record<number, number> = {};
    const headers = Object.keys(data[0]);
    
    headers.forEach((header, index) => {
      maxWidths[index] = header.length;
    });
    
    data.forEach(row => {
      headers.forEach((header, index) => {
        const value = String(row[header as keyof typeof row]);
        if (value.length > maxWidths[index]) {
          maxWidths[index] = value.length;
        }
      });
    });
    
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[parseInt(key)] + 2 }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Closed Invoices");
    XLSX.writeFile(workbook, `closed_invoices_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Export successful",
      description: `Exported ${data.length} closed invoices to Excel file.`
    });
  };
  
  const exportClosedToPdf = () => {
    const data = prepareClosedExportData();
    if (!data) return;
    
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
    const fromDate = format(new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()), "dd MMM yyyy");
    const toDate = format(new Date(), "dd MMM yyyy");
    const currentDate = format(new Date(), "dd MMM yyyy, hh:mm a");
    
    // Calculate totals
    const totalAmount = filteredClosedData.reduce((sum, invoice) => 
      sum + Number(invoice.total || invoice.subtotal || 0), 0);
    
    // Reusing the same styles from the previous export function
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Closed Invoices Report - BussNote</title>
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
              --success-color: #10b981;
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
            
            .badge-paid {
              background-color: #d1fae5;
              color: var(--success-color);
            }
            
            .badge-cancelled {
              background-color: #fef2f2;
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
                <p class="report-name">Closed Invoices Report</p>
              </div>
              <div class="header-right">
                <p class="report-date">Generated: ${currentDate}</p>
                <p class="report-info">Period: <span class="highlight">${fromDate} to ${toDate}</span></p>
                <p class="report-info">Status: <span class="highlight">
                  ${closedFilter === "all" 
                    ? "All Closed" 
                    : closedFilter === "paid" 
                      ? "Paid Only" 
                      : "Cancelled Only"}
                </span></p>
              </div>
            </div>
            
            <div class="report-summary">
              <div class="summary-title">Summary</div>
              <div class="summary-item">
                <span>Total Invoices:</span>
                <span>${filteredClosedData.length}</span>
              </div>
              <div class="summary-item">
                <span>Period Range:</span>
                <span>${fromDate} - ${toDate}</span>
              </div>
              <div class="summary-item">
                <span>Filter:</span>
                <span>${closedFilter === "all" 
                  ? "All Closed" 
                  : closedFilter === "paid" 
                    ? "Paid Only" 
                    : "Cancelled Only"}</span>
              </div>
              <div class="summary-total">
                <span>Total Amount:</span>
                <span>${formatCurrency(totalAmount)}</span>
              </div>
            </div>
            
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Party Name</th>
                    <th>Invoice Date</th>
                    <th>Closed Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredClosedData.map(invoice => `
                    <tr>
                      <td>${invoice.invoiceNo}</td>
                      <td>${invoice.partyName}</td>
                      <td>${format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</td>
                      <td>${invoice.paymentDate ? format(new Date(invoice.paymentDate), "MMM dd, yyyy") : "N/A"}</td>
                      <td>${formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency)}</td>
                      <td>
                        <span class="badge ${invoice.status === 'paid' ? 'badge-paid' : 'badge-cancelled'}">
                          ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} BussNote. All rights reserved.</p>
              <p>This report was generated automatically and is valid as of ${currentDate}.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
    
    toast({
      title: "PDF export prepared",
      description: "Print dialog should open shortly. Save as PDF to complete the export."
    });
  };
  
  // Prepare sales report export
  const prepareSalesExportData = () => {
    if (!salesData?.periods || salesData.periods.length === 0) {
      toast({
        title: "No data to export",
        description: "There is no sales data available for the selected period.",
        variant: "destructive"
      });
      return null;
    }
    
    // Create export data
    return salesData.periods.map((period: any) => ({
      "Period": period.label,
      "Invoice Count": period.invoiceCount,
      "Total Sales": formatCurrency(period.total || 0).replace(getCurrencySymbol(null), ''),
      "Brokerage": formatCurrency(period.brokerage || 0).replace(getCurrencySymbol(null), '')
    }));
  };
  
  const exportSalesToCsv = () => {
    const data = prepareSalesExportData();
    if (!data) return;
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row: any) => 
        headers.map(header => 
          `"${row[header]}"`
        ).join(',')
      )
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Exported sales report data to CSV file.`
    });
  };
  
  const exportSalesToExcel = () => {
    const data = prepareSalesExportData();
    if (!data) return;
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const maxWidths: Record<number, number> = {};
    const headers = Object.keys(data[0]);
    
    headers.forEach((header, index) => {
      maxWidths[index] = header.length;
    });
    
    data.forEach((row: any) => {
      headers.forEach((header, index) => {
        const value = String(row[header]);
        if (value.length > maxWidths[index]) {
          maxWidths[index] = value.length;
        }
      });
    });
    
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[parseInt(key)] + 2 }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, `sales_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Export successful",
      description: `Exported sales report data to Excel file.`
    });
  };
  
  // Prepare chart data from sales data
  const prepareChartData = () => {
    if (!salesData?.periods || salesData.periods.length === 0) {
      return [];
    }
    
    // Map the data for the chart
    return salesData.periods.map((period: any) => ({
      name: period.label,
      Sales: period.total || 0,
      Brokerage: period.brokerage || 0
    }));
  };
  
  return (
    <div className="p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and export financial reports for your business
            </p>
          </div>
          
          <div className="flex gap-2 self-start">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Report Settings</CardTitle>
            
            <div className="flex space-x-2">
              {reportType === "outstanding" && (
                <Select 
                  value={outstandingFilter} 
                  onValueChange={setOutstandingFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outstanding</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {reportType === "closed" && (
                <Select 
                  value={closedFilter} 
                  onValueChange={setClosedFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Closed</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                    <SelectItem value="cancelled">Cancelled Only</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {reportType === "sales" && (
                <Select 
                  value={salesGroupBy} 
                  onValueChange={setSalesGroupBy}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Grouping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {reportType === "outstanding" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      <DownloadCloud className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Choose format</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportOutstandingToCsv}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportOutstandingToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportOutstandingToPdf}>
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {reportType === "closed" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      <DownloadCloud className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Choose format</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportClosedToCsv}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportClosedToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportClosedToPdf}>
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {reportType === "sales" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      <DownloadCloud className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Choose format</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportSalesToCsv}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportSalesToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="outstanding" onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="outstanding" className="px-4">
                <Calendar className="h-4 w-4 mr-2" />
                Outstanding Invoices
              </TabsTrigger>
              <TabsTrigger value="closed" className="px-4">
                <Calendar className="h-4 w-4 mr-2" />
                Closed Invoices
              </TabsTrigger>
              <TabsTrigger value="sales" className="px-4">
                <BarChartIcon className="h-4 w-4 mr-2" />
                Sales Analysis
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="outstanding">
              <Card>
                <CardHeader>
                  <CardTitle>Outstanding Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredOutstandingData?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice No</TableHead>
                            <TableHead>Party Name</TableHead>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Days Overdue</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOutstandingData.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell>{invoice.invoiceNo}</TableCell>
                              <TableCell>{invoice.partyName}</TableCell>
                              <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                              <TableCell>{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</TableCell>
                              <TableCell className={invoice.daysOverdue > 0 ? "text-red-500 font-medium" : ""}>
                                {invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : "Not overdue"}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={invoice.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No outstanding invoices found matching your current filters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="closed">
              <Card>
                <CardHeader>
                  <CardTitle>Closed Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredClosedData?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice No</TableHead>
                            <TableHead>Party Name</TableHead>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead>Closed Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredClosedData.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell>{invoice.invoiceNo}</TableCell>
                              <TableCell>{invoice.partyName}</TableCell>
                              <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                              <TableCell>
                                {invoice.paymentDate 
                                  ? format(new Date(invoice.paymentDate), "MMM dd, yyyy")
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(invoice.total || invoice.subtotal || 0, invoice.currency)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={invoice.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No closed invoices found matching your current filters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sales">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Analysis ({salesGroupBy})</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesData?.periods && salesData.periods.length > 0 ? (
                    <>
                      <div className="h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={prepareChartData()}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: number) => formatCurrency(value)}
                              labelFormatter={(label) => `Period: ${label}`}
                            />
                            <Legend />
                            <Bar name="Sales Amount" dataKey="Sales" fill="#8884d8" />
                            <Bar name="Brokerage Amount" dataKey="Brokerage" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="overflow-x-auto mt-8">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead>Invoice Count</TableHead>
                              <TableHead>Total Sales</TableHead>
                              <TableHead>Brokerage</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salesData.periods.map((period: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{period.label}</TableCell>
                                <TableCell>{period.invoiceCount}</TableCell>
                                <TableCell>{formatCurrency(period.total || 0)}</TableCell>
                                <TableCell>{formatCurrency(period.brokerage || 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-sm font-medium text-muted-foreground">
                                Total Invoices
                              </div>
                              <div className="text-2xl font-bold mt-1">
                                {salesData.totals?.invoiceCount || 0}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-sm font-medium text-muted-foreground">
                                Total Sales
                              </div>
                              <div className="text-2xl font-bold mt-1">
                                {formatCurrency(salesData.totals?.totalSales || 0)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-sm font-medium text-muted-foreground">
                                Total Brokerage
                              </div>
                              <div className="text-2xl font-bold mt-1">
                                {formatCurrency(salesData.totals?.totalBrokerage || 0)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No sales data available for the selected period.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}