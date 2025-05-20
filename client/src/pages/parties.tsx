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
        
        return data.hasInvoices;
      }
      return false;
    } catch (error) {
      console.error(`Error checking party ${partyId} has invoices`);
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
          
          const hasInvoices = await checkPartyHasInvoices(party.id);
          invoiceStatus[party.id] = hasInvoices;
        } catch (error) {
          console.error(`Error checking if party ${party.id} has invoices`);
        }
      }
      
      // Update state with all results at once
      setPartiesWithInvoices(invoiceStatus);
    };
    
    checkAllParties();
  }, [parties]);
  
  // Delete party mutation
  const deletePartyMutation = useMutation({
    mutationFn: async (partyId: number) => {
      const response = await apiRequest("DELETE", `/api/parties/${partyId}`);
      if (!response.ok) {
        throw new Error("Failed to delete party");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      toast({
        title: "Party deleted",
        description: "The party has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Unable to delete party.",
        variant: "destructive",
      });
    },
  });
  
  // Function to handle party deletion
  const handleDeleteParty = (party: Party) => {
    setPartyToDelete(party);
    setDeleteDialogOpen(true);
  };
  
  // Function to confirm deletion
  const confirmDelete = () => {
    if (partyToDelete) {
      deletePartyMutation.mutate(partyToDelete.id);
    }
  };
  
  // Filter parties based on search input and filters
  const filteredParties = parties
    ? parties.filter(party => {
        // Apply search filter
        const matchesSearch =
          party.name.toLowerCase().includes(search.toLowerCase()) ||
          party.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
          party.phone.toLowerCase().includes(search.toLowerCase()) ||
          (party.email && party.email.toLowerCase().includes(search.toLowerCase())) ||
          (party.address && party.address.toLowerCase().includes(search.toLowerCase())) ||
          (party.gstin && party.gstin.toLowerCase().includes(search.toLowerCase()));
        
        // Apply status filter
        let matchesStatus = true;
        if (filters.status === "active") {
          matchesStatus = partiesWithInvoices[party.id] || false;
        } else if (filters.status === "inactive") {
          matchesStatus = !partiesWithInvoices[party.id];
        }
        
        return matchesSearch && matchesStatus;
      })
    : [];
  
  // Sort the filtered parties
  const sortedParties = [...filteredParties].sort((a, b) => {
    // Handle different sort fields
    let valA: string | Date = "";
    let valB: string | Date = "";
    
    if (filters.sortBy === "name") {
      valA = a.name;
      valB = b.name;
    } else if (filters.sortBy === "contactPerson") {
      valA = a.contactPerson;
      valB = b.contactPerson;
    } else if (filters.sortBy === "dateAdded") {
      valA = a.createdAt;
      valB = b.createdAt;
    }
    
    // Sort based on sort order
    if (filters.sortOrder === "asc") {
      if (valA < valB) return -1;
      if (valA > valB) return 1;
    } else {
      if (valA > valB) return -1;
      if (valA < valB) return 1;
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
    const maxWidths: Record<number, number> = {};
    
    // First pass: Get the maximum width for each column from headers
    data.headers.forEach((header, index) => {
      maxWidths[index] = header.length;
    });
    
    // Second pass: Check data and update max widths
    data.partyData.forEach(row => {
      Object.keys(row).forEach((key, index) => {
        const cellLength = String(row[key as keyof typeof row]).length;
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
  
  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Party Master</h2>
          <Button onClick={() => {
            setSelectedParty(undefined);
            setOpenPartyForm(true);
          }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Party
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All Parties</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Search parties by name, contact person, or phone..."
                  className="w-full"
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
              <TableHeader>
                <TableRow>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Loading parties...
                    </TableCell>
                  </TableRow>
                ) : sortedParties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No parties found. Add a new party to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedParties.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell className="font-medium">{party.name}</TableCell>
                      <TableCell>{party.contactPerson}</TableCell>
                      <TableCell>{party.phone}</TableCell>
                      <TableCell>{party.email || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link to={`/parties/${party.id}`}>
                            <Button variant="ghost" size="icon" asChild>
                              <div>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </div>
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleEditParty(party)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost" 
                            size="icon"
                            disabled={partiesWithInvoices[party.id]}
                            onClick={() => handleDeleteParty(party)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
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