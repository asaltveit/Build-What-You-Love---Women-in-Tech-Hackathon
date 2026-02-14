import { Layout } from "@/components/ui/Layout";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { usePcosProfile, useDailyRecommendation } from "@/hooks/use-pcos";
import { useLogs } from "@/hooks/use-logs";
import { Loader2, Plus, Calendar, MoveRight, Leaf, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";

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

  // Calculate current cycle day (mock logic for now - normally calculated from last period)
  const currentDay = 14; 
  const cycleLength = profile?.cycleLength || 28;
  const progress = (currentDay / cycleLength) * 100;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Hello, Beautiful
            </h1>
            <p className="text-muted-foreground">
              Today is {format(new Date(), "EEEE, MMMM do")}
            </p>
          </div>
          <Link href="/log">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Log Symptoms
            </Button>
          </Link>
        </div>

        {/* Cycle Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="col-span-2 relative overflow-hidden glass-card border-primary/10">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10" />
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <CardTitle>Current Phase</CardTitle>
                <CardDescription>Your hormonal landscape</CardDescription>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                {recs?.phase || "Follicular"} Phase
              </span>
            </div>

            <div className="flex items-center gap-8">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * progress) / 100}
                    className="text-primary transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-foreground">{currentDay}</span>
                  <span className="text-xs text-muted-foreground">Day</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">{recs?.lifestyle}</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Your energy is naturally rising. It's a great time for creative projects and social gatherings.
                </p>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-center bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-xl shadow-primary/20">
            <div className="mb-4 p-3 bg-white/20 w-fit rounded-xl backdrop-blur-sm">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-1">Next Period</h3>
            <p className="text-primary-foreground/80 text-sm mb-4">Estimated in 14 days</p>
            <div className="mt-auto pt-4 border-t border-white/20">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>View Calendar</span>
                <MoveRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* Daily Recommendations */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-t-4 border-t-green-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <Leaf className="w-5 h-5" />
                </div>
                <CardTitle>Nutrition Focus</CardTitle>
              </div>
              
              <div className="space-y-4">
                <p className="font-medium text-foreground">{recs?.nutrition.focus}</p>
                
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eat More</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recs?.nutrition.foodsToEat.map(food => (
                      <span key={food} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Limit</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {recs?.nutrition.foodsToAvoid.join(", ")}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-t-4 border-t-pink-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <CardTitle>Movement</CardTitle>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{recs?.exercise.focus}</p>
                  <span className={`
                    px-2 py-1 rounded text-xs font-bold uppercase
                    ${recs?.exercise.intensity === 'high' ? 'bg-orange-100 text-orange-700' : 
                      recs?.exercise.intensity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'}
                  `}>
                    {recs?.exercise.intensity} Intensity
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recs?.exercise.recommendedTypes.map(type => (
                      <span key={type} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
