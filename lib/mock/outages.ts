import { getScene } from "@/lib/mock/scene";

export interface OutageInfo {
  area: string;
  active: boolean;
  type?: string;
  eta?: string;
  message: string;
}

const STATIC_OUTAGES: Record<string, Omit<OutageInfo, "active" | "message">> = {
  Gulshan: {
    area: "Gulshan",
    type: "PON down",
    eta: "about 45 minutes",
  },
};

export function checkAreaOutage(area: string): OutageInfo {
  const scene = getScene();
  const normalized = area.trim().toLowerCase();
  const isGulshan = normalized.includes("gulshan");

  if (isGulshan) {
    const base = STATIC_OUTAGES.Gulshan;
    if (scene.gulshanOutage) {
      return {
        ...base,
        active: true,
        message: `Yes — Gulshan area has a PON outage right now. ETA ${base.eta}. We are already working on it.`,
      };
    }
    return {
      area: "Gulshan",
      active: false,
      message: "No active outage reported for Gulshan right now.",
    };
  }

  return {
    area: area.trim() || "unknown",
    active: false,
    message: `No active outage reported for ${area.trim() || "that area"} right now.`,
  };
}
