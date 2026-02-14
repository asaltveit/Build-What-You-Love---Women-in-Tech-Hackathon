import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface GrocerySearchParams {
  query?: string;
}

export function useGroceries(params: GrocerySearchParams) {
  return useQuery({
    queryKey: [api.groceries.search.path, params],
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      if (params.query) urlParams.append("query", params.query);

      const url = `${api.groceries.search.path}?${urlParams.toString()}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search groceries");
      return res.json();
    },
    enabled: true,
  });
}
