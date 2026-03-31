import { motion } from "framer-motion";
import { Database, Globe } from "lucide-react";

const DashboardHeader = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border bg-card px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              Canton Fair Scraper
            </h1>
            <p className="text-xs text-muted-foreground">
              Exhibitor data extraction platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          <span>Demo Mode</span>
        </div>
      </div>
    </motion.header>
  );
};

export default DashboardHeader;
