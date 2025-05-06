import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Trash2,
  ChevronLeft,
  FileCog
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { PartyForm } from "@/components/PartyForm";
import { InvoiceForm } from "@/components/InvoiceForm";
import { Party, Invoice } from "@shared/schema";

export default function PartyDetailsPage() {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [, params] = useRoute("/parties/:id");
  const partyId = params?.id;
  
  const { data: party } = useQuery<Party>({
    queryKey: [`/api/parties/${partyId}`],
  });
  
  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: [`/api/parties/${partyId}/invoices`],
  });
  
  const { data: transactions } = useQuery<any[]>({
    queryKey: [`/api/parties/${partyId}/transactions`],
  });
  
  if (!party) {
    return <div className="flex justify-center items-center h-64">Loading party details...</div>;
  }
  
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
        <Link href="/parties">
          <Button variant="ghost" className="mb-4 hover:bg-neutral-100 -ml-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Parties
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">{party.name}</h1>
            <p className="text-neutral-600">{party.contactPerson}</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditFormOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Party
            </Button>
            <Button 
              onClick={() => setIsInvoiceFormOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="font-medium">{party.phone}</p>
                <p className="text-sm text-neutral-500">Phone</p>
              </div>
            </div>
            
            {party.email && (
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-neutral-500 mt-0.5" />
                <div>
                  <p className="font-medium">{party.email}</p>
                  <p className="text-sm text-neutral-500">Email</p>
                </div>
              </div>
            )}
            
            {party.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-neutral-500 mt-0.5" />
                <div>
                  <p className="font-medium">{party.address}</p>
                  <p className="text-sm text-neutral-500">Address</p>
                </div>
              </div>
            )}
            
            {party.gstin && (
              <div className="flex items-start space-x-3">
                <FileCog className="h-5 w-5 text-neutral-500 mt-0.5" />
                <div>
                  <p className="font-medium">{party.gstin}</p>
                  <p className="text-sm text-neutral-500">GSTIN</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-500">Outstanding Amount</p>
              <p className="text-2xl font-bold text-neutral-800">
                {formatCurrency(party.outstanding || 0)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500">Total Invoices</p>
                <p className="text-xl font-semibold text-neutral-800">
                  {invoices?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Last Transaction</p>
                <p className="text-xl font-semibold text-neutral-800">
                  {party.lastTransactionDate 
                    ? format(new Date(party.lastTransactionDate), "MMM dd, yyyy")
                    : "No transactions"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {party.notes 
              ? <p className="text-neutral-700">{party.notes}</p>
              : <p className="text-neutral-500 italic">No notes added</p>
            }
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="py-5">
              <CardTitle className="text-lg font-semibold">Invoice History</CardTitle>
              <CardDescription>
                All invoices generated for {party.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">#{invoice.invoiceNumber}</TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status as any} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}

                  {(!invoices || invoices.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                        No invoices found for this party
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="py-5">
              <CardTitle className="text-lg font-semibold">Transaction History</CardTitle>
              <CardDescription>
                All payment transactions for {party.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Related Invoice</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">#{transaction.transactionId}</TableCell>
                      <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        {transaction.invoiceNumber 
                          ? <Link href={`/invoices/${transaction.invoiceId}`}>
                              <a className="text-primary hover:underline">
                                #{transaction.invoiceNumber}
                              </a>
                            </Link>
                          : "-"
                        }
                      </TableCell>
                      <TableCell>{transaction.notes || "-"}</TableCell>
                    </TableRow>
                  ))}

                  {(!transactions || transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                        No transactions found for this party
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PartyForm
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        party={party}
      />
      
      <InvoiceForm
        open={isInvoiceFormOpen}
        onOpenChange={setIsInvoiceFormOpen}
      />
    </>
  );
}
