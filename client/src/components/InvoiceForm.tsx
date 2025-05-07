import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Party, Invoice } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// Round to 2 decimal places to avoid floating point precision issues
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

const formSchema = z.object({
  partyId: z.string().min(1, "Seller is required"),
  buyerId: z.string().min(1, "Buyer is required"),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDays: z.coerce.number().min(0, "Due days must be a positive number"),
  terms: z.string().min(1, "Terms are required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().min(1, "Currency is required"),
  brokerageRate: z.coerce.number().min(0, "Brokerage rate must be a positive number").default(0),
  exchangeRate: z.coerce.number().min(0.01, "Exchange rate must be greater than 0").default(1.00),
  receivedBrokerage: z.coerce.number().min(0, "Received brokerage cannot be negative").default(0),
  isClosed: z.boolean().default(false),
  remarks: z.string().optional(),
}).refine(data => data.partyId !== data.buyerId, {
  message: "Seller and buyer cannot be the same party",
  path: ["buyerId"], // Show error on buyer field
});

type FormData = z.infer<typeof formSchema>;

// Terms options for dropdown
const termsOptions = [
  "Days",
  "Days Fix",
  "Days D/A",
  "Days B/D",
  "Days A/D"
];

// Currency options for dropdown
const currencyOptions = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "CAD"
];

interface InvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
}

