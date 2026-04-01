import { useState, useCallback, useEffect } from "react";

export interface ScrapedPage {
  id: string;
  url: string;
  title: string;
  markdown: string;
  description: string;
  scrapedAt: string;
  status: "running" | "completed" | "failed";
  error?: string;
}

const STORAGE_KEY = "scraped-pages";

function loadFromStorage(): ScrapedPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(pages: ScrapedPage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export function useScrapedData() {
  const [pages, setPages] = useState<ScrapedPage[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(pages);
  }, [pages]);

  const addPage = useCallback((page: ScrapedPage) => {
    setPages((prev) => [page, ...prev]);
  }, []);

  const updatePage = useCallback((id: string, updates: Partial<ScrapedPage>) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const removePage = useCallback((id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setPages([]);
  }, []);

  const stats = {
    total: pages.length,
    running: pages.filter((p) => p.status === "running").length,
    completed: pages.filter((p) => p.status === "completed").length,
    failed: pages.filter((p) => p.status === "failed").length,
  };

  return { pages, addPage, updatePage, removePage, clearAll, stats };
}
