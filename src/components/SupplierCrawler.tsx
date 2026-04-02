import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Square, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const API_BASE = RAW_API_BASE.replace(/\/api\/?$/, "");
const APP_API_KEY = import.meta.env.VITE_APP_API_KEY || "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (APP_API_KEY) headers["x-api-key"] = APP_API_KEY;
  return headers;
}

interface CrawlLog {
  page: number;
  status: "ok" | "error" | "empty";
  count: number;
  message: string;
}

interface SupplierCrawlerProps {
  onComplete?: () => void;
}

const SupplierCrawler = ({ onComplete }: SupplierCrawlerProps) => {
  const [categoryId, setCategoryId] = useState("461147369757478912");
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(88);
  const [currentPage, setCurrentPage] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [totalExtracted, setTotalExtracted] = useState(0);
  const abortRef = useRef(false);

  const addLog = (log: CrawlLog) => {
    setLogs((prev) => [...prev, log]);
  };

  const crawlPage = async (pageNo: number): Promise<number> => {
    const res = await fetch(`${API_BASE}/api/crawl-suppliers`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ pageNo, categoryId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erro HTTP ${res.status}`);
    }

    const data = await res.json();
    const suppliers = data.suppliers || [];

    if (suppliers.length === 0) {
      addLog({ page: pageNo, status: "empty", count: 0, message: "Nenhum supplier encontrado" });
      return 0;
    }

    // Insert into Supabase
    if (isSupabaseConfigured) {
      const rows = suppliers.map((s: any) => ({
        company_name: s.company_name,
        description: s.description || "",
        products: s.products || [],
        segment: s.segment || "",
        images: s.images || [],
        website_url: s.website_url || "",
        source_url: s.source_url || "",
        booth: s.booth || "",
        raw_content: s,
      }));

      const { error } = await supabase.from("suppliers").insert(rows);
      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(`Erro ao salvar no banco: ${error.message}`);
      }
    }

    addLog({
      page: pageNo,
      status: "ok",
      count: suppliers.length,
      message: `${suppliers.length} suppliers extraídos`,
    });

    return suppliers.length;
  };

  const startCrawl = async () => {
    if (!API_BASE) {
      toast({
        title: "Erro",
        description: "VITE_API_BASE_URL não configurada.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setTotalExtracted(0);
    setCurrentPage(startPage);
    abortRef.current = false;

    let total = 0;

    for (let page = startPage; page <= endPage; page++) {
      if (abortRef.current) {
        addLog({ page, status: "error", count: 0, message: "Crawling cancelado pelo usuário" });
        break;
      }

      setCurrentPage(page);

      try {
        const count = await crawlPage(page);
        total += count;
        setTotalExtracted(total);
      } catch (err: any) {
        addLog({ page, status: "error", count: 0, message: err.message });
      }

      // Rate limiting delay
      if (page < endPage && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setIsRunning(false);
    toast({
      title: "Crawling finalizado",
      description: `${total} suppliers extraídos de ${endPage - startPage + 1} páginas.`,
    });
    onComplete?.();
  };

  const stopCrawl = () => {
    abortRef.current = true;
  };

  const progress = isRunning
    ? ((currentPage - startPage) / (endPage - startPage + 1)) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Crawler de Suppliers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Category ID</Label>
            <Input
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isRunning}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Página inicial</Label>
            <Input
              type="number"
              min={1}
              value={startPage}
              onChange={(e) => setStartPage(Number(e.target.value))}
              disabled={isRunning}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Página final</Label>
            <Input
              type="number"
              min={1}
              value={endPage}
              onChange={(e) => setEndPage(Number(e.target.value))}
              disabled={isRunning}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isRunning ? (
            <Button onClick={startCrawl} size="sm" className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Iniciar Crawling
            </Button>
          ) : (
            <Button onClick={stopCrawl} size="sm" variant="destructive" className="gap-1.5">
              <Square className="h-3.5 w-3.5" />
              Parar
            </Button>
          )}

          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Página {currentPage} de {endPage}
            </div>
          )}

          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {totalExtracted} suppliers extraídos
          </span>
        </div>

        {isRunning && <Progress value={progress} className="h-2" />}

        {logs.length > 0 && (
          <ScrollArea className="h-40 rounded-md border p-2">
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`text-xs font-mono ${
                    log.status === "ok"
                      ? "text-green-600"
                      : log.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  [Pág {log.page}] {log.message}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierCrawler;