export function InvoiceForm({ open, onOpenChange, invoice }: InvoiceFormProps) {
  console.log("InvoiceForm received invoice:", invoice);
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 },
  ]);
  
  const isEditing = !!invoice;
  console.log("isEditing:", isEditing);
  
  // Fetch invoice items if not included
  const { data: invoiceItems } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoices", invoice?.id, "items"],
    queryFn: async () => {
      if (!isEditing || !invoice?.id) return [];
      const res = await apiRequest("GET", `/api/invoices/${invoice.id}/items`);
      return await res.json();
    },
    enabled: isEditing && invoice?.id !== undefined && !invoice?.items?.length
  });

  // Load items when editing an invoice
  useEffect(() => {
    if (isEditing) {
      if (invoice?.items?.length) {
        // Convert invoice items to the local format with unique IDs
        const formattedItems = invoice.items.map(item => ({
          id: crypto.randomUUID(),
          description: item.description || "",
          quantity: parseFloat(typeof item.quantity === 'string' ? item.quantity : String(item.quantity) || "1"),
          rate: parseFloat(typeof item.rate === 'string' ? item.rate : String(item.rate) || "0")
        }));
        console.log("Loading invoice items from invoice:", formattedItems);
        setItems(formattedItems);
      } else if (invoiceItems && invoiceItems.length > 0) {
        // Use items fetched from separate query
        const formattedItems = invoiceItems.map(item => ({
          id: crypto.randomUUID(),
          description: item.description || "",
          quantity: parseFloat(typeof item.quantity === 'string' ? item.quantity : String(item.quantity) || "1"),
          rate: parseFloat(typeof item.rate === 'string' ? item.rate : String(item.rate) || "0")
        }));
        console.log("Loading invoice items from separate query:", formattedItems);
        setItems(formattedItems);
      }
    }
  }, [isEditing, invoice, invoiceItems]);
  
  const { data: parties } = useQuery<Party[]>({
    queryKey: ["/api/parties"],
  });
  
  const { toast } = useToast();
  
  // Prepare default values based on whether we're editing or creating
  const getDefaultValues = () => {
    // Default values for new invoice
    const newInvoiceDefaults = {
      partyId: "",
      buyerId: "",
      invoiceNo: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDays: 15,
      terms: "Days",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currency: "INR",
      brokerageRate: 0.75, // Default brokerage rate is 0.75%
      exchangeRate: 1.00,
      receivedBrokerage: 0,
      isClosed: false,
      remarks: "",
    };
    
    // If editing an existing invoice, populate with its data
    if (isEditing && invoice) {
      console.log("getDefaultValues for editing, invoice:", invoice);
      
      // Calculate due days based on invoice date and due date
      const invoiceDateObj = new Date(invoice.invoiceDate);
      const dueDateObj = new Date(invoice.dueDate);
      const diffTime = Math.abs(dueDateObj.getTime() - invoiceDateObj.getTime());
      const calculatedDueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 15;
      
      // Ensure all numeric values are rounded properly
      const brokerageRateValue = roundToTwoDecimals(parseFloat(invoice.brokerageRate?.toString() || "0.75"));
      const exchangeRateValue = roundToTwoDecimals(parseFloat(invoice.exchangeRate?.toString() || "1.00"));
      const receivedBrokerageValue = roundToTwoDecimals(parseFloat(invoice.receivedBrokerage?.toString() || "0"));
      
      const remarksOrNotes = invoice.remarks || invoice.notes || "";
      console.log("Remarks/Notes value from invoice:", { remarks: invoice.remarks, notes: invoice.notes, finalValue: remarksOrNotes });
      
      const values = {
        partyId: invoice.partyId?.toString() || "",
        buyerId: invoice.buyerId?.toString() || "",
        invoiceNo: invoice.invoiceNo || invoice.invoiceNumber || "",
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split("T")[0],
        dueDays: invoice.dueDays || calculatedDueDays,
        terms: invoice.terms || "Days",
        dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
        currency: invoice.currency || "INR",
        brokerageRate: brokerageRateValue,
        exchangeRate: exchangeRateValue,
        receivedBrokerage: receivedBrokerageValue,
        isClosed: invoice.isClosed || false,
        remarks: remarksOrNotes,
      };
      
      console.log("Setting form values:", values);
      return values;
    }
    
    return newInvoiceDefaults;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });
  
  // Reset form when invoice changes (for editing) or when opening/closing modal
  useEffect(() => {
    if (isEditing && invoice) {
      console.log("Resetting form with invoice data:", invoice);
      
      // Calculate due days based on invoice date and due date
      const invoiceDateObj = new Date(invoice.invoiceDate);
      const dueDateObj = new Date(invoice.dueDate);
      const diffTime = Math.abs(dueDateObj.getTime() - invoiceDateObj.getTime());
      const calculatedDueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 15;
      
      // Get remarks value, checking both invoice.remarks and invoice.notes
      // Make sure to convert any null values to empty string
      const remarksValue = invoice.remarks !== undefined && invoice.remarks !== null ? invoice.remarks : 
                          (invoice.notes !== undefined && invoice.notes !== null ? invoice.notes : "");
      
      console.log("Remarks/Notes value from invoice:", {
        remarks: invoice.remarks,
        notes: invoice.notes,
        finalValue: remarksValue
      });
      
      // Round all decimal values properly for display
      const brokerageRateValue = roundToTwoDecimals(parseFloat(invoice.brokerageRate?.toString() || "0.75"));
      const exchangeRateValue = roundToTwoDecimals(parseFloat(invoice.exchangeRate?.toString() || "1.00"));
      const receivedBrokerageValue = roundToTwoDecimals(parseFloat(invoice.receivedBrokerage?.toString() || "0"));
      
      // Reset form with updated values from the invoice
      const formValues = {
        partyId: invoice.partyId?.toString() || "",
        buyerId: invoice.buyerId?.toString() || "",
        invoiceNo: invoice.invoiceNo || invoice.invoiceNumber || "",
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split("T")[0],
        dueDays: invoice.dueDays || calculatedDueDays || 15,
        terms: invoice.terms || "Days",
        dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
        currency: invoice.currency || "INR",
        brokerageRate: brokerageRateValue,
        exchangeRate: exchangeRateValue,
        receivedBrokerage: receivedBrokerageValue,
        isClosed: invoice.isClosed || false,
        remarks: remarksValue,
      };
      
      console.log("Setting form values:", formValues);
      form.reset(formValues);
    } else if (!isEditing) {
      // Reset form to defaults when creating a new invoice
      const newInvoiceDefaults = {
        partyId: "",
        buyerId: "",
        invoiceNo: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDays: 15,
        terms: "Days",
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        currency: "INR",
        brokerageRate: 0.75, // Default brokerage rate is 0.75%
        exchangeRate: 1.00,
        receivedBrokerage: 0,
        isClosed: false,
        remarks: "",
      };
      
      // Reset form with default values
      form.reset(newInvoiceDefaults);
      
      // Reset items to a single empty item
      setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 }]);
    }
  }, [isEditing, invoice, form, open]);
  
  // Calculate due date when invoice date or due days change
  const calculateDueDate = (invoiceDate: string, dueDays: number): string => {
    if (!invoiceDate) return "";
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + dueDays);
    return date.toISOString().split("T")[0];
  };
  
  // Watch relevant fields for due date calculation
  const invoiceDate = form.watch("invoiceDate");
  const dueDays = form.watch("dueDays");
  
  // Watch party selections to ensure buyer and seller are different
  const partyId = form.watch("partyId");
  const buyerId = form.watch("buyerId");
  
  // Update due date when invoice date or due days change
  React.useEffect(() => {
    if (invoiceDate && dueDays !== undefined) {
      const newDueDate = calculateDueDate(invoiceDate, dueDays);
      form.setValue("dueDate", newDueDate);
    }
  }, [invoiceDate, dueDays, form]);
  
  // Show warning and clear buyer if same as seller
  React.useEffect(() => {
    if (partyId && buyerId && partyId === buyerId) {
      toast({
        title: "Validation error",
        description: "Seller and buyer cannot be the same party",
        variant: "destructive",
      });
      
      // Clear the buyer field
      form.setValue("buyerId", "");
    }
  }, [partyId, buyerId, toast, form]);
  
  // Force re-render when currency changes to update currency symbols
  const [, forceUpdate] = useState({});
  
  // Watch for currency changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'currency') {
        // Set exchange rate to 1.00 if currency is INR, otherwise leave it as is
        if (value.currency === 'INR') {
          form.setValue('exchangeRate', 1.00);
        }
        forceUpdate({});
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  
  // Get currency symbol based on selected currency
  const getCurrencySymbol = (currency: string): string => {
    switch(currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'AED': return 'د.إ';
      case 'CAD': return 'C$';
      case 'INR':
      default: return '₹';
    }
  };

  const calculateSubtotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    return roundToTwoDecimals(subtotal);
  };

  const brokerageRate = form.watch("brokerageRate");
  const exchangeRate = form.watch("exchangeRate");
  const receivedBrokerage = form.watch("receivedBrokerage");
  const currency = form.watch("currency");

  const calculateBrokerage = () => {
    return roundToTwoDecimals(calculateSubtotal() * (brokerageRate / 100));
  };

  const calculateBrokerageInINR = () => {
    return roundToTwoDecimals(calculateBrokerage() * exchangeRate);
  };

  const calculateBalanceBrokerage = () => {
    return roundToTwoDecimals(calculateBrokerageInINR() - receivedBrokerage);
  };

  const calculateTotal = () => {
    return roundToTwoDecimals(calculateSubtotal() + calculateBrokerage());
  };

  const onSubmit = async (data: FormData) => {
    if (items.some(item => !item.description)) {
      toast({
        title: "Validation error",
        description: "All items must have a description",
        variant: "destructive",
      });
      return;
    }

    try {
      // Separate notes/remarks handling
      const { remarks, ...restData } = data;
      
      // Format items correctly, removing temp id
      const formattedItems = items.map(({ id, ...rest }) => ({
        description: rest.description,
        quantity: rest.quantity.toString(),
        rate: rest.rate.toString()
      }));
      
      // Don't round input values, just convert them to fixed strings for API
      const exchangeRateValue = parseFloat(data.exchangeRate?.toString() || "1.00").toFixed(2);
      const receivedBrokerageValue = parseFloat(data.receivedBrokerage?.toString() || "0").toFixed(2);
      const brokerageRateValue = parseFloat(data.brokerageRate?.toString() || "0").toFixed(2);
      
      // Convert other string values to ensure consistent types
      const partyId = typeof data.partyId === 'string' ? parseInt(data.partyId) : data.partyId;
      const buyerId = typeof data.buyerId === 'string' ? parseInt(data.buyerId) : data.buyerId;
      const dueDays = typeof data.dueDays === 'string' ? parseInt(data.dueDays) : data.dueDays;
      
      // Build the invoice data object
      const invoiceData = {
        // Main fields with correct types
        partyId,
        buyerId,
        invoiceNo: data.invoiceNo,
        dueDays,
        terms: data.terms,
        currency: data.currency,
        isClosed: data.isClosed,
        
        // Explicitly set notes field to remarks value (that's how it's stored in DB)
        notes: remarks || "",
        
        // Include correctly formatted items
        items: formattedItems,
        
        // Format numeric values as strings for API
        subtotal: calculateSubtotal().toString(),
        tax: calculateBrokerage().toString(),
        brokerageRate: brokerageRateValue,
        exchangeRate: exchangeRateValue,
        brokerageInINR: calculateBrokerageInINR().toString(),
        receivedBrokerage: receivedBrokerageValue,
        balanceBrokerage: calculateBalanceBrokerage().toString(),
        total: calculateTotal().toString(),
        
        // Format dates properly
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate
      };
      
      console.log("Submitting invoice data:", invoiceData);

      if (isEditing && invoice) {
        // Update existing invoice
        const response = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, invoiceData);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Update error:", errorData);
          throw new Error(errorData.message || "Failed to update invoice");
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        toast({
          title: "Success",
          description: "Note updated successfully",
        });
      } else {
        // Create new invoice
        const response = await apiRequest("POST", "/api/invoices", invoiceData);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Create error:", errorData);
          throw new Error(errorData.message || "Failed to create invoice");
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        toast({
          title: "Success",
          description: "Note created successfully",
        });
      }
      
      // Close the dialog first
      onOpenChange(false);
      
      // Reset form to default values for a clean state on next open
      const newInvoiceDefaults = {
        partyId: "",
        buyerId: "",
        invoiceNo: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDays: 15,
        terms: "Days",
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        currency: "INR",
        brokerageRate: 0.75, // Default brokerage rate is 0.75%
        exchangeRate: 1.00,
        receivedBrokerage: 0,
        isClosed: false,
        remarks: "",
      };
      
      // Reset form with default values 
      form.reset(newInvoiceDefaults);
      
      // Reset items to a single empty item
      setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 }]);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} note: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Note' : 'Add New Note'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edit this note to update sales details between a seller and a buyer.'
              : 'Create a new note to track sales between a seller and a buyer. Add items, set dates, and include additional information.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="partyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Seller</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a seller" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parties?.map((party) => (
                          <SelectItem key={party.id} value={party.id.toString()}>
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buyerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Buyer</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className={partyId && field.value === partyId ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select a buyer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parties?.map((party) => (
                          <SelectItem 
                            key={party.id} 
                            value={party.id.toString()}
                            disabled={party.id.toString() === partyId}
                          >
                            {party.name}
                            {party.id.toString() === partyId ? " (Same as Seller)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {partyId && field.value === partyId && (
                      <p className="text-xs text-red-500 mt-1">Buyer cannot be the same as Seller</p>
                    )}
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="invoiceNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice No.</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter invoice number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dueDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Days</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="Enter days until due" 
                        {...field} 
                        onChange={(e) => {
                          const value = e.target.value === "" ? "0" : e.target.value;
                          field.onChange(parseInt(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {termsOptions.map((term) => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <FormLabel>Items</FormLabel>
              </div>
              
              {/* Column Headers */}
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-neutral-500">
                <div className="flex-1 pl-3">Description</div>
                <div className="w-20 text-center">Quantity</div>
                <div className="w-24 text-center">Rate</div>
                <div className="w-24 text-right pr-2">Amount</div>
                <div className="w-9"></div> {/* Space for the remove button */}
              </div>
              
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="0.01"
                        step="0.01"
                        value={item.quantity.toString()}
                        onChange={(e) => handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Rate"
                        min="0"
                        step="0.01"
                        value={item.rate.toString()}
                        onChange={(e) => handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-24 text-right">
                      {getCurrencySymbol(form.getValues().currency || 'INR')}{(item.quantity * item.rate).toFixed(2)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleAddItem}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal:</span>
                <span className="font-medium">{getCurrencySymbol(form.getValues().currency || 'INR')}{calculateSubtotal().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <span className="text-neutral-600 mr-2">Brokerage @</span>
                  <FormField
                    control={form.control}
                    name="brokerageRate"
                    render={({ field }) => (
                      <FormItem className="w-20 mb-0">
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="0.01"
                            placeholder="0.00" 
                            className="h-7 px-2 py-1 text-sm"
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value === "" ? "0" : e.target.value;
                              field.onChange(parseFloat(value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span className="text-neutral-600 ml-1">%:</span>
                </div>
                <span className="font-medium">{getCurrencySymbol(form.getValues().currency || 'INR')}{calculateBrokerage().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm mt-2">
                <div className="flex items-center">
                  <span className="text-neutral-600 mr-2">Ex. Rate</span>
                  <FormField
                    control={form.control}
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem className="w-20 mb-0">
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0.01" 
                            step="0.01"
                            placeholder="1.00" 
                            className="h-7 px-2 py-1 text-sm"
                            disabled={currency === 'INR'}
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value === "" ? "1" : e.target.value;
                              field.onChange(parseFloat(value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <span className="font-medium">{currency !== 'INR' ? `1 ${currency} = ₹${exchangeRate.toFixed(2)}` : ''}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-neutral-600">Brokerage in INR:</span>
                <span className="font-medium">₹{calculateBrokerageInINR().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm mt-2">
                <div className="flex items-center">
                  <span className="text-neutral-600 mr-2">Received Brokerage</span>
                  <FormField
                    control={form.control}
                    name="receivedBrokerage"
                    render={({ field }) => (
                      <FormItem className="w-24 mb-0">
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            placeholder="0.00" 
                            className="h-7 px-2 py-1 text-sm"
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value === "" ? "0" : e.target.value;
                              field.onChange(parseFloat(value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <span className="font-medium">₹{receivedBrokerage.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-neutral-600">Balance Brokerage:</span>
                <span className="font-medium">₹{calculateBalanceBrokerage().toFixed(2)}</span>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any specific remarks or additional information..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isClosed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-2">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-semibold">Closed Bill</FormLabel>
                    <FormDescription>
                      Toggle if this bill is already closed
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Note' : 'Save Note'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
