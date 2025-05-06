import { useState } from "react";
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

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

const formSchema = z.object({
  partyId: z.string().min(1, "Party is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "",
    },
  });

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

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18; // 18% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
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
        tax: calculateTax(),
        total: calculateTotal(),
      };

      await apiRequest("POST", "/api/invoices", invoiceData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      
      onOpenChange(false);
      
      // Reset form
      form.reset();
      setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
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
            Create a new note for a party. Add items, set dates, and include additional information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Party</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a party" />
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                        min="1"
                        value={item.quantity.toString()}
                        onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Rate"
                        min="0"
                        value={item.rate.toString()}
                        onChange={(e) => handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-24 text-right">
                      ₹{(item.quantity * item.rate).toFixed(2)}
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
                <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Tax (18%):</span>
                <span className="font-medium">₹{calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Total:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            
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
