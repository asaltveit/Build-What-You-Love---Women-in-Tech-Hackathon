import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { usePcosProfile } from "@/hooks/use-pcos";
import { Loader2 } from "lucide-react";

import AuthPage from "@/pages/AuthPage";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Groceries from "@/pages/Groceries";
import MealPlan from "@/pages/MealPlan";
import Log from "@/pages/Log";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: authLoading } = useAuth();
  
  // Wait for auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  // Not logged in -> Auth Page
  if (!user) {
    return <AuthPage />;
  }

  return <Component />;
}

// Special wrapper for Dashboard to check onboarding status
function DashboardWrapper() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = usePcosProfile();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // If no profile or no PCOS type set, force onboarding
  if (!profile || !profile.pcosType) {
    return <Onboarding />;
  }

  return <Dashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path="/api/login" component={() => { window.location.href = "/api/login"; return null; }} />
      <Route path="/api/logout" component={() => { window.location.href = "/api/logout"; return null; }} />
      
      {/* Public/Auth */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes */}
      <Route path="/" component={DashboardWrapper} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />
      <Route path="/groceries" component={() => <ProtectedRoute component={Groceries} />} />
      <Route path="/meal-plan" component={() => <ProtectedRoute component={MealPlan} />} />
      <Route path="/log" component={() => <ProtectedRoute component={Log} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
