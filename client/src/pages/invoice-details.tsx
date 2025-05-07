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
          <title>Invoice #${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .invoice-title { font-size: 24px; font-weight: bold; color: #333; }
            .invoice-details { margin-top: 5px; color: #666; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-box { padding: 15px; border: 1px solid #eee; border-radius: 5px; }
            .info-box-title { font-weight: bold; margin-bottom: 8px; color: #555; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th { background-color: #f5f5f5; text-align: left; padding: 10px; }
            .table td { padding: 10px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; }
            .notes { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .flex-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .flex-row .label { color: #666; }
            .flex-row .value { font-weight: 500; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="invoice-title">Invoice #${invoice.invoiceNo || invoice.invoiceNumber}</div>
              <div class="invoice-details">Issued on ${format(new Date(invoice.invoiceDate), "MMMM d, yyyy")}</div>
              <div class="invoice-details">Status: ${invoice.status}</div>
              <div class="invoice-details">Bill Closed: ${invoice.isClosed ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <h1>BussNote</h1>
              <div>Invoice Management System</div>
            </div>
          </div>
          
          <div class="grid">
            <div class="info-box">
              <div class="info-box-title">Party Information</div>
              <div>Seller: ${invoice.partyName || ""}</div>
              ${invoice.buyerName ? `<div>Buyer: ${invoice.buyerName}</div>` : ""}
            </div>
            
            <div class="info-box">
              <div class="info-box-title">Invoice Details</div>
              <div>Invoice Date: ${format(new Date(invoice.invoiceDate), "MMMM d, yyyy")}</div>
              <div>Due Date: ${format(new Date(invoice.dueDate), "MMMM d, yyyy")}</div>
              <div>Due Terms: ${invoice.dueDays || '0'} ${invoice.terms || 'Days'}</div>
              ${invoice.status === "paid" && invoice.paymentDate ? 
                `<div>Payment Date: ${format(new Date(invoice.paymentDate), "MMMM d, yyyy")}</div>` : ""}
              ${invoice.remarks ? `<div>Remarks: ${invoice.remarks}</div>` : ""}
            </div>
            
            <div class="info-box">
              <div class="info-box-title">Payment Summary</div>
              <div class="flex-row">
                <span class="label">Subtotal:</span>
                <span class="value">${formatCurrency(Number(invoice.subtotal), invoice.currency || 'INR')}</span>
              </div>
              <div class="flex-row">
                <span class="label">Brokerage (${isNaN(Number(invoice.brokerageRate)) ? '0.00' : Number(invoice.brokerageRate).toFixed(2)}%):</span>
                <span class="value">${formatCurrency(Number(invoice.tax), invoice.currency || 'INR')}</span>
              </div>
              <div class="flex-row">
                <span class="label">Currency:</span>
                <span class="value">${invoice.currency || 'INR'}</span>
              </div>
              <div class="flex-row">
                <span class="label">Exchange Rate:</span>
                <span class="value">${invoice.exchangeRate || '1.00'}</span>
              </div>
              <div class="flex-row">
                <span class="label">Brokerage in INR:</span>
                <span class="value">${formatCurrency(Number(invoice.brokerageInINR || '0'))}</span>
              </div>
              <div class="flex-row">
                <span class="label">Received Brokerage:</span>
                <span class="value">${formatCurrency(Number(invoice.receivedBrokerage || '0'))}</span>
              </div>
              <div class="flex-row">
                <span class="label">Balance Brokerage:</span>
                <span class="value">${formatCurrency(Number(invoice.balanceBrokerage || '0'))}</span>
              </div>
              <div class="flex-row" style="margin-top: 10px; font-weight: bold;">
                <span class="label">Total:</span>
                <span class="value">${formatCurrency(Number(invoice.total), invoice.currency || 'INR')}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Invoice Items</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items?.map((item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(Number(item.rate), invoice.currency || 'INR')}</td>
                    <td class="text-right">${formatCurrency(Number(item.quantity) * Number(item.rate), invoice.currency || 'INR')}</td>
                  </tr>
                `).join("") || ""}
                <tr class="total-row">
                  <td colspan="2"></td>
                  <td class="text-right">Subtotal</td>
                  <td class="text-right">${formatCurrency(Number(invoice.subtotal), invoice.currency || 'INR')}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2"></td>
                  <td class="text-right">Brokerage (${isNaN(Number(invoice.brokerageRate)) ? '0.00' : Number(invoice.brokerageRate).toFixed(2)}%)</td>
                  <td class="text-right">${formatCurrency(Number(invoice.tax), invoice.currency || 'INR')}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2"></td>
                  <td class="text-right">Total</td>
                  <td class="text-right">${formatCurrency(Number(invoice.total), invoice.currency || 'INR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          ${invoice.notes ? `
            <div class="notes">
              <div class="section-title">Notes</div>
              <p>${invoice.notes}</p>
            </div>
          ` : ""}
          
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
    
    const subject = `Invoice #${invoice.invoiceNumber} from BussNote`;
    const body = `Dear ${invoice.partyName},\n\n`+
      `Please find attached invoice #${invoice.invoiceNumber} for your reference.\n\n`+
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
    
    const subject = `REMINDER: Invoice #${invoice.invoiceNumber} Payment Due`;
    const body = `Dear ${invoice.partyName},\n\n`+
      `This is a friendly reminder that payment for invoice #${invoice.invoiceNumber} is due `+
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
            <h1 className="text-2xl font-bold text-neutral-800">Invoice #{invoice.invoiceNumber}</h1>
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
                <p className="font-medium">{invoice.invoiceNo || invoice.invoiceNumber}</p>
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
                <span className="font-medium">{formatCurrency(invoice.tax, invoice.currency)}</span>
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
                <span className="font-medium">{formatCurrency(invoice.brokerageInINR || '0', 'INR')}</span>
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
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              
              {invoice.status === "paid" && (
                <div className="flex justify-between text-secondary-500">
                  <span>Paid:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              )}
              
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
                <TableCell className="text-right font-medium">{formatCurrency(invoice.tax, invoice.currency)}</TableCell>
              </TableRow>
              <TableRow className="bg-neutral-50">
                <TableCell colSpan={2}></TableCell>
                <TableCell className="text-right font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(invoice.total, invoice.currency)}</TableCell>
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
