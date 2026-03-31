/**
 * API client for Canton Fair Scraper backend.
 * Configure API_BASE_URL to point to your FastAPI instance.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface Exhibitor {
  id: number;
  name: string;
  booth: string;
  category: string;
  subcategory: string;
  country: string;
  description: string;
  products: string[];
  email: string;
  phone: string;
  website: string;
  phase: number;
  scraped_at: string;
}

export interface ScrapeJob {
  id: number;
  phase: number;
  category: string | null;
  status: "pending" | "running" | "completed" | "failed";
  total_found: number;
  total_scraped: number;
  errors: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface ExhibitorsResponse {
  total: number;
  page: number;
  page_size: number;
  data: Exhibitor[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  startScrape: (phase: number, category?: string) =>
    apiFetch<{ job_id: number; status: string }>("/scrape/start", {
      method: "POST",
      body: JSON.stringify({ phase, category: category || "" }),
    }),

  getScrapeStatus: () =>
    apiFetch<{ jobs: ScrapeJob[] }>("/scrape/status"),

  getExhibitors: (params: {
    phase?: number;
    category?: string;
    country?: string;
    page?: number;
    page_size?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.phase) searchParams.set("phase", String(params.phase));
    if (params.category) searchParams.set("category", params.category);
    if (params.country) searchParams.set("country", params.country);
    searchParams.set("page", String(params.page || 1));
    searchParams.set("page_size", String(params.page_size || 20));
    return apiFetch<ExhibitorsResponse>(`/exhibitors?${searchParams}`);
  },

  getExhibitor: (id: number) =>
    apiFetch<Exhibitor>(`/exhibitors/${id}`),
};
