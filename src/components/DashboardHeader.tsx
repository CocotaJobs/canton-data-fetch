import { motion } from "framer-motion";
import { Database, Globe, Sparkles, LayoutDashboard } from "lucide-react";
import { NavLink } from "./NavLink";

const DashboardHeader = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card px-6 py-4 shadow-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-normal tracking-tight text-foreground">
              Canton Fair Scraper
            </h1>
            <p className="text-xs text-muted-foreground">
              Exhibitor data extraction platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors" activeClassName="bg-primary text-primary-foreground" pendingClassName="opacity-50">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </NavLink>
          <NavLink to="/match" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors" activeClassName="bg-primary text-primary-foreground" pendingClassName="opacity-50">
            <Sparkles className="h-3.5 w-3.5" />
            AI Match
          </NavLink>
          <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span>Demo Mode</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default DashboardHeader;
