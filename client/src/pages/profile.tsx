import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, Settings } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile information state with defaults from the user object
  const [profileInfo, setProfileInfo] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    address: user?.address || "",
    mobile: user?.mobile || "",
    company: ""
  });
  
  // Password change state
  const [passwordInfo, setPasswordInfo] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Update profile info when user data loads/changes
  useEffect(() => {
    if (user) {
      setProfileInfo({
        fullName: user.fullName || "",
        email: user.email || "",
        address: user.address || "",
        mobile: user.mobile || "",
        company: ""
      });
    }
  }, [user]);
  
  // Handle input changes for profile form
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle input changes for password form
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save profile information
  const saveProfile = () => {
    // Here we would typically call an API to save the profile
    // For now, just show a success toast
    toast({
      title: "Profile Saved",
      description: "Your profile information has been updated successfully.",
    });
  };
  
  // Change password
  const changePassword = () => {
    // Validate passwords
    if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation password must match.",
        variant: "destructive"
      });
      return;
    }
    
    if (passwordInfo.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    
    // Here we would typically call an API to change the password
    // For now, just show a success toast
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
    });
    
    // Reset password fields
    setPasswordInfo({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };
  
  return (
    <div className="p-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account settings and profile information
          </p>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle>Account Management</CardTitle>
          <CardDescription>
            Update your profile information and manage your account settings
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="profile" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Profile Information
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName"
                      name="fullName"
                      value={profileInfo.fullName}
                      onChange={handleProfileChange}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      value={profileInfo.email}
                      onChange={handleProfileChange}
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address"
                    name="address"
                    value={profileInfo.address}
                    onChange={handleProfileChange}
                    placeholder="Enter your address"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone"
                      name="phone"
                      value={profileInfo.phone}
                      onChange={handleProfileChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input 
                      id="company"
                      name="company"
                      value={profileInfo.company}
                      onChange={handleProfileChange}
                      placeholder="Enter your company name"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button onClick={saveProfile}>
                    Save Profile
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="security">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordInfo.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordInfo.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter your new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordInfo.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm your new password"
                    />
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button onClick={changePassword}>
                      Change Password
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}