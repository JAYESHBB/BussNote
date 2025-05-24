import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface AddUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserForm({ open, onOpenChange }: AddUserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    role: "user"
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      username: "",
      fullName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      role: "user"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username || !formData.fullName || !formData.email || !formData.mobile || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🟢 Form: Starting user creation");
      console.log("🟢 Form: Data to send:", formData);
      
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
          role: formData.role,
          status: "active"
        }),
      });

      console.log("🟢 Form: Response status:", response.status);
      console.log("🟢 Form: Response content-type:", response.headers.get("content-type"));

      const responseText = await response.text();
      console.log("🟢 Form: Raw response:", responseText);

      if (!response.ok) {
        throw new Error(responseText || "Failed to create user");
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log("🟢 Form: Parsed result:", result);
      } catch (parseError) {
        console.error("🔴 Form: JSON parse error:", parseError);
        throw new Error("Server returned invalid response");
      }

      // Success
      toast({
        title: "Success",
        description: "User created successfully!",
      });

      // Refresh users list and close dialog
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      resetForm();
      onOpenChange(false);

    } catch (error: any) {
      console.error("🔴 Form: Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <Label htmlFor="mobile">Mobile Number *</Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) => handleInputChange("mobile", e.target.value)}
              placeholder="Enter mobile number"
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              placeholder="Confirm password"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}