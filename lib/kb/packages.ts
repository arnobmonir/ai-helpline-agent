/** Official Amber IT Home Internet packages from Support docs KB. */

export type PackageId =
  | "HOME_20"
  | "HOME_30"
  | "HOME_50"
  | "HOME_100"
  | "HOME_125"
  | "HOME_150"
  | "HOME_200"
  | "HOME_250";

export interface PackagePlan {
  id: PackageId;
  name: string;
  speedMbps: number;
  monthlyBdt: number;
  vatPercent: number;
  /** One-time installation; 0 = free under current offer */
  otcBdt: number;
  notes?: string;
}

export const PACKAGES: PackagePlan[] = [
  {
    id: "HOME_20",
    name: "20 Mbps",
    speedMbps: 20,
    monthlyBdt: 500,
    vatPercent: 5,
    otcBdt: 1000,
    notes: "OTC ৳1000; waived if customer provides compatible GPON/XPON ONU",
  },
  {
    id: "HOME_30",
    name: "30 Mbps",
    speedMbps: 30,
    monthlyBdt: 650,
    vatPercent: 5,
    otcBdt: 0,
    notes: "Free installation (current offer)",
  },
  {
    id: "HOME_50",
    name: "50 Mbps",
    speedMbps: 50,
    monthlyBdt: 800,
    vatPercent: 5,
    otcBdt: 0,
    notes: "Free installation (current offer)",
  },
  {
    id: "HOME_100",
    name: "100 Mbps",
    speedMbps: 100,
    monthlyBdt: 1000,
    vatPercent: 5,
    otcBdt: 0,
  },
  {
    id: "HOME_125",
    name: "125 Mbps",
    speedMbps: 125,
    monthlyBdt: 1200,
    vatPercent: 5,
    otcBdt: 0,
  },
  {
    id: "HOME_150",
    name: "150 Mbps",
    speedMbps: 150,
    monthlyBdt: 1500,
    vatPercent: 5,
    otcBdt: 0,
  },
  {
    id: "HOME_200",
    name: "200 Mbps",
    speedMbps: 200,
    monthlyBdt: 2000,
    vatPercent: 5,
    otcBdt: 0,
  },
  {
    id: "HOME_250",
    name: "250 Mbps",
    speedMbps: 250,
    monthlyBdt: 2500,
    vatPercent: 5,
    otcBdt: 0,
    notes: "Includes 1 free Real IP; other home packages use Shared IP",
  },
];

export function getPackage(id: PackageId): PackagePlan {
  const plan = PACKAGES.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown package: ${id}`);
  return plan;
}

export function withVat(monthlyBdt: number, vatPercent = 5): number {
  return Math.round(monthlyBdt * (1 + vatPercent / 100));
}

export function formatPackageLine(plan: PackagePlan): string {
  const total = withVat(plan.monthlyBdt, plan.vatPercent);
  const otc =
    plan.otcBdt > 0 ? `; OTC ৳${plan.otcBdt}` : "; Free installation";
  return `${plan.name} ৳${plan.monthlyBdt}/mo (+${plan.vatPercent}% VAT = ৳${total})${otc}`;
}
