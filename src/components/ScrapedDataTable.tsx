import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import type { ScrapedPage } from "@/hooks/use-scraped-data";

interface Props {
  pages: ScrapedPage[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const statusConfig: Record<string, { className: string }> = {
  completed: { className: "bg-success/10 text-success border-success/20" },
  running: { className: "bg-warning/10 text-warning border-warning/20 animate-pulse-slow" },
  failed: { className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ScrapedDataTable = ({ pages, onRemove, onClearAll }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewFull, setViewFull] = useState<ScrapedPage | null>(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-lg glass shadow-card"
      >
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Scraped Data
          </h2>
          {pages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-muted-foreground hover:text-destructive">
              Clear All
            </Button>
          )}
        </div>

        {pages.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No pages scraped yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Enter a URL above to start scraping</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {pages.map((page) => {
              const isOpen = expanded === page.id;
              return (
                <div key={page.id} className="hover:bg-accent/5 transition-colors">
                  <div
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : page.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {page.title || page.url}
                        </span>
                        <Badge variant="outline" className={statusConfig[page.status]?.className}>
                          {page.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{page.url}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(page.scrapedAt).toLocaleString()}
                      </span>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemove(page.id); }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && page.markdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 space-y-2">
                          {page.error && (
                            <p className="text-xs text-destructive">{page.error}</p>
                          )}
                          <div className="rounded-md glass p-3 max-h-48 overflow-auto">
                            <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                              <ReactMarkdown>
                                {page.markdown.slice(0, 2000) + (page.markdown.length > 2000 ? "\n\n..." : "")}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={(e) => { e.stopPropagation(); setViewFull(page); }}
                          >
                            View Full Content
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <Dialog open={!!viewFull} onOpenChange={() => setViewFull(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-sm">{viewFull?.title || viewFull?.url}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none p-4">
              <ReactMarkdown>{viewFull?.markdown || ""}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScrapedDataTable;
