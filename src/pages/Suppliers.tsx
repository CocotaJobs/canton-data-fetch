import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import SupplierCrawler from "@/components/SupplierCrawler";
import SuppliersTable from "@/components/SuppliersTable";

const Suppliers = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-6 py-6 space-y-6">
        <SupplierCrawler onComplete={() => setRefreshKey((k) => k + 1)} />
        <SuppliersTable refreshKey={refreshKey} />
      </main>
    </div>
  );
};

export default Suppliers;
