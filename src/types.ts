export interface HotspotPackage {
  id: string;
  name: string;
  priceTzs: number;
  durationMins: number;
  speedLimit?: string;
}

export interface Transaction {
  id: string;
  phone: string;
  provider: "mpesa" | "airtel" | "tigo" | "halotel";
  packageId: string;
  packageName: string;
  priceTzs: number;
  status: "pending" | "completed" | "failed";
  voucherCode?: string;
  macAddress?: string;
  createdAt: string;
}

export interface Voucher {
  code: string;
  packageId: string;
  packageName: string;
  durationMins: number;
  priceTzs: number;
  createdAt: string;
  status: "unused" | "active" | "expired";
  activatedAt?: string;
  expiresAt?: string;
  macAddress?: string;
}

export interface ActiveSession {
  mac: string;
  ip: string;
  username: string;
  uptime: string;
  downBytes: number;
  upBytes: number;
  packageName: string;
  expiresAt: string;
}

export interface ClientSettings {
  internetName: string;
  hotspotSubtitle: string;
  welcomeTitle: string;
  welcomeQuote: string;
  welcomeText: string;
  contactPhone: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string; // stored as SHA-256 hash
  role: "admin" | "other" | "operator";
  operatorRole?: "senior" | "standard" | "support";
  status?: "active" | "suspended" | "locked";
  permissions?: string[]; // granular operator permissions
  loginHistory?: { ip: string; timestamp: string; location: string; duration: string }[];
  lastAction?: { action: string; timestamp: string };
  loginTimeLimit?: number; // active session limit in minutes
  allowedIps?: string;
  allowedDevices?: string;
  profileName?: string;
  profilePhone?: string; // payment redirection target wallet e.g. Tigo Pesa or Airtel Money
  routerBrand?: "mikrotik" | "tplink" | "other";
  routerHost?: string;
  routerPort?: string;
  routerUsername?: string;
  routerPassword?: string;
  internetName?: string;
  createdAt: string;
  biometricRegistered?: boolean;
  biometricKey?: string;
  sessionToken?: string;
}

export interface AdminStats {
  revenueToday: number;
  revenueAllTime: number;
  activeUsers: number;
  totalVouchers: number;
  hourlyRevenueChart: { time: string; revenue: number }[];
  devicePieChart: { name: string; value: number }[];
  paymentDistribution: {
    mpesa: number;
    airtel: number;
    tigo: number;
    halotel: number;
  };
}
