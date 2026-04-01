import { motion, AnimatePresence } from "framer-motion";
import { Award, ChevronDown, ChevronUp, ExternalLink, Mail, Package } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Exhibitor } from "@/lib/api";
import type { MatchResult } from "@/lib/ai-match";

interface Props {
  matches: MatchResult[];
  exhibitors: Exhibitor[];
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-success text-success-foreground";
  if (score >= 60) return "bg-secondary text-secondary-foreground";
  if (score >= 40) return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

const MatchResults = ({ matches, exhibitors }: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  const enriched = matches
    .map((m) => ({ ...m, exhibitor: exhibitors.find((e) => e.id === m.exhibitorId) }))
    .filter((m) => m.exhibitor)
    .sort((a, b) => b.score - a.score);

  if (!enriched.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-secondary" />
            Match Results
            <Badge variant="secondary" className="ml-auto text-xs">{enriched.length} found</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <AnimatePresence>
            {enriched.map((m, i) => {
              const ex = m.exhibitor!;
              const isOpen = expanded === ex.id;
              return (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-sm border border-border bg-background p-3 cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => setExpanded(isOpen ? null : ex.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{ex.name}</span>
                        <Badge className={`${scoreColor(m.score)} text-[10px] px-1.5 py-0`}>{m.score}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.reasoning}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                          <p className="text-muted-foreground">{m.reasoning}</p>
                          <div className="flex flex-wrap gap-1">
                            <Package className="h-3 w-3 text-muted-foreground mt-0.5" />
                            {m.suggestedProducts.map((p) => (
                              <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>Booth: {ex.booth}</span>
                            <span>Phase {ex.phase}</span>
                            {ex.email && (
                              <a href={`mailto:${ex.email}`} className="flex items-center gap-1 text-foreground hover:text-secondary" onClick={(e) => e.stopPropagation()}>
                                <Mail className="h-3 w-3" /> Email
                              </a>
                            )}
                            {ex.website && (
                              <a href={ex.website} target="_blank" rel="noopener" className="flex items-center gap-1 text-foreground hover:text-secondary" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-3 w-3" /> Website
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MatchResults;
