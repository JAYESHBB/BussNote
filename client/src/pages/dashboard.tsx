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

  interface DashboardStats {
    totalSales: number;
    outstanding: number;
    totalInvoices: number;
    activeParties: number;
    pendingInvoices: number;
    dateRange: string;
  }
  
  const { data: dashboardStats = {
    totalSales: 0,
    outstanding: 0,
    totalInvoices: 0, 
    activeParties: 0,
    pendingInvoices: 0,
    dateRange: ""
  } } = useQuery<DashboardStats>({
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
  
  const formatDateRange = () => {
    switch(dateRange) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "year":
        return "This Year";
      default:
        return "Current Period";
    }
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
          value={formatCurrency(dashboardStats.totalSales)}
          icon={LineChart}
          iconBgClass="bg-primary-50"
          iconColor="text-primary-500"
          trend={{
            value: formatDateRange(),
            isPositive: true,
          }}
        />
        
        <DashboardCard
          title="Outstanding"
          value={formatCurrency(dashboardStats.outstanding)}
          icon={Bell}
          iconBgClass="bg-destructive-50"
          iconColor="text-destructive"
          trend={{
            value: "Total pending amount",
            isPositive: false,
          }}
        />
        
        <DashboardCard
          title="Active Parties"
          value={dashboardStats.activeParties}
          icon={Users}
          iconBgClass="bg-secondary-50"
          iconColor="text-secondary-500"
          trend={{
            value: formatDateRange(),
            isPositive: true,
          }}
        />
        
        <DashboardCard
          title="Pending Invoices"
          value={dashboardStats.pendingInvoices}
          icon={AlertTriangle}
          iconBgClass="bg-accent-50"
          iconColor="text-accent-500"
          trend={{
            value: formatDateRange(),
            isPositive: false,
          }}
        />
      </div>

      {/* Party Overview, Recent Activities and Recent Invoices sections have been removed as requested */}

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
