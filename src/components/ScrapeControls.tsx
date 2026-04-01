import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ScrapeControlsProps {
  onStartScrape: (url: string) => void;
  isLoading?: boolean;
}

const ScrapeControls = ({ onStartScrape, isLoading }: ScrapeControlsProps) => {
  const [url, setUrl] = useState("");

  const handleStart = () => {
    if (!url.trim()) return;
    onStartScrape(url.trim());
    setUrl("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-lg glass p-5 shadow-card"
    >
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Scrape Website
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[300px] flex-1 space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            URL to scrape
          </Label>
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            className="h-9 text-sm"
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={handleStart}
          disabled={isLoading || !url.trim()}
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
