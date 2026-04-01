import { useCallback } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import ScrapeControls from "@/components/ScrapeControls";
import StatsCards from "@/components/StatsCards";
import ScrapedDataTable from "@/components/ScrapedDataTable";
import { useScrapedData } from "@/hooks/use-scraped-data";
import { scrapeWebsite } from "@/lib/ai-match";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { pages, addPage, updatePage, removePage, clearAll, stats } = useScrapedData();
  const { toast } = useToast();

  const handleStartScrape = useCallback(async (url: string) => {
    let formattedUrl = url;
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const id = crypto.randomUUID();
    addPage({
      id,
      url: formattedUrl,
      title: "",
      markdown: "",
      description: "",
      scrapedAt: new Date().toISOString(),
      status: "running",
    });

    toast({ title: "Scraping started", description: formattedUrl });

    try {
      const result = await scrapeWebsite(formattedUrl);
      updatePage(id, {
        title: result.title || formattedUrl,
        markdown: result.markdown,
        status: "completed",
        scrapedAt: new Date().toISOString(),
      });
      toast({ title: "Scraping completed", description: result.title || formattedUrl });
    } catch (err: any) {
      updatePage(id, {
        status: "failed",
        error: err.message,
      });
      toast({
        title: "Scraping failed",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [addPage, updatePage, toast]);

  const isLoading = stats.running > 0;

  return (
    <div className="min-h-screen relative">
      <div className="bg-orbs">
        <div className="bg-orb-accent" />
      </div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="mx-auto max-w-7xl space-y-5 px-6 py-6">
          <ScrapeControls onStartScrape={handleStartScrape} isLoading={isLoading} />
          <StatsCards stats={stats} />
          <ScrapedDataTable pages={pages} onRemove={removePage} onClearAll={clearAll} />
        </main>
      </div>
    </div>
  );
};

export default Index;
