import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ScrapeControlsProps {
  onStartScrape: (phase: number, category: string) => void;
  isLoading?: boolean;
}

const PHASES = [1, 2, 3] as const;

const ScrapeControls = ({ onStartScrape, isLoading }: ScrapeControlsProps) => {
  const [selectedPhase, setSelectedPhase] = useState<number>(1);
  const [category, setCategory] = useState("");
  const { toast } = useToast();

  const handleStart = () => {
    onStartScrape(selectedPhase, category);
    toast({
      title: "Scraping started",
      description: `Phase ${selectedPhase}${category ? ` — ${category}` : ""}`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-lg bg-card p-5 shadow-card"
    >
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Scrape Controls
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Phase</Label>
          <div className="flex gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPhase(p)}
                className={`flex h-9 w-12 items-center justify-center rounded-md text-sm font-medium transition-all ${
                  selectedPhase === p
                    ? "bg-primary text-primary-foreground shadow-button"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label className="text-xs text-muted-foreground">Category (optional)</Label>
          <Input
            placeholder="e.g. Electronics, Furniture"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <Button
          onClick={handleStart}
          disabled={isLoading}
          className="h-9 gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Start Scraping
        </Button>
      </div>
    </motion.div>
  );
};

export default ScrapeControls;
