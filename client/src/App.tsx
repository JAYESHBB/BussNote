import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "./lib/protected-route";
import { useMobile } from "@/hooks/use-mobile";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import Dashboard from "@/pages/dashboard";
import PartiesPage from "@/pages/parties";
import InvoicesPage from "@/pages/invoices";
import PartyDetailsPage from "@/pages/party-details";
import InvoiceDetailsPage from "@/pages/invoice-details";
import ReportsPage from "@/pages/reports";
import AnalyticsPage from "@/pages/analytics";
import ProfilePage from "@/pages/profile";
import SetupPasswordPage from "@/pages/setup-password";
import UserManagementPage from "@/pages/settings/users";
import RoleManagementPage from "@/pages/settings/roles";
import SystemSettingsPage from "@/pages/settings/system";
import { PageLayout } from "@/components/PageLayout";

function Router() {
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Auto-hide sidebar on mobile when navigation happens or on initial load
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile, window.location.pathname]);
  
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/setup-password" component={SetupPasswordPage} />
      
      <ProtectedRoute path="/">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <Dashboard />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/parties">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <PartiesPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/parties/:id">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <PartyDetailsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/invoices">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <InvoicesPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/invoices/:id">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <InvoiceDetailsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/reports">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <ReportsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/reports/outstanding">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <ReportsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/reports/closed">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <ReportsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/reports/sales">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <ReportsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/analytics">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <AnalyticsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/settings">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <UserManagementPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/settings/users">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <UserManagementPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/settings/roles">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <RoleManagementPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/settings/system">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <SystemSettingsPage />
        </PageLayout>
      </ProtectedRoute>
      
      <ProtectedRoute path="/profile">
        <PageLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <ProfilePage />
        </PageLayout>
      </ProtectedRoute>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
