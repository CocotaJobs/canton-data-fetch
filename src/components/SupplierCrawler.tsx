import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Square, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_AUTO_MAX_PAGES,
  DEFAULT_CANTON_FAIR_SEARCH_URL,
  EMPTY_PAGES_BEFORE_STOP,
  parseCantonFairSearchUrl,
} from "@/lib/canton-fair";

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const API_BASE = RAW_API_BASE.replace(/\/api\/?$/, "");
const APP_API_KEY = import.meta.env.VITE_APP_API_KEY || "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (APP_API_KEY) headers["x-api-key"] = APP_API_KEY;
  return headers;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

interface CrawlLog {
  page: number;
  status: "ok" | "error" | "empty" | "retry" | "info";
  count: number;
  saved: number;
  message: string;
}

interface SupplierCrawlerProps {
  onComplete?: () => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;
const DEFAULT_SEARCH_CONFIG = parseCantonFairSearchUrl(DEFAULT_CANTON_FAIR_SEARCH_URL);
const REQUEST_DELAY = 1500;

const SupplierCrawler = ({ onComplete }: SupplierCrawlerProps) => {
  const [searchUrl, setSearchUrl] = useState(DEFAULT_CANTON_FAIR_SEARCH_URL);
  const [categoryId, setCategoryId] = useState(DEFAULT_SEARCH_CONFIG.categoryId);
  const [queryType, setQueryType] = useState(DEFAULT_SEARCH_CONFIG.queryType);
  const [startPage, setStartPage] = useState(DEFAULT_SEARCH_CONFIG.pageNo);
  const [endPage, setEndPage] = useState(88);
  const [autoPaginate, setAutoPaginate] = useState(true);
  const [maxPages, setMaxPages] = useState(DEFAULT_AUTO_MAX_PAGES);
  const [currentPage, setCurrentPage] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [totalExtracted, setTotalExtracted] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const abortRef = useRef(false);
  const derivedStartPageRef = useRef(DEFAULT_SEARCH_CONFIG.pageNo);

  const addLog = (log: CrawlLog) => {
    setLogs((prev) => [...prev, log]);
  };

  const handleSearchUrlChange = (value: string) => {
    setSearchUrl(value);

    if (isRunning) return;

    try {
      const parsed = parseCantonFairSearchUrl(value);
      const previousDerivedStartPage = derivedStartPageRef.current;

      setCategoryId(parsed.categoryId);
      setQueryType(parsed.queryType);
      setStartPage((currentStartPage) =>
        currentStartPage === previousDerivedStartPage ? parsed.pageNo : currentStartPage,
      );
      derivedStartPageRef.current = parsed.pageNo;
    } catch {
      // Ignore partial URLs while the user is typing.
    }
  };

  const crawlPage = async (
    pageNo: number,
    crawlConfig: { categoryId: string; queryType: number; searchUrl: string },
  ): Promise<{ extracted: number; saved: number }> => {
    const res = await fetch(`${API_BASE}/api/crawl-suppliers`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        pageNo,
        categoryId: crawlConfig.categoryId,
        queryType: crawlConfig.queryType,
        searchUrl: crawlConfig.searchUrl,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erro HTTP ${res.status}`);
    }

    const data = await res.json();
    const suppliers = data.suppliers || [];
    const saved = data.saved || 0;

    if (suppliers.length === 0) {
      addLog({ page: pageNo, status: "empty", count: 0, saved: 0, message: data.message || "Nenhum supplier encontrado" });
      return { extracted: 0, saved: 0 };
    }

    if (data.dbError) {
      addLog({
        page: pageNo,
        status: "ok",
        count: suppliers.length,
        saved: 0,
        message: `${suppliers.length} extraídos, erro ao salvar: ${data.dbError}`,
      });
    } else {
      addLog({
        page: pageNo,
        status: "ok",
        count: suppliers.length,
        saved,
        message: `${suppliers.length} extraídos, ${saved} salvos no banco`,
      });
    }

    return { extracted: suppliers.length, saved };
  };

  const crawlPageWithRetry = async (
    pageNo: number,
    crawlConfig: { categoryId: string; queryType: number; searchUrl: string },
  ): Promise<{ extracted: number; saved: number }> => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await crawlPage(pageNo, crawlConfig);
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        if (attempt < MAX_RETRIES) {
          addLog({
            page: pageNo,
            status: "retry",
            count: 0,
            saved: 0,
            message: `Tentativa ${attempt + 1} falhou: ${errorMessage}. Retentando em ${RETRY_DELAY / 1000}s...`,
          });
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
        } else {
          addLog({
            page: pageNo,
            status: "error",
            count: 0,
            saved: 0,
            message: `Falhou após ${MAX_RETRIES + 1} tentativas: ${errorMessage}`,
          });
          return { extracted: 0, saved: 0 };
        }
      }
    }
    return { extracted: 0, saved: 0 };
  };

  const startCrawl = async () => {
    if (!API_BASE) {
      toast({ title: "Erro", description: "VITE_API_BASE_URL não configurada.", variant: "destructive" });
      return;
    }

    let parsedSearchUrl: ReturnType<typeof parseCantonFairSearchUrl>;
    try {
      parsedSearchUrl = parseCantonFairSearchUrl(searchUrl);
    } catch (error: unknown) {
      toast({ title: "URL inválida", description: getErrorMessage(error), variant: "destructive" });
      return;
    }

    const initialPage = Math.max(1, startPage || parsedSearchUrl.pageNo || 1);
    const lastPage = autoPaginate
      ? initialPage + Math.max(1, maxPages) - 1
      : Math.max(initialPage, endPage);

    setCategoryId(parsedSearchUrl.categoryId);
    setQueryType(parsedSearchUrl.queryType);

    setIsRunning(true);
    setLogs([]);
    setTotalExtracted(0);
    setTotalSaved(0);
    setCurrentPage(initialPage);
    abortRef.current = false;

    let extracted = 0;
    let saved = 0;
    let emptyStreak = 0;
    let pagesChecked = 0;
    let completedLastPage = initialPage - 1;
    let stopMessage = "";

    for (let page = initialPage; page <= lastPage; page++) {
      if (abortRef.current) {
        stopMessage = `Processo interrompido na página ${Math.max(initialPage, page - 1)}.`;
        addLog({ page, status: "info", count: 0, saved: 0, message: "Crawling cancelado pelo usuário" });
        break;
      }

      setCurrentPage(page);

      const result = await crawlPageWithRetry(page, {
        categoryId: parsedSearchUrl.categoryId,
        queryType: parsedSearchUrl.queryType,
        searchUrl: parsedSearchUrl.searchUrl,
      });
      extracted += result.extracted;
      saved += result.saved;
      pagesChecked += 1;
      completedLastPage = page;
      setTotalExtracted(extracted);
      setTotalSaved(saved);

      if (result.extracted === 0) {
        emptyStreak += 1;
      } else {
        emptyStreak = 0;
      }

      if (autoPaginate && emptyStreak >= EMPTY_PAGES_BEFORE_STOP) {
        stopMessage = `Fim da listagem detectado após ${EMPTY_PAGES_BEFORE_STOP} páginas vazias consecutivas.`;
        addLog({
          page,
          status: "info",
          count: 0,
          saved: 0,
          message: stopMessage,
        });
        break;
      }

      if (page < lastPage && !abortRef.current) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY));
      }
    }

    setIsRunning(false);

    if (!stopMessage) {
      stopMessage = autoPaginate
        ? `Limite de segurança atingido após ${pagesChecked} páginas verificadas.`
        : `${pagesChecked} páginas percorridas no intervalo informado.`;
    }

    toast({
      title: abortRef.current ? "Crawling interrompido" : "Crawling finalizado",
      description: `${extracted} extraídos, ${saved} salvos. ${stopMessage}`,
    });

    setCurrentPage(completedLastPage);
    onComplete?.();
  };

  const stopCrawl = () => {
    abortRef.current = true;
  };

  const effectiveLastPage = autoPaginate
    ? startPage + Math.max(1, maxPages) - 1
    : Math.max(startPage, endPage);
  const totalPlannedPages = Math.max(1, effectiveLastPage - startPage + 1);
  const progress = isRunning
    ? Math.min(100, ((currentPage - startPage + 1) / totalPlannedPages) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Crawler de Suppliers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">URL da busca</Label>
          <Input
            value={searchUrl}
            onChange={(e) => handleSearchUrlChange(e.target.value)}
            disabled={isRunning}
            className="text-xs"
            placeholder="https://365.cantonfair.org.cn/zh-CN/search?..."
          />
          <p className="text-xs text-muted-foreground">
            Query type {queryType} · categoryId {categoryId}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <Label className="text-xs">Percorrer até o fim da listagem</Label>
            <p className="text-xs text-muted-foreground">
              Para automaticamente após {EMPTY_PAGES_BEFORE_STOP} páginas vazias seguidas.
            </p>
          </div>
          <Switch checked={autoPaginate} onCheckedChange={setAutoPaginate} disabled={isRunning} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">Página inicial</Label>
            <Input
              type="number"
              min={1}
              value={startPage}
              onChange={(e) => setStartPage(Number(e.target.value) || 1)}
              disabled={isRunning}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">
              {autoPaginate ? "Máximo de páginas" : "Página final"}
            </Label>
            <Input
              type="number"
              min={1}
              value={autoPaginate ? maxPages : endPage}
              onChange={(e) =>
                autoPaginate
                  ? setMaxPages(Number(e.target.value) || 1)
                  : setEndPage(Number(e.target.value) || 1)
              }
              disabled={isRunning}
              className="text-xs"
            />
          </div>
          <div>
            <div className="rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
              {autoPaginate
                ? `Vai testar da página ${startPage} até, no máximo, a ${effectiveLastPage}.`
                : `Vai percorrer da página ${startPage} até a ${Math.max(startPage, endPage)}.`}
            </div>
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
              Página {currentPage}
              {autoPaginate ? ` de até ${effectiveLastPage}` : ` de ${Math.max(startPage, endPage)}`}
            </div>
          )}

          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {totalExtracted} extraídos · {totalSaved} salvos
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
                      : log.status === "retry"
                      ? "text-yellow-600"
                      : log.status === "info"
                      ? "text-blue-600"
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
