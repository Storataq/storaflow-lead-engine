"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createProspectAction,
  createProspectSearchAction,
} from "@/lib/prospecting/actions";
import { EMPLOYEE_BANDS, REVENUE_BANDS } from "@/lib/prospecting/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProspectSearchForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("ICP search");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [employeeBand, setEmployeeBand] = useState("");
  const [revenueBand, setRevenueBand] = useState("");
  const [technology, setTechnology] = useState("");
  const [keyword, setKeyword] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await createProspectSearchAction({
              name,
              industry: industry || null,
              country: country || null,
              region: region || null,
              city: city || null,
              employeeBand: employeeBand || null,
              revenueBand: revenueBand || null,
              technology: technology || null,
              keyword: keyword || null,
              importMatchingCompanies: true,
            });
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          });
        }}
      >
        <p className="text-sm font-medium">Prospect search / ICP</p>
        <div className="space-y-1.5">
          <Label>Search name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Branche</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Land</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Provincie / regio</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Stad</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Medewerkers</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={employeeBand}
              onChange={(e) => setEmployeeBand(e.target.value)}
            >
              <option value="">—</option>
              {EMPLOYEE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Omzetklasse</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={revenueBand}
              onChange={(e) => setRevenueBand(e.target.value)}
            >
              <option value="">—</option>
              {REVENUE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Technologie</Label>
            <Input value={technology} onChange={(e) => setTechnology(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Trefwoorden</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Searching…" : "Search & import matching companies"}
        </Button>
      </form>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await createProspectAction({
              companyName,
              websiteUrl: websiteUrl || null,
              industry: industry || null,
              country: country || null,
              region: region || null,
              city: city || null,
              employeeBand: employeeBand || null,
              revenueBand: revenueBand || null,
              technology: technology || null,
              keyword: keyword || null,
              runResearch: true,
            });
            if (r.success) {
              toast.success(r.message);
              setCompanyName("");
              setWebsiteUrl("");
            } else toast.error(r.message);
          });
        }}
      >
        <p className="text-sm font-medium">Add prospect + research</p>
        <div className="space-y-1.5">
          <Label>Bedrijfsnaam</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
        <Button type="submit" disabled={pending || !companyName.trim()}>
          {pending ? "Working…" : "Create & research"}
        </Button>
      </form>
    </div>
  );
}
