import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { 
  UserPlus, 
  Search, 
  FileText, 
  Eye, 
  Edit,
  Download,
  Filter,
  FileSpreadsheet,
  FileDown,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  DropdownMenuLabel,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PartyForm } from "@/components/PartyForm";
import { Party } from "@shared/schema";

export default function PartiesPage() {
  const [search, setSearch] = useState("");
  const [openPartyForm, setOpenPartyForm] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | undefined>(undefined);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all", // all, active, inactive
    sortBy: "name", // name, contactPerson, dateAdded
    sortOrder: "asc" // asc, desc
  });
  const { toast } = useToast();
  
  // Keep track of which parties have invoices
  const [partiesWithInvoices, setPartiesWithInvoices] = useState<Record<number, boolean>>({});
  
  // Function to check if a party has invoices
  const checkPartyHasInvoices = async (partyId: number) => {
    try {
      const response = await apiRequest("GET", `/api/parties/${partyId}/has-invoices`);
      if (response.ok) {
        const data = await response.json();
        
        // Update state
        setPartiesWithInvoices(prev => ({
          ...prev,
          [partyId]: data.hasInvoices
        }));
        
        console.log(`Party ${partyId} has invoices: ${data.hasInvoices}`);
        return data.hasInvoices;
      }
      return false;
    } catch (error) {
      console.error(`Error checking if party ${partyId} has invoices`);
      return false;
    }
  };
  
  // Query to get parties with loading state
  const { data: parties, isLoading } = useQuery<Party[]>({
    queryKey: ["/api/parties"]
  });
  
  // Use the useEffect hook to fetch invoice relationships
  // when the parties data changes
  useEffect(() => {
    // Only run this effect if we have parties data
    if (!parties || parties.length === 0) return;
    
    // Check each party for invoices
    const checkAllParties = async () => {
      // Create a temporary object to store results
      const invoiceStatus: Record<number, boolean> = {};
      
      // Loop through each party and check if they have invoices
      for (const party of parties) {
        try {
          // Add some delay to prevent overwhelming the server
          if (Object.keys(invoiceStatus).length > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          // Use apiRequest from queryClient to ensure proper handling
          const response = await apiRequest("GET", `/api/parties/${party.id}/has-invoices`);
          
          if (response.ok) {
            const data = await response.json();
            
            // Store the result in our temporary object
            invoiceStatus[party.id] = data.hasInvoices;
            
            // Print clean debug info without empty objects
            console.log(`Party ${party.id} (${party.name}) has invoices: ${data.hasInvoices}`);
          } else {
            // If response is not ok, log the error but don't disable deletion
            console.warn(`Failed to check party ${party.id}, status: ${response.status}`);
            invoiceStatus[party.id] = false;
          }
        } catch (error) {
          // Clean up the error logging to avoid showing empty objects
          console.error(`Error checking party ${party.id}`);
          // If there's an error, default to false to allow deletion
          // The server will block deletion if the party has invoices
          invoiceStatus[party.id] = false;
        }
      }
      
      // After all checks, update state once
      setPartiesWithInvoices(invoiceStatus);
    };
    
    // Execute the function
    checkAllParties();
  }, [parties]);
  
  // Apply filters to parties list
  const filteredParties = parties?.filter((party) => {
    // First apply text search filter
    const matchesSearch = (
      party.name.toLowerCase().includes(search.toLowerCase()) ||
      party.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      party.phone.includes(search) ||
      (party.email && party.email.toLowerCase().includes(search.toLowerCase()))
    );
    
    // Apply status filter if not "all"
    if (filters.status !== "all") {
      // This is a placeholder for actual status logic
      // We would need to add status field to the Party type
      return matchesSearch;
    }
    
    return matchesSearch;
  })?.sort((a, b) => {
    // Sort by the selected field
    if (filters.sortBy === "name") {
      return filters.sortOrder === "asc" 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (filters.sortBy === "contactPerson") {
      return filters.sortOrder === "asc"
        ? a.contactPerson.localeCompare(b.contactPerson)
        : b.contactPerson.localeCompare(a.contactPerson);
    } else if (filters.sortBy === "dateAdded") {
      return filters.sortOrder === "asc"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    
    return 0;
  });
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "₹0";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Function to handle filter changes
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  // Prepare data for all export functions
  const prepareExportData = () => {
    if (!filteredParties || filteredParties.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no parties matching your current filters.",
        variant: "destructive"
      });
      return null;
    }
    
    // Create headers and data for export
    const headers = ["Party Name", "Contact Person", "Phone", "Email", "Address", "GSTIN", "Notes"];
    const partyData = filteredParties.map(party => ({
      "Party Name": party.name,
      "Contact Person": party.contactPerson,
      "Phone": party.phone,
      "Email": party.email || '',
      "Address": party.address || '',
      "GSTIN": party.gstin || '',
      "Notes": party.notes || ''
    }));
    
    return { headers, partyData };
  };
  
  // Function to export party list to CSV
  const exportToCSV = () => {
    const data = prepareExportData();
    if (!data) return;
    
    // Map party data to CSV rows
    const csvRows = [
      data.headers.join(','), // Add headers as first row
      ...data.partyData.map(party => [
        `"${party["Party Name"]}"`, // Use quotes to handle commas in names
        `"${party["Contact Person"]}"`,
        `"${party.Phone}"`,
        `"${party.Email}"`,
        `"${party.Address}"`,
        `"${party.GSTIN}"`,
        `"${party.Notes}"`
      ].join(','))
    ];
    
    // Join rows with newlines to form CSV content
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `party_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download and clean up
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Exported ${data.partyData.length} parties to CSV file.`
    });
  };
  
  // Function to export party list to Excel
  const exportToExcel = () => {
    const data = prepareExportData();
    if (!data) return;
    
    // Create a workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data.partyData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Parties");
    
    // Auto-size columns for better readability
    const maxWidths = {};
    
    // First pass: Get the maximum width for each column from headers
    data.headers.forEach((header, index) => {
      maxWidths[index] = header.length;
    });
    
    // Second pass: Check data and update max widths
    data.partyData.forEach(row => {
      Object.keys(row).forEach((key, index) => {
        const cellLength = String(row[key]).length;
        if (cellLength > maxWidths[index]) {
          maxWidths[index] = cellLength;
        }
      });
    });
    
    // Apply column widths
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[parseInt(key)] + 2 }));
    
    // Generate Excel file
    XLSX.writeFile(workbook, `party_list_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export successful",
      description: `Exported ${data.partyData.length} parties to Excel file.`
    });
  };
  
  // Function to export party list to PDF
  const exportToPDF = () => {
    const data = prepareExportData();
    if (!data) return;
    
    // Create a printable page
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "Export failed",
        description: "Please allow pop-ups to export as PDF.",
        variant: "destructive"
      });
      return;
    }
    
    // Generate HTML content for the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Party List</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              text-align: center;
              color: #333;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            .header-info {
              text-align: right;
              margin-bottom: 20px;
              font-size: 12px;
              color: #666;
            }
            .print-button {
              display: block;
              margin: 20px auto;
              padding: 10px 20px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print(); setTimeout(() => window.close(), 500);">
            Print PDF
          </button>
          
          <h1>Party List</h1>
          
          <div class="header-info">
            <div>Generated: ${new Date().toLocaleString()}</div>
            <div>Total Parties: ${data.partyData.length}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                ${data.headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.partyData.map(party => `
                <tr>
                  <td>${party["Party Name"]}</td>
                  <td>${party["Contact Person"]}</td>
                  <td>${party.Phone}</td>
                  <td>${party.Email}</td>
                  <td>${party.Address}</td>
                  <td>${party.GSTIN}</td>
                  <td>${party.Notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            BussNote - Party Master Report
          </div>
        </body>
      </html>
    `);
    
    // Focus the window
    printWindow.focus();
    
    toast({
      title: "PDF Export prepared",
      description: "Your PDF is ready. Click the 'Print PDF' button in the new window."
    });
  };
  
  const handleEditParty = (party: Party) => {
    setSelectedParty(party);
    setOpenPartyForm(true);
  };
  
  const handleAddNewParty = () => {
    setSelectedParty(undefined);
    setOpenPartyForm(true);
  };
  
  const deletePartyMutation = useMutation({
    mutationFn: async (partyId: number) => {
      const response = await apiRequest("DELETE", `/api/parties/${partyId}`);
      if (!response.ok) {
        // Always use the same error message regardless of actual error
        throw new Error("Unable to Delete Party");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      toast({
        title: "Party deleted",
        description: `${partyToDelete?.name} has been deleted successfully.`,
      });
      setPartyToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to Delete Party",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
    },
  });
  
  const handleDeleteParty = async (party: Party) => {
    try {
      // Use the state data we already have
      if (partiesWithInvoices[party.id]) {
        // Show error message if party has invoices
        toast({
          title: "Unable to Delete Party",
          variant: "destructive"
        });
        return;
      }
      
      // No invoices found, proceed with delete confirmation
      setPartyToDelete(party);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error("Error handling party deletion request");
      toast({
        title: "Unable to Delete Party",
        variant: "destructive"
      });
    }
  };
  
  const confirmDelete = () => {
    if (partyToDelete) {
      deletePartyMutation.mutate(partyToDelete.id);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Party Master</h1>
          <p className="text-neutral-600">Manage your clients and customers</p>
        </div>
        <Button onClick={handleAddNewParty} className="flex items-center">
          <UserPlus className="mr-2 h-4 w-4" />
          <span>Add New Party</span>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-5">
          <CardTitle className="text-lg font-semibold">All Parties</CardTitle>
          <div className="flex space-x-2">
            <div className="relative w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search parties..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setFilterDialogOpen(true)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>CSV Format</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>Excel Format</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  <span>PDF Format</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead>Party Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParties?.map((party) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>{party.contactPerson}</TableCell>
                  <TableCell>{party.phone}</TableCell>
                  <TableCell>{party.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/parties/${party.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4 text-neutral-500" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEditParty(party)}
                      >
                        <Edit className="h-4 w-4 text-neutral-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 relative group"
                        onClick={() => handleDeleteParty(party)}
                        disabled={partiesWithInvoices[party.id] === true}
                        title={partiesWithInvoices[party.id] === true ? "Cannot delete party with associated invoices" : "Delete party"}
                      >
                        <Trash2 className={`h-4 w-4 ${partiesWithInvoices[party.id] === true ? 'text-gray-400' : 'text-red-500'}`} />
                        {partiesWithInvoices[party.id] === true && (
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-white border border-gray-200 rounded shadow-lg text-xs text-gray-700">
                            Party cannot be deleted because it has associated invoices
                          </div>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredParties?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-neutral-500">
                    No parties found. Add your first party to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {filteredParties && filteredParties.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-200 bg-neutral-50">
              <div className="text-sm text-neutral-600">
                Showing 1-{filteredParties.length} of {filteredParties.length} parties
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

      <PartyForm 
        open={openPartyForm} 
        onOpenChange={setOpenPartyForm} 
        party={selectedParty}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this party?</AlertDialogTitle>
            <AlertDialogDescription>
              {partyToDelete && (
                <>
                  You are about to delete <span className="font-semibold">{partyToDelete.name}</span>. 
                  This action cannot be undone if the party has no related invoices or transactions.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Parties</DialogTitle>
            <DialogDescription>
              Customize your party list view by applying filters and sorting options.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label>Sort By</Label>
              <RadioGroup 
                value={filters.sortBy} 
                onValueChange={(value) => updateFilters({ sortBy: value })}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="name" id="sort-name" />
                  <Label htmlFor="sort-name">Party Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contactPerson" id="sort-contact" />
                  <Label htmlFor="sort-contact">Contact Person</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dateAdded" id="sort-date" />
                  <Label htmlFor="sort-date">Date Added</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <RadioGroup 
                value={filters.sortOrder} 
                onValueChange={(value) => updateFilters({ sortOrder: value })}
                className="flex flex-row space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="asc" id="order-asc" />
                  <Label htmlFor="order-asc">Ascending</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="desc" id="order-desc" />
                  <Label htmlFor="order-desc">Descending</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup 
                value={filters.status} 
                onValueChange={(value) => updateFilters({ status: value })}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="status-all" />
                  <Label htmlFor="status-all">All Parties</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="status-active" />
                  <Label htmlFor="status-active">Active Parties</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="status-inactive" />
                  <Label htmlFor="status-inactive">Inactive Parties</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setFilters({
                status: "all",
                sortBy: "name",
                sortOrder: "asc"
              });
            }}>
              Reset Filters
            </Button>
            <Button onClick={() => setFilterDialogOpen(false)}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
