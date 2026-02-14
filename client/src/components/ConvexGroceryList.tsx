import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ShoppingCart, CloudOff, Wifi, Check, AlertTriangle, Loader2 } from "lucide-react";
import "@/styles/bem-components.css";

interface LocalGroceryItem {
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

function getDefaultItems(cyclePhase: string): LocalGroceryItem[] {
  const phaseItems: Record<string, LocalGroceryItem[]> = {
    menstrual: [
      { id: "m1", name: "Wild Salmon", category: "protein", quantity: 1, unit: "lb", checked: false, isRecommended: true, isWarned: false, reason: "Omega-3s help reduce menstrual cramps" },
      { id: "m2", name: "Spinach", category: "vegetable", quantity: 1, unit: "bunch", checked: false, isRecommended: true, isWarned: false, reason: "Iron-rich to replenish during menstruation" },
      { id: "m3", name: "Dark Chocolate (70%+)", category: "snack", quantity: 1, unit: "bar", checked: false, isRecommended: true, isWarned: false, reason: "Magnesium supports muscle relaxation" },
      { id: "m4", name: "Red Lentils", category: "legume", quantity: 1, unit: "bag", checked: false, isRecommended: true, isWarned: false, reason: "Plant-based iron and protein" },
      { id: "m5", name: "Sugary Drinks", category: "beverage", quantity: 1, unit: "each", checked: false, isRecommended: false, isWarned: true, reason: "Sugar increases inflammation during menstruation" },
    ],
    follicular: [
      { id: "f1", name: "Avocado", category: "fruit", quantity: 2, unit: "each", checked: false, isRecommended: true, isWarned: false, reason: "Healthy fats support rising estrogen" },
      { id: "f2", name: "Kale", category: "vegetable", quantity: 1, unit: "bunch", checked: false, isRecommended: true, isWarned: false, reason: "Supports estrogen metabolism" },
      { id: "f3", name: "Quinoa", category: "grain", quantity: 1, unit: "bag", checked: false, isRecommended: true, isWarned: false, reason: "Complete protein for follicle development" },
      { id: "f4", name: "Blueberries", category: "fruit", quantity: 1, unit: "pint", checked: false, isRecommended: true, isWarned: false, reason: "Antioxidant-rich, low glycemic index" },
      { id: "f5", name: "White Bread", category: "grain", quantity: 1, unit: "loaf", checked: false, isRecommended: false, isWarned: true, reason: "Refined carbs can spike insulin levels" },
    ],
    ovulatory: [
      { id: "o1", name: "Greek Yogurt", category: "dairy", quantity: 1, unit: "tub", checked: false, isRecommended: true, isWarned: false, reason: "Probiotics support gut health at peak fertility" },
      { id: "o2", name: "Mixed Greens", category: "vegetable", quantity: 1, unit: "bag", checked: false, isRecommended: true, isWarned: false, reason: "Raw vegetables for peak anti-inflammatory support" },
      { id: "o3", name: "Brazil Nuts", category: "nut", quantity: 1, unit: "bag", checked: false, isRecommended: true, isWarned: false, reason: "Selenium supports thyroid and ovulation" },
      { id: "o4", name: "Cod Fillet", category: "protein", quantity: 1, unit: "lb", checked: false, isRecommended: true, isWarned: false, reason: "Light protein, rich in vitamin D" },
      { id: "o5", name: "Processed Meats", category: "protein", quantity: 1, unit: "each", checked: false, isRecommended: false, isWarned: true, reason: "Excess sodium increases bloating" },
    ],
    luteal: [
      { id: "l1", name: "Sweet Potatoes", category: "vegetable", quantity: 2, unit: "each", checked: false, isRecommended: true, isWarned: false, reason: "Complex carbs for luteal phase energy" },
      { id: "l2", name: "Pumpkin Seeds", category: "seed", quantity: 1, unit: "bag", checked: false, isRecommended: true, isWarned: false, reason: "Magnesium helps reduce PMS symptoms" },
      { id: "l3", name: "Turkey", category: "protein", quantity: 1, unit: "lb", checked: false, isRecommended: true, isWarned: false, reason: "Tryptophan supports serotonin production" },
      { id: "l4", name: "Bananas", category: "fruit", quantity: 4, unit: "each", checked: false, isRecommended: true, isWarned: false, reason: "B6 and potassium reduce water retention" },
      { id: "l5", name: "Caffeine", category: "beverage", quantity: 1, unit: "each", checked: false, isRecommended: false, isWarned: true, reason: "Can worsen anxiety and sleep issues in luteal phase" },
    ],
  };
  return phaseItems[cyclePhase] || phaseItems.follicular;
}

function ConvexSyncedList({ userId, pcosType, cyclePhase }: ConvexGroceryListProps) {
  const [newItem, setNewItem] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);

