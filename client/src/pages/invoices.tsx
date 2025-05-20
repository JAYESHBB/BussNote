import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  Eye,
  Printer,
  MoreHorizontal,
  MessageSquare,
  Edit,
  CheckSquare,
  Bell,
  Copy,
  XCircle,
  Trash,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceForm } from "@/components/InvoiceForm";
import { Invoice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showClosed, setShowClosed] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  
  // Function to handle edit invoice
  const handleEditInvoice = (invoice: Invoice) => {
    console.log("Editing invoice:", invoice);
    setEditingInvoice(invoice);
    setIsInvoiceFormOpen(true);
  };
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const { toast } = useToast();
  
  // Mutation for updating invoice status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update invoice status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Updated mutation for deleting invoice - using the standard DELETE endpoint
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        // Use the standard DELETE endpoint with our improved reliable backend implementation
        const res = await apiRequest("DELETE", `/api/invoices/${id}`);
        
        // Check if the response is OK
        if (!res.ok) {
          const errorText = await res.text();
          try {
            // Try to parse as JSON
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || "Failed to delete invoice");
          } catch (e) {
            // If parsing fails, use the text as error message
            throw new Error(errorText.substring(0, 100) || "Failed to delete invoice");
          }
        }
        
        // Try to parse response as JSON or return simple success object
        try {
          return await res.json();
        } catch (e) {
          // If response is not valid JSON, return a success object anyway
          return { success: true };
        }
      } catch (error) {
        console.error("Error deleting invoice:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Function to handle printing invoice
  const handlePrint = (invoice: Invoice) => {
    // Open print dialog with invoice details
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup blocker settings.",
        variant: "destructive",
      });
      return;
    }
    
    // Format invoice data for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .invoice-details { margin-bottom: 20px; }
          .invoice-details div { margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .amount-row { font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div>
            <div class="invoice-title">Invoice ${invoice.invoiceNo}</div>
            <div>BussNote - Invoice Management System</div>
          </div>
          <div>
            <div>Date: ${format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</div>
            <div>Due Date: ${format(new Date(invoice.dueDate), "MMM dd, yyyy")}</div>
          </div>
        </div>
        
        <div class="invoice-details">
          <div><strong>Seller:</strong> ${invoice.partyName || 'N/A'}</div>
          <div><strong>Buyer:</strong> ${invoice.buyerName || 'N/A'}</div>
          <div><strong>Status:</strong> ${invoice.status.toUpperCase()}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Currency</th>
              <th>Subtotal</th>
              <th>Brokerage</th>
              <th>Brokerage in INR</th>
              <th>Received</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Invoice ${invoice.invoiceNo}</td>
              <td>${invoice.currency || 'INR'}</td>
              <td>${invoice.currency === 'INR' ? '₹' : invoice.currency} ${Number(invoice.subtotal || 0).toFixed(2)}</td>
              <td>${invoice.currency === 'INR' ? '₹' : invoice.currency} ${Number(invoice.brokerageInINR || 0).toFixed(2)}</td>
              <td>₹ ${Number(invoice.brokerageInINR || 0).toFixed(2)}</td>
              <td>₹ ${Number(invoice.receivedBrokerage || 0).toFixed(2)}</td>
              <td>₹ ${Number(invoice.balanceBrokerage || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
      printWindow.print();
      // printWindow.close(); // Optional: close after printing
    };
  };
  
  // Function to mark invoice as paid
  const handleMarkAsPaid = (invoice: Invoice) => {
    updateStatusMutation.mutate({ id: invoice.id, status: 'paid' });
  };
  
  // Function to mark invoice as cancelled
  const handleCancelInvoice = (invoice: Invoice) => {
    updateStatusMutation.mutate({ id: invoice.id, status: 'cancelled' });
  };
  
  // Function to duplicate invoice (placeholder for now)
  const handleDuplicateInvoice = (invoice: Invoice) => {
    toast({
      title: "Coming Soon",
      description: "Duplicate invoice functionality will be available soon.",
    });
  };
  
  // Function to send reminder via the user's default email client
  const handleSendReminder = (invoice: Invoice) => {
    // Get the party email address
    if (!invoice.partyEmail && !invoice.buyerEmail) {
      toast({
        title: "Missing Email",
        description: "No email address found for this invoice's party or buyer.",
        variant: "destructive",
      });
      return;
    }
    
    // Create the reminder email content
    const subject = `Reminder: Invoice ${invoice.invoiceNo} Payment Due`;
    
    // Get the proper amount to display - use subtotal when total is 0 or not present
    const amountValue = Number(invoice.total) > 0 ? Number(invoice.total) : Number(invoice.subtotal);
    const formattedAmount = !isNaN(amountValue) ? amountValue.toFixed(2) : '0.00';
    
    const body = `Dear ${invoice.buyerName || invoice.partyName},

This is a friendly reminder that invoice ${invoice.invoiceNo} for ${invoice.currency === 'INR' ? '₹' : invoice.currency} ${formattedAmount} is currently ${invoice.status}.

Invoice Details:
- Invoice No.: ${invoice.invoiceNo}
- Invoice Date: ${format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}
- Due Date: ${format(new Date(invoice.dueDate), "MMM dd, yyyy")}
- Amount Due: ${invoice.currency === 'INR' ? '₹' : invoice.currency} ${formattedAmount}

Please process this payment at your earliest convenience.

Thank you for your business.

Best regards,
BussNote Team`;
    
    // Encode the subject and body for mailto link
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    
    // Use the party's email or the buyer's email if available
    const toEmail = invoice.partyEmail || invoice.buyerEmail || '';
    
    // Create and open the mailto link
    const mailtoLink = `mailto:${toEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    window.open(mailtoLink);
    
    // Show a success message
    toast({
      title: "Email Prepared",
      description: "Reminder email has been prepared in your default email client.",
    });
  };
  
  const { data: invoices, isLoading: isLoadingInvoices, refetch } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  
  const filteredInvoices = invoices?.filter((invoice) => {
    // Filter by search
    const searchMatch = 
      (invoice.invoiceNo ? invoice.invoiceNo.toLowerCase().includes(search.toLowerCase()) : false) ||
      (invoice.partyName ? invoice.partyName.toLowerCase().includes(search.toLowerCase()) : false);
      
    // Filter by status
    const statusMatch = status === "all" || invoice.status === status;
    
    // Filter by closed/open status
    // When "showClosed" is true, show only closed invoices
    // When "showClosed" is false, show only open (non-closed) invoices
    const closedMatch = showClosed ? invoice.isClosed === true : invoice.isClosed === false;
    
    return searchMatch && statusMatch && closedMatch;
  });
  
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'number' ? amount : Number(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Invoices</h1>
          <p className="text-neutral-600">Manage your sales invoices</p>
        </div>
        <Button 
          onClick={() => setIsInvoiceFormOpen(true)}
          className="flex items-center"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Add New Note</span>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-5">
          <CardTitle className="text-lg font-semibold">All Invoices</CardTitle>
          <div className="flex space-x-2">
            <div className="relative w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search invoices..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              defaultValue={status}
              onValueChange={(value) => setStatus(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2 border px-3 py-2 rounded-md">
              <Switch 
                id="show-closed" 
                checked={showClosed} 
                onCheckedChange={(value) => {
                  setShowClosed(value);
                  refetch(); // Re-fetch data when toggle changes
                }} 
              />
              <Label htmlFor="show-closed" className="cursor-pointer text-sm">
                Show Closed Bills
              </Label>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-50">
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Sub Total</TableHead>
                  <TableHead>Brokerage in INR</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.partyName || '-'}</TableCell>
                    <TableCell>{invoice.buyerName || '-'}</TableCell>
                    <TableCell>{invoice.invoiceNo || '-'}</TableCell>
                    <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{invoice.currency === 'INR' ? '₹ ' : (invoice.currency ? `${invoice.currency} ` : '')}{Number(invoice.subtotal || 0).toFixed(2)}</TableCell>
                    <TableCell>₹ {Math.round(Number(invoice.brokerageInINR || 0))}</TableCell>
                    <TableCell>
                      {invoice.status === 'pending' && invoice.daysOverdue 
                        ? `${invoice.daysOverdue} days` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status as any} />
                    </TableCell>
                    <TableCell>
                      {invoice.isClosed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handlePrint(invoice)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={async () => {
                              console.log("Fetching complete invoice data for editing");
                              try {
                                // Fetch complete invoice data with items
                                const res = await apiRequest("GET", `/api/invoices/${invoice.id}`);
                                const completeInvoice = await res.json();
                                console.log("Complete invoice data:", completeInvoice);
                                setEditingInvoice(completeInvoice);
                                setIsInvoiceFormOpen(true);
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to load invoice data for editing",
                                  variant: "destructive"
                                });
                              }
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                              <CheckSquare className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSendReminder(invoice)}
                              disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
                              className={invoice.status === 'paid' || invoice.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <Bell className="mr-2 h-4 w-4" />
                              Send Reminder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateInvoice(invoice)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleCancelInvoice(invoice)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setInvoiceToDelete(invoice);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredInvoices?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-neutral-500">
                      No invoices found matching your filters. Try changing your search or create a new invoice.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredInvoices && filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-200 bg-neutral-50">
              <div className="text-sm text-neutral-600">
                Showing 1-{filteredInvoices.length} of {filteredInvoices.length} invoices
              </div>
              <div className="flex items-center space-x-2">
                <Select defaultValue="10">
                  <SelectTrigger className="w-16">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-1">
                  <Button disabled variant="outline" size="icon" className="h-8 w-8">
                    <span className="sr-only">Previous page</span>
                    <span>←</span>
                  </Button>
                  <Button variant="outline" size="sm" className="bg-primary-500 text-white h-8 min-w-8">
                    1
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <span className="sr-only">Next page</span>
                    <span>→</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Invoice #{invoiceToDelete?.invoiceNo}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (invoiceToDelete) {
                  deleteInvoiceMutation.mutate(invoiceToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteInvoiceMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <InvoiceForm 
        open={isInvoiceFormOpen} 
        onOpenChange={(open) => {
          setIsInvoiceFormOpen(open);
          if (!open) setEditingInvoice(null);
        }}
        invoice={editingInvoice} 
      />
    </>
  );
}
