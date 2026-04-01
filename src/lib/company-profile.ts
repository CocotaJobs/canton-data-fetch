import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CompanyProfile {
  name: string;
  industry: string;
  description: string;
  lookingFor: string;
  keywords: string;
}

const EMPTY_PROFILE: CompanyProfile = {
  name: "",
  industry: "",
  description: "",
  lookingFor: "",
  keywords: "",
};

export function useCompanyProfile() {
  const queryClient = useQueryClient();

  const { data: profile = EMPTY_PROFILE, isLoading } = useQuery({
    queryKey: ["company-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_profiles")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return EMPTY_PROFILE;
      return {
        name: data.name || "",
        industry: data.industry || "",
        description: data.description || "",
        lookingFor: data.looking_for || "",
        keywords: data.keywords || "",
      } as CompanyProfile;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (p: CompanyProfile) => {
      const { data: existing } = await supabase
        .from("company_profiles")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("company_profiles")
          .update({
            name: p.name,
            industry: p.industry,
            description: p.description,
            looking_for: p.lookingFor,
            keywords: p.keywords,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_profiles").insert({
          name: p.name,
          industry: p.industry,
          description: p.description,
          looking_for: p.lookingFor,
          keywords: p.keywords,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-profile"] }),
  });

  const saveProfile = (p: CompanyProfile) => {
    queryClient.setQueryData(["company-profile"], p);
    saveMutation.mutate(p);
  };

  return { profile, saveProfile, isLoading };
}

// Backward-compatible exports
export function loadProfile(): CompanyProfile {
  return EMPTY_PROFILE;
}

export function saveProfile(_profile: CompanyProfile) {
  // No-op — use useCompanyProfile hook instead
}