  const userLists = useQuery(api.groceryLists.getUserLists, { userId });
  const activeList = userLists?.[0];
  const listItems = useQuery(
    api.groceryLists.getListItems,
    activeList ? { listId: activeList._id } : "skip"
  );

  const createList = useMutation(api.groceryLists.createList);
  const addItemMutation = useMutation(api.groceryLists.addItem);
  const toggleItemMutation = useMutation(api.groceryLists.toggleItem);
  const removeItemMutation = useMutation(api.groceryLists.removeItem);

  useEffect(() => {
    if (userLists && userLists.length === 0 && !isSeeding) {
      setIsSeeding(true);
      (async () => {
        const listId = await createList({
          userId,
          name: `${cyclePhase.charAt(0).toUpperCase() + cyclePhase.slice(1)} Phase List`,
          cyclePhase,
          pcosType,
        });
        const defaults = getDefaultItems(cyclePhase);
        for (const item of defaults) {
          await addItemMutation({
            listId,
            userId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            isRecommended: item.isRecommended,
            isWarned: item.isWarned,
            reason: item.reason,
          });
        }
        setIsSeeding(false);
      })();
    }
  }, [userLists, userId, cyclePhase, pcosType, isSeeding, createList, addItemMutation]);

  const handleAddItem = useCallback(async () => {
    if (!newItem.trim() || !activeList) return;
    await addItemMutation({
      listId: activeList._id,
      userId,
      name: newItem.trim(),
      category: "other",
      quantity: 1,
      unit: "each",
      isRecommended: false,
      isWarned: false,
    });
    setNewItem("");
  }, [newItem, activeList, userId, addItemMutation]);

  const handleToggle = useCallback(async (itemId: string) => {
    await toggleItemMutation({ itemId: itemId as any });
  }, [toggleItemMutation]);

  const handleRemove = useCallback(async (itemId: string) => {
    await removeItemMutation({ itemId: itemId as any });
  }, [removeItemMutation]);

  const isLoading = userLists === undefined || (activeList && listItems === undefined) || isSeeding;
  const items = listItems || [];
  const checkedCount = items.filter((i: any) => i.checked).length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm" data-testid="text-grocery-title">Smart Grocery List</h3>
          <Badge variant="secondary" className="text-xs">
            <Wifi className="w-3 h-3 mr-1" /> Synced
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground" data-testid="text-grocery-count">
          {checkedCount}/{items.length} items
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          data-testid="input-grocery-item"
          placeholder="Add an item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
        />
        <Button size="icon" onClick={handleAddItem} data-testid="button-add-grocery" disabled={!activeList}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading grocery list...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item: any) => (
            <div
              key={item._id}
              className={`grocery-item ${item.checked ? "grocery-item--checked" : ""}`}
              data-testid={`grocery-item-${item._id}`}
            >
              <Checkbox
                className="grocery-item__checkbox"
                checked={item.checked}
                onCheckedChange={() => handleToggle(item._id)}
                data-testid={`checkbox-grocery-${item._id}`}
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
                onClick={() => handleRemove(item._id)}
                data-testid={`button-remove-grocery-${item._id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground" data-testid="text-empty-grocery">
          Your grocery list is empty. Add items above.
        </div>
      )}
    </Card>
  );
}

function LocalOnlyList({ pcosType, cyclePhase }: { pcosType: string; cyclePhase: string }) {
  const defaultItems = useMemo(() => getDefaultItems(cyclePhase), [cyclePhase]);
  const [items, setItems] = useState<LocalGroceryItem[]>(defaultItems);
  const [newItem, setNewItem] = useState("");

  const toggleItem = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const addItem = useCallback(() => {
    if (!newItem.trim()) return;
    const item: LocalGroceryItem = {
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
  }, [newItem]);

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm" data-testid="text-grocery-title">Smart Grocery List</h3>
          <Badge variant="outline" className="text-xs">
            <CloudOff className="w-3 h-3 mr-1" /> Local
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground" data-testid="text-grocery-count">
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
        <div className="text-center py-6 text-sm text-muted-foreground" data-testid="text-empty-grocery">
          Your grocery list is empty. Add items above.
        </div>
      )}
    </Card>
  );
}

export default function ConvexGroceryList({ userId, pcosType, cyclePhase }: ConvexGroceryListProps) {
  if (isConvexConfigured()) {
    return <ConvexSyncedList userId={userId} pcosType={pcosType} cyclePhase={cyclePhase} />;
  }
  return <LocalOnlyList pcosType={pcosType} cyclePhase={cyclePhase} />;
}
