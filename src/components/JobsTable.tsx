import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { ScrapeJob } from "@/lib/api";

interface JobsTableProps {
  jobs: ScrapeJob[];
}

const statusConfig: Record<string, { className: string }> = {
  completed: { className: "bg-success/10 text-success border-success/20" },
  running: { className: "bg-warning/10 text-warning border-warning/20 animate-pulse-slow" },
  pending: { className: "bg-muted text-muted-foreground border-border" },
  failed: { className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const JobsTable = ({ jobs }: JobsTableProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-lg glass shadow-card"
    >
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Scrape Jobs
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">ID</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Phase</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Scraped</th>
              <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Errors</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-border/50 last:border-0 hover:bg-accent/5 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">#{job.id}</td>
                <td className="px-5 py-3 font-medium text-foreground">Phase {job.phase}</td>
                <td className="px-5 py-3 text-muted-foreground">{job.category || "All"}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={statusConfig[job.status]?.className}>
                    {job.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-mono text-foreground">{job.total_scraped}</td>
                <td className="px-5 py-3 font-mono text-foreground">{job.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default JobsTable;
