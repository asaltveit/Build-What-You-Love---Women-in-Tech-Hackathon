import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2, Store, ShoppingBasket } from "lucide-react";
import { useGroceries } from "@/hooks/use-groceries";
import { motion } from "framer-motion";

export default function Groceries() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");

  const handleSearch = () => {
    setDebouncedQuery(query);
    setDebouncedLocation(location);
  };

  const { data: items, isLoading } = useGroceries({ 
    query: debouncedQuery, 
    location: debouncedLocation 
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-display font-bold text-foreground">Grocery Finder</h1>
          <p className="text-muted-foreground mt-2">
            Discover foods that support your current cycle phase and PCOS type.
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-4 md:p-6 bg-secondary/20 border-secondary">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search food (e.g., Salmon, Kale)..."
                className="pl-10 bg-white"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Zip Code"
                className="pl-10 bg-white"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="md:w-auto w-full">
              {isLoading ? <Loader2 className="animate-spin" /> : "Find Nearby"}
            </Button>
          </div>
        </Card>

        {/* Results */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Skeletons
            [1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />
            ))
          ) : items?.length ? (
            items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full flex flex-col hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>
                    {item.isRecommended && (
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <ShoppingBasket className="w-3 h-3" /> Recommended
                      </span>
                    )}
                  </div>
                  
                  {item.benefits && (
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {item.benefits}
                    </p>
                  )}

                  <div className="pt-4 border-t border-border mt-auto">
                    <div className="flex items-center gap-2 text-sm text-foreground mb-1">
                      <Store className="w-4 h-4 text-primary" />
                      <span className="font-medium">{item.store || "Local Market"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.distance || "1.2 miles"}</span>
                      <span>{item.price || "$$"}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <ShoppingBasket className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No items found. Try searching for "Avocado" or "Berries".</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
