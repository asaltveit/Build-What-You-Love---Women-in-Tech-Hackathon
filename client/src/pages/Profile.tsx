import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { usePcosProfile } from "@/hooks/use-pcos";
import { Card, CardTitle } from "@/components/ui/Card";
import { Loader2, User } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = usePcosProfile();

  if (isLoading) return <Layout><Loader2 className="animate-spin" /></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-8 h-8" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{user?.firstName} {user?.lastName}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Card className="space-y-6">
          <CardTitle>Health Profile</CardTitle>
          
          <div className="grid gap-4">
            <div className="p-4 bg-secondary/20 rounded-xl">
              <span className="text-sm text-muted-foreground uppercase tracking-wide block mb-1">PCOS Type</span>
              <span className="text-lg font-medium capitalize">{profile?.pcosType?.replace('_', ' ') || "Not Set"}</span>
            </div>
            
            <div className="p-4 bg-secondary/20 rounded-xl">
              <span className="text-sm text-muted-foreground uppercase tracking-wide block mb-1">Cycle Length</span>
              <span className="text-lg font-medium">{profile?.cycleLength} Days</span>
            </div>

            <div className="p-4 bg-secondary/20 rounded-xl">
              <span className="text-sm text-muted-foreground uppercase tracking-wide block mb-1">Account Created</span>
              <span className="text-lg font-medium">{new Date(user?.createdAt || "").toLocaleDateString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
