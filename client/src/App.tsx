import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import Dashboard from "@/pages/dashboard";
import PartiesPage from "@/pages/parties";
import InvoicesPage from "@/pages/invoices";
import PartyDetailsPage from "@/pages/party-details";
import InvoiceDetailsPage from "@/pages/invoice-details";
import ReportsPage from "@/pages/reports";
import { PageLayout } from "@/components/PageLayout";

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
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
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
