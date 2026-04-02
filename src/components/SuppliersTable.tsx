import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Supplier {
  id: string;
  company_name: string;
  description: string;
  products: string[];
  segment: string;
  images: string[];
  website_url: string;
  source_url: string;
  booth: string;
  created_at: string;
}

interface SuppliersTableProps {
  refreshKey?: number;
}

const SuppliersTable = ({ refreshKey }: SuppliersTableProps) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error && data) {
      setSuppliers(data as Supplier[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [refreshKey]);

  const segments = [...new Set(suppliers.map((s) => s.segment).filter(Boolean))];

  const filtered = suppliers.filter((s) => {
    const matchesText =
      !filter ||
      s.company_name.toLowerCase().includes(filter.toLowerCase()) ||
      s.products.some((p) => p.toLowerCase().includes(filter.toLowerCase()));
    const matchesSegment = !segmentFilter || s.segment === segmentFilter;
    return matchesText && matchesSegment;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Suppliers ({filtered.length}
            {filtered.length !== suppliers.length ? ` de ${suppliers.length}` : ""})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSuppliers} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nome ou produto..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs"
          />
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="rounded-md border bg-background px-2 text-xs"
          >
            <option value="">Todos segmentos</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Estande</TableHead>
                <TableHead>Site</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                    {loading ? "Carregando..." : "Nenhum supplier encontrado"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <>
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    >
                      <TableCell>
                        {expandedId === s.id ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-xs">{s.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {s.segment || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {s.products.slice(0, 3).join(", ")}
                        {s.products.length > 3 && ` +${s.products.length - 3}`}
                      </TableCell>
                      <TableCell className="text-xs">{s.booth || "—"}</TableCell>
                      <TableCell>
                        {s.website_url ? (
                          <a
                            href={s.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-primary" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === s.id && (
                      <TableRow key={`${s.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="space-y-2 text-xs">
                            <p className="text-muted-foreground">{s.description}</p>
                            <div>
                              <span className="font-medium">Produtos: </span>
                              {s.products.join(", ")}
                            </div>
                            {s.images.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {s.images.map((img, i) => (
                                  <img
                                    key={i}
                                    src={img}
                                    alt={`${s.company_name} ${i + 1}`}
                                    className="h-16 w-16 rounded object-cover border"
                                    loading="lazy"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuppliersTable;
