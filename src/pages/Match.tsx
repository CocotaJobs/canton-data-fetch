import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import CompanyProfileForm from "@/components/CompanyProfileForm";
import MatchResults from "@/components/MatchResults";
import MatchChat from "@/components/MatchChat";
import { mockExhibitors } from "@/lib/mock-data";
import { findMatches, type MatchResult } from "@/lib/ai-match";
import type { CompanyProfile } from "@/lib/company-profile";
import { useToast } from "@/hooks/use-toast";

const Match = () => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (p: CompanyProfile) => {
    setProfile(p);
    setIsLoading(true);
    try {
      const results = await findMatches(p, mockExhibitors);
      setMatches(results);
    } catch (err: any) {
      toast({
        title: "Match Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-5xl space-y-5 px-6 py-6">
        <CompanyProfileForm onSubmit={handleSubmit} isLoading={isLoading} />
        {matches.length > 0 && (
          <MatchResults matches={matches} exhibitors={mockExhibitors} />
        )}
        {profile && (
          <MatchChat
            profile={profile}
            exhibitors={mockExhibitors}
            matchResults={matches.length > 0 ? matches : undefined}
          />
        )}
      </main>
    </div>
  );
};

export default Match;
