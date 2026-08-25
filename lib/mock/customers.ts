import type { PackageId } from "@/lib/kb/packages";

export type OnuStatus = "online" | "los_red" | "power_off" | "unknown";

export interface BillInfo {
  dueAmountBdt: number;
  dueDate: string;
  status: "paid" | "unpaid" | "overdue";
}

export interface Customer {
  id: string;
  cid: string;
  name: string;
  phone: string;
  area: string;
  packageId: PackageId;
  onuStatus: OnuStatus;
  bill: BillInfo;
}

/** Demo-friendly seed customers across Dhaka areas. */
export const CUSTOMERS: Customer[] = [
  {
    id: "cust-gulshan-01",
    cid: "AIT-100234",
    name: "Rafiq Hasan",
    phone: "01711001234",
    area: "Gulshan",
    packageId: "HOME_125",
    onuStatus: "los_red",
    bill: { dueAmountBdt: 1260, dueDate: "2026-08-28", status: "unpaid" },
  },
  {
    id: "cust-badda-01",
    cid: "AIT-100891",
    name: "Nusrat Jahan",
    phone: "01812004567",
    area: "Badda",
    packageId: "HOME_50",
    onuStatus: "online",
    bill: { dueAmountBdt: 0, dueDate: "2026-09-05", status: "paid" },
  },
  {
    id: "cust-dhanmondi-01",
    cid: "AIT-101402",
    name: "Imran Chowdhury",
    phone: "01913007890",
    area: "Dhanmondi",
    packageId: "HOME_200",
    onuStatus: "online",
    bill: { dueAmountBdt: 2100, dueDate: "2026-08-20", status: "overdue" },
  },
  {
    id: "cust-banani-01",
    cid: "AIT-102033",
    name: "Sadia Rahman",
    phone: "01614001122",
    area: "Banani",
    packageId: "HOME_30",
    onuStatus: "online",
    bill: { dueAmountBdt: 683, dueDate: "2026-09-01", status: "unpaid" },
  },
  {
    id: "cust-mirpur-01",
    cid: "AIT-103210",
    name: "Karim Uddin",
    phone: "01515003344",
    area: "Mirpur",
    packageId: "HOME_20",
    onuStatus: "power_off",
    bill: { dueAmountBdt: 525, dueDate: "2026-08-30", status: "unpaid" },
  },
  {
    id: "cust-uttara-01",
    cid: "AIT-104555",
    name: "Fahim Ahmed",
    phone: "01716005566",
    area: "Uttara",
    packageId: "HOME_150",
    onuStatus: "online",
    bill: { dueAmountBdt: 0, dueDate: "2026-09-10", status: "paid" },
  },
  {
    id: "cust-mohammadpur-01",
    cid: "AIT-105777",
    name: "Lamia Akter",
    phone: "01817007788",
    area: "Mohammadpur",
    packageId: "HOME_250",
    onuStatus: "online",
    bill: { dueAmountBdt: 2625, dueDate: "2026-08-25", status: "unpaid" },
  },
];

/** Primary pitch customer (Gulshan outage / unpaid bill demos). */
export const DEMO_CUSTOMER_ID = "cust-gulshan-01";

function normalizeQuery(q: string): string {
  return q.replace(/[\s\-]/g, "").toUpperCase();
}

export function findCustomer(cidOrPhone: string): Customer | undefined {
  const q = normalizeQuery(cidOrPhone);
  return CUSTOMERS.find((c) => {
    const cid = normalizeQuery(c.cid);
    const phone = normalizeQuery(c.phone);
    return cid === q || phone === q || phone.endsWith(q) || cid.includes(q);
  });
}
