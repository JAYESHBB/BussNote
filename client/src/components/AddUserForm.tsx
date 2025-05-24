import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, AlertCircle } from "lucide-react";

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

  // Validation states
  const [validations, setValidations] = useState({
    username: { isValid: null as boolean | null, message: "", isChecking: false },
    email: { isValid: null as boolean | null, message: "" },
    mobile: { isValid: null as boolean | null, message: "" },
    password: { isValid: null as boolean | null, message: "" },
    confirmPassword: { isValid: null as boolean | null, message: "" }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Trigger real-time validation
    if (field === 'username') {
      validateUsername(value);
    } else if (field === 'email') {
      validateEmail(value);
    } else if (field === 'mobile') {
      validateMobile(value);
    } else if (field === 'password') {
      validatePassword(value);
    } else if (field === 'confirmPassword') {
      validateConfirmPassword(value, formData.password);
    }
  };

  // Real-time username validation with availability check
  const validateUsername = async (username: string) => {
    if (username.length === 0) {
      setValidations(prev => ({
        ...prev,
        username: { isValid: null, message: "", isChecking: false }
      }));
      return;
    }

    if (username.length < 3) {
      setValidations(prev => ({
        ...prev,
        username: { isValid: false, message: "Username must be at least 3 characters", isChecking: false }
      }));
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setValidations(prev => ({
        ...prev,
        username: { isValid: false, message: "Username can only contain letters, numbers, and underscores", isChecking: false }
      }));
      return;
    }

    // Check availability
    setValidations(prev => ({
      ...prev,
      username: { isValid: null, message: "Checking availability...", isChecking: true }
    }));

    try {
      const response = await fetch(`/api/check-username?username=${username}`);
      const data = await response.json();
      
      if (data.available) {
        setValidations(prev => ({
          ...prev,
          username: { isValid: true, message: "Username is available", isChecking: false }
        }));
      } else {
        setValidations(prev => ({
          ...prev,
          username: { isValid: false, message: "Username is already taken", isChecking: false }
        }));
      }
    } catch (error) {
      setValidations(prev => ({
        ...prev,
        username: { isValid: false, message: "Error checking username", isChecking: false }
      }));
    }
  };

  // Email validation with availability check
  const validateEmail = async (email: string) => {
    if (email.length === 0) {
      setValidations(prev => ({
        ...prev,
        email: { isValid: null, message: "" }
      }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidations(prev => ({
        ...prev,
        email: { isValid: false, message: "Please enter a valid email address" }
      }));
      return;
    }

    // Check availability
    try {
      const response = await fetch(`/api/check-email?email=${email}`);
      const data = await response.json();
      
      if (data.available) {
        setValidations(prev => ({
          ...prev,
          email: { isValid: true, message: "Email is available" }
        }));
      } else {
        setValidations(prev => ({
          ...prev,
          email: { isValid: false, message: "Email is already registered" }
        }));
      }
    } catch (error) {
      setValidations(prev => ({
        ...prev,
        email: { isValid: false, message: "Error checking email" }
      }));
    }
  };

  // Mobile validation with availability check
  const validateMobile = async (mobile: string) => {
    if (mobile.length === 0) {
      setValidations(prev => ({
        ...prev,
        mobile: { isValid: null, message: "" }
      }));
      return;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      setValidations(prev => ({
        ...prev,
        mobile: { isValid: false, message: "Please enter a valid 10-digit mobile number" }
      }));
      return;
    }

    // Check availability
    try {
      const response = await fetch(`/api/check-mobile?mobile=${mobile}`);
      const data = await response.json();
      
      console.log('Mobile validation response:', data);
      
      if (data.available) {
        setValidations(prev => ({
          ...prev,
          mobile: { isValid: true, message: "Mobile number is available" }
        }));
      } else {
        setValidations(prev => ({
          ...prev,
          mobile: { isValid: false, message: "Mobile number is already registered" }
        }));
      }
    } catch (error) {
      console.error('Mobile validation error:', error);
      setValidations(prev => ({
        ...prev,
        mobile: { isValid: false, message: "Error checking mobile number" }
      }));
    }
  };

  // Password validation
  const validatePassword = (password: string) => {
    if (password.length === 0) {
      setValidations(prev => ({
        ...prev,
        password: { isValid: null, message: "" }
      }));
      return;
    }

    if (password.length < 8) {
      setValidations(prev => ({
        ...prev,
        password: { isValid: false, message: "Password must be at least 8 characters long" }
      }));
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      setValidations(prev => ({
        ...prev,
        password: { isValid: false, message: "Password must contain uppercase, lowercase, number, and special character" }
      }));
    } else {
      setValidations(prev => ({
        ...prev,
        password: { isValid: true, message: "Strong password" }
      }));
    }
  };

  // Confirm password validation
  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (confirmPassword.length === 0) {
      setValidations(prev => ({
        ...prev,
        confirmPassword: { isValid: null, message: "" }
      }));
      return;
    }

    if (confirmPassword === password) {
      setValidations(prev => ({
        ...prev,
        confirmPassword: { isValid: true, message: "Passwords match" }
      }));
    } else {
      setValidations(prev => ({
        ...prev,
        confirmPassword: { isValid: false, message: "Passwords do not match" }
      }));
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.username &&
      formData.fullName &&
      formData.email &&
      formData.mobile &&
      formData.password &&
      formData.confirmPassword &&
      validations.username.isValid === true &&
      validations.email.isValid === true &&
      validations.mobile.isValid === true &&
      validations.password.isValid === true &&
      validations.confirmPassword.isValid === true
    );
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
            <div className="relative">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter username"
                required
                className={`pr-10 ${
                  validations.username.isValid === true
                    ? "border-green-500 focus:border-green-500"
                    : validations.username.isValid === false
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {validations.username.isChecking ? (
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                ) : validations.username.isValid === true ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : validations.username.isValid === false ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            </div>
            {validations.username.message && (
              <p className={`text-xs mt-1 ${
                validations.username.isValid === true
                  ? "text-green-600"
                  : validations.username.isValid === false
                  ? "text-red-600"
                  : "text-blue-600"
              }`}>
                {validations.username.message}
              </p>
            )}
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
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email"
                required
                className={`pr-10 ${
                  validations.email.isValid === true
                    ? "border-green-500 focus:border-green-500"
                    : validations.email.isValid === false
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {validations.email.isValid === true ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : validations.email.isValid === false ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            </div>
            {validations.email.message && (
              <p className={`text-xs mt-1 ${
                validations.email.isValid === true
                  ? "text-green-600"
                  : "text-red-600"
              }`}>
                {validations.email.message}
              </p>
            )}
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