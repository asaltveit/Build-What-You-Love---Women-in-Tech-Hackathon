import { Layout } from "@/components/ui/Layout";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { usePcosProfile, useDailyRecommendation } from "@/hooks/use-pcos";
import { useLogs } from "@/hooks/use-logs";
import { Loader2, Plus, Calendar, MoveRight, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";
import CycleTracker from "@/components/CycleTracker";
import RecommendationCards from "@/components/RecommendationCards";

function getCycleInfo(profile: any) {
  if (!profile) return { day: 14, phase: "follicular" as const };
  const today = new Date();
  const lastPeriod = new Date(profile.lastPeriodDate);
  const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % (profile.cycleLength || 28);
  let phase: "menstrual" | "follicular" | "ovulatory" | "luteal" = "follicular";
  if (diffDays < 5) phase = "menstrual";
  else if (diffDays < 14) phase = "follicular";
  else if (diffDays < 17) phase = "ovulatory";
  else phase = "luteal";
  return { day: diffDays || 1, phase };
}

export default function Dashboard() {
  const { data: profile, isLoading: loadingProfile } = usePcosProfile();
  const { data: recs, isLoading: loadingRecs } = useDailyRecommendation();
  const { data: logs } = useLogs();

  if (loadingProfile || loadingRecs) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const { day: currentDay, phase } = getCycleInfo(profile);
  const cycleLength = profile?.cycleLength || 28;
  const daysUntilPeriod = cycleLength - currentDay;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Hello, Beautiful
            </h1>
            <p className="text-muted-foreground">
              Today is {format(new Date(), "EEEE, MMMM do")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/meal-plan">
              <Button variant="outline" data-testid="link-meal-plan">
                <ChefHat className="w-4 h-4 mr-2" /> Meal Plan
              </Button>
            </Link>
            <Link href="/log">
              <Button data-testid="link-log-symptoms">
                <Plus className="w-4 h-4 mr-2" /> Log Symptoms
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="col-span-2 relative overflow-visible">
            <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
              <div>
                <CardTitle>Current Phase</CardTitle>
                <CardDescription>Your hormonal landscape</CardDescription>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  {
                    insulin_resistant: "bg-[hsl(210,50%,90%)] text-[hsl(210,60%,35%)] dark:bg-[hsl(210,30%,20%)] dark:text-[hsl(210,50%,70%)]",
                    inflammatory: "bg-[hsl(350,50%,90%)] text-[hsl(350,60%,35%)] dark:bg-[hsl(350,30%,20%)] dark:text-[hsl(350,50%,70%)]",
                    adrenal: "bg-[hsl(35,50%,90%)] text-[hsl(35,60%,35%)] dark:bg-[hsl(35,30%,20%)] dark:text-[hsl(35,50%,70%)]",
                    post_pill: "bg-[hsl(265,50%,90%)] text-[hsl(265,60%,35%)] dark:bg-[hsl(265,30%,20%)] dark:text-[hsl(265,50%,70%)]",
                    unknown: "bg-muted text-muted-foreground",
                  }[profile?.pcosType || "unknown"] || "bg-muted text-muted-foreground"
                }`}
                data-testid="badge-pcos-type"
              >
                {(profile?.pcosType || "unknown").replace("_", " ")} PCOS
              </span>
            </div>

            <div className="flex items-center gap-8 flex-wrap justify-center md:justify-start">
              <CycleTracker
                cycleDay={currentDay}
                cycleLength={cycleLength}
                phase={phase}
              />
              <div className="space-y-2 flex-1 min-w-[200px]">
                <h4 className="font-semibold text-lg">{recs?.lifestyle}</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {phase === "menstrual" && "Focus on rest and gentle nourishment. Your body needs iron-rich foods and warmth."}
                  {phase === "follicular" && "Your energy is naturally rising. Great time for creative projects and new activities."}
                  {phase === "ovulatory" && "Peak energy and confidence. Ideal for social activities and high-intensity workouts."}
                  {phase === "luteal" && "Time to slow down. Focus on complex carbs and stress-reducing activities."}
                </p>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-center bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none">
            <div className="mb-4 p-3 bg-white/20 w-fit rounded-md backdrop-blur-sm">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-1">Next Period</h3>
            <p className="text-primary-foreground/80 text-sm mb-4">
              Estimated in {daysUntilPeriod} days
            </p>
            <div className="mt-auto pt-4 border-t border-white/20">
              <Link href="/log">
                <div className="flex items-center justify-between gap-2 text-sm font-medium cursor-pointer">
                  <span>Track Cycle</span>
                  <MoveRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <RecommendationCards
              nutrition={recs?.nutrition}
              exercise={recs?.exercise}
              lifestyle={recs?.lifestyle}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardTitle className="mb-4">Recent Logs</CardTitle>
              {logs && logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.slice(0, 3).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2">
                      <span className="text-muted-foreground">{format(new Date(log.date), "MMM dd")}</span>
                      <span className="text-foreground">{log.mood || "No mood logged"}</span>
                      <span className="text-xs text-muted-foreground capitalize">{log.energyLevel || "moderate"} energy</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No logs yet. Start tracking your symptoms.</p>
              )}
              <Link href="/log">
                <Button variant="outline" className="w-full mt-4" data-testid="link-view-all-logs">
                  View All Logs
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
