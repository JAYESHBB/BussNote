import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(2, "Party name must be at least 2 characters"),
  contactPerson: z.string().min(2, "Contact person name is required"),
  phone: z.string().regex(/^\+?[0-9\s-]{10,15}$/, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PartyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party?: Party;
}

function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function PartyForm({ open, onOpenChange, party }: PartyFormProps) {
  const { toast } = useToast();
  const isEditing = !!party;
  const [nameChecking, setNameChecking] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [mobileValid, setMobileValid] = useState<boolean | null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [gstinValid, setGstinValid] = useState<boolean | null>(null);
  
  // Function to reset the form and all validation states
  const resetForm = () => {
    form.reset();
    setNameAvailable(null);
    setMobileValid(null);
    setEmailValid(null);
    setGstinValid(null);
    toast({
      title: "Form Reset",
      description: "All form fields have been cleared."
    });
  };
  
  const validateMobile = (mobile: string) => {
    const isValid = /^\+?[0-9\s-]{10,15}$/.test(mobile);
    setMobileValid(isValid);
    return isValid;
  };

  const validateEmail = (email: string) => {
    // Allow empty email
    if (email === "") {
      setEmailValid(null);
      return true;
    }
    const isValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    setEmailValid(isValid);
    return isValid;
  };

  const validateGSTIN = (gstin: string) => {
    // Allow empty GSTIN
    if (gstin === "") {
      setGstinValid(null);
      return true;
    }
    // GSTIN format: 2 digits, 10 alphanumeric, 1 digit, 1 alphanumeric, 1 check digit
    const isValid = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(gstin);
    setGstinValid(isValid);
    return isValid;
  };
    
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: party ? {
      name: party.name,
      contactPerson: party.contactPerson,
      phone: party.phone,
      email: party.email || "",
      address: party.address || "",
      gstin: party.gstin || "",
      notes: party.notes || "",
    } : {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      gstin: "",
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Perform validations before submitting
      if (!isEditing && nameAvailable === false) {
        toast({
          title: "Validation Error",
          description: "This party name already exists. Please choose a different name.",
          variant: "destructive",
        });
        return;
      }

      // Validate mobile number
      if (!validateMobile(data.phone)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid phone number (10-15 digits)",
          variant: "destructive",
        });
        return;
      }

      // Validate email if provided
      if (data.email && !validateEmail(data.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      // Validate GSTIN if provided
      if (data.gstin && !validateGSTIN(data.gstin)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid GSTIN format",
          variant: "destructive",
        });
        return;
      }

      if (isEditing) {
        await apiRequest("PATCH", `/api/parties/${party.id}`, data);
        queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
        queryClient.invalidateQueries({ queryKey: [`/api/parties/${party.id}`] });
        toast({
          title: "Success",
          description: "Party updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/parties", data);
        queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
        toast({
          title: "Success",
          description: "Party created successfully",
        });
      }
      
      onOpenChange(false);
      form.reset();
      
      // Reset validation states
      setNameAvailable(null);
      setMobileValid(null);
      setEmailValid(null);
      setGstinValid(null);
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing ? "Failed to update party" : "Failed to create party",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Party" : "Add New Party"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update party details in your system."
              : "Add a new party to your system for generating invoices."
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Party Name</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        placeholder="Enter business name" 
                        {...field} 
                        value={field.value}
                        onChange={(e) => {
                          // Immediately apply capitalization when typing
                          const value = e.target.value;
                          field.onChange(capitalizeWords(value));
                          // Reset party name availability if editing
                          setNameAvailable(null);
                        }}
                        onBlur={async (e) => {
                          field.onBlur();
                          if (!isEditing) {
                            const value = e.target.value;
                            if (value.length >= 2) {
                              setNameChecking(true);
                              try {
                                const response = await apiRequest('GET', `/api/check-party-name?name=${encodeURIComponent(value)}`);
                                const data = await response.json();
                                setNameAvailable(data.available);
                              } catch (error) {
                                console.error('Error checking party name:', error);
                                setNameAvailable(null);
                              } finally {
                                setNameChecking(false);
                              }
                            }
                          }
                        }}
                      />
                    </FormControl>
                    {nameChecking && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 rounded-full border-2 border-b-transparent border-primary animate-spin"></div>
                      </div>
                    )}
                    {!nameChecking && nameAvailable === false && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {!nameChecking && nameAvailable === true && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                  {!nameChecking && nameAvailable === false && (
                    <p className="text-xs text-red-500 mt-1">This party name already exists. Please choose a different name.</p>
                  )}
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Primary contact" 
                        {...field} 
                        value={field.value}
                        onChange={(e) => {
                          // Immediately apply capitalization when typing
                          const value = e.target.value;
                          field.onChange(capitalizeWords(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          placeholder="+91 9876543210" 
                          {...field} 
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e);
                            validateMobile(e.target.value);
                          }}
                        />
                      </FormControl>
                      {mobileValid === false && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {mobileValid === true && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                    {mobileValid === false && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid phone number (10-15 digits)</p>
                    )}
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          placeholder="contact@example.com" 
                          type="email" 
                          {...field} 
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e);
                            validateEmail(e.target.value);
                          }}
                        />
                      </FormControl>
                      {emailValid === false && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {emailValid === true && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                    {emailValid === false && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                    )}
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN (Optional)</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          placeholder="GST Number" 
                          {...field} 
                          value={field.value}
                          onChange={(e) => {
                            // Keep GSTIN in uppercase
                            const value = e.target.value.toUpperCase();
                            field.onChange(value);
                            validateGSTIN(value);
                          }}
                        />
                      </FormControl>
                      {gstinValid === false && field.value && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {gstinValid === true && field.value && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                    {gstinValid === false && field.value && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid GSTIN format</p>
                    )}
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Business address"
                      className="resize-none"
                      {...field} 
                      value={field.value}
                      onChange={(e) => {
                        // Apply capitalization to address with proper handling for multi-line content
                        const value = e.target.value;
                        const lines = value.split('\n');
                        const capitalizedLines = lines.map(line => {
                          // Only capitalize the first letter of each line
                          return line.charAt(0).toUpperCase() + line.slice(1);
                        });
                        field.onChange(capitalizedLines.join('\n'));
                      }}
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional information"
                      className="resize-none"
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        // Apply capitalization to notes with proper handling for multi-line content
                        const value = e.target.value;
                        const lines = value.split('\n');
                        const capitalizedLines = lines.map(line => {
                          // Only capitalize the first letter of each line
                          return line.charAt(0).toUpperCase() + line.slice(1);
                        });
                        field.onChange(capitalizedLines.join('\n'));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="bg-blue-50 hover:bg-blue-100"
                >
                  Reset Form
                </Button>
              </div>
              <Button type="submit">{isEditing ? "Update Party" : "Add Party"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
