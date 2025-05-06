import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  LineChart, 
  Bell, 
  Users, 
  AlertTriangle,
  FileText,
  CheckSquare,
  BarChart,
  UserPlus,
  MessageSquare,
  Edit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityItem } from "@/components/ActivityItem";
import { InvoiceForm } from "@/components/InvoiceForm";
import { MobileDashboard } from "@/components/MobileDashboard";
import { useMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Invoice, Party, Activity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("today");
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [noteText, setNoteText] = useState("");
  const isMobile = useMobile();
  const { toast } = useToast();

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats", dateRange],
  });

  const { data: recentInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/recent"],
  });

  const { data: parties } = useQuery<Party[]>({
    queryKey: ["/api/parties"],
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });
  
  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number, notes: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}/notes`, { notes });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      
      // Show success message
      toast({
        title: "Notes updated",
        description: "Invoice notes have been updated successfully",
        variant: "default",
      });
      
      // Close dialog and reset state
      handleCloseNoteDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update notes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusFromInvoice = (invoice: Invoice) => {
    if (invoice.status === "paid") return "paid";
    if (invoice.status === "cancelled") return "cancelled";
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    
    if (dueDate < today) {
      return "overdue";
    }
    
    return "pending";
  };
  
  const handleOpenNoteDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setNoteText(invoice.notes || "");
    setIsNoteDialogOpen(true);
  };
  
  const handleCloseNoteDialog = () => {
    setIsNoteDialogOpen(false);
    setSelectedInvoice(null);
    setNoteText("");
  };
  
  const handleSaveNote = () => {
    if (!selectedInvoice) return;
    
    updateNotesMutation.mutate({
      id: selectedInvoice.id,
      notes: noteText
    });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // If mobile, render the mobile dashboard instead
  if (isMobile) {
    return (
      <>
        <MobileDashboard 
          recentInvoices={recentInvoices} 
          stats={dashboardStats}
          handleNewInvoice={() => setIsInvoiceFormOpen(true)}
        />
        <InvoiceForm open={isInvoiceFormOpen} onOpenChange={setIsInvoiceFormOpen} />
      </>
    );
  }
  
  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
            <p className="text-neutral-600">Welcome back. Here's what's happening today.</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Select defaultValue={dateRange} onValueChange={(value) => setDateRange(value)}>
              <SelectTrigger className="w-[180px] bg-white border border-neutral-200">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => setIsInvoiceFormOpen(true)}
              className="flex items-center"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>New Invoice</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard
          title="Total Sales"
          value={formatCurrency(dashboardStats?.totalSales || 27500)}
          icon={LineChart}
          iconBgClass="bg-primary-50"
          iconColor="text-primary-500"
          trend={{
            value: "12% from last month",
            isPositive: true,
          }}
        />
        
        <DashboardCard
          title="Outstanding"
          value={formatCurrency(dashboardStats?.outstanding || 12450)}
          icon={Bell}
          iconBgClass="bg-destructive-50"
          iconColor="text-destructive"
          trend={{
            value: "8% from last month",
            isPositive: false,
          }}
        />
        
        <DashboardCard
          title="Active Parties"
          value={dashboardStats?.activeParties || 32}
          icon={Users}
          iconBgClass="bg-secondary-50"
          iconColor="text-secondary-500"
          trend={{
            value: "3 new this month",
            isPositive: true,
          }}
        />
        
        <DashboardCard
          title="Pending Invoices"
          value={dashboardStats?.pendingInvoices || 7}
          icon={AlertTriangle}
          iconBgClass="bg-accent-50"
          iconColor="text-accent-500"
          trend={{
            value: "Due in next 7 days",
            isPositive: true,
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 colorful-card">
          <CardHeader className="colorful-header secondary flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
            <Link href="/invoices">
              <a className="text-white text-sm font-medium hover:text-white/90 flex items-center">
                View All
              </a>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-neutral-50">
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">#{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyName}</TableCell>
                    <TableCell>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={getStatusFromInvoice(invoice)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleOpenNoteDialog(invoice)}
                          title="Add/Edit Notes"
                        >
                          <MessageSquare className="h-4 w-4 text-primary-500" />
                        </Button>
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4 text-neutral-500" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="colorful-card">
          <CardHeader className="colorful-header accent">
            <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activities?.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  icon={
                    activity.type === "invoice_created" ? FileText :
                    activity.type === "payment_received" ? CheckSquare :
                    activity.type === "party_added" ? UserPlus :
                    activity.type === "payment_reminder" ? Bell :
                    BarChart
                  }
                  iconBgClass={
                    activity.type === "invoice_created" ? "bg-primary-50" :
                    activity.type === "payment_received" ? "bg-secondary-50" :
                    activity.type === "party_added" ? "bg-accent-50" :
                    activity.type === "payment_reminder" ? "bg-accent-50" :
                    "bg-primary-50"
                  }
                  iconColor={
                    activity.type === "invoice_created" ? "text-primary-500" :
                    activity.type === "payment_received" ? "text-secondary-500" :
                    activity.type === "party_added" ? "text-accent-500" :
                    activity.type === "payment_reminder" ? "text-accent-500" :
                    "text-primary-500"
                  }
                  title={activity.title}
                  description={activity.description}
                  timestamp={activity.timestamp}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 colorful-card">
        <CardHeader className="colorful-header flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Party Overview</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white">
              Export
            </Button>
            <Link href="/parties/new">
              <Button size="sm" className="bg-white text-primary-500 hover:bg-white/90 hover:text-primary-600">
                Add New Party
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead>Party Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Last Transaction</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parties?.slice(0, 5).map((party) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>{party.contactPerson}</TableCell>
                  <TableCell>{party.phone}</TableCell>
                  <TableCell>{formatCurrency(party.outstanding || 0)}</TableCell>
                  <TableCell>
                    {party.lastTransactionDate 
                      ? format(new Date(party.lastTransactionDate), "MMM dd, yyyy")
                      : "No transactions"
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/invoices/new?partyId=${party.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FileText className="h-4 w-4 text-primary-500" />
                        </Button>
                      </Link>
                      <Link href={`/parties/${party.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Users className="h-4 w-4 text-neutral-500" />
                        </Button>
                      </Link>
                      <Link href={`/parties/${party.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Users className="h-4 w-4 text-neutral-500" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between p-4 border-t border-neutral-200 bg-neutral-50">
            <div className="text-sm text-neutral-600">
              Showing 1-{Math.min(parties?.length || 0, 5)} of {parties?.length || 0} parties
            </div>
            <div className="flex items-center space-x-1">
              <Button disabled variant="outline" size="icon" className="h-8 w-8">
                <span className="sr-only">Previous page</span>
                <span>←</span>
              </Button>
              <Button variant="outline" size="sm" className="bg-primary-500 text-white h-8 min-w-8">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 min-w-8">
                2
              </Button>
              <Button variant="outline" size="sm" className="h-8 min-w-8">
                3
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <span className="sr-only">Next page</span>
                <span>→</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <InvoiceForm open={isInvoiceFormOpen} onOpenChange={setIsInvoiceFormOpen} />
      
      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add/Edit Notes</DialogTitle>
            <DialogDescription>
              {selectedInvoice && (
                <span className="text-sm text-neutral-600">
                  Invoice #{selectedInvoice.invoiceNumber} | 
                  {selectedInvoice.partyName} | 
                  {formatCurrency(selectedInvoice.total)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter notes here..."
              className="min-h-32"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={handleCloseNoteDialog}
              disabled={updateNotesMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNote}
              disabled={updateNotesMutation.isPending}
            >
              {updateNotesMutation.isPending ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
