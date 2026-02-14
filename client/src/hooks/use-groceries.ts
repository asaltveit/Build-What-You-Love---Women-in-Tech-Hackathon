import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface GrocerySearchParams {
  query?: string;
  location?: string;
}

export function useGroceries(params: GrocerySearchParams) {
  // Only fetch if we have at least one param, or if we want to show suggestions initially
  // We'll allow fetching without query to show recommended items
  return useQuery({
    queryKey: [api.groceries.search.path, params],
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      if (params.query) urlParams.append("query", params.query);
      if (params.location) urlParams.append("location", params.location);
      
      const url = `${api.groceries.search.path}?${urlParams.toString()}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search groceries");
      return api.groceries.search.responses[200].parse(await res.json());
    },
    enabled: true, // Always enabled, search component can manage when to display results
  });
}
