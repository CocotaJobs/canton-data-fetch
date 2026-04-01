import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Search, Sparkles, Globe, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { loadProfile, saveProfile, type CompanyProfile } from "@/lib/company-profile";
import { scrapeWebsite, extractProfileFromWebsite } from "@/lib/ai-match";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onSubmit: (profile: CompanyProfile) => void;
  isLoading: boolean;
}

const CompanyProfileForm = ({ onSubmit, isLoading }: Props) => {
  const [profile, setProfile] = useState<CompanyProfile>(loadProfile);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const update = (field: keyof CompanyProfile, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

  const handleExtractFromWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setIsExtracting(true);
    try {
      toast({ title: "Analisando site...", description: "Extraindo conteúdo com Firecrawl" });

      const scrapeResult = await scrapeWebsite(websiteUrl.trim());

      toast({ title: "Conteúdo extraído!", description: "IA analisando o perfil da empresa..." });

      const extracted = await extractProfileFromWebsite(scrapeResult.markdown, websiteUrl.trim());

      setProfile((prev) => ({
        name: extracted.name || prev.name,
        industry: extracted.industry || prev.industry,
        description: extracted.description || prev.description,
        lookingFor: extracted.lookingFor || prev.lookingFor,
        keywords: extracted.keywords || prev.keywords,
      }));

      toast({
        title: "Perfil extraído com sucesso!",
        description: "Revise os campos e ajuste se necessário antes de buscar matches.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao analisar site",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Building2 className="h-4 w-4 text-primary" />
            Company Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Website URL extraction */}
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Globe className="h-4 w-4" />
              Importar perfil do site
            </div>
            <p className="text-xs text-muted-foreground">
              Cole a URL do seu site e a IA extrairá automaticamente o contexto da sua empresa.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://suaempresa.com.br"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isExtracting}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleExtractFromWebsite}
                disabled={isExtracting || !websiteUrl.trim()}
                className="gap-2 shrink-0"
              >
                {isExtracting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Extrair</>
                )}
              </Button>
            </div>
          </div>

          {/* Manual fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Company Name</Label>
              <Input id="name" placeholder="Acme Corp" value={profile.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry" className="text-xs">Industry</Label>
              <Input id="industry" placeholder="Electronics, Lighting, etc." value={profile.industry} onChange={(e) => update("industry", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Company Description</Label>
            <Textarea id="description" placeholder="We are a distributor specializing in..." rows={2} value={profile.description} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lookingFor" className="text-xs">What are you looking for?</Label>
            <Textarea id="lookingFor" placeholder="Smart home devices, LED panels, eco-friendly packaging..." rows={2} value={profile.lookingFor} onChange={(e) => update("lookingFor", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="keywords" className="text-xs">Keywords (comma-separated)</Label>
            <Input id="keywords" placeholder="LED, smart, sustainable, OEM" value={profile.keywords} onChange={(e) => update("keywords", e.target.value)} />
          </div>
          <Button onClick={() => onSubmit(profile)} disabled={isLoading || !profile.name} className="w-full gap-2">
            {isLoading ? (
              <><Search className="h-4 w-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Find Matches</>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CompanyProfileForm;
