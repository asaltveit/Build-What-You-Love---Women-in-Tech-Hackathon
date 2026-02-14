import { useState } from "react";
import { isConvexConfigured } from "@/lib/convex";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ShoppingCart, CloudOff, Check, AlertTriangle } from "lucide-react";
import "@/styles/bem-components.css";

interface GroceryListItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  checked: boolean;
  isRecommended: boolean;
  isWarned: boolean;
  reason?: string;
}

interface ConvexGroceryListProps {
  userId: string;
  pcosType: string;
  cyclePhase: string;
}

export default function ConvexGroceryList({ userId, pcosType, cyclePhase }: ConvexGroceryListProps) {
  const configured = isConvexConfigured();
  const [items, setItems] = useState<GroceryListItem[]>([
    { id: "1", name: "Wild Salmon", category: "protein", quantity: 1, unit: "lb", checked: false, isRecommended: true, isWarned: false, reason: "Rich in omega-3, great for anti-inflammatory support" },
    { id: "2", name: "Spinach", category: "vegetable", quantity: 1, unit: "bunch", checked: false, isRecommended: true, isWarned: false, reason: "Iron-rich, supports hormone balance" },
    { id: "3", name: "Blueberries", category: "fruit", quantity: 1, unit: "pint", checked: false, isRecommended: true, isWarned: false, reason: "Antioxidant-rich, low glycemic index" },
    { id: "4", name: "Sweet Potatoes", category: "vegetable", quantity: 2, unit: "each", checked: false, isRecommended: true, isWarned: false, reason: "Complex carbs, great for luteal phase energy" },
    { id: "5", name: "White Bread", category: "grain", quantity: 1, unit: "loaf", checked: false, isRecommended: false, isWarned: true, reason: "Refined carbs can spike insulin levels" },
  ]);
  const [newItem, setNewItem] = useState("");

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const item: GroceryListItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      category: "other",
      quantity: 1,
      unit: "each",
      checked: false,
      isRecommended: false,
      isWarned: false,
    };
    setItems(prev => [...prev, item]);
    setNewItem("");
  };

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Smart Grocery List</h3>
          {configured ? (
            <Badge variant="secondary" className="text-xs">
              Convex Real-time
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <CloudOff className="w-3 h-3 mr-1" /> Local
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {checkedCount}/{items.length} items
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          data-testid="input-grocery-item"
          placeholder="Add an item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <Button size="icon" onClick={addItem} data-testid="button-add-grocery">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={`grocery-item ${item.checked ? "grocery-item--checked" : ""}`}
            data-testid={`grocery-item-${item.id}`}
          >
            <Checkbox
              className="grocery-item__checkbox"
              checked={item.checked}
              onCheckedChange={() => toggleItem(item.id)}
              data-testid={`checkbox-grocery-${item.id}`}
            />
            <div className="grocery-item__info">
              <span className={`grocery-item__name ${item.checked ? "grocery-item__name--checked" : ""}`}>
                {item.name}
              </span>
              <span className="grocery-item__category">{item.category}</span>
              {item.reason && (
                <span className="text-xs text-muted-foreground block mt-0.5">{item.reason}</span>
              )}
            </div>
            <div className="grocery-item__badge">
              {item.isRecommended && (
                <Check className="w-4 h-4 grocery-item__badge--recommended" />
              )}
              {item.isWarned && (
                <AlertTriangle className="w-4 h-4 grocery-item__badge--warned" />
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeItem(item.id)}
              data-testid={`button-remove-grocery-${item.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Your grocery list is empty. Add items or generate from your meal plan.
        </div>
      )}
    </Card>
  );
}
