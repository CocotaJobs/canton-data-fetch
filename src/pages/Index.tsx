import { useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardHeader from "@/components/DashboardHeader";
import ScrapeControls from "@/components/ScrapeControls";
import StatsCards from "@/components/StatsCards";
import ScrapedDataTable from "@/components/ScrapedDataTable";
import { useScrapedData } from "@/hooks/use-scraped-data";
import { scrapeWebsite } from "@/lib/ai-match";
import { useToast } from "@/hooks/use-toast";
import { getConfigStatus } from "@/lib/env-check";

const configStatus = getConfigStatus();

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
          {!configStatus.allConfigured && (
            <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-200 [&>svg]:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuração incompleta</AlertTitle>
              <AlertDescription className="space-y-1">
                {!configStatus.supabase.configured && (
                  <p>
                    <strong>Banco de dados:</strong> configure{" "}
                    {configStatus.supabase.missing.map((v) => <code key={v} className="rounded bg-yellow-500/20 px-1 text-xs">{v}</code>).reduce((a, b) => <>{a}, {b}</>)}{" "}
                    nas env vars da Vercel.
                  </p>
                )}
                {!configStatus.api.configured && (
                  <p>
                    <strong>API Backend:</strong> configure{" "}
                    {configStatus.api.missing.map((v) => <code key={v} className="rounded bg-yellow-500/20 px-1 text-xs">{v}</code>).reduce((a, b) => <>{a}, {b}</>)}{" "}
                    nas env vars da Vercel.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
          <ScrapeControls onStartScrape={handleStartScrape} isLoading={isLoading} />
          <StatsCards stats={stats} />
          <ScrapedDataTable pages={pages} onRemove={removePage} onClearAll={clearAll} />
        </main>
      </div>
    </div>
  );
};

export default Index;
