import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import SearchPage from "@/pages/search";
import GarmentDetailPage from "@/pages/garment-detail";
import RackDetailPage from "@/pages/rack-detail";
import CuratorScanPage from "@/pages/curator-scan";
import CuratorNewGarmentPage from "@/pages/curator-new-garment";
import CuratorPrintQRsPage from "@/pages/curator-print-qrs";
import CuratorCategoriesPage from "@/pages/curator-categories";
import CuratorTypesPage from "@/pages/curator-types";
import CuratorCollectionsPage from "@/pages/curator-collections";
import CuratorLotsPage from "@/pages/curator-lots";
import CuratorRacksPage from "@/pages/curator-racks";

// Authenticated routes that use the sidebar layout
function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/garment/:id" component={GarmentDetailPage} />
      <Route path="/rack/:id" component={RackDetailPage} />
      <Route path="/curator/scan" component={CuratorScanPage} />
      <Route path="/curator/new" component={CuratorNewGarmentPage} />
      <Route path="/curator/print-qrs" component={CuratorPrintQRsPage} />
      <Route path="/curator/categories" component={CuratorCategoriesPage} />
      <Route path="/curator/types" component={CuratorTypesPage} />
      <Route path="/curator/collections" component={CuratorCollectionsPage} />
      <Route path="/curator/lots" component={CuratorLotsPage} />
      <Route path="/curator/racks" component={CuratorRacksPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Authenticated layout with sidebar
function AuthenticatedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <AuthenticatedRoutes />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Main router that decides which layout to use
function AppRouter() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading && location !== "/login" && location !== "/") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Public routes
  if (location === "/" || location === "/login") {
    // If user is already logged in, redirect to dashboard
    if (user && !isLoading) {
      return <Redirect to="/dashboard" />;
    }
    return <LoginPage />;
  }

  // All other routes use authenticated layout
  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <AppRouter />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
