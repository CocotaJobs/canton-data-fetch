import { motion } from "framer-motion";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
}

const StatsCards = ({ stats }: StatsCardsProps) => {
  const cards = [
    { label: "Total Scraped", value: stats.total, icon: FileText, color: "text-foreground" },
    { label: "Running", value: stats.running, icon: Clock, color: "text-warning" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-success" },
    { label: "Errors", value: stats.failed, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05 }}
          className="rounded-lg glass p-5 shadow-card hover:shadow-elevated transition-shadow duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;
