import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Search, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { loadProfile, saveProfile, type CompanyProfile } from "@/lib/company-profile";

interface Props {
  onSubmit: (profile: CompanyProfile) => void;
  isLoading: boolean;
}

const CompanyProfileForm = ({ onSubmit, isLoading }: Props) => {
  const [profile, setProfile] = useState<CompanyProfile>(loadProfile);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const update = (field: keyof CompanyProfile, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

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
