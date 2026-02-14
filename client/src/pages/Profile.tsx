import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { usePcosProfile, useUpdatePcosProfile } from "@/hooks/use-pcos";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Save, User, CalendarDays, Activity, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PCOS_TYPES = [
  { value: "insulin_resistant", label: "Insulin Resistant" },
  { value: "inflammatory", label: "Inflammatory" },
  { value: "adrenal", label: "Adrenal" },
  { value: "post_pill", label: "Post-Pill" },
  { value: "unknown", label: "Not Sure" },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: profile, isLoading } = usePcosProfile();
  const updateProfile = useUpdatePcosProfile();
  const { toast } = useToast();

  const [pcosType, setPcosType] = useState<string>("");
  const [cycleLength, setCycleLength] = useState<string>("");
  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const startEditing = () => {
    setPcosType(profile?.pcosType || "unknown");
    setCycleLength(String(profile?.cycleLength || 28));
    setLastPeriodDate(profile?.lastPeriodDate || new Date().toISOString().split("T")[0]);
    setIsEditing(true);
  };

  const handleSave = () => {
    const length = parseInt(cycleLength, 10);
    if (isNaN(length) || length < 18 || length > 45) {
      toast({ title: "Invalid cycle length", description: "Please enter a value between 18 and 45 days.", variant: "destructive" });
      return;
    }
    if (!lastPeriodDate) {
      toast({ title: "Missing date", description: "Please select your last period start date.", variant: "destructive" });
      return;
    }

    updateProfile.mutate(
      {
        pcosType,
        cycleLength: length,
        lastPeriodDate,
        symptoms: profile?.symptoms || [],
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast({ title: "Profile updated", description: "Your health profile has been saved." });
        },
        onError: () => {
          toast({ title: "Update failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            {user?.profileImageUrl ? (
              <AvatarImage src={user.profileImageUrl} alt="Profile" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground" data-testid="text-username">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="text-email">{user?.email}</p>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
            <div>
              <CardTitle>Health Profile</CardTitle>
              <CardDescription>Your PCOS and cycle information</CardDescription>
            </div>
            {!isEditing ? (
              <Button variant="outline" onClick={startEditing} data-testid="button-edit-profile">
                Edit
              </Button>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateProfile.isPending} data-testid="button-save-profile">
                  {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-md">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">PCOS Type</Label>
                {isEditing ? (
                  <Select value={pcosType} onValueChange={setPcosType}>
                    <SelectTrigger className="mt-1" data-testid="select-pcos-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PCOS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-medium capitalize mt-1" data-testid="text-pcos-type">
                    {profile?.pcosType?.replace("_", " ") || "Not set"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-md">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Cycle Length</Label>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min={18}
                      max={45}
                      value={cycleLength}
                      onChange={(e) => setCycleLength(e.target.value)}
                      className="w-24"
                      data-testid="input-cycle-length"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                ) : (
                  <p className="text-lg font-medium mt-1" data-testid="text-cycle-length">
                    {profile?.cycleLength || 28} days
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-md">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Last Period Start Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={lastPeriodDate}
                    onChange={(e) => setLastPeriodDate(e.target.value)}
                    className="mt-1 w-48"
                    max={new Date().toISOString().split("T")[0]}
                    data-testid="input-last-period"
                  />
                ) : (
                  <p className="text-lg font-medium mt-1" data-testid="text-last-period">
                    {profile?.lastPeriodDate
                      ? new Date(profile.lastPeriodDate + "T00:00:00").toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Not set"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">Account</CardTitle>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium" data-testid="text-joined-date">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-6 text-destructive hover:text-destructive"
            onClick={() => logout()}
            data-testid="button-sign-out"
          >
            Sign Out
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
