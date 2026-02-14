import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side - Hero */}
      <div className="relative bg-primary overflow-hidden flex flex-col justify-between p-8 md:p-12 lg:p-16 text-primary-foreground">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Bloom.</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-md text-balance">
            Sync your life with your cycle. Holistic care tailored to your unique biology.
          </p>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-4 text-sm font-medium opacity-80">
            <span>Cycle Tracking</span>
            <span className="w-1 h-1 bg-current rounded-full" />
            <span>PCOS Support</span>
            <span className="w-1 h-1 bg-current rounded-full" />
            <span>Nutrition</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-foreground">Welcome Back</h2>
            <p className="mt-2 text-muted-foreground">Sign in to access your personalized health dashboard</p>
          </div>

          <div className="grid gap-4">
            <Button 
              size="lg" 
              className="w-full h-12 text-base font-semibold"
              onClick={() => window.location.href = "/api/login"}
            >
              Get Started with Replit Auth
            </Button>
            
            <p className="text-center text-xs text-muted-foreground mt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
