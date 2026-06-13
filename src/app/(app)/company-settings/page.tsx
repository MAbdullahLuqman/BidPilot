"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  Loader2Icon,
  PaperclipIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { COMPANY_SIZES, ROUTES, SECTORS } from "@/lib/constants";
import {
  saveStoredCompany,
  useStoredCompany,
  type StoredCompany,
  type StoredPastProject,
} from "@/lib/client-storage";
import {
  useStoredDatasets,
  deleteDataset,
  type TrainingDataset,
} from "@/lib/dataset-store";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

const emptyProject: StoredPastProject = {
  title: "", clientName: "", clientType: "", sector: "", projectValue: "",
  yearCompleted: "", durationMonths: "", scopeSummary: "",
  evidenceUploaded: false, performanceCertAvailable: false,
};

const emptyCompany: StoredCompany = {
  companyName: "", tradingName: "", category: "construction",
  sector: "Engineering & Construction", city: "", country: "Pakistan",
  websiteUrl: "", contactPerson: "", contactEmail: "", phone: "",
  ntn: "", strn: "", secp: "", activetaxpayer: "", pecCategory: "",
  otherLicenses: "", taxDocsUploaded: false, taxDocNames: "", regDocsUploaded: false, regDocNames: "",
  mainServices: "", secondaryServices: "", industriesServed: "",
  geographicCoverage: "", clientType: "both", typicalProjectSize: "",
  yearsInBusiness: "", size: "11-50", description: "",
  pastProjects: [],
  isoCertifications: "", otherCertifications: "", customCertificates: [], vendorRegistrations: "",
  financialDocsAvailable: false, financialDocNames: "", bankStatementsAvailable: false, bankDocNames: "",
  numEmployees: "", keyExperts: "", softwareTools: "",
  logoUrl: "", coverPageUrl: "", letterheadUrl: "",
  taxFileUrls: [], regFileUrls: [], certFileUrls: [],
};

const STEP_LABELS = ["Basic info & legal", "Services & experience", "Past projects", "Certifications & team", "Training datasets"];

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Toggle({ label, checked, onChange, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors", checked ? "bg-emerald-500" : "bg-muted")}>
        <span className={cn("inline-block size-5 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </button>
    </label>
  );
}

// Reads files as data URLs and returns them
function readFilesAsDataUrls(files: FileList): Promise<string[]> {
  return Promise.all(
    Array.from(files).map(
      (f) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(f);
        }),
    ),
  );
}

