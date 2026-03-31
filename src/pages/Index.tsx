import { useState, useCallback } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import ScrapeControls from "@/components/ScrapeControls";
import StatsCards from "@/components/StatsCards";
import JobsTable from "@/components/JobsTable";
import ExhibitorTable from "@/components/ExhibitorTable";
import { mockExhibitors, mockJobs } from "@/lib/mock-data";
import type { ScrapeJob } from "@/lib/api";

const Index = () => {
  const [jobs, setJobs] = useState<ScrapeJob[]>(mockJobs);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartScrape = useCallback((phase: number, category: string) => {
    setIsLoading(true);
    const newJob: ScrapeJob = {
      id: jobs.length + 1,
      phase,
      category: category || null,
      status: "running",
      total_found: 0,
      total_scraped: 0,
      errors: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
    };
    setJobs((prev) => [newJob, ...prev]);

    // Simulate completion
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? { ...j, status: "completed" as const, total_scraped: 156, completed_at: new Date().toISOString() }
            : j
        )
      );
      setIsLoading(false);
    }, 3000);
  }, [jobs.length]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        <ScrapeControls onStartScrape={handleStartScrape} isLoading={isLoading} />
        <StatsCards jobs={jobs} totalExhibitors={mockExhibitors.length} />
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <JobsTable jobs={jobs} />
          </div>
          <div className="lg:col-span-3">
            <ExhibitorTable
              exhibitors={mockExhibitors}
              total={mockExhibitors.length}
              page={page}
              pageSize={20}
              onPageChange={setPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
