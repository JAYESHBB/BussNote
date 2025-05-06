import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Party } from "@shared/schema";

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
  isClosed: z.boolean().default(false),
  remarks: z.string().optional(),
  notes: z.string().optional(),
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
}

export function InvoiceForm({ open, onOpenChange }: InvoiceFormProps) {
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 },
  ]);
  
  const { data: parties } = useQuery<Party[]>({
    queryKey: ["/api/parties"],
  });
  
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyId: "",
      buyerId: "",
      invoiceNo: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDays: 15,
      terms: "Days",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currency: "INR",
      brokerageRate: 0,
      isClosed: false,
      remarks: "",
      notes: "",
    },
  });
  
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
  
  // Update due date when invoice date or due days change
  React.useEffect(() => {
    if (invoiceDate && dueDays !== undefined) {
      const newDueDate = calculateDueDate(invoiceDate, dueDays);
      form.setValue("dueDate", newDueDate);
    }
  }, [invoiceDate, dueDays, form]);
  
  // Force re-render when currency changes to update currency symbols
  const [, forceUpdate] = useState({});
  
  // Watch for currency changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'currency') {
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
    return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  };

  const brokerageRate = form.watch("brokerageRate");

  const calculateBrokerage = () => {
    return calculateSubtotal() * (brokerageRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateBrokerage();
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
      const invoiceData = {
        ...data,
        items: items.map(({ id, ...rest }) => rest), // Remove temporary id
        subtotal: calculateSubtotal(),
        tax: calculateBrokerage(),
        total: calculateTotal(),
      };

      await apiRequest("POST", "/api/invoices", invoiceData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Note created successfully",
      });
      
      onOpenChange(false);
      
      // Reset form
      form.reset();
      setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Note</DialogTitle>
          <DialogDescription>
            Create a new note to track sales between a seller and a buyer. Add items, set dates, and include additional information.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a buyer" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
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
              <Button type="submit">Save Note</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
