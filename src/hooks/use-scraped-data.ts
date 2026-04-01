import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

function rowToPage(row: any): ScrapedPage {
  return {
    id: row.id,
    url: row.url,
    title: row.title || "",
    markdown: row.markdown || "",
    description: row.description || "",
    scrapedAt: row.scraped_at,
    status: row.status,
    error: row.error || undefined,
  };
}

export function useScrapedData() {
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["scraped-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraped_pages")
        .select("*")
        .order("scraped_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToPage);
    },
  });

  const addPageMutation = useMutation({
    mutationFn: async (page: ScrapedPage) => {
      const { error } = await supabase.from("scraped_pages").insert({
        id: page.id,
        url: page.url,
        title: page.title,
        markdown: page.markdown,
        description: page.description,
        status: page.status,
        error: page.error || null,
        scraped_at: page.scrapedAt,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraped-pages"] }),
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScrapedPage> }) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.markdown !== undefined) dbUpdates.markdown = updates.markdown;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.error !== undefined) dbUpdates.error = updates.error;
      if (updates.scrapedAt !== undefined) dbUpdates.scraped_at = updates.scrapedAt;

      const { error } = await supabase
        .from("scraped_pages")
        .update(dbUpdates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraped-pages"] }),
  });

  const removePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scraped_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraped-pages"] }),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("scraped_pages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraped-pages"] }),
  });

  const addPage = useCallback((page: ScrapedPage) => {
    queryClient.setQueryData<ScrapedPage[]>(["scraped-pages"], (old = []) => [page, ...old]);
    addPageMutation.mutate(page);
  }, [addPageMutation, queryClient]);

  const updatePage = useCallback((id: string, updates: Partial<ScrapedPage>) => {
    queryClient.setQueryData<ScrapedPage[]>(["scraped-pages"], (old = []) =>
      old.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    updatePageMutation.mutate({ id, updates });
  }, [updatePageMutation, queryClient]);

  const removePage = useCallback((id: string) => {
    queryClient.setQueryData<ScrapedPage[]>(["scraped-pages"], (old = []) =>
      old.filter((p) => p.id !== id)
    );
    removePageMutation.mutate(id);
  }, [removePageMutation, queryClient]);

  const clearAll = useCallback(() => {
    queryClient.setQueryData<ScrapedPage[]>(["scraped-pages"], []);
    clearAllMutation.mutate();
  }, [clearAllMutation, queryClient]);

  const stats = {
    total: pages.length,
    running: pages.filter((p) => p.status === "running").length,
    completed: pages.filter((p) => p.status === "completed").length,
    failed: pages.filter((p) => p.status === "failed").length,
  };

  return { pages, addPage, updatePage, removePage, clearAll, stats, isLoading };
}
