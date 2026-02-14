import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Store, ShoppingBasket, Check, X, Filter, Leaf } from "lucide-react";
import { useGroceries } from "@/hooks/use-groceries";
import { motion } from "framer-motion";

interface StorePricing {
  store: string;
  priceRange: string;
  available: boolean;
}

interface GroceryResult {
  id: number;
  name: string;
  category: string;
  benefits?: string | null;
  suitability: "recommended" | "avoid" | "neutral";
  pcosRating: string;
  cycleRating: string;
  storePricing: StorePricing[];
  dietaryTags: string[];
}

const suitabilityConfig = {
  recommended: { label: "Recommended", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  neutral: { label: "Neutral", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  avoid: { label: "Avoid", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const categoryLabels: Record<string, string> = {
  protein: "Protein",
  vegetable: "Vegetable",
  fruit: "Fruit",
  grain: "Grain",
  fat: "Healthy Fat",
  spice: "Spice",
  beverage: "Beverage",
  dairy: "Dairy",
  other: "Other",
};

export default function Groceries() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSuitability, setFilterSuitability] = useState<string>("all");
  const [filterDiet, setFilterDiet] = useState<string>("all");

  const handleSearch = () => {
    setSearchQuery(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const { data: items, isLoading } = useGroceries({
    query: searchQuery,
  });

  const filtered = (items as GroceryResult[] | undefined)?.filter(item => {
    if (filterSuitability !== "all" && item.suitability !== filterSuitability) return false;
    if (filterDiet !== "all" && !(item.dietaryTags || []).includes(filterDiet)) return false;
    return true;
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-grocery-title">Smart Grocery Finder</h1>
          <p className="text-muted-foreground mt-2">
            Foods ranked by your PCOS type and current cycle phase. Prices are estimated ranges across major stores.
          </p>
        </div>

        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search foods (e.g., Salmon, Kale, Avocado)..."
                  className="pl-10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  data-testid="input-grocery-search"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading} data-testid="button-grocery-search">
                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4 mr-2" />}
                Search
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">Suitability:</span>
              {["all", "recommended", "neutral", "avoid"].map(f => (
                <Button
                  key={f}
                  variant={filterSuitability === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSuitability(f)}
                  data-testid={`button-filter-${f}`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Leaf className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">Diet:</span>
              {[
                { value: "all", label: "All" },
                { value: "vegan", label: "Vegan" },
                { value: "vegetarian", label: "Vegetarian" },
                { value: "pescatarian", label: "Pescatarian" },
                { value: "non_vegetarian", label: "Non-Veg" },
              ].map(d => (
                <Button
                  key={d.value}
                  variant={filterDiet === d.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterDiet(d.value)}
                  data-testid={`button-diet-${d.value}`}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-56 bg-muted rounded-md animate-pulse" />
            ))
          ) : filtered?.length ? (
            filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="h-full flex flex-col" data-testid={`card-grocery-${item.id}`}>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base truncate" data-testid={`text-grocery-name-${item.id}`}>{item.name}</h3>
                      <Badge variant="outline" className="text-xs mt-1">
                        {categoryLabels[item.category] || item.category}
                      </Badge>
                    </div>
                    <Badge className={`shrink-0 text-xs no-default-hover-elevate no-default-active-elevate ${suitabilityConfig[item.suitability].className}`} data-testid={`badge-suitability-${item.id}`}>
                      {suitabilityConfig[item.suitability].label}
                    </Badge>
                  </div>

                  {item.benefits && (
                    <p className="text-sm text-muted-foreground mb-3 flex-1 line-clamp-2">
                      {item.benefits}
                    </p>
                  )}

                  <div className="flex gap-3 text-xs mb-2">
                    <span className="text-muted-foreground">
                      PCOS: <span className={item.pcosRating === "recommended" ? "text-green-600 dark:text-green-400 font-medium" : item.pcosRating === "avoid" ? "text-red-600 dark:text-red-400 font-medium" : ""}>{item.pcosRating}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Cycle: <span className={item.cycleRating === "recommended" ? "text-green-600 dark:text-green-400 font-medium" : item.cycleRating === "avoid" ? "text-red-600 dark:text-red-400 font-medium" : ""}>{item.cycleRating}</span>
                    </span>
                  </div>

                  {item.dietaryTags && item.dietaryTags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-3" data-testid={`diet-tags-${item.id}`}>
                      {item.dietaryTags.map(tag => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] no-default-hover-elevate no-default-active-elevate"
                        >
                          {tag === "non_vegetarian" ? "Non-Veg" : tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {item.storePricing && item.storePricing.length > 0 && (
                    <div className="pt-3 border-t border-border mt-auto">
                      <div className="flex items-center gap-1 mb-2">
                        <Store className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">Store Prices (est.)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {item.storePricing.map((sp) => (
                          <div key={sp.store} className="flex items-center justify-between text-xs gap-1">
                            <span className="text-muted-foreground truncate">{sp.store}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              <span className="font-medium">{sp.priceRange}</span>
                              {sp.available ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <X className="w-3 h-3 text-red-400" />
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground" data-testid="text-empty-groceries">
              <ShoppingBasket className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">No items found</p>
              <p className="text-sm">Try searching for "Salmon", "Avocado", or "Berries".</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
