import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  
  const { data: invoice } = useQuery<Invoice>({
    queryKey: [`/api/invoices/${invoiceId}`],
  });
  
  if (!invoice) {
    return <div className="flex justify-center items-center h-64">Loading invoice details...</div>;
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
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
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline">
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
                <DropdownMenuItem>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Duplicate Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
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
                  <Link href={`/parties/${invoice.partyId}`}>
                    <a className="text-primary-500 hover:underline">
                      View Party Details
                    </a>
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
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-neutral-600">Tax (18%):</span>
                <span className="font-medium">{formatCurrency(invoice.tax)}</span>
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
                  <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.quantity * item.rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableRow className="bg-neutral-50">
              <TableCell colSpan={2}></TableCell>
              <TableCell className="text-right font-medium">Subtotal</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(invoice.subtotal)}</TableCell>
            </TableRow>
            <TableRow className="bg-neutral-50">
              <TableCell colSpan={2}></TableCell>
              <TableCell className="text-right font-medium">Tax (18%)</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(invoice.tax)}</TableCell>
            </TableRow>
            <TableRow className="bg-neutral-50">
              <TableCell colSpan={2}></TableCell>
              <TableCell className="text-right font-bold">Total</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(invoice.total)}</TableCell>
            </TableRow>
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
