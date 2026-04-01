import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import CompanyProfileForm from "@/components/CompanyProfileForm";
import MatchChat from "@/components/MatchChat";
import { useScrapedData } from "@/hooks/use-scraped-data";
import type { CompanyProfile } from "@/lib/company-profile";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Match = () => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const { pages } = useScrapedData();
  const { toast } = useToast();

  const completedPages = pages.filter((p) => p.status === "completed");

  const handleSubmit = async (p: CompanyProfile) => {
    if (completedPages.length === 0) {
      toast({
        title: "No scraped data",
        description: "Go to the Dashboard and scrape some pages first to use as context for AI matching.",
        variant: "destructive",
      });
      return;
    }
    setProfile(p);
  };

  return (
    <div className="min-h-screen relative">
      <div className="bg-orbs">
        <div className="bg-orb-accent" />
      </div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="mx-auto max-w-5xl space-y-5 px-6 py-6">
          {completedPages.length === 0 && (
            <Card>
              <CardContent className="flex items-center gap-4 py-6">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">No scraped data available</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Scrape some pages on the Dashboard first, then come back to chat with the AI about the extracted data.
                  </p>
                </div>
                <Link
                  to="/"
                  className="flex items-center gap-1.5 rounded-md gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          <CompanyProfileForm onSubmit={handleSubmit} isLoading={false} />

          {profile && completedPages.length > 0 && (
            <MatchChat
              profile={profile}
              scrapedContext={completedPages.map((p) => `## ${p.title}\nSource: ${p.url}\n\n${p.markdown}`).join("\n\n---\n\n")}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Match;
