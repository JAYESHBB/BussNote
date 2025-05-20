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
import { LoadingState } from "@/components/ui/loading-state";
import { 
  DataAnalyticsIllustration, 
  LoadingDataIllustration,
  ProcessingIllustration
} from "@/components/illustrations/animated-illustrations";
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
    salesByCurrency: Record<string, number>;
    outstanding: number;
    outstandingByCurrency: Record<string, number>;
    totalInvoices: number;
    activeParties: number;
    pendingInvoices: number;
    dateRange: string;
  }
  
  const { data: dashboardStats = {
    totalSales: 0,
    salesByCurrency: {},
    outstanding: 0,
    outstandingByCurrency: {},
    totalInvoices: 0, 
    activeParties: 0,
    pendingInvoices: 0,
    dateRange: ""
  }, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", dateRange],
  });

  const { data: recentInvoices, isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/recent"],
  });

  const { data: parties, isLoading: isLoadingParties } = useQuery<Party[]>({
    queryKey: ["/api/parties"],
  });

  const { data: activities, isLoading: isLoadingActivities } = useQuery<Activity[]>({
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
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 2,
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
          isLoadingStats={isLoadingStats}
          isLoadingInvoices={isLoadingInvoices}
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
        <Card className="p-4 bg-gradient-to-br from-primary-50 to-white rounded-lg border border-primary-100 shadow-sm">
          {isLoadingStats ? (
            <div className="h-[180px] flex items-center justify-center">
              <LoadingState 
                type="data" 
                title="Loading Sales Data"
                message="Please wait..." 
                size="md"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center mr-3 animate-pulse-subtle">
                    <LineChart className="h-5 w-5 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800">Total Sales</h3>
                </div>
                <div className="text-xs bg-white px-2 py-1 rounded-full border border-gray-200 text-neutral-600">
                  {formatDateRange()}
                </div>
              </div>
              
              <div className="text-2xl font-bold text-neutral-900 mb-2 animate-fade-in">
                {formatCurrency(dashboardStats.totalSales)}
              </div>
              
              <div className="space-y-1 mt-3 border-t pt-2">
                {dashboardStats.salesByCurrency && Object.entries(dashboardStats.salesByCurrency || {}).map(([currency, amount], index) => (
                  <div key={currency} className="flex justify-between items-center text-sm animate-slide-in-bottom" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="font-medium text-neutral-700">{currency}:</span>
                    <span className="text-neutral-900">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
                {(!dashboardStats.salesByCurrency || Object.keys(dashboardStats.salesByCurrency).length === 0) && (
                  <div className="text-sm text-neutral-500 italic animate-fade-in">No sales data available</div>
                )}
              </div>
            </>
          )}
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-destructive-50 to-white rounded-lg border border-destructive-100 shadow-sm min-h-[180px]">
          {isLoadingStats ? (
            <div className="h-[150px] flex items-center justify-center">
              <LoadingState 
                type="data" 
                title="Loading Outstanding Data"
                message="Please wait..." 
                size="sm"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-destructive-50 flex items-center justify-center mr-3 animate-pulse-subtle">
                    <Bell className="h-5 w-5 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800">Outstanding</h3>
                </div>
                <div className="text-xs bg-white px-2 py-1 rounded-full border border-gray-200 text-neutral-600">
                  {formatDateRange()}
                </div>
              </div>
              
              <div className="text-2xl font-bold text-neutral-900 mb-2 animate-fade-in">
                {formatCurrency(dashboardStats.outstanding)}
              </div>
              
              <div className="space-y-1 mt-3 border-t pt-2">
                {dashboardStats.outstandingByCurrency && Object.entries(dashboardStats.outstandingByCurrency || {}).map(([currency, amount], index) => (
                  <div key={currency} className="flex justify-between items-center text-sm animate-slide-in-bottom" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="font-medium text-neutral-700">{currency}:</span>
                    <span className="text-neutral-900">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
                {(!dashboardStats.outstandingByCurrency || Object.keys(dashboardStats.outstandingByCurrency).length === 0) && (
                  <div className="text-sm text-neutral-500 italic animate-fade-in">No outstanding data available</div>
                )}
              </div>
            </>
          )}
        </Card>
        
        <Card className="overflow-hidden card-hover glow-on-hover group">
          <CardContent className="p-5 relative min-h-[150px]">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r from-primary via-secondary to-accent rounded-lg transition-opacity duration-500"></div>
            
            {isLoadingStats ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingState
                  type="data"
                  title="Loading Active Parties"
                  message="Please wait..."
                  size="sm"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-neutral-600 font-medium group-hover:text-primary transition-colors duration-300">Active Parties</h3>
                  <div className="p-2 bg-secondary-50 text-secondary-500 rounded-full transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="transition-all duration-300 transform group-hover:translate-y-[-2px]">
                    <p className="text-3xl font-bold text-neutral-800 group-hover:text-primary transition-colors duration-300">{dashboardStats.activeParties}</p>
                    <p className="text-sm flex items-center text-secondary opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="mr-1 transition-transform duration-300 group-hover:transform group-hover:translate-y-[-2px]">
                        ↑
                      </span>
                      <span>{formatDateRange()}</span>
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden card-hover glow-on-hover group">
          <CardContent className="p-5 relative min-h-[150px]">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r from-primary via-secondary to-accent rounded-lg transition-opacity duration-500"></div>
            
            {isLoadingStats ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingState
                  type="data"
                  title="Loading Pending Invoices"
                  message="Please wait..."
                  size="sm"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-neutral-600 font-medium group-hover:text-primary transition-colors duration-300">Pending Invoices</h3>
                  <div className="p-2 bg-accent-50 text-accent-500 rounded-full transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="transition-all duration-300 transform group-hover:translate-y-[-2px]">
                    <p className="text-3xl font-bold text-neutral-800 group-hover:text-primary transition-colors duration-300">{dashboardStats.pendingInvoices}</p>
                    <p className="text-sm flex items-center text-destructive opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="mr-1 transition-transform duration-300 group-hover:transform group-hover:translate-y-[2px]">
                        ↓
                      </span>
                      <span>{formatDateRange()}</span>
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
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
                  Invoice #{selectedInvoice.invoiceNo} | 
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
