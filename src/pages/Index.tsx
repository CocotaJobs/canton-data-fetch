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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown scraping error";
}

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
        description: result.description || "",
        markdown: result.markdown,
        status: "completed",
        scrapedAt: new Date().toISOString(),
      });
      toast({ title: "Scraping completed", description: result.title || formattedUrl });
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      updatePage(id, {
        status: "failed",
        error: errorMessage,
      });
      toast({
        title: "Scraping failed",
        description: errorMessage,
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
            <Alert
              className="border-amber-300/80 bg-amber-50/95 text-amber-950 shadow-sm backdrop-blur-sm [&>svg]:text-amber-700"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-amber-900">Configuração incompleta</AlertTitle>
              <AlertDescription className="space-y-2 text-amber-800">
                {!configStatus.supabase.configured && (
                  <p>
                    <strong>Banco de dados:</strong> configure{" "}
                    {configStatus.supabase.missing.map((v) => (
                      <code
                        key={v}
                        className="rounded-md border border-amber-300/80 bg-amber-200/70 px-1.5 py-0.5 text-xs font-semibold text-amber-950"
                      >
                        {v}
                      </code>
                    )).reduce((a, b) => <>{a}, {b}</>)}{" "}
                    nas env vars da Vercel.
                  </p>
                )}
                {!configStatus.api.configured && (
                  <p>
                    <strong>API Backend:</strong> configure{" "}
                    {configStatus.api.missing.map((v) => (
                      <code
                        key={v}
                        className="rounded-md border border-amber-300/80 bg-amber-200/70 px-1.5 py-0.5 text-xs font-semibold text-amber-950"
                      >
                        {v}
                      </code>
                    )).reduce((a, b) => <>{a}, {b}</>)}{" "}
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
