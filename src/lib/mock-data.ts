/**
 * Mock data for development when backend is not connected.
 */
import type { Exhibitor, ScrapeJob } from "./api";

export const mockExhibitors: Exhibitor[] = [
  {
    id: 1, name: "Guangzhou Linuo Electronics Co., Ltd.", booth: "1.1A01",
    category: "Electronics & Household Electrical Appliances", subcategory: "Consumer Electronics",
    country: "China", description: "Leading manufacturer of consumer electronics and smart home devices.",
    products: ["Smart Speakers", "LED Displays", "Home Automation"], email: "sales@linuo.com",
    phone: "+86-20-12345678", website: "https://linuo.com", phase: 1, scraped_at: "2026-03-30T10:00:00Z",
  },
  {
    id: 2, name: "Shenzhen BrightTech Co., Ltd.", booth: "2.1B15",
    category: "Electronics & Household Electrical Appliances", subcategory: "Lighting",
    country: "China", description: "Professional LED lighting solutions for commercial and residential use.",
    products: ["LED Panels", "Smart Bulbs", "Solar Lights"], email: "info@brighttech.cn",
    phone: "+86-755-87654321", website: "https://brighttech.cn", phase: 1, scraped_at: "2026-03-30T10:05:00Z",
  },
  {
    id: 3, name: "Foshan HomeStyle Furniture", booth: "3.2C08",
    category: "Home Decorations & Gifts", subcategory: "Furniture",
    country: "China", description: "Modern furniture design and manufacturing.",
    products: ["Office Chairs", "Standing Desks", "Storage Solutions"], email: "export@homestyle.cn",
    phone: "+86-757-55556666", website: "https://homestyle-furniture.cn", phase: 2, scraped_at: "2026-03-30T10:10:00Z",
  },
  {
    id: 4, name: "Yiwu GreenPack Materials", booth: "4.1D22",
    category: "Textiles & Garments", subcategory: "Packaging",
    country: "China", description: "Eco-friendly packaging solutions.",
    products: ["Biodegradable Bags", "Recycled Boxes", "Compostable Wrap"], email: "green@greenpack.cn",
    phone: "+86-579-11223344", website: "https://greenpack.cn", phase: 3, scraped_at: "2026-03-30T10:15:00Z",
  },
  {
    id: 5, name: "Dongguan PrecisionTools Ltd.", booth: "1.2E10",
    category: "Machinery", subcategory: "Hand Tools",
    country: "China", description: "High-precision hand tools and power tools for industrial use.",
    products: ["Drill Bits", "Wrenches", "Measuring Instruments"], email: "tools@precisiontools.com",
    phone: "+86-769-99887766", website: "https://precisiontools.com", phase: 1, scraped_at: "2026-03-30T10:20:00Z",
  },
];

export const mockJobs: ScrapeJob[] = [
  { id: 1, phase: 1, category: "", status: "completed", total_found: 245, total_scraped: 245, errors: 0, started_at: "2026-03-30T09:00:00Z", completed_at: "2026-03-30T09:45:00Z" },
  { id: 2, phase: 2, category: "Furniture", status: "running", total_found: 0, total_scraped: 87, errors: 2, started_at: "2026-03-30T10:00:00Z", completed_at: null },
  { id: 3, phase: 3, category: "", status: "pending", total_found: 0, total_scraped: 0, errors: 0, started_at: null, completed_at: null },
];
