export type ConnectionStatus = "good" | "fair" | "slow" | "offline" | "unknown";

export type ConnectionSnapshot = { online: boolean; effectiveType?: string; downlink?: number; rtt?: number; available?: boolean };

export function assessConnectionQuality(snapshot: ConnectionSnapshot): ConnectionStatus {
  if (!snapshot.online) return "offline";
  if (snapshot.available === false) return "unknown";
  if (snapshot.effectiveType === "slow-2g" || snapshot.effectiveType === "2g" || (snapshot.rtt ?? 0) > 1000 || ((snapshot.downlink ?? Infinity) < 0.5)) return "slow";
  if (snapshot.effectiveType === "3g" || (snapshot.rtt ?? 0) > 450 || ((snapshot.downlink ?? Infinity) < 1.5)) return "fair";
  return "good";
}

export function getBrowserConnectionQuality(): ConnectionStatus {
  if (typeof navigator === "undefined") return "unknown";
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection;
  return assessConnectionQuality({ online: navigator.onLine, available: Boolean(connection), effectiveType: connection?.effectiveType, downlink: connection?.downlink, rtt: connection?.rtt });
}
