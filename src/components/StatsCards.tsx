import { motion } from "framer-motion";
import { Users, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { ScrapeJob } from "@/lib/api";

interface StatsCardsProps {
  jobs: ScrapeJob[];
  totalExhibitors: number;
}

const StatsCards = ({ jobs, totalExhibitors }: StatsCardsProps) => {
  const running = jobs.filter((j) => j.status === "running").length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const totalErrors = jobs.reduce((sum, j) => sum + j.errors, 0);

  const stats = [
    { label: "Total Exhibitors", value: totalExhibitors, icon: Users, color: "text-primary" },
    { label: "Running Jobs", value: running, icon: Clock, color: "text-warning" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-success" },
    { label: "Errors", value: totalErrors, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="mt-2 text-2xl font-bold font-display text-foreground">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;
