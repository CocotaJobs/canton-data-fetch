import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, Mail, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Exhibitor } from "@/lib/api";

interface ExhibitorTableProps {
  exhibitors: Exhibitor[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const ExhibitorTable = ({ exhibitors, total, page, pageSize, onPageChange }: ExhibitorTableProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-lg bg-card shadow-card"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Exhibitors
        </h2>
        <span className="text-xs text-muted-foreground">{total} results</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Company</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Booth</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Country</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Phase</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {exhibitors.map((ex) => (
              <>
                <tr
                  key={ex.id}
                  onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
                  className="cursor-pointer border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-foreground">{ex.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{ex.booth}</td>
                  <td className="px-5 py-3 text-muted-foreground">{ex.category}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {ex.country}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="text-xs">
                      P{ex.phase}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        expandedId === ex.id ? "rotate-180" : ""
                      }`}
                    />
                  </td>
                </tr>
                <AnimatePresence>
                  {expandedId === ex.id && (
                    <tr key={`detail-${ex.id}`}>
                      <td colSpan={6} className="bg-muted/20 px-5 py-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-4 py-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Description</p>
                              <p className="text-sm text-foreground leading-relaxed">{ex.description || "—"}</p>
                              <p className="text-xs font-medium text-muted-foreground pt-2">Products</p>
                              <div className="flex flex-wrap gap-1.5">
                                {ex.products.length > 0
                                  ? ex.products.map((p, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                                    ))
                                  : <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Contact</p>
                              <div className="space-y-1.5 text-sm">
                                {ex.email && (
                                  <a href={`mailto:${ex.email}`} className="flex items-center gap-2 text-foreground hover:text-secondary">
                                    <Mail className="h-3.5 w-3.5" /> {ex.email}
                                  </a>
                                )}
                                {ex.phone && (
                                  <p className="flex items-center gap-2 text-foreground">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {ex.phone}
                                  </p>
                                )}
                                {ex.website && (
                                  <a href={ex.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-secondary">
                                    <ExternalLink className="h-3.5 w-3.5" /> {ex.website}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40 hover:bg-muted/80 transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40 hover:bg-muted/80 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ExhibitorTable;
