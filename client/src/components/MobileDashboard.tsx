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
  Edit,
  AlertTriangle
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
      <div className="mb-5">
        <MobileTile 
          icon={FileText} 
          title="New Invoice" 
          bgClass="bg-gradient-to-br from-primary-500 to-primary-700" 
          href="#" 
          onClick={handleNewInvoice}
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
        
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 gap-4">
          {/* Total Sales Card */}
          <Card className="p-4 bg-gradient-to-br from-primary-50 to-white rounded-lg border border-primary-100 shadow-sm">
            {isLoadingStats ? (
              <div className="h-[150px] flex items-center justify-center">
                <LoadingState 
                  type="data" 
                  title="Loading Sales Data"
                  message="Please wait..." 
                  size="sm"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center mr-2 animate-pulse-subtle">
                      <LineChart className="h-4 w-4 text-primary-500" />
                    </div>
                    <h3 className="text-base font-semibold text-neutral-800">Total Sales</h3>
                  </div>
                  <div className="text-xs bg-white px-2 py-1 rounded-full border border-gray-200 text-neutral-600">
                    This Month
                  </div>
                </div>
                
                <div className="text-xl font-bold text-neutral-900 mb-2 animate-fade-in">
                  {formatCurrency(stats?.totalSales || 0)}
                </div>
                
                <div className="space-y-1 mt-2 border-t pt-2">
                  {stats?.salesByCurrency && Object.entries(stats.salesByCurrency || {}).map(([currency, amount], index) => (
                    <div key={currency} className="flex justify-between items-center text-xs animate-slide-in-bottom" style={{ animationDelay: `${index * 0.1}s` }}>
                      <span className="font-medium text-neutral-700">{currency}:</span>
                      <span className="text-neutral-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                  {(!stats?.salesByCurrency || Object.keys(stats?.salesByCurrency || {}).length === 0) && (
                    <div className="text-xs text-neutral-500 italic animate-fade-in">No sales data available</div>
                  )}
                </div>
              </>
            )}
          </Card>
          
          {/* Outstanding Card */}
          <Card className="p-4 bg-gradient-to-br from-destructive-50 to-white rounded-lg border border-destructive-100 shadow-sm">
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
                    <div className="w-8 h-8 rounded-full bg-destructive-50 flex items-center justify-center mr-2 animate-pulse-subtle">
                      <Bell className="h-4 w-4 text-destructive" />
                    </div>
                    <h3 className="text-base font-semibold text-neutral-800">Outstanding</h3>
                  </div>
                  <div className="text-xs bg-white px-2 py-1 rounded-full border border-gray-200 text-neutral-600">
                    This Month
                  </div>
                </div>
                
                <div className="text-xl font-bold text-neutral-900 mb-2 animate-fade-in">
                  {formatCurrency(stats?.outstanding || 0)}
                </div>
                
                <div className="space-y-1 mt-2 border-t pt-2">
                  {stats?.outstandingByCurrency && Object.entries(stats.outstandingByCurrency || {}).map(([currency, amount], index) => (
                    <div key={currency} className="flex justify-between items-center text-xs animate-slide-in-bottom" style={{ animationDelay: `${index * 0.1}s` }}>
                      <span className="font-medium text-neutral-700">{currency}:</span>
                      <span className="text-neutral-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                  {(!stats?.outstandingByCurrency || Object.keys(stats?.outstandingByCurrency || {}).length === 0) && (
                    <div className="text-xs text-neutral-500 italic animate-fade-in">No outstanding data available</div>
                  )}
                </div>
              </>
            )}
          </Card>
          
          {/* Bottom Row Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Active Parties */}
            <Card className="overflow-hidden border border-secondary-100">
              <CardContent className="p-4 relative min-h-[110px]">
                {isLoadingStats ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingState
                      type="data"
                      title="Loading"
                      size="sm"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-neutral-600">Active Parties</h3>
                      <div className="p-1.5 bg-secondary-50 text-secondary-500 rounded-full">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-neutral-800">{stats?.activeParties || 0}</p>
                        <p className="text-xs text-secondary opacity-90">
                          <span className="mr-1">↑</span>
                          <span>This Month</span>
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Pending Invoices */}
            <Card className="overflow-hidden border border-accent-100">
              <CardContent className="p-4 relative min-h-[110px]">
                {isLoadingStats ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingState
                      type="data"
                      title="Loading"
                      size="sm"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-neutral-600">Pending Invoices</h3>
                      <div className="p-1.5 bg-accent-50 text-accent-500 rounded-full">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-neutral-800">{stats?.pendingInvoices || 0}</p>
                        <p className="text-xs text-accent-600 opacity-90">
                          <span className="mr-1">⚠</span>
                          <span>Need Attention</span>
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Recent Notes */}
      <Card className="mb-5 colorful-card">
        <CardHeader className="colorful-header secondary py-3 px-4">
          <CardTitle className="text-base font-semibold">Recent Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingInvoices ? (
            <div className="py-10 flex items-center justify-center">
              <LoadingState 
                type="data" 
                title="Loading Recent Notes"
                message="Please wait..." 
                size="sm"
              />
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-100">
                {recentInvoices?.slice(0, 3).map((invoice, index) => {
                  // Convert status to the expected type
                  const status = invoice.status === "paid" ? "paid" : 
                                invoice.status === "cancelled" ? "cancelled" : 
                                invoice.status === "overdue" ? "overdue" : "pending";
                                
                  return (
                    <div key={invoice.id} className="p-3 flex justify-between items-center animate-slide-in-bottom" style={{ animationDelay: `${index * 0.1}s` }}>
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
                  <div className="p-4 text-center text-neutral-500 text-sm animate-fade-in">
                    No recent invoices
                  </div>
                )}
              </div>
              <div className="p-3 border-t">
                <Button variant="ghost" size="sm" className="w-full text-sm text-primary-600">
                  Manage Notes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      


      {/* App Info */}
      <div className="text-center text-xs text-neutral-400 mt-6 mb-4">
        <p>BussNote v1.0</p>
        <p className="mt-1">© 2023-2025 All Rights Reserved</p>
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
