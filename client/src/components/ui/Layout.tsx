import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  CalendarHeart, 
  ShoppingBag, 
  ChefHat,
  LogOut, 
  User,
  Menu,
  X,
  ScanLine
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/log", label: "Cycle Log", icon: CalendarHeart },
    { href: "/meal-plan", label: "Meal Plan", icon: ChefHat },
    { href: "/groceries", label: "Groceries", icon: ShoppingBag },
    { href: "/fridge", label: "Fridge Scanner", icon: ScanLine },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-white border-r border-border/50 shadow-sm">
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
            Bloom<span className="text-accent-foreground">.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Holistic Cycle Care</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? "bg-primary/10 text-primary font-medium shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-primary">Bloom.</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-muted-foreground hover:bg-secondary/50 rounded-lg"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-30 bg-background pt-20 px-4"
          >
            <nav className="space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium
                    ${location === item.href 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground hover:bg-secondary"
                    }
                  `}
                >
                  <item.icon className="w-6 h-6" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => logout()}
                className="flex items-center gap-4 px-4 py-4 w-full rounded-xl text-lg font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive text-left"
              >
                <LogOut className="w-6 h-6" />
                Sign Out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 lg:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
