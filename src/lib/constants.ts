export const APP_NAME = "BidPilot Pakistan";
export const APP_TAGLINE =
  "From tender document to compliant proposal draft in minutes.";

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  onboarding: "/company-settings",
  companySettings: "/company-settings",
  companyProfile: "/company-profile",
  capabilityLibrary: "/capability-library",
  workspaces: "/workspaces",
  newWorkspace: "/workspaces/new",
  settings: "/settings",
  governmentRfps: "/government-rfps",
  workspaceReadiness: (id: string) => `/workspaces/${id}/readiness`,
} as const;

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/company-settings",
  "/company-profile",
  "/capability-library",
  "/workspaces",
  "/settings",
  "/government-rfps",
] as const;

export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"] as const;

export const SESSION_COOKIE_NAME = "__session";

export const SECTORS = [
  "Software & IT Services",
  "Engineering & Construction",
  "Logistics & Supply Chain",
  "Healthcare",
  "Education",
  "Financial Services",
  "Energy & Power",
  "Telecommunications",
  "Manufacturing",
  "Consulting",
  "Marketing & Advertising",
  "Other",
] as const;

export type Sector = (typeof SECTORS)[number];

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;

export type CompanySize = (typeof COMPANY_SIZES)[number];

export const GO_NO_GO_BANDS = [
  { min: 80, max: 100, decision: "STRONG_GO", label: "Strong GO" },
  { min: 60, max: 79, decision: "GO_WITH_CAUTION", label: "Go with caution" },
  { min: 40, max: 59, decision: "NO_GO_UNLESS_FIXED", label: "No-go unless gaps fixed" },
  { min: 0, max: 39, decision: "NO_GO", label: "No-go" },
] as const;
