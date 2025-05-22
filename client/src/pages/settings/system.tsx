import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getSettings, saveSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Save, DatabaseBackup, Mail, Download, Upload, FileUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // General settings - load from storage or use defaults
  const [generalSettings, setGeneralSettings] = useState<any>(() => {
    return getSettings();
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

  // State for file upload
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  
  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setGeneralSettings((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setGeneralSettings((prev: any) => ({
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
    // Save to localStorage and eventually we can also save to API
    const success = saveSettings(generalSettings);
    
    if (success) {
      toast({
        title: "Settings Saved",
        description: "General settings have been updated successfully.",
      });
    } else {
      toast({
        title: "Error Saving Settings",
        description: "There was a problem saving your settings. Please try again.",
        variant: "destructive"
      });
    }
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

  // Handle file selection for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setRestoreFile(e.target.files[0]);
    }
  };

  // Trigger file input click
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to run manual backup
  const runManualBackup = async () => {
    toast({
      title: "Backup Started",
      description: "Manual backup process has been initiated.",
    });
    
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the last backup time
      setBackupSettings(prev => ({
        ...prev,
        lastBackup: new Date().toISOString()
      }));
      
      toast({
        title: "Backup Completed",
        description: "Database backup has been created successfully.",
      });
      
      // Trigger download of the backup file
      downloadBackupFile();
      
    } catch (error) {
      console.error("Backup error:", error);
      toast({
        title: "Backup Failed",
        description: "There was an error creating the backup. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to download backup file
  const downloadBackupFile = () => {
    try {
      // For now, we'll simulate by creating a JSON file with the current date/time
      // In a real implementation, this would use actual database backup data
      const dataStr = JSON.stringify({
        backup_date: new Date().toISOString(),
        app_name: "BussNote",
        version: "1.0.0",
        data: {
          users: [
            { id: 1, username: "admin", email: "admin@example.com" }
          ],
          parties: [
            { id: 1, name: "ABC Traders", email: "contact@abctraders.com", phone: "+91 9876543210" },
            { id: 2, name: "XYZ Enterprises", email: "info@xyzent.com", phone: "+91 9988776655" }
          ],
          invoices: [
            { id: 1, partyId: 1, invoiceNo: "INV-2025-001", subtotal: 5000, status: "paid" },
            { id: 2, partyId: 2, invoiceNo: "INV-2025-002", subtotal: 7500, status: "pending" }
          ],
          invoice_items: [
            { id: 1, invoiceId: 1, description: "Product A", quantity: 10, rate: 500 },
            { id: 2, invoiceId: 2, description: "Service B", quantity: 5, rate: 1500 }
          ],
          transactions: [
            { id: 1, invoiceId: 1, amount: 5000, date: "2025-05-15T10:30:00Z" }
          ],
          activities: [
            { id: 1, userId: 1, action: "Created invoice", details: "Invoice INV-2025-001", timestamp: "2025-05-10T08:45:00Z" },
            { id: 2, userId: 1, action: "Recorded payment", details: "Invoice INV-2025-001", timestamp: "2025-05-15T10:35:00Z" }
          ]
        }
      }, null, 2);
      
      // Create a blob from the data
      const blob = new Blob([dataStr], { type: "application/json" });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const link = document.createElement("a");
      link.download = `bussnote_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.href = url;
      
      // Append the link to the body
      document.body.appendChild(link);
      
      // Click the link to start download
      link.click();
      
      // Remove the link
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the backup file.",
        variant: "destructive"
      });
    }
  };
  
  // Function to handle restore from backup
  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        title: "No File Selected",
        description: "Please select a backup file to restore from.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if file is JSON
    if (!restoreFile.name.endsWith('.json')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid JSON backup file.",
        variant: "destructive"
      });
      return;
    }
    
    // Close dialog and show toast
    setRestoreDialogOpen(false);
    
    toast({
      title: "Restore Started",
      description: "Restoring data from backup file. Please wait...",
    });
    
    try {
      // Read the file content
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          const backupData = JSON.parse(fileContent);
          
          // In a real implementation, we would send this data to the server
          // For now, we'll simulate a successful restore
          
          // Simulate server processing time
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Simulate a successful restore
          toast({
            title: "Restore Completed",
            description: "Your data has been restored successfully.",
          });
          
          // Clear the file input
          setRestoreFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
        } catch (error) {
          console.error("Parse error:", error);
          toast({
            title: "Restore Failed",
            description: "There was an error parsing the backup file. Please ensure it's a valid BussNote backup.",
            variant: "destructive"
          });
        }
      };
      
      fileReader.onerror = () => {
        toast({
          title: "File Read Error",
          description: "Failed to read the backup file.",
          variant: "destructive"
        });
      };
      
      fileReader.readAsText(restoreFile);
      
    } catch (error) {
      console.error("Restore error:", error);
      toast({
        title: "Restore Failed",
        description: "There was an error restoring your data. Please try again.",
        variant: "destructive"
      });
    }
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
                      setGeneralSettings((prev: any) => ({ ...prev, enableNotifications: checked }))
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
              <CardDescription>Manage your application data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Backup Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Backup</h3>
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg mb-4">
                  <div>
                    <h4 className="text-sm font-medium">Last Backup</h4>
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
                
                <div className="flex justify-end mt-4">
                  <Button onClick={saveBackupSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Backup Settings
                  </Button>
                </div>
              </div>
              
              {/* Restore Section */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-3">Restore</h3>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    Restoring data will replace your current database. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center space-x-4">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange} 
                    accept=".json"
                    className="hidden"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {restoreFile ? restoreFile.name : "No file selected"}
                    </p>
                    {restoreFile && (
                      <p className="text-xs text-muted-foreground">
                        {(restoreFile.size / 1024).toFixed(2)} KB • 
                        {new Date(restoreFile.lastModified).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" onClick={openFileSelector}>
                    <FileUp className="h-4 w-4 mr-2" />
                    Select Backup File
                  </Button>
                  <Button 
                    variant="default" 
                    disabled={!restoreFile}
                    onClick={() => setRestoreDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Restore Data
                  </Button>
                </div>
                
                {/* Restore confirmation dialog */}
                <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Restore</DialogTitle>
                      <DialogDescription>
                        You are about to restore data from {restoreFile?.name}. This will replace your current database and cannot be undone. Are you sure you want to continue?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="default" onClick={handleRestore}>
                        Yes, Restore Data
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                  <h3 className="text-sm font-medium text-yellow-800">Email Configuration Required</h3>
                  <p className="text-sm text-yellow-700">
                    Email notifications will not work until you configure your SMTP server settings.
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
                
                <div className="flex items-center justify-between space-y-0 pt-5">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableSSL">Enable SSL/TLS</Label>
                    <p className="text-sm text-muted-foreground">
                      Use secure connection for email delivery
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
              
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={testEmailSettings}>
                  <Mail className="h-4 w-4 mr-2" />
                  Test Settings
                </Button>
                <Button onClick={saveEmailSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}