function FileUploadList({
  urls,
  onAdd,
  onRemove,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
}: {
  urls: string[];
  onAdd: (newUrls: string[]) => void;
  onRemove: (index: number) => void;
  accept?: string;
}) {
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const newUrls = await readFilesAsDataUrls(e.target.files);
    onAdd(newUrls);
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      {urls.map((url, i) => {
        const name = url.split(";")[0].replace("data:", "").replace(/\//g, ".").slice(0, 30);
        return (
          <div key={i} className="flex items-center gap-2 rounded-md border border-border/50 bg-background/30 px-3 py-1.5 text-xs">
            <PaperclipIcon className="size-3.5 shrink-0 text-emerald-400" />
            <span className="flex-1 truncate text-muted-foreground">{name}</span>
            <button type="button" onClick={() => onRemove(i)} className="text-muted-foreground hover:text-red-400">
              <TrashIcon className="size-3.5" />
            </button>
          </div>
        );
      })}
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-emerald-400/50 hover:text-emerald-300">
        <UploadIcon className="size-3.5" />
        Upload file (PDF, image, Word)
        <input type="file" multiple accept={accept} className="sr-only" onChange={handleChange} />
      </label>
    </div>
  );
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const saved = useStoredCompany(user);
  const datasets = useStoredDatasets(user);
  const [form, setForm] = useState<StoredCompany>(saved ? { ...emptyCompany, ...saved } : emptyCompany);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  const set = (field: keyof StoredCompany, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function addProject() {
    setForm((prev) => ({ ...prev, pastProjects: [...(prev.pastProjects ?? []), { ...emptyProject }] }));
  }

  function updateProject(index: number, field: keyof StoredPastProject, value: string | boolean) {
    setForm((prev) => {
      const projects = [...(prev.pastProjects ?? [])];
      projects[index] = { ...projects[index], [field]: value };
      return { ...prev, pastProjects: projects };
    });
  }

  function removeProject(index: number) {
    setForm((prev) => ({ ...prev, pastProjects: (prev.pastProjects ?? []).filter((_, i) => i !== index) }));
  }

  function addCustomCert() {
    setForm((prev) => ({ ...prev, customCertificates: [...(prev.customCertificates ?? []), ""] }));
  }

  function updateCustomCert(index: number, value: string) {
    setForm((prev) => {
      const certs = [...(prev.customCertificates ?? [])];
      certs[index] = value;
      return { ...prev, customCertificates: certs };
    });
  }

  function removeCustomCert(index: number) {
    setForm((prev) => ({ ...prev, customCertificates: (prev.customCertificates ?? []).filter((_, i) => i !== index) }));
  }

  async function importDataset(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/datasets/import", { method: "POST", body: fd });
      const data = await res.json() as { dataset?: TrainingDataset; error?: string };
      if (!res.ok || !data.dataset) throw new Error(data.error ?? "Import failed");
      const { saveDataset } = await import("@/lib/dataset-store");
      saveDataset(user, data.dataset);
      // Auto-select as active if none set
      if (!form.activeDatasetId) {
        setForm((prev) => ({ ...prev, activeDatasetId: data.dataset!.id }));
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function saveAndContinue() {
    setSaving(true);
    saveStoredCompany(user, form);
    await new Promise((r) => setTimeout(r, 200));
    setSaving(false);
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      setSavedOk(true);
      setTimeout(() => router.push(ROUTES.companyProfile), 800);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Company settings"
        title="Build your bidder profile."
        description="Complete all steps for accurate compliance matching and stronger proposal generation."
      />

      {/* Step progress bar */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div key={num} className="flex items-center gap-2">
              <button type="button" onClick={() => setStep(num)}
                className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  active && "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40",
                  done && "bg-muted/60 text-muted-foreground hover:bg-muted",
                  !active && !done && "text-muted-foreground hover:text-foreground")}>
                <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                  active ? "bg-emerald-400 text-emerald-950" : done ? "bg-emerald-400/30 text-emerald-300" : "bg-muted text-muted-foreground")}>
                  {done ? <CheckCircle2Icon className="size-3" /> : num}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEP_LABELS.length - 1 && <div className="h-px w-6 shrink-0 bg-border/60" />}
            </div>
          );
        })}
      </div>

      <Card className="rounded-lg border border-border/70 bg-card/55">
        <CardHeader>
          <CardTitle>Step {step} — {STEP_LABELS[step - 1]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Legal company name *" value={form.companyName} onChange={(v) => set("companyName", v)} placeholder="Associated Builders Pvt Ltd" />
              <Field label="Brand / trading name" value={form.tradingName} onChange={(v) => set("tradingName", v)} placeholder="AB Builders" />
              <div className="space-y-1.5">
                <Label>Proposal category</Label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring">
                  <option value="construction">Construction / Engineering</option>
                  <option value="it">IT / Software</option>
                  <option value="consulting">Consulting</option>
                  <option value="logistics">Logistics</option>
                  <option value="services">General Services</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Industry / sector</Label>
                <select value={form.sector} onChange={(e) => set("sector", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring">
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} placeholder="Lahore" />
              <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
              <Field label="Website URL" value={form.websiteUrl} onChange={(v) => set("websiteUrl", v)} placeholder="https://example.com" />
              <Field label="Contact person" value={form.contactPerson} onChange={(v) => set("contactPerson", v)} />
              <Field label="Contact email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} type="email" />
              <Field label="Contact phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+92 300 0000000" />
              <div className="border-t border-border/60 pt-2 md:col-span-2">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Legal &amp; Tax Details</p>
              </div>
              <Field label="NTN (National Tax Number)" value={form.ntn} onChange={(v) => set("ntn", v)} placeholder="1234567-8" />
              <Field label="STRN (Sales Tax Registration)" value={form.strn} onChange={(v) => set("strn", v)} />
              <Field label="SECP / CUIN registration" value={form.secp} onChange={(v) => set("secp", v)} />
              <Field label="Active Taxpayer Status" value={form.activetaxpayer} onChange={(v) => set("activetaxpayer", v)} placeholder="Active / check FBR ATL" />
              <Field label="PEC category (if applicable)" value={form.pecCategory} onChange={(v) => set("pecCategory", v)} placeholder="C-4, CE, EA…" />
              <Field label="Other licenses" value={form.otherLicenses} onChange={(v) => set("otherLicenses", v)} placeholder="PSEB, Telecom license…" />
              {/* Tax documents */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Tax documents</p>
                    <p className="text-xs text-muted-foreground">NTN certificate, tax returns, FBR ATL screenshot</p>
                  </div>
                  <button type="button" role="switch" aria-checked={form.taxDocsUploaded} onClick={() => set("taxDocsUploaded", !form.taxDocsUploaded)}
                    className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors", form.taxDocsUploaded ? "bg-emerald-500" : "bg-muted")}>
                    <span className={cn("inline-block size-5 transform rounded-full bg-white shadow transition-transform", form.taxDocsUploaded ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">List document names / file references</Label>
                  <textarea
                    value={form.taxDocNames}
                    onChange={(e) => set("taxDocNames", e.target.value)}
                    rows={2}
                    placeholder="e.g. NTN_Certificate.pdf, Tax_Return_2024.pdf, FBR_ATL_Screenshot.png"
                    className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Upload tax documents</Label>
                  <FileUploadList
                    urls={form.taxFileUrls ?? []}
                    onAdd={(newUrls) => set("taxFileUrls", [...(form.taxFileUrls ?? []), ...newUrls])}
                    onRemove={(i) => set("taxFileUrls", (form.taxFileUrls ?? []).filter((_, idx) => idx !== i))}
                  />
                </div>
              </div>

              {/* Registration documents */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Registration documents</p>
                    <p className="text-xs text-muted-foreground">SECP Form A, CUIN certificate, MOA/AOA</p>
                  </div>
                  <button type="button" role="switch" aria-checked={form.regDocsUploaded} onClick={() => set("regDocsUploaded", !form.regDocsUploaded)}
                    className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors", form.regDocsUploaded ? "bg-emerald-500" : "bg-muted")}>
                    <span className={cn("inline-block size-5 transform rounded-full bg-white shadow transition-transform", form.regDocsUploaded ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">List document names / file references</Label>
                  <textarea
                    value={form.regDocNames}
                    onChange={(e) => set("regDocNames", e.target.value)}
                    rows={2}
                    placeholder="e.g. SECP_Form_A.pdf, CUIN_Certificate.pdf, Company_MOA.pdf"
                    className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Upload registration documents</Label>
                  <FileUploadList
                    urls={form.regFileUrls ?? []}
                    onAdd={(newUrls) => set("regFileUrls", [...(form.regFileUrls ?? []), ...newUrls])}
                    onRemove={(i) => set("regFileUrls", (form.regFileUrls ?? []).filter((_, idx) => idx !== i))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Core services *</Label>
                <textarea value={form.mainServices} onChange={(e) => set("mainServices", e.target.value)} rows={3} placeholder="Road design, structural engineering, IT platform delivery, AI automation…" className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Secondary services</Label>
                <textarea value={form.secondaryServices} onChange={(e) => set("secondaryServices", e.target.value)} rows={2} placeholder="QA, HSE, project management, training…" className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring" />
              </div>
              <Field label="Industries served" value={form.industriesServed} onChange={(v) => set("industriesServed", v)} placeholder="Government, banking, telecom…" />
              <Field label="Geographic coverage" value={form.geographicCoverage} onChange={(v) => set("geographicCoverage", v)} placeholder="Nationwide / Punjab / KPK…" />
              <div className="space-y-1.5">
                <Label>Client type</Label>
                <select value={form.clientType} onChange={(e) => set("clientType", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring">
                  <option value="government">Government only</option>
                  <option value="private">Private sector only</option>
                  <option value="both">Government &amp; private</option>
                </select>
              </div>
              <Field label="Typical project size" value={form.typicalProjectSize} onChange={(v) => set("typicalProjectSize", v)} placeholder="PKR 5M–50M" />
              <Field label="Years in business" value={form.yearsInBusiness} onChange={(v) => set("yearsInBusiness", v)} placeholder="8" />
              <div className="space-y-1.5">
                <Label>Company size</Label>
                <select value={form.size} onChange={(e) => set("size", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring">
                  {COMPANY_SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Company description *</Label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="Describe real experience, certifications, project strengths, and differentiators. Used directly in proposal generation." className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring" />
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add past projects to strengthen compliance matching. Do not invent project values or client names — mark evidence as uploaded only when it actually is.
              </p>
              {(form.pastProjects ?? []).map((proj, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Project {i + 1}</p>
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeProject(i)}>
                      <TrashIcon className="size-3.5" /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Project title</Label>
                      <Input value={proj.title} onChange={(e) => updateProject(i, "title", e.target.value)} placeholder="Design of Ring Road Phase-II" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Client name (if permitted)</Label>
                      <Input value={proj.clientName} onChange={(e) => updateProject(i, "clientName", e.target.value)} placeholder="NHA / Client name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Client type</Label>
                      <Input value={proj.clientType} onChange={(e) => updateProject(i, "clientType", e.target.value)} placeholder="Government / Private" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sector</Label>
                      <Input value={proj.sector} onChange={(e) => updateProject(i, "sector", e.target.value)} placeholder="Highway / IT / Consulting" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Project value (if available)</Label>
                      <Input value={proj.projectValue} onChange={(e) => updateProject(i, "projectValue", e.target.value)} placeholder="PKR 120M" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Year completed</Label>
                      <Input value={proj.yearCompleted} onChange={(e) => updateProject(i, "yearCompleted", e.target.value)} placeholder="2023" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duration (months)</Label>
                      <Input value={proj.durationMonths} onChange={(e) => updateProject(i, "durationMonths", e.target.value)} placeholder="18" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Scope summary</Label>
                      <textarea value={proj.scopeSummary} onChange={(e) => updateProject(i, "scopeSummary", e.target.value)} rows={2} placeholder="Brief description of what was delivered." className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring" />
                    </div>
                    <Toggle label="Evidence uploaded" checked={proj.evidenceUploaded} onChange={(v) => updateProject(i, "evidenceUploaded", v)} note="Completion cert, LOA, etc." />
                    <Toggle label="Performance certificate available" checked={proj.performanceCertAvailable} onChange={(v) => updateProject(i, "performanceCertAvailable", v)} />
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addProject}>
                <PlusIcon className="size-4" /> Add past project
              </Button>
            </div>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Certifications &amp; Compliance</p>
              </div>
              <Field label="ISO certifications" value={form.isoCertifications} onChange={(v) => set("isoCertifications", v)} placeholder="ISO 9001:2015, ISO 27001…" />
              <Field label="Other standard certifications" value={form.otherCertifications} onChange={(v) => set("otherCertifications", v)} placeholder="PEC, PSEB, safety certs…" />

              {/* Custom certificates */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Custom certificates &amp; accreditations</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Add any sector-specific, local, or niche certifications relevant to your tenders</p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={addCustomCert}>
                    <PlusIcon className="size-3.5" /> Add certificate
                  </Button>
                </div>
                {(form.customCertificates ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-1">No custom certificates added yet. Click "Add certificate" to add yours.</p>
                )}
                {(form.customCertificates ?? []).map((cert, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={cert}
                      onChange={(e) => updateCustomCert(i, e.target.value)}
                      placeholder={`e.g. PPRA Vendor Registration, PEC Category C-4, PSEB IT Company, ISO 14001:2015…`}
                      className="flex-1"
                    />
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeCustomCert(i)}>
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Certificate file uploads */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-4 md:col-span-2">
                <p className="text-sm font-medium">Upload certificate files</p>
                <p className="text-xs text-muted-foreground">Upload scanned copies of ISO, PEC, PPRA, or any other certificates (PDF or image)</p>
                <FileUploadList
                  urls={form.certFileUrls ?? []}
                  onAdd={(newUrls) => set("certFileUrls", [...(form.certFileUrls ?? []), ...newUrls])}
                  onRemove={(i) => set("certFileUrls", (form.certFileUrls ?? []).filter((_, idx) => idx !== i))}
                />
              </div>

              <Field label="Vendor / panel registrations" value={form.vendorRegistrations} onChange={(v) => set("vendorRegistrations", v)} placeholder="PPRA, World Bank, ADB…" />

              {/* Financial documents */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Audited financial statements</p>
                    <p className="text-xs text-muted-foreground">Last 3 years preferred</p>
                  </div>
                  <button type="button" role="switch" aria-checked={form.financialDocsAvailable} onClick={() => set("financialDocsAvailable", !form.financialDocsAvailable)}
                    className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors", form.financialDocsAvailable ? "bg-emerald-500" : "bg-muted")}>
                    <span className={cn("inline-block size-5 transform rounded-full bg-white shadow transition-transform", form.financialDocsAvailable ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Document names</Label>
                  <Input value={form.financialDocNames} onChange={(e) => set("financialDocNames", e.target.value)} placeholder="Audited_Accounts_2023.pdf, Audited_Accounts_2022.pdf" />
                </div>
              </div>

              {/* Bank statements */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Bank statements (last 6 months)</p>
                    <p className="text-xs text-muted-foreground">All operating accounts</p>
                  </div>
                  <button type="button" role="switch" aria-checked={form.bankStatementsAvailable} onClick={() => set("bankStatementsAvailable", !form.bankStatementsAvailable)}
                    className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors", form.bankStatementsAvailable ? "bg-emerald-500" : "bg-muted")}>
                    <span className={cn("inline-block size-5 transform rounded-full bg-white shadow transition-transform", form.bankStatementsAvailable ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Document names / bank reference</Label>
                  <Input value={form.bankDocNames} onChange={(e) => set("bankDocNames", e.target.value)} placeholder="HBL_Bank_Statements_Jan-Jun2024.pdf" />
                </div>
              </div>
              <div className="border-t border-border/60 pt-2 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Team &amp; Resources</p>
              </div>
              <Field label="Number of employees" value={form.numEmployees} onChange={(v) => set("numEmployees", v)} placeholder="45" />
              <div className="space-y-1.5 md:col-span-2">
                <Label>Key experts / roles</Label>
                <textarea value={form.keyExperts} onChange={(e) => set("keyExperts", e.target.value)} rows={3} placeholder="Project Director (15 yrs), Highway Design Lead, GIS Analyst, Financial Manager…" className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Software / tools / equipment</Label>
                <textarea value={form.softwareTools} onChange={(e) => set("softwareTools", e.target.value)} rows={2} placeholder="AutoCAD, Civil3D, SAP2000, Primavera P6, GIS, survey equipment…" className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring" />
              </div>
            </div>
          )}

          {/* ── STEP 5 ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold">Import training dataset</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Upload an Excel file with Bid History and Capability Library sheets. Used to match incoming tenders against your past performance.</p>
                  </div>
                  <label className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm font-medium transition-colors",
                    importing
                      ? "border-border/40 text-muted-foreground cursor-not-allowed"
                      : "border-emerald-400/50 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-400/5"
                  )}>
                    {importing ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                    {importing ? "Importing…" : "Upload Excel (.xlsx)"}
                    <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={importing} onChange={importDataset} />
                  </label>
                </div>
                {importError && (
                  <p className="text-xs text-red-400 rounded-md bg-red-500/10 px-3 py-2">{importError}</p>
                )}
              </div>

              {datasets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 py-10 text-center">
                  <DatabaseIcon className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No datasets imported yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Upload an Excel file above to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} — select one as active for tender matching
                  </p>
                  {datasets.map((ds) => {
                    const isActive = form.activeDatasetId === ds.id;
                    return (
                      <div key={ds.id} className={cn(
                        "rounded-lg border p-4 transition-colors",
                        isActive ? "border-emerald-400/60 bg-emerald-400/5" : "border-border/60 bg-background/40"
                      )}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">{ds.fileName}</p>
                              {isActive && (
                                <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300 shrink-0">
                                  <StarIcon className="size-3" /> Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Imported {new Date(ds.importedAt).toLocaleDateString()} ·{" "}
                              {ds.bidHistory?.length ?? 0} bids · {ds.capabilities?.length ?? 0} capabilities · Win rate: {ds.winRate ?? 0}%
                            </p>
                            {(ds.domainIndex?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ds.domainIndex!.slice(0, 6).map((d) => (
                                  <span key={d} className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">{d}</span>
                                ))}
                                {(ds.domainIndex!.length > 6) && (
                                  <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">+{ds.domainIndex!.length - 6} more</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isActive && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setForm((prev) => ({ ...prev, activeDatasetId: ds.id }))}
                              >
                                Set active
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                deleteDataset(user, ds.id);
                                if (form.activeDatasetId === ds.id) {
                                  setForm((prev) => ({ ...prev, activeDatasetId: undefined }));
                                }
                              }}
                            >
                              <TrashIcon className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        {isActive && (
                          <p className="mt-3 text-xs text-emerald-300/70 border-t border-emerald-400/20 pt-2">
                            This dataset will be used automatically when running AI tender matching in any workspace.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 border-t border-border/60 pt-4">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeftIcon /> Back
              </Button>
            )}
            <Button type="button" onClick={saveAndContinue} disabled={saving}>
              {saving ? (
                <><Loader2Icon className="animate-spin" /> Saving…</>
              ) : step < TOTAL_STEPS ? (
                <>Save &amp; continue <ArrowRightIcon /></>
              ) : savedOk ? (
                <><CheckCircle2Icon /> Saved — going to profile…</>
              ) : (
                <><CheckCircle2Icon /> Save &amp; finish</>
              )}
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
