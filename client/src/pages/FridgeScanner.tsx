import { useState, useRef } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Loader2, Check, AlertTriangle, Minus, ImageIcon, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ScannedItem {
  name: string;
  category: string;
  quantity: string;
  suitability: "recommended" | "avoid" | "neutral";
  pcosRating: string;
  cycleRating: string;
  benefits: string | null;
  matched: boolean;
}

interface ScanResult {
  items: ScannedItem[];
  phase: string;
  pcosType: string;
}

const suitabilityConfig = {
  recommended: { label: "Recommended", icon: Check, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  neutral: { label: "Neutral", icon: Minus, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  avoid: { label: "Avoid", icon: AlertTriangle, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
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

const phaseLabels: Record<string, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulatory: "Ovulatory",
  luteal: "Luteal",
};

const pcosTypeLabels: Record<string, string> = {
  insulin_resistant: "Insulin Resistant",
  inflammatory: "Inflammatory",
  adrenal: "Adrenal",
  post_pill: "Post-Pill",
  unknown: "Unknown",
};

export default function FridgeScanner() {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 10MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/fridge/scan", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Scan failed");
      }

      const data: ScanResult = await res.json();
      setResult(data);
      toast({ title: "Scan complete", description: `Found ${data.items.length} items in your fridge.` });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message || "Could not analyze the image.", variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const counts = result ? {
    recommended: result.items.filter(i => i.suitability === "recommended").length,
    neutral: result.items.filter(i => i.suitability === "neutral").length,
    avoid: result.items.filter(i => i.suitability === "avoid").length,
  } : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-fridge-title">
            Fridge Scanner
          </h1>
          <p className="text-muted-foreground mt-2">
            Take a photo of your fridge and we'll identify what you have, rate each item for your PCOS type and cycle phase, and suggest what to add.
          </p>
        </div>

        {!preview ? (
          <Card data-testid="card-upload-area">
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Upload a fridge photo</p>
                <p className="text-sm text-muted-foreground mt-1">Take a picture or upload from your gallery</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-camera"
                />
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  data-testid="button-take-photo"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-photo"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card data-testid="card-preview">
              <div className="space-y-4">
                <div className="relative rounded-md overflow-hidden bg-muted">
                  <img
                    src={preview}
                    alt="Fridge preview"
                    className="w-full max-h-[400px] object-contain"
                    data-testid="img-fridge-preview"
                  />
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button
                    onClick={handleScan}
                    disabled={isScanning}
                    data-testid="button-scan"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        Analyzing...
                      </>
                    ) : result ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-scan
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Scan Fridge
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={isScanning} data-testid="button-reset">
                    New Photo
                  </Button>
                </div>
              </div>
            </Card>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Card data-testid="card-scan-summary">
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-foreground">Scan Results</h2>
                      <div className="flex gap-2 flex-wrap items-center">
                        <Badge variant="outline" data-testid="badge-phase">
                          {phaseLabels[result.phase] || result.phase} Phase
                        </Badge>
                        <Badge variant="outline" data-testid="badge-pcos-type">
                          {pcosTypeLabels[result.pcosType] || result.pcosType} PCOS
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {result.items.length} items found
                        </span>
                      </div>

                      {counts && (
                        <div className="flex gap-4 flex-wrap text-sm">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            <span className="text-muted-foreground">{counts.recommended} recommended</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                            <span className="text-muted-foreground">{counts.neutral} neutral</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-muted-foreground">{counts.avoid} to limit</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {result.items.map((item, idx) => {
                      const config = suitabilityConfig[item.suitability];
                      const SuitIcon = config.icon;
                      return (
                        <motion.div
                          key={`${item.name}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                        >
                          <Card className="h-full" data-testid={`card-scanned-item-${idx}`}>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-sm truncate" data-testid={`text-item-name-${idx}`}>
                                  {item.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                                    {categoryLabels[item.category] || item.category}
                                  </Badge>
                                  {item.quantity && (
                                    <span className="text-xs text-muted-foreground">{item.quantity}</span>
                                  )}
                                </div>
                              </div>
                              <Badge
                                className={`shrink-0 text-xs no-default-hover-elevate no-default-active-elevate ${config.className}`}
                                data-testid={`badge-item-suitability-${idx}`}
                              >
                                <SuitIcon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>

                            {item.benefits && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {item.benefits}
                              </p>
                            )}

                            <div className="flex gap-3 text-xs mt-2">
                              <span className="text-muted-foreground">
                                PCOS: <span className={item.pcosRating === "recommended" ? "text-green-600 dark:text-green-400 font-medium" : item.pcosRating === "avoid" ? "text-red-600 dark:text-red-400 font-medium" : ""}>{item.pcosRating}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Cycle: <span className={item.cycleRating === "recommended" ? "text-green-600 dark:text-green-400 font-medium" : item.cycleRating === "avoid" ? "text-red-600 dark:text-red-400 font-medium" : ""}>{item.cycleRating}</span>
                              </span>
                            </div>

                            {!item.matched && (
                              <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
                                Not in our database yet — suitability is estimated
                              </p>
                            )}
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

                  {result.items.length === 0 && (
                    <Card>
                      <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                        <p className="text-lg font-medium text-foreground mb-1">No items detected</p>
                        <p className="text-sm text-muted-foreground">Try taking a clearer photo with better lighting.</p>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}
