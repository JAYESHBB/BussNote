import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface AddUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any; // User to edit (null/undefined for create mode)
}

export function AddUserForm({ open, onOpenChange, user }: AddUserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    mobile: "",
    address: "",
    role: "user"
  });

  const isEditMode = !!user;

  // Populate form with user data in edit mode
  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username || "",
        fullName: user.fullName || user.full_name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        address: user.address || "",
        role: user.role || "user"
      });
    } else if (!user && open) {
      setFormData({
        username: "",
        fullName: "",
        email: "",
        mobile: "",
        address: "",
        role: "user"
      });
    }
  }, [user, open]);

  // Validation states
  const [validations, setValidations] = useState({
    username: { isValid: null as boolean | null, message: "", isChecking: false },
    email: { isValid: null as boolean | null, message: "" },
    mobile: { isValid: null as boolean | null, message: "" }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset validation for the field when user starts typing
    if (field === 'username' || field === 'email' || field === 'mobile') {
      setValidations(prev => ({
        ...prev,
        [field]: { isValid: null, message: "", isChecking: false }
      }));
    }
  };

  // Real-time username availability check
  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim() || username.length < 3) {
      setValidations(prev => ({
        ...prev,
        username: { isValid: false, message: "Username must be at least 3 characters", isChecking: false }
      }));
      return;
    }

    // Skip validation in edit mode for existing username
    if (isEditMode && username === user?.username) {
      setValidations(prev => ({
        ...prev,
        username: { isValid: true, message: "Current username", isChecking: false }
      }));
      return;
    }

    setValidations(prev => ({
      ...prev,
      username: { ...prev.username, isChecking: true }
    }));

    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      setValidations(prev => ({
        ...prev,
        username: {
          isValid: data.available,
          message: data.available ? "Username is available" : "Username already exists",
          isChecking: false
        }
      }));
    } catch (error) {
      setValidations(prev => ({
        ...prev,
        username: { isValid: false, message: "Failed to check username", isChecking: false }
      }));
    }
  };

  // Real-time email availability check
  const checkEmailAvailability = async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidations(prev => ({
        ...prev,
        email: { isValid: false, message: "Please enter a valid email address" }
      }));
      return;
    }

    // Skip validation in edit mode for existing email
    if (isEditMode && email === user?.email) {
      setValidations(prev => ({
        ...prev,
        email: { isValid: true, message: "Current email" }
      }));
      return;
    }

    try {
      const response = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      setValidations(prev => ({
        ...prev,
        email: {
          isValid: data.available,
          message: data.available ? "Email is available" : "Email already exists"
        }
      }));
    } catch (error) {
      setValidations(prev => ({
        ...prev,
        email: { isValid: false, message: "Failed to check email" }
      }));
    }
  };

  // Real-time mobile availability check
  const checkMobileAvailability = async (mobile: string) => {
    const mobileRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!mobileRegex.test(mobile)) {
      setValidations(prev => ({
        ...prev,
        mobile: { isValid: false, message: "Please enter a valid mobile number" }
      }));
      return;
    }

    // Skip validation in edit mode for existing mobile
    if (isEditMode && mobile === user?.mobile) {
      setValidations(prev => ({
        ...prev,
        mobile: { isValid: true, message: "Current mobile number" }
      }));
      return;
    }

    try {
      const response = await fetch(`/api/check-mobile?mobile=${encodeURIComponent(mobile)}`);
      const data = await response.json();
      
      setValidations(prev => ({
        ...prev,
        mobile: {
          isValid: data.available,
          message: data.available ? "Mobile number is available" : "Mobile number already exists"
        }
      }));
    } catch (error) {
      setValidations(prev => ({
        ...prev,
        mobile: { isValid: false, message: "Failed to check mobile number" }
      }));
    }
  };

  // Validation on blur
  const handleBlur = (field: string, value: string) => {
    if (field === 'username' && value.trim()) {
      checkUsernameAvailability(value);
    } else if (field === 'email' && value.trim()) {
      checkEmailAvailability(value);
    } else if (field === 'mobile' && value.trim()) {
      checkMobileAvailability(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.email.trim() || !formData.mobile.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check if validations are passing (only for new users or changed fields)
    const usernameChanged = !isEditMode || formData.username !== user?.username;
    const emailChanged = !isEditMode || formData.email !== user?.email;
    const mobileChanged = !isEditMode || formData.mobile !== user?.mobile;

    if ((usernameChanged && validations.username.isValid !== true) ||
        (emailChanged && validations.email.isValid !== true) ||
        (mobileChanged && validations.mobile.isValid !== true)) {
      toast({
        title: "Validation Error",
        description: "Please fix validation errors before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isEditMode ? `/api/users/${user.id}` : '/api/create-user';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const payload = {
        username: formData.username,
        full_name: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        role: formData.role,
        status: 'active'
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to save user');
      }

      await response.json();

      toast({
        title: "Success",
        description: isEditMode ? "User updated successfully" : "User created successfully. They can now log in and set their password.",
      });

      // Invalidate users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      onOpenChange(false);
      
      // Reset form
      setFormData({
        username: "",
        fullName: "",
        email: "",
        mobile: "",
        address: "",
        role: "user"
      });
      
      setValidations({
        username: { isValid: null, message: "", isChecking: false },
        email: { isValid: null, message: "" },
        mobile: { isValid: null, message: "" }
      });

    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationIcon = (validation: { isValid: boolean | null; isChecking?: boolean }) => {
    if (validation.isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (validation.isValid === true) {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    if (validation.isValid === false) {
      return <X className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit User" : "Add New User"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update user details. Username cannot be changed." 
              : "Create a new user account. The user will set their password during first login."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <div className="relative">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                onBlur={(e) => handleBlur('username', e.target.value)}
                placeholder="Enter username"
                disabled={isEditMode} // Username cannot be changed in edit mode
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getValidationIcon(validations.username)}
              </div>
            </div>
            {validations.username.message && (
              <p className={`text-sm ${validations.username.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validations.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter address (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={(e) => handleBlur('email', e.target.value)}
                placeholder="Enter email address"
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getValidationIcon(validations.email)}
              </div>
            </div>
            {validations.email.message && (
              <p className={`text-sm ${validations.email.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validations.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number *</Label>
            <div className="relative">
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value)}
                onBlur={(e) => handleBlur('mobile', e.target.value)}
                placeholder="Enter mobile number"
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getValidationIcon(validations.mobile)}
              </div>
            </div>
            {validations.mobile.message && (
              <p className={`text-sm ${validations.mobile.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validations.mobile.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update User" : "Create User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}