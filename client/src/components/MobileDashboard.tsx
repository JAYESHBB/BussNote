import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MobileTile } from '@/components/MobileTile';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/ui/loading-state';
import {
  Bell,
  Users,
  FileText,
  BarChart2,
  CheckSquare,
  Settings,
  LineChart,
  DollarSign,
  PlusCircle,
  ActivitySquare,
  LogOut,
  MessageSquare,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { Invoice } from '@shared/schema';

interface MobileDashboardProps {
  recentInvoices?: Invoice[];
  stats?: any;
  handleNewInvoice: () => void;
  isLoadingStats?: boolean;
  isLoadingInvoices?: boolean;
}

export function MobileDashboard({ 
  recentInvoices, 
  stats, 
  handleNewInvoice, 
  isLoadingStats = false,
  isLoadingInvoices = false 
}: MobileDashboardProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [noteText, setNoteText] = useState("");
  
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
  
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(numAmount || 0);
  };

  return (
    <div className="px-2 py-4">
      {/* Welcome Banner */}
      <Card className="mb-5 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-none shadow-lg">
        <CardContent className="p-4 flex items-center">
          <Avatar className="h-12 w-12 mr-3 border-2 border-white/30">
            <AvatarFallback className="bg-primary-300 text-primary-800">
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'BN'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-bold">Welcome, {user?.username || 'User'}!</h2>
            <p className="text-sm text-primary-100">Let's get productive today</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <h2 className="text-lg font-bold mb-3 ml-1 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
        Quick Actions
      </h2>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MobileTile 
          icon={FileText} 
          title="New Invoice" 
          bgClass="bg-gradient-to-br from-primary-500 to-primary-700" 
          href="#" 
          onClick={handleNewInvoice}
        />
        <MobileTile 
          icon={Users} 
          title="Add Party" 
          bgClass="bg-gradient-to-br from-secondary-500 to-secondary-700" 
          href="/parties/new" 
        />
        <MobileTile 
          icon={DollarSign} 
          title="Payment" 
          bgClass="bg-gradient-to-br from-accent-500 to-accent-700" 
          href="/transactions/new" 
        />
      </div>
      
      {/* Stats Cards */}
      <div className="mb-5">
        <div className="flex justify-between mb-3">
          <h2 className="text-lg font-bold ml-1 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
            Business Insights
          </h2>
          <Button variant="ghost" size="sm" className="text-xs text-primary-600 -mr-1">
            View All
          </Button>
        </div>
        
        {/* Sales Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="colorful-card overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary-100 rounded-full opacity-30"></div>
            <CardContent className="p-4 relative">
              <LineChart className="h-6 w-6 text-primary-500 mb-2" />
              <p className="text-xs text-neutral-500 mb-1">Total Sales</p>
              <h3 className="text-lg font-bold text-neutral-800">
                {formatCurrency(stats?.totalSales || 0)}
              </h3>
              <div className="text-xs font-medium text-green-600 mt-1">
                ↑ 12% from last month
              </div>
            </CardContent>
          </Card>
          
          <Card className="colorful-card overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-destructive-100 rounded-full opacity-30"></div>
            <CardContent className="p-4 relative">
              <Bell className="h-6 w-6 text-destructive-500 mb-2" />
              <p className="text-xs text-neutral-500 mb-1">Outstanding</p>
              <h3 className="text-lg font-bold text-neutral-800">
                {formatCurrency(stats?.outstanding || 0)}
              </h3>
              <div className="text-xs font-medium text-destructive-600 mt-1">
                ↑ 8% from last month
              </div>
            </CardContent>
          </Card>
          
          <Card className="colorful-card overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-secondary-100 rounded-full opacity-30"></div>
            <CardContent className="p-4 relative">
              <Users className="h-6 w-6 text-secondary-500 mb-2" />
              <p className="text-xs text-neutral-500 mb-1">Active Parties</p>
              <h3 className="text-lg font-bold text-neutral-800">
                {stats?.activeParties || 0}
              </h3>
              <div className="text-xs font-medium text-green-600 mt-1">
                3 new this month
              </div>
            </CardContent>
          </Card>
          
          <Card className="colorful-card overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-accent-100 rounded-full opacity-30"></div>
            <CardContent className="p-4 relative">
              <FileText className="h-6 w-6 text-accent-500 mb-2" />
              <p className="text-xs text-neutral-500 mb-1">Pending Invoices</p>
              <h3 className="text-lg font-bold text-neutral-800">
                {stats?.pendingInvoices || 0}
              </h3>
              <div className="text-xs font-medium text-accent-600 mt-1">
                Due in next 7 days
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Recent Notes */}
      <Card className="mb-5 colorful-card">
        <CardHeader className="colorful-header secondary py-3 px-4">
          <CardTitle className="text-base font-semibold">Recent Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-100">
            {recentInvoices?.slice(0, 3).map((invoice) => {
              // Convert status to the expected type
              const status = invoice.status === "paid" ? "paid" : 
                             invoice.status === "cancelled" ? "cancelled" : 
                             invoice.status === "overdue" ? "overdue" : "pending";
                             
              return (
                <div key={invoice.id} className="p-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">#{invoice.invoiceNo}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{invoice.partyName}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="font-semibold text-sm">
                      {formatCurrency(invoice.total)}
                    </div>
                    <StatusBadge 
                      status={status}
                      className="mt-1 text-xs py-0.5 px-1.5"
                    />
                    <div className="flex mt-1 space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenNoteDialog(invoice);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 text-primary-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {(recentInvoices?.length || 0) === 0 && (
              <div className="p-4 text-center text-neutral-500 text-sm">
                No recent invoices
              </div>
            )}
          </div>
          <div className="p-3 border-t">
            <Button variant="ghost" size="sm" className="w-full text-sm text-primary-600">
              Manage Notes
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Access Menu */}
      <h2 className="text-lg font-bold mb-3 ml-1 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
        Menu
      </h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MobileTile 
          icon={Users} 
          title="Parties" 
          bgClass="bg-white" 
          textClass="text-primary-700"
          className="shadow-md border border-neutral-100"
          href="/parties" 
        />
        <MobileTile 
          icon={MessageSquare} 
          title="Add Note" 
          bgClass="bg-white" 
          textClass="text-primary-700"
          className="shadow-md border border-neutral-100"
          href="/invoices" 
        />
        <MobileTile 
          icon={DollarSign} 
          title="Payments" 
          bgClass="bg-white" 
          textClass="text-primary-700"
          className="shadow-md border border-neutral-100"
          href="/transactions" 
        />
        <MobileTile 
          icon={BarChart2} 
          title="Reports" 
          bgClass="bg-white" 
          textClass="text-primary-700"
          className="shadow-md border border-neutral-100"
          href="/reports" 
        />
        <MobileTile 
          icon={ActivitySquare} 
          title="Activities" 
          bgClass="bg-white" 
          textClass="text-primary-700"
          className="shadow-md border border-neutral-100"
          href="/activities" 
        />
        <MobileTile 
          icon={CheckSquare} 
          title="Closed Bills" 
          bgClass="bg-white" 
          textClass="text-primary-700"
          className="shadow-md border border-neutral-100"
          href="/reports/closed" 
        />
        <MobileTile 
          icon={Settings} 
          title="Settings" 
          bgClass="bg-white" 
          textClass="text-primary-700"
          className="shadow-md border border-neutral-100"
          href="/settings" 
        />
        <MobileTile 
          icon={LogOut} 
          title="Logout" 
          bgClass="bg-white" 
          textClass="text-destructive-500"
          className="shadow-md border border-neutral-100"
          href="#" 
          onClick={() => logoutMutation.mutate()}
        />
      </div>

      {/* App Info */}
      <div className="text-center text-xs text-neutral-400 mt-6 mb-4">
        <p>BussNote v1.0</p>
        <p className="mt-1">© 2023 All Rights Reserved</p>
      </div>
      
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
    </div>
  );
}
