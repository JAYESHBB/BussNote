import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Save, RotateCw, DatabaseBackup, Server, Mail } from "lucide-react";

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "BussNote",
    contactEmail: "support@bussnote.com",
    defaultCurrency: "INR",
    dateFormat: "DD/MM/YYYY",
    autoLogout: "30",
    enableNotifications: true
  });

  // Backup settings
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: "daily",
    backupRetention: "30",
    backupLocation: "local",
    lastBackup: "2025-05-20T08:30:00Z"
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtpServer: "smtp.example.com",
    smtpPort: "587",
    smtpUsername: "notifications@bussnote.com",
    smtpPassword: "********",
    senderName: "BussNote Notifications",
    senderEmail: "notifications@bussnote.com",
    enableSSL: true
  });

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setGeneralSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBackupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setBackupSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleBackupSelectChange = (name: string, value: string) => {
    setBackupSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setEmailSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const saveGeneralSettings = () => {
    // Here we would normally save to an API
    toast({
      title: "Settings Saved",
      description: "General settings have been updated successfully.",
    });
  };

  const saveBackupSettings = () => {
    toast({
      title: "Backup Settings Saved",
      description: "Backup settings have been updated successfully.",
    });
  };

  const saveEmailSettings = () => {
    toast({
      title: "Email Settings Saved",
      description: "Email settings have been updated successfully.",
    });
  };

  const runManualBackup = () => {
    toast({
      title: "Backup Started",
      description: "Manual backup process has been initiated.",
    });
    
    // Simulate backup process
    setTimeout(() => {
      toast({
        title: "Backup Completed",
        description: "Database backup completed successfully.",
      });
      
      setBackupSettings(prev => ({
        ...prev,
        lastBackup: new Date().toISOString()
      }));
    }, 3000);
  };

  const testEmailSettings = () => {
    toast({
      title: "Testing Email Settings",
      description: "Sending a test email...",
    });
    
    // Simulate email test
    setTimeout(() => {
      toast({
        title: "Test Email Sent",
        description: "A test email has been sent successfully.",
      });
    }, 2000);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Configure application settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic application configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName"
                    name="companyName"
                    value={generalSettings.companyName}
                    onChange={handleGeneralChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input 
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={generalSettings.contactEmail}
                    onChange={handleGeneralChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select 
                    value={generalSettings.defaultCurrency} 
                    onValueChange={(value) => handleSelectChange("defaultCurrency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select 
                    value={generalSettings.dateFormat} 
                    onValueChange={(value) => handleSelectChange("dateFormat", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="autoLogout">Auto Logout (minutes)</Label>
                  <Input 
                    id="autoLogout"
                    name="autoLogout"
                    type="number"
                    value={generalSettings.autoLogout}
                    onChange={handleGeneralChange}
                  />
                </div>
                
                <div className="flex items-center justify-between space-y-0 pt-5">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableNotifications">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show system notifications for important events
                    </p>
                  </div>
                  <Switch 
                    id="enableNotifications"
                    name="enableNotifications"
                    checked={generalSettings.enableNotifications}
                    onCheckedChange={(checked) => 
                      setGeneralSettings(prev => ({ ...prev, enableNotifications: checked }))
                    }
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={saveGeneralSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="backup" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>Configure database backup settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium">Last Backup</h3>
                  <p className="text-sm text-muted-foreground">
                    {backupSettings.lastBackup 
                      ? new Date(backupSettings.lastBackup).toLocaleString() 
                      : "No recent backup"}
                  </p>
                </div>
                <Button variant="outline" onClick={runManualBackup}>
                  <DatabaseBackup className="h-4 w-4 mr-2" />
                  Run Backup Now
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoBackup">Automatic Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Schedule regular backups of your database
                    </p>
                  </div>
                  <Switch 
                    id="autoBackup"
                    name="autoBackup"
                    checked={backupSettings.autoBackup}
                    onCheckedChange={(checked) => 
                      setBackupSettings(prev => ({ ...prev, autoBackup: checked }))
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select 
                    value={backupSettings.backupFrequency} 
                    onValueChange={(value) => handleBackupSelectChange("backupFrequency", value)}
                    disabled={!backupSettings.autoBackup}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backupRetention">Retention Period (days)</Label>
                  <Input 
                    id="backupRetention"
                    name="backupRetention"
                    type="number"
                    value={backupSettings.backupRetention}
                    onChange={handleBackupChange}
                    disabled={!backupSettings.autoBackup}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backupLocation">Backup Storage Location</Label>
                  <Select 
                    value={backupSettings.backupLocation} 
                    onValueChange={(value) => handleBackupSelectChange("backupLocation", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={saveBackupSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Backup Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>Configure email server for notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                  <p className="text-sm text-yellow-700">
                    These settings are required for sending email notifications. Please ensure the SMTP details are correct.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtpServer">SMTP Server</Label>
                  <Input 
                    id="smtpServer"
                    name="smtpServer"
                    value={emailSettings.smtpServer}
                    onChange={handleEmailChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input 
                    id="smtpPort"
                    name="smtpPort"
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={handleEmailChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input 
                    id="smtpUsername"
                    name="smtpUsername"
                    value={emailSettings.smtpUsername}
                    onChange={handleEmailChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input 
                    id="smtpPassword"
                    name="smtpPassword"
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={handleEmailChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input 
                    id="senderName"
                    name="senderName"
                    value={emailSettings.senderName}
                    onChange={handleEmailChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Sender Email</Label>
                  <Input 
                    id="senderEmail"
                    name="senderEmail"
                    type="email"
                    value={emailSettings.senderEmail}
                    onChange={handleEmailChange}
                  />
                </div>
                
                <div className="flex items-center justify-between space-y-0 col-span-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableSSL">Enable SSL/TLS</Label>
                    <p className="text-sm text-muted-foreground">
                      Use secure connection for SMTP server
                    </p>
                  </div>
                  <Switch 
                    id="enableSSL"
                    name="enableSSL"
                    checked={emailSettings.enableSSL}
                    onCheckedChange={(checked) => 
                      setEmailSettings(prev => ({ ...prev, enableSSL: checked }))
                    }
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={testEmailSettings}>
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email Settings
                </Button>
                <Button onClick={saveEmailSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Email Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}