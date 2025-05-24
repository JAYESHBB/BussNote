import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  UserCheck,
  Settings,
  BarChart3,
  Building2,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const defaultPermissions: Permission[] = [
  // Dashboard Permissions
  { id: "dashboard.view", name: "View Dashboard", description: "Access main dashboard", category: "Dashboard" },
  { id: "dashboard.analytics", name: "View Analytics", description: "Access analytics and reports", category: "Dashboard" },
  
  // User Management Permissions
  { id: "users.view", name: "View Users", description: "View user list and details", category: "User Management" },
  { id: "users.create", name: "Create Users", description: "Add new users to system", category: "User Management" },
  { id: "users.edit", name: "Edit Users", description: "Modify user information", category: "User Management" },
  { id: "users.delete", name: "Delete Users", description: "Remove users from system", category: "User Management" },
  { id: "users.manage_roles", name: "Manage User Roles", description: "Assign roles to users", category: "User Management" },
  
  // Invoice Management Permissions
  { id: "invoices.view", name: "View Invoices", description: "Access invoice list and details", category: "Invoice Management" },
  { id: "invoices.create", name: "Create Invoices", description: "Create new invoices", category: "Invoice Management" },
  { id: "invoices.edit", name: "Edit Invoices", description: "Modify invoice information", category: "Invoice Management" },
  { id: "invoices.delete", name: "Delete Invoices", description: "Remove invoices from system", category: "Invoice Management" },
  { id: "invoices.close", name: "Close Invoices", description: "Mark invoices as closed", category: "Invoice Management" },
  { id: "invoices.export", name: "Export Invoices", description: "Export invoice data", category: "Invoice Management" },
  
  // Party Management Permissions
  { id: "parties.view", name: "View Parties", description: "Access party list and details", category: "Party Management" },
  { id: "parties.create", name: "Create Parties", description: "Add new parties", category: "Party Management" },
  { id: "parties.edit", name: "Edit Parties", description: "Modify party information", category: "Party Management" },
  { id: "parties.delete", name: "Delete Parties", description: "Remove parties from system", category: "Party Management" },
  
  // Reports & Analytics Permissions
  { id: "reports.view", name: "View Reports", description: "Access reports and analytics", category: "Reports & Analytics" },
  { id: "reports.export", name: "Export Reports", description: "Export report data", category: "Reports & Analytics" },
  { id: "reports.advanced", name: "Advanced Analytics", description: "Access advanced analytics features", category: "Reports & Analytics" },
  
  // System Settings Permissions
  { id: "settings.view", name: "View Settings", description: "Access system settings", category: "System Settings" },
  { id: "settings.edit", name: "Edit Settings", description: "Modify system configuration", category: "System Settings" },
  { id: "settings.backup", name: "Backup & Restore", description: "Perform backup and restore operations", category: "System Settings" },
  
  // Role & Permission Management
  { id: "roles.view", name: "View Roles", description: "Access roles and permissions", category: "Role Management" },
  { id: "roles.create", name: "Create Roles", description: "Create new roles", category: "Role Management" },
  { id: "roles.edit", name: "Edit Roles", description: "Modify role permissions", category: "Role Management" },
  { id: "roles.delete", name: "Delete Roles", description: "Remove custom roles", category: "Role Management" },
];

export default function RoleManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: !!user,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string; description: string; permissions: string[] }) => {
      const res = await apiRequest("POST", "/api/roles", roleData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsRoleDialogOpen(false);
      setSelectedRole(null);
      resetForm();
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Role creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...roleData }: { id: number; name: string; description: string; permissions: string[] }) => {
      const res = await apiRequest("PUT", `/api/roles/${id}`, roleData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsRoleDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const res = await apiRequest("DELETE", `/api/roles/${roleId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPermissions = defaultPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Dashboard": return <BarChart3 className="h-4 w-4" />;
      case "User Management": return <Users className="h-4 w-4" />;
      case "Invoice Management": return <FileText className="h-4 w-4" />;
      case "Party Management": return <Building2 className="h-4 w-4" />;
      case "Reports & Analytics": return <BarChart3 className="h-4 w-4" />;
      case "System Settings": return <Settings className="h-4 w-4" />;
      case "Role Management": return <Shield className="h-4 w-4" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    if (role.isSystem) return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role & Permission Management</h1>
          <p className="text-gray-600">Manage user roles and permissions for system access control</p>
        </div>
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedRole(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRole ? "Edit Role" : "Create New Role"}
              </DialogTitle>
            </DialogHeader>
            <RoleForm 
              role={selectedRole} 
              onSubmit={selectedRole ? updateRoleMutation.mutate : createRoleMutation.mutate}
              isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
              permissions={defaultPermissions}
              groupedPermissions={groupedPermissions}
              getCategoryIcon={getCategoryIcon}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roles ({filteredRoles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-gray-600">{role.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{role.userCount} users</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(role)}>
                        {role.isSystem ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsRoleDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteRoleMutation.mutate(role.id)}
                            disabled={deleteRoleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface RoleFormProps {
  role: Role | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  permissions: Permission[];
  groupedPermissions: Record<string, Permission[]>;
  getCategoryIcon: (category: string) => React.ReactNode;
}

function RoleForm({ role, onSubmit, isLoading, permissions, groupedPermissions, getCategoryIcon }: RoleFormProps) {
  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
    permissions: role?.permissions || [],
  });

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = groupedPermissions[category].map(p => p.id);
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p));
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role) {
      onSubmit({ id: role.id, ...formData });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter role name"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter role description"
            required
          />
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Permissions</Label>
        <p className="text-sm text-gray-600 mb-4">Select the permissions for this role</p>
        
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
            const allSelected = categoryPermissions.every(p => formData.permissions.includes(p.id));
            const someSelected = categoryPermissions.some(p => formData.permissions.includes(p.id));
            
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <CardTitle className="text-lg">{category}</CardTitle>
                    </div>
                    <Switch
                      checked={allSelected}
                      onCheckedChange={() => handleCategoryToggle(category)}
                      className={someSelected && !allSelected ? "opacity-50" : ""}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Switch
                          checked={formData.permissions.includes(permission.id)}
                          onCheckedChange={() => handlePermissionToggle(permission.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{permission.name}</div>
                          <div className="text-xs text-gray-500">{permission.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setFormData({ name: "", description: "", permissions: [] })}>
          Reset
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : (role ? "Update Role" : "Create Role")}
        </Button>
      </div>
    </form>
  );
}