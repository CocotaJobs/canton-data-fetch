export interface CompanyProfile {
  name: string;
  industry: string;
  description: string;
  lookingFor: string;
  keywords: string;
}

const STORAGE_KEY = "canton-fair-company-profile";

export function loadProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "", industry: "", description: "", lookingFor: "", keywords: "" };
}

export function saveProfile(profile: CompanyProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
