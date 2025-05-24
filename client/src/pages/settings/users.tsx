import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, UserPlus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { queryClient } from "@/lib/queryClient";

// Function to capitalize each word in a string
function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Mock users for display until API integration
const mockUsers = [
  {
    id: 1,
    username: "admin",
    fullName: "Admin User",
    role: "admin",
    lastLogin: "2025-05-22T10:30:00Z",
    status: "active"
  },
  {
    id: 2,
    username: "user1",
    fullName: "Regular User",
    role: "user",
    lastLogin: "2025-05-20T08:15:00Z",
    status: "active"
  }
];

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("users");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    role: "user"
  });

  // Validation states
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [mobileValid, setMobileValid] = useState<boolean | null>(null);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  // Validation functions
  const validateEmail = (email: string) => {
    const isValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    setEmailValid(isValid);
    return isValid;
  };

  const validateMobile = (mobile: string) => {
    const isValid = /^\+?[0-9\s-]{10,15}$/.test(mobile);
    setMobileValid(isValid);
    return isValid;
  };

  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password)
    };
    
    setPasswordChecks(checks);
    return Object.values(checks).every(check => check);
  };

  const validatePasswordMatch = (password: string, confirmPassword: string) => {
    const match = password === confirmPassword && password.length > 0;
    setPasswordsMatch(match);
    return match;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username.length >= 3) {
      setUsernameChecking(true);
      try {
        const response = await apiRequest('GET', `/api/check-username?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }
  };

  // We'll use this query in the future when the API is ready
  /*
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => fetch("/api/users").then(res => res.json())
  });
  */
  
  // Using mock data until API is ready
  const users = mockUsers;
  const isLoading = false;
  const error = null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'fullName') {
      // Auto capitalize full name
      const capitalizedValue = capitalizeWords(value);
      setNewUser(prev => ({ ...prev, [name]: capitalizedValue }));
    } else if (name === 'email') {
      setNewUser(prev => ({ ...prev, [name]: value }));
      validateEmail(value);
    } else if (name === 'mobile') {
      setNewUser(prev => ({ ...prev, [name]: value }));
      validateMobile(value);
    } else if (name === 'password') {
      setNewUser(prev => ({ ...prev, [name]: value }));
      validatePassword(value);
      // Check password match if confirm password exists
      if (newUser.confirmPassword) {
        validatePasswordMatch(value, newUser.confirmPassword);
      }
    } else if (name === 'confirmPassword') {
      setNewUser(prev => ({ ...prev, [name]: value }));
      validatePasswordMatch(newUser.password, value);
    } else if (name === 'username') {
      setNewUser(prev => ({ ...prev, [name]: value }));
      // Reset username availability when typing
      setUsernameAvailable(null);
    } else {
      setNewUser(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddUser = () => {
    // Comprehensive validation
    if (!newUser.username || !newUser.fullName || !newUser.email || !newUser.mobile || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (usernameAvailable === false) {
      toast({
        title: "Username Error",
        description: "Username is already taken. Please choose another.",
        variant: "destructive"
      });
      return;
    }

    if (emailValid === false) {
      toast({
        title: "Email Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    if (mobileValid === false) {
      toast({
        title: "Mobile Error",
        description: "Please enter a valid mobile number.",
        variant: "destructive"
      });
      return;
    }

    if (!Object.values(passwordChecks).every(check => check)) {
      toast({
        title: "Password Error",
        description: "Password must meet all requirements.",
        variant: "destructive"
      });
      return;
    }

    if (passwordsMatch === false) {
      toast({
        title: "Password Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    // Mock success for now
    toast({
      title: "User Added",
      description: `User ${newUser.username} has been added successfully.`,
      variant: "default"
    });
    
    setIsAddUserOpen(false);
    // Reset form
    setNewUser({
      username: "",
      fullName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      role: "user"
    });
    
    // Reset validation states
    setUsernameAvailable(null);
    setEmailValid(null);
    setMobileValid(null);
    setPasswordChecks({
      length: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false
    });
    setPasswordsMatch(null);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>

      <Tabs defaultValue="users" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Users</CardTitle>
                <CardDescription>Manage user accounts in the system</CardDescription>
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account with specific role and permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Full Name Field */}
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input 
                        id="fullName"
                        name="fullName"
                        placeholder="Enter full name"
                        value={newUser.fullName}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Input 
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter email address"
                          value={newUser.email}
                          onChange={handleInputChange}
                          className="pr-8"
                        />
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
                      {emailValid === false && (
                        <p className="text-xs text-red-500">Please enter a valid email address</p>
                      )}
                    </div>

                    {/* Mobile Field */}
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number *</Label>
                      <div className="relative">
                        <Input 
                          id="mobile"
                          name="mobile"
                          placeholder="Enter mobile number"
                          value={newUser.mobile}
                          onChange={handleInputChange}
                          className="pr-8"
                        />
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
                      {mobileValid === false && (
                        <p className="text-xs text-red-500">Please enter a valid mobile number (10-15 digits)</p>
                      )}
                    </div>

                    {/* Username Field */}
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <div className="relative">
                        <Input 
                          id="username"
                          name="username"
                          placeholder="Choose a unique username"
                          value={newUser.username}
                          onChange={handleInputChange}
                          onBlur={() => checkUsernameAvailability(newUser.username)}
                          className="pr-8"
                        />
                        {usernameChecking && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 rounded-full border-2 border-b-transparent border-primary animate-spin"></div>
                          </div>
                        )}
                        {!usernameChecking && usernameAvailable === false && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {!usernameChecking && usernameAvailable === true && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {!usernameChecking && usernameAvailable === false && (
                        <p className="text-xs text-red-500">This username is already taken. Please choose another.</p>
                      )}
                      {!usernameChecking && usernameAvailable === true && (
                        <p className="text-xs text-green-500">Username is available!</p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input 
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Create a strong password"
                        value={newUser.password}
                        onChange={handleInputChange}
                      />
                      {newUser.password.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Password requirements:</p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className={`flex items-center ${passwordChecks.length ? 'text-green-600' : 'text-red-500'}`}>
                              {passwordChecks.length ? '✓' : '✗'} 8+ characters
                            </div>
                            <div className={`flex items-center ${passwordChecks.hasUppercase ? 'text-green-600' : 'text-red-500'}`}>
                              {passwordChecks.hasUppercase ? '✓' : '✗'} Uppercase
                            </div>
                            <div className={`flex items-center ${passwordChecks.hasLowercase ? 'text-green-600' : 'text-red-500'}`}>
                              {passwordChecks.hasLowercase ? '✓' : '✗'} Lowercase
                            </div>
                            <div className={`flex items-center ${passwordChecks.hasNumber ? 'text-green-600' : 'text-red-500'}`}>
                              {passwordChecks.hasNumber ? '✓' : '✗'} Number
                            </div>
                            <div className={`flex items-center ${passwordChecks.hasSpecial ? 'text-green-600' : 'text-red-500'}`}>
                              {passwordChecks.hasSpecial ? '✓' : '✗'} Special char
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={newUser.confirmPassword}
                          onChange={handleInputChange}
                          className="pr-8"
                        />
                        {newUser.confirmPassword.length > 0 && passwordsMatch === false && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {newUser.confirmPassword.length > 0 && passwordsMatch === true && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {newUser.confirmPassword.length > 0 && passwordsMatch === false && (
                        <p className="text-xs text-red-500">Passwords do not match</p>
                      )}
                      {newUser.confirmPassword.length > 0 && passwordsMatch === true && (
                        <p className="text-xs text-green-500">Passwords match!</p>
                      )}
                    </div>

                    {/* Role Field */}
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddUser}>Add User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-40 text-destructive">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  <p>Failed to load users. Please try again.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {user.role === 'admin' ? 'Administrator' : 'User'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {user.status === 'active' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive mr-1" />
                            )}
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(user.lastLogin).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Edit User">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete User" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Define roles and their access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">Administrator</h3>
                  <p className="text-muted-foreground mb-4">Full access to all system functions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">User Management</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">System Settings</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Party Master</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Note Creation</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Reports</span>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">User</h3>
                  <p className="text-muted-foreground mb-4">Limited access to system functions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                      <span className="text-sm">User Management</span>
                    </div>
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                      <span className="text-sm">System Settings</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Party Master</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Note Creation</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">Reports</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}