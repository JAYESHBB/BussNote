import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  Send, 
  CreditCard, 
  User,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { Invoice, InvoiceItem } from "@shared/schema";

export default function InvoiceDetailsPage() {
  const [, params] = useRoute("/invoices/:id");
  const invoiceId = params?.id;
  const { toast } = useToast();
  
  const { data: invoice } = useQuery<Invoice>({
    queryKey: [`/api/invoices/${invoiceId}`],
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/invoices/${invoiceId}/status`,
        { status }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  if (!invoice) {
    return <div className="flex justify-center items-center h-64">Loading invoice details...</div>;
  }
  
  const formatCurrency = (amount: string | number, currencyCode: string = 'INR') => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode || 'INR',
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup settings.",
        variant: "destructive",
      });
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${invoice.invoiceNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; color: #333; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
            .invoice-title { font-size: 20px; font-weight: bold; color: #333; }
            .invoice-details { margin-top: 4px; color: #666; font-size: 11px; }
            .section { margin-bottom: 15px; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #444; }
            .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .info-box { padding: 12px; border: 1px solid #eee; border-radius: 4px; background-color: #fafafa; }
            .info-box-title { font-weight: bold; margin-bottom: 6px; color: #555; font-size: 12px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table th { background-color: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; color: #555; }
            .table td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .notes { background-color: #f9f9f9; padding: 12px; border-radius: 4px; margin-top: 15px; font-size: 11px; }
            .flex-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
            .flex-row .label { color: #666; }
            .flex-row .value { font-weight: 500; }
            @media print { 
              body { margin: 0; }
              .info-box { break-inside: avoid; }
              .table { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="flex: 2">
              <div class="invoice-title">Invoice #${invoice.invoiceNo}</div>
              <div class="invoice-details">Issued on ${format(new Date(invoice.invoiceDate), "MMMM d, yyyy")}</div>
              <div class="invoice-details">Status: <span style="font-weight: bold; color: ${invoice.status === 'paid' ? '#16a34a' : invoice.status === 'pending' ? '#ea580c' : invoice.status === 'overdue' ? '#dc2626' : invoice.status === 'cancelled' ? '#6b7280' : '#0284c7'}">${invoice.status.toUpperCase()}</span></div>
              <div class="invoice-details">Bill Closed: <span style="font-weight: bold">${invoice.isClosed ? 'Yes' : 'No'}</span></div>
            </div>
            <div style="flex: 1; text-align: right;">
              <div style="font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 2px;">BussNote</div>
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Management System</div>
              <div style="margin-top: 4px; font-size: 9px; color: #94a3b8;">Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</div>
            </div>
          </div>
          
          <div class="grid">
            <div class="info-box">
              <div class="info-box-title" style="color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px;">Party Information</div>
              <div style="display: flex; margin-bottom: 3px;"><span style="min-width: 60px; font-weight: 500; color: #4b5563;">Seller:</span> <span style="color: #1f2937;">${invoice.partyName || ""}</span></div>
              ${invoice.buyerName ? `<div style="display: flex; margin-bottom: 3px;"><span style="min-width: 60px; font-weight: 500; color: #4b5563;">Buyer:</span> <span style="color: #1f2937;">${invoice.buyerName}</span></div>` : ""}
              ${invoice.partyEmail ? `<div style="display: flex; margin-bottom: 3px;"><span style="min-width: 60px; font-weight: 500; color: #4b5563;">Email:</span> <span style="color: #1f2937; font-size: 10px;">${invoice.partyEmail}</span></div>` : ""}
            </div>
            
            <div class="info-box">
              <div class="info-box-title" style="color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px;">Invoice Details</div>
              <div style="display: flex; margin-bottom: 3px;"><span style="min-width: 95px; font-weight: 500; color: #4b5563;">Invoice Date:</span> <span style="color: #1f2937;">${format(new Date(invoice.invoiceDate), "MMM d, yyyy")}</span></div>
              <div style="display: flex; margin-bottom: 3px;"><span style="min-width: 95px; font-weight: 500; color: #4b5563;">Due Date:</span> <span style="color: #1f2937;">${format(new Date(invoice.dueDate), "MMM d, yyyy")}</span></div>
              <div style="display: flex; margin-bottom: 3px;"><span style="min-width: 95px; font-weight: 500; color: #4b5563;">Due Terms:</span> <span style="color: #1f2937;">${invoice.dueDays || '0'} ${invoice.terms || 'Days'}</span></div>
              ${invoice.status === "paid" && invoice.paymentDate ? 
                `<div style="display: flex; margin-bottom: 3px;"><span style="min-width: 95px; font-weight: 500; color: #4b5563;">Payment Date:</span> <span style="color: #1f2937;">${format(new Date(invoice.paymentDate), "MMM d, yyyy")}</span></div>` : ""}
              ${invoice.notes ? `<div style="display: flex; margin-bottom: 3px;"><span style="min-width: 95px; font-weight: 500; color: #4b5563;">Notes:</span> <span style="color: #1f2937;">${invoice.notes}</span></div>` : ""}
            </div>
            
            <div class="info-box">
              <div class="info-box-title" style="color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px;">Payment Summary</div>
              <div style="display: flex; margin-bottom: 3px;">
                <span style="min-width: 150px; font-weight: 500; color: #4b5563;">Subtotal:</span> 
                <span style="color: #1f2937; font-weight: 500;">${formatCurrency(Number(invoice.subtotal), invoice.currency || 'INR')}</span>
              </div>
              <div style="display: flex; margin-bottom: 3px;">
                <span style="min-width: 150px; font-weight: 500; color: #4b5563;">Brokerage (${isNaN(Number(invoice.brokerageRate)) ? '0.00' : Number(invoice.brokerageRate).toFixed(2)}%):</span> 
                <span style="color: #1f2937; font-weight: 500;">${formatCurrency(Number(invoice.subtotal) * (Number(invoice.brokerageRate || 0) / 100), invoice.currency || 'INR')}</span>
              </div>
              <div style="display: flex; margin-bottom: 3px;">
                <span style="min-width: 150px; font-weight: 500; color: #4b5563;">Currency:</span> 
                <span style="color: #1f2937;">${invoice.currency || 'INR'}</span>
              </div>
              <div style="display: flex; margin-bottom: 3px;">
                <span style="min-width: 150px; font-weight: 500; color: #4b5563;">Exchange Rate:</span> 
                <span style="color: #1f2937;">${invoice.exchangeRate || '1.00'}</span>
              </div>
              <div style="display: flex; margin-bottom: 3px;">
                <span style="min-width: 150px; font-weight: 500; color: #4b5563;">Brokerage in INR:</span> 
                <span style="color: #1f2937; font-weight: 500;">${formatCurrency(Math.round(Number(invoice.brokerageInINR || '0')))}</span>
              </div>
              <div style="display: flex; margin-bottom: 3px;">
                <span style="min-width: 150px; font-weight: 500; color: #4b5563;">Received Brokerage:</span> 
                <span style="color: #1f2937;">${formatCurrency(Number(invoice.receivedBrokerage || '0'))}</span>
              </div>
              <div style="display: flex; margin-bottom: 3px; ${Number(invoice.balanceBrokerage || 0) === 0 ? 'color: #16a34a;' : 'color: #dc2626;'} font-weight: bold;">
                <span style="min-width: 150px; font-weight: 500;">Balance Brokerage:</span> 
                <span>${formatCurrency(Number(invoice.balanceBrokerage || '0'))}</span>
              </div>
              <div style="border-top: 1px dashed #e2e8f0; margin-top: 5px; padding-top: 5px; font-size: 10px; color: #94a3b8; text-align: center;">
                ${invoice.isClosed ? 'This invoice has been marked as closed' : 'Invoice is still open'}
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title" style="color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px;">Invoice Items</div>
            <table class="table" style="border: 1px solid #f1f5f9;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="font-size: 11px; font-weight: 600; color: #475569; padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Description</th>
                  <th style="font-size: 11px; font-weight: 600; color: #475569; padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Quantity</th>
                  <th style="font-size: 11px; font-weight: 600; color: #475569; padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Rate</th>
                  <th style="font-size: 11px; font-weight: 600; color: #475569; padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items?.map((item, index) => `
                  <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td style="padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #1f2937;">${item.description}</td>
                    <td style="padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #1f2937;">${item.quantity}</td>
                    <td style="padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #1f2937;">${formatCurrency(Number(item.rate), invoice.currency || 'INR')}</td>
                    <td style="padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #1f2937; font-weight: 500;">${formatCurrency(Number(item.quantity) * Number(item.rate), invoice.currency || 'INR')}</td>
                  </tr>
                `).join("") || `
                  <tr>
                    <td colspan="4" style="padding: 10px; text-align: center; font-style: italic; color: #94a3b8;">No items found</td>
                  </tr>
                `}
                <tr style="background-color: #f8fafc; font-weight: 600;">
                  <td colspan="2" style="padding: 8px;"></td>
                  <td style="padding: 8px; text-align: right; border-top: 1px solid #e2e8f0; color: #475569;">Subtotal</td>
                  <td style="padding: 8px; text-align: right; border-top: 1px solid #e2e8f0; color: #1e3a8a;">${formatCurrency(Number(invoice.subtotal), invoice.currency || 'INR')}</td>
                </tr>
                <tr style="background-color: #f8fafc; font-weight: 600;">
                  <td colspan="2" style="padding: 8px;"></td>
                  <td style="padding: 8px; text-align: right; color: #475569;">Brokerage (${isNaN(Number(invoice.brokerageRate)) ? '0.00' : Number(invoice.brokerageRate).toFixed(2)}%)</td>
                  <td style="padding: 8px; text-align: right; color: #1e3a8a;">${formatCurrency(Number(invoice.subtotal) * (Number(invoice.brokerageRate || 0) / 100), invoice.currency || 'INR')}</td>
                </tr>
              </tbody>
            </table>
            <div style="font-size: 9px; color: #94a3b8; text-align: right; margin-top: 5px;">
              * All amounts are in ${invoice.currency || 'INR'} unless specified otherwise.
            </div>
          </div>
          
          ${invoice.notes ? `
            <div class="notes" style="background-color: #f9fafb; padding: 12px; border-radius: 4px; margin-top: 15px; border: 1px solid #f1f5f9;">
              <div class="section-title" style="color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px; font-size: 14px; font-weight: 600;">Notes</div>
              <p style="font-size: 11px; color: #374151; line-height: 1.5;">${invoice.notes}</p>
            </div>
          ` : ""}
          
          <div style="margin-top: 30px; border-top: 1px dashed #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between;">
            <div style="flex: 1; font-size: 10px; color: #64748b;">
              <div style="margin-bottom: 3px;">Thank you for your business!</div>
              <div>BussNote Invoice Management</div>
            </div>
            <div style="text-align: right; font-size: 10px; color: #64748b;">
              <div>Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</div>
              <div>Invoice #${invoice.invoiceNo}</div>
            </div>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const handleDownload = () => {
    toast({
      title: "Coming Soon",
      description: "Download as PDF functionality will be available soon."
    });
  };
  
  const handleEmail = () => {
    const emailTo = invoice.partyEmail || invoice.buyerEmail;
    if (!emailTo) {
      toast({
        title: "Error",
        description: "No email address found for this party",
        variant: "destructive",
      });
      return;
    }
    
    const subject = `Invoice #${invoice.invoiceNo} from BussNote`;
    const body = `Dear ${invoice.partyName},\n\n`+
      `Please find attached invoice #${invoice.invoiceNo} for your reference.\n\n`+
      `Invoice Date: ${format(new Date(invoice.invoiceDate), "MMMM d, yyyy")}\n`+
      `Due Date: ${format(new Date(invoice.dueDate), "MMMM d, yyyy")}\n`+
      `Amount Due: ${formatCurrency(Number(invoice.total))}\n\n`+
      `Please let us know if you have any questions.\n\n`+
      `Thank you for your business!\n\n`+
      `Regards,\nBussNote Team`;
    
    window.open(`mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };
  
  const handleMarkAsPaid = () => {
    updateStatusMutation.mutate("paid");
  };
  
  const handleCancelInvoice = () => {
    updateStatusMutation.mutate("cancelled");
  };
  
  const handleDuplicateInvoice = () => {
    toast({
      title: "Coming Soon",
      description: "Duplicate invoice functionality will be available soon."
    });
  };
  
  const handleSendReminder = () => {
    const emailTo = invoice.partyEmail || invoice.buyerEmail;
    if (!emailTo) {
      toast({
        title: "Error",
        description: "No email address found for this party",
        variant: "destructive",
      });
      return;
    }
    
    const subject = `REMINDER: Invoice #${invoice.invoiceNo} Payment Due`;
    const body = `Dear ${invoice.partyName},\n\n`+
      `This is a friendly reminder that payment for invoice #${invoice.invoiceNo} is due `+
      `${new Date(invoice.dueDate) < new Date() ? 'was due' : 'is due'} on ${format(new Date(invoice.dueDate), "MMMM d, yyyy")}.\n\n`+
      `Invoice Date: ${format(new Date(invoice.invoiceDate), "MMMM d, yyyy")}\n`+
      `Due Date: ${format(new Date(invoice.dueDate), "MMMM d, yyyy")}\n`+
      `Amount Due: ${formatCurrency(Number(invoice.total))}\n\n`+
      `Please arrange for payment at your earliest convenience. If you have already made the payment, please disregard this reminder.\n\n`+
      `If you have any questions regarding this invoice, please don't hesitate to contact us.\n\n`+
      `Thank you for your business!\n\n`+
      `Regards,\nBussNote Team`;
    
    window.open(`mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <>
      <div className="mb-6">
        <Link href="/invoices">
          <Button variant="ghost" className="mb-4 hover:bg-neutral-100 -ml-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Invoice #{invoice.invoiceNo}</h1>
            <div className="flex items-center mt-1">
              <StatusBadge status={invoice.status as any} />
              <span className="text-neutral-500 ml-2">
                Issued on {format(new Date(invoice.invoiceDate), "MMMM d, yyyy")}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleEmail}>
              <Send className="h-4 w-4 mr-2" />
              Email
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleMarkAsPaid}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendReminder}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicateInvoice}>
                  <FileText className="h-4 w-4 mr-2" />
                  Duplicate Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleCancelInvoice}>
                  Cancel Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Party Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="font-medium">{invoice.partyName}</p>
                <p className="text-sm text-neutral-500">
                  <Link href={`/parties/${invoice.partyId}`} className="text-primary-500 hover:underline">
                    View Party Details
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="font-medium">{invoice.invoiceNo}</p>
                <p className="text-sm text-neutral-500">Invoice No.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="font-medium">{format(new Date(invoice.invoiceDate), "MMMM d, yyyy")}</p>
                <p className="text-sm text-neutral-500">Invoice Date</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="font-medium">{format(new Date(invoice.dueDate), "MMMM d, yyyy")}</p>
                <p className="text-sm text-neutral-500">Due Date</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="font-medium">{invoice.dueDays || '0'} {invoice.terms || 'Days'}</p>
                <p className="text-sm text-neutral-500">Due Terms</p>
              </div>
            </div>
            
            {invoice.status === "paid" && invoice.paymentDate && (
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-secondary-500 mt-0.5" />
                <div>
                  <p className="font-medium">{format(new Date(invoice.paymentDate), "MMMM d, yyyy")}</p>
                  <p className="text-sm text-neutral-500">Payment Date</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-neutral-600">Brokerage ({isNaN(Number(invoice.brokerageRate)) ? '0.00' : Number(invoice.brokerageRate).toFixed(2)}%):</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal * (Number(invoice.brokerageRate || 0) / 100), invoice.currency)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-600">Currency:</span>
                <span className="font-medium">{invoice.currency || 'INR'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-600">Exchange Rate:</span>
                <span className="font-medium">{invoice.exchangeRate || '1.00'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-600">Brokerage in INR:</span>
                <span className="font-medium">{formatCurrency(Math.round(Number(invoice.brokerageInINR || 0)), 'INR')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-600">Received Brokerage:</span>
                <span className="font-medium">{formatCurrency(invoice.receivedBrokerage || '0', 'INR')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-600">Balance Brokerage:</span>
                <span className="font-medium">{formatCurrency(invoice.balanceBrokerage || '0', 'INR')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-neutral-600">Bill Closed:</span>
                <span className="font-medium">{invoice.isClosed ? 'Yes' : 'No'}</span>
              </div>
              
              <Separator className="my-2" />
              
              {invoice.status === "pending" && (
                <div className="flex justify-between text-accent-700 font-medium">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              )}
              
              {invoice.status === "overdue" && (
                <div className="flex justify-between text-destructive font-medium">
                  <span>Overdue:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-5">
          <CardTitle className="text-lg font-semibold">Invoice Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead className="w-full">Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items?.map((item: InvoiceItem, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.rate, invoice.currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.quantity) * Number(item.rate), invoice.currency)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-neutral-50">
                <TableCell colSpan={2}></TableCell>
                <TableCell className="text-right font-medium">Subtotal</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</TableCell>
              </TableRow>
              <TableRow className="bg-neutral-50">
                <TableCell colSpan={2}></TableCell>
                <TableCell className="text-right font-medium">Brokerage ({isNaN(Number(invoice.brokerageRate)) ? '0.00' : Number(invoice.brokerageRate).toFixed(2)}%)</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(invoice.subtotal * (Number(invoice.brokerageRate || 0) / 100), invoice.currency)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card className="mt-6">
          <CardHeader className="py-5">
            <CardTitle className="text-lg font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-700">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
