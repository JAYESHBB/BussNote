import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceForm } from "@/components/InvoiceForm";
import { Invoice } from "@shared/schema";

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  
  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  
  const filteredInvoices = invoices?.filter((invoice) => {
    // Filter by search
    const searchMatch = 
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (invoice.partyName ? invoice.partyName.toLowerCase().includes(search.toLowerCase()) : false);
      
    // Filter by status
    const statusMatch = status === "all" || invoice.status === status;
    
    return searchMatch && statusMatch;
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
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Buyer Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Brokerage</TableHead>
                  <TableHead>Brokerage in INR</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">#{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyName || '-'}</TableCell>
                    <TableCell>{invoice.buyerName || '-'}</TableCell>
                    <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{invoice.currency || 'INR'}</TableCell>
                    <TableCell>{invoice.subtotal || 0}</TableCell>
                    <TableCell>{invoice.tax || 0}</TableCell>
                    <TableCell>{invoice.brokerageInINR || 0}</TableCell>
                    <TableCell>{invoice.receivedBrokerage || 0}</TableCell>
                    <TableCell>{invoice.balanceBrokerage || 0}</TableCell>
                    <TableCell>{invoice.total || 0}</TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status as any} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
                            <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Cancel Invoice</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredInvoices?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-neutral-500">
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

      <InvoiceForm open={isInvoiceFormOpen} onOpenChange={setIsInvoiceFormOpen} />
    </>
  );
}
