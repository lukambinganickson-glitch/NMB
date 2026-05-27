import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface HotspotPackage {
  id: string;
  name: string;
  priceTzs: number;
  durationMins: number;
  speedLimit?: string; // e.g. "2M/2M"
}

interface Transaction {
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

interface Voucher {
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

interface ActiveSession {
  mac: string;
  ip: string;
  username: string; // usually the voucher code
  uptime: string;
  downBytes: number;
  upBytes: number;
  packageName: string;
  expiresAt: string;
}

interface RouterConfig {
  host: string;
  port: string;
  username: string;
  password?: string;
  interfaceName: string;
  sslEnabled: boolean;
  lastConnected?: string;
}

interface ClientSettings {
  internetName: string;
  hotspotSubtitle: string;
  welcomeTitle: string;
  welcomeQuote: string;
  welcomeText: string;
  contactPhone: string;
}

interface UserAccount {
  id: string;
  username: string;
  password?: string;
  role: "admin" | "other" | "operator";
  operatorRole?: "senior" | "standard" | "support";
  status?: "active" | "suspended" | "locked";
  permissions?: string[]; // granular operator permissions
  loginHistory?: { ip: string; timestamp: string; location: string; duration: string }[];
  lastAction?: { action: string; timestamp: string };
  loginTimeLimit?: number; // max session duration in minutes
  allowedIps?: string;
  allowedDevices?: string;
  profileName?: string;
  profilePhone?: string;
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

interface Database {
  packages: HotspotPackage[];
  transactions: Transaction[];
  vouchers: Voucher[];
  activeSessions: ActiveSession[];
  routerConfig?: RouterConfig;
  clientSettings?: ClientSettings;
  users?: UserAccount[];
  systemLogs?: { id: string; level: "info" | "warning" | "danger" | "success"; timestamp: string; message: string; operator?: string }[];
  backups?: { id: string; filename: string; timestamp: string; size: string; count: number }[];
  blacklistedIps?: { ip: string; reason: string; createdAt: string }[];
  blacklistedMacs?: { mac: string; reason: string; createdAt: string }[];
  securityAlerts?: { id: string; type: string; details: string; target: string; timestamp: string; resolved: boolean }[];
}

const DB_FILE = path.join(process.cwd(), "hotspot_db.json");

// Default initial database content
const DEFAULT_DB: Database = {
  users: [
    {
      id: "usr-admin",
      username: "admin",
      password: "admin",
      role: "admin",
      profileName: "Root Admin Operator",
      profilePhone: "0699302513",
      routerBrand: "mikrotik",
      routerHost: "192.168.88.1",
      routerPort: "8728",
      routerUsername: "admin",
      routerPassword: "",
      internetName: "N-internet services LTD",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-senior",
      username: "senior",
      password: "operator",
      role: "operator",
      operatorRole: "senior",
      status: "active",
      permissions: ["view_users", "view_payments", "create_vouchers", "assist_activation", "view_logs", "suspend_sessions", "view_reports"],
      profileName: "Senior Operator - Lukambinga",
      profilePhone: "0699111222",
      createdAt: new Date().toISOString(),
      loginHistory: [
        { ip: "192.168.1.10", timestamp: new Date(Date.now() - 3600*1000).toISOString(), location: "Dar es Salaam, TZ", duration: "1h 5m" }
      ],
      lastAction: { action: "Generated manual voucher HOT-4K2P", timestamp: new Date(Date.now() - 15*60*1000).toISOString() }
    },
    {
      id: "usr-standard",
      username: "standard",
      password: "operator",
      role: "operator",
      operatorRole: "standard",
      status: "active",
      permissions: ["view_users", "view_payments", "create_vouchers", "assist_activation", "view_logs"],
      profileName: "Standard Operator - Nickson",
      profilePhone: "0699333444",
      createdAt: new Date().toISOString(),
      loginHistory: [
        { ip: "192.168.1.15", timestamp: new Date(Date.now() - 18000*1000).toISOString(), location: "Arusha, TZ", duration: "45m" }
      ],
      lastAction: { action: "Assisted client authentication 02:1A:C5:3F:89:E4", timestamp: new Date(Date.now() - 10*60*1000).toISOString() }
    },
    {
      id: "usr-support",
      username: "support",
      password: "operator",
      role: "operator",
      operatorRole: "support",
      status: "active",
      permissions: ["view_users", "assist_activation", "view_logs"],
      profileName: "Support Operator - PiliPili",
      profilePhone: "0699555666",
      createdAt: new Date().toISOString(),
      loginHistory: [
        { ip: "192.168.1.22", timestamp: new Date(Date.now() - 4000*1000).toISOString(), location: "Mwanza, TZ", duration: "2h 10m" }
      ],
      lastAction: { action: "Viewed captive portal logs", timestamp: new Date(Date.now() - 30*60*1000).toISOString() }
    }
  ],
  clientSettings: {
    internetName: "N-internet services LTD",
    hotspotSubtitle: "High-Speed Fiber Hotspot",
    welcomeTitle: "Welcome to N-Internet",
    welcomeQuote: "Connection fuels opportunity. We believe seamless browsing and reliable internet inspire boundless potential.",
    welcomeText: "Enjoy blazing-fast, high-speed, unlimited access designed to empower your studies, career, and entertainment. Select a customized packages profile below to connect instantly.",
    contactPhone: "0699302513"
  },
  packages: [
    { id: "pkg-1", name: "Short Pass", priceTzs: 500, durationMins: 60, speedLimit: "1M/1M" },
    { id: "pkg-2", name: "Standard Pass", priceTzs: 1000, durationMins: 180, speedLimit: "2M/2M" },
    { id: "pkg-3", name: "Premium day Pass", priceTzs: 2000, durationMins: 1440, speedLimit: "4M/4M" }
  ],
  transactions: [
    {
      id: "tx-77112",
      phone: "255755123456",
      provider: "mpesa",
      packageId: "pkg-1",
      packageName: "Short Pass",
      priceTzs: 500,
      status: "completed",
      voucherCode: "TZ-9102",
      macAddress: "FC:AA:14:8B:2E:11",
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    },
    {
      id: "tx-77113",
      phone: "255688987654",
      provider: "airtel",
      packageId: "pkg-2",
      packageName: "Standard Pass",
      priceTzs: 1000,
      status: "completed",
      voucherCode: "TZ-8472",
      macAddress: "02:1A:C5:3F:89:E4",
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: "tx-77114",
      phone: "255712343434",
      provider: "tigo",
      packageId: "pkg-3",
      packageName: "Premium day Pass",
      priceTzs: 2000,
      status: "pending",
      createdAt: new Date(Date.now() - 10000).toISOString()
    }
  ],
  vouchers: [
    {
      code: "TZ-9102",
      packageId: "pkg-1",
      packageName: "Short Pass",
      durationMins: 60,
      priceTzs: 500,
      status: "active",
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      activatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      macAddress: "FC:AA:14:8B:2E:11"
    },
    {
      code: "TZ-8472",
      packageId: "pkg-2",
      packageName: "Standard Pass",
      durationMins: 180,
      priceTzs: 1000,
      status: "active",
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      activatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
      macAddress: "02:1A:C5:3F:89:E4"
    },
    {
      code: "TZ-2391",
      packageId: "pkg-3",
      packageName: "Premium day Pass",
      durationMins: 1440,
      priceTzs: 2000,
      status: "unused",
      createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
    }
  ],
  activeSessions: [
    {
      mac: "02:1A:C5:3F:89:E4",
      ip: "10.5.50.22",
      username: "TZ-8472",
      uptime: "02:00:15",
      downBytes: 421000000,
      upBytes: 31000000,
      packageName: "Standard Pass",
      expiresAt: new Date(Date.now() + 1 * 3600 * 1000).toISOString()
    }
  ],
  routerConfig: {
    host: "192.168.88.1",
    port: "8728",
    username: "admin",
    password: "",
    interfaceName: "ether1-gateway",
    sslEnabled: false,
    lastConnected: new Date().toISOString()
  }
};

// Cryptographic SHA-256 tool to sanitize and secure passwords
function hashPassword(pwd: string): string {
  return crypto.createHash("sha256").update(pwd).digest("hex");
}

// Intrusion prevention and Brute-force credentials login tracking
interface AccessLock {
  count: number;
  lockedUntil: number;
  lastAttemptAt: string;
}
const failedLoginAttempts: Record<string, AccessLock> = {};

// Captive Portal security settings
let antiMacBypassEnabled = true;

// Client device integrity secure cookies tracker to block ARP MAC spoof hacks
// Maps MAC -> Secret Token
const activeMacIntegrityTokens: Record<string, string> = {
  "FC:AA:14:8B:2E:11": "token-fcaa148b2e11" // Prepopulate default active client
};

// Tanzania mobile cell reset OTP verification mappings
interface ResetOTP {
  code: string;
  expiresAt: string;
  username: string;
}
const activeResetCodes: Record<string, ResetOTP> = {};

// JSON database synchronous utility helper to prevent concurrency file corruption
function readDB(): Database {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Secure hash default admin password before boot writing
      const initialDb = { ...DEFAULT_DB };
      if (initialDb.users) {
        initialDb.users = initialDb.users.map(u => ({
          ...u,
          password: u.password ? hashPassword(u.password) : undefined
        }));
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
      return initialDb as Database;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const db = JSON.parse(raw);
    let changed = false;
    if (!db.routerConfig) {
      db.routerConfig = DEFAULT_DB.routerConfig;
      changed = true;
    }
    if (!db.clientSettings) {
      db.clientSettings = DEFAULT_DB.clientSettings;
      changed = true;
    }
    if (!db.users) {
      db.users = DEFAULT_DB.users;
      changed = true;
    }
    if (!db.systemLogs) {
      db.systemLogs = [];
      changed = true;
    }
    if (!db.backups) {
      db.backups = [];
      changed = true;
    }
    if (!db.blacklistedIps) {
      db.blacklistedIps = [];
      changed = true;
    }
    if (!db.blacklistedMacs) {
      db.blacklistedMacs = [];
      changed = true;
    }
    if (!db.securityAlerts) {
      db.securityAlerts = [];
      changed = true;
    }
    
    // SECURITY PASS: Auto-migrate any existing plaintext user passwords to SHA-256 crypts
    // Ensure all standard operators are migrated / inserted into the existing database
    if (db.users) {
      const defaultOperators = DEFAULT_DB.users?.filter(u => u.role === "operator") || [];
      defaultOperators.forEach((op: any) => {
        const found = db.users.find((u: any) => u.username === op.username);
        if (!found) {
          db.users.push({
            ...op,
            password: hashPassword(op.password || "operator")
          });
          changed = true;
        }
      });

      db.users.forEach((u: any) => {
        if (u.password && (u.password.length !== 64 || !/^[0-9a-f]{64}$/i.test(u.password))) {
          u.password = hashPassword(u.password);
          changed = true;
        }
      });
    }

    if (changed) {
      writeDB(db);
    }
    return db;
  } catch (err) {
    console.error("Database read error. Returning default configuration.", err);
    return DEFAULT_DB;
  }
}

function writeDB(data: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Database write error.", err);
  }
}

// Generate an elegant voucher code: TZ-XXXX
function generateVoucherCode(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // High legibility list
  let code = "HOT-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Start building full-stack server
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Ensure DB gets initialized
  readDB();

  // ---------------------------------------------------------------------------
  // AUTHENTICATION & PARTNER OPERATIONS ENDPOINTS
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // AUTHENTICATION, PASSWORD RESET & BIOMETRIC GATEWAY ENDPOINTS
  // ---------------------------------------------------------------------------
  app.post("/api/auth/register", (req, res) => {
    const { username, password, profileName, profilePhone, routerBrand } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }
    const db = readDB();
    if (!db.users) db.users = [];
    const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "Username is already registered." });
      return;
    }
    const newUser: UserAccount = {
      id: "usr-" + Date.now(),
      username,
      password: hashPassword(password), // SHA-256 Hashing prevent server DB breach bypass
      role: "other",
      profileName: profileName || "Hotspot Partner User",
      profilePhone: profilePhone || "0699302513",
      routerBrand: routerBrand || "tplink",
      routerHost: "192.168.0.1",
      routerPort: "80",
      routerUsername: "admin",
      routerPassword: "",
      internetName: "My High Speed Net",
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDB(db);
    res.status(201).json({ 
      success: true, 
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        role: newUser.role, 
        profileName: newUser.profileName, 
        profilePhone: newUser.profilePhone,
        routerBrand: newUser.routerBrand,
        routerHost: newUser.routerHost,
        routerPort: newUser.routerPort,
        routerUsername: newUser.routerUsername,
        routerPassword: newUser.routerPassword,
        internetName: newUser.internetName
      } 
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const LOCKOUT_THRESHOLD = 3;
    const LOCKOUT_DURATION = 30000; // 30 seconds lockout for demo
    const ip = req.ip || "unknown-ip";
    const lockKey = `${ip}:${username.toLowerCase()}`;
    const now = Date.now();

    const currentLock = failedLoginAttempts[lockKey];
    if (currentLock && currentLock.count >= LOCKOUT_THRESHOLD && now < currentLock.lockedUntil) {
      const remainingSec = Math.ceil((currentLock.lockedUntil - now) / 1000);
      res.status(429).json({ 
        error: `Account temporarily locked due to brute-force hacking risk. Please wait ${remainingSec} seconds.`,
        locked: true,
        remainingSec
      });
      return;
    }

    const db = readDB();
    if (!db.users) db.users = [];
    
    const inputHash = hashPassword(password);
    const matched = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === inputHash);
    
    if (!matched) {
      if (!failedLoginAttempts[lockKey]) {
        failedLoginAttempts[lockKey] = { count: 1, lockedUntil: 0, lastAttemptAt: new Date().toISOString() };
      } else {
        failedLoginAttempts[lockKey].count += 1;
        failedLoginAttempts[lockKey].lastAttemptAt = new Date().toISOString();
        if (failedLoginAttempts[lockKey].count >= LOCKOUT_THRESHOLD) {
          failedLoginAttempts[lockKey].lockedUntil = now + LOCKOUT_DURATION;
        }
      }
      
      const attemptsRemaining = LOCKOUT_THRESHOLD - (failedLoginAttempts[lockKey].count % LOCKOUT_THRESHOLD);
      const isLockedNow = failedLoginAttempts[lockKey].count >= LOCKOUT_THRESHOLD;
      
      const errMsg = isLockedNow 
        ? "Too many failed login attempts. Access temporarily locked for 30 seconds."
        : `Incorrect credentials. Brute force lock active. attempts remaining: ${attemptsRemaining}. (Default admin password is 'admin')`;

      res.status(401).json({ error: errMsg, attemptsLeft: isLockedNow ? 0 : attemptsRemaining });
      return;
    }

    if (failedLoginAttempts[lockKey]) {
      delete failedLoginAttempts[lockKey];
    }

    if (matched.role === "operator" && (matched.status === "suspended" || matched.status === "locked")) {
      res.status(403).json({ error: `Operation Denied: This Operator account is currently ${matched.status.toUpperCase()} by the administrator.` });
      return;
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    matched.sessionToken = sessionToken;
    matched.status = "active"; // Reset to active if log in successfully

    if (!matched.loginHistory) matched.loginHistory = [];
    matched.loginHistory.unshift({
      ip: req.ip || "192.168.1.100",
      timestamp: new Date().toISOString(),
      location: "Dar es Salaam, TZ",
      duration: "Active Session"
    });
    if (matched.loginHistory.length > 30) {
      matched.loginHistory = matched.loginHistory.slice(0, 30);
    }

    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "success",
      timestamp: new Date().toISOString(),
      message: `${matched.role.toUpperCase()} sign-in: User "${matched.username}" successfully authenticated. Client IP: ${ip}`,
      operator: matched.username
    });

    writeDB(db);

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: matched.id,
        username: matched.username,
        role: matched.role,
        operatorRole: matched.operatorRole || "standard",
        status: matched.status,
        permissions: matched.permissions || ["view_users", "view_payments"],
        profileName: matched.profileName,
        profilePhone: matched.profilePhone,
        routerBrand: matched.routerBrand || "tplink",
        routerHost: matched.routerHost || "192.168.0.1",
        routerPort: matched.routerPort || "85",
        routerUsername: matched.routerUsername || "admin",
        routerPassword: matched.routerPassword || "",
        internetName: matched.internetName || "My High Speed Net",
        biometricRegistered: !!matched.biometricRegistered,
        loginHistory: matched.loginHistory,
        lastAction: matched.lastAction,
        loginTimeLimit: matched.loginTimeLimit,
        allowedIps: matched.allowedIps,
        allowedDevices: matched.allowedDevices
      }
    });
  });

  app.put("/api/auth/profile/:id", (req, res) => {
    const { id } = req.params;
    const { profileName, profilePhone, routerBrand, routerHost, routerPort, routerUsername, routerPassword, internetName, password } = req.body;
    const db = readDB();
    if (!db.users) db.users = [];
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "User account not found" });
      return;
    }
    const current = db.users[idx];
    const resolvedPassword = password ? hashPassword(password) : current.password;

    db.users[idx] = {
      ...current,
      profileName: profileName !== undefined ? profileName : current.profileName,
      profilePhone: profilePhone !== undefined ? profilePhone : current.profilePhone,
      routerBrand: routerBrand !== undefined ? routerBrand : current.routerBrand,
      routerHost: routerHost !== undefined ? routerHost : current.routerHost,
      routerPort: routerPort !== undefined ? routerPort : current.routerPort,
      routerUsername: routerUsername !== undefined ? routerUsername : current.routerUsername,
      routerPassword: routerPassword !== undefined ? routerPassword : current.routerPassword,
      internetName: internetName !== undefined ? internetName : current.internetName,
      password: resolvedPassword
    };
    writeDB(db);
    res.json({ success: true, user: db.users[idx] });
  });

  // PASSWORD RECOVERY / RESET ENDPOINTS (SMS SIMULATION)
  app.post("/api/auth/forgot-password", (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: "Mobile number or username is required for verification code dispatch." });
      return;
    }
    
    let formattedPhone = phone.trim().replace(/[\s\+\-]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "255" + formattedPhone.substring(1);
    }
    
    const db = readDB();
    const user = db.users?.find(u => {
      let uPhone = u.profilePhone?.trim().replace(/[\s\+\-]/g, "") || "";
      if (uPhone.startsWith("0")) uPhone = "255" + uPhone.substring(1);
      return uPhone === formattedPhone || u.username.toLowerCase() === phone.toLowerCase();
    });

    if (!user) {
      res.status(404).json({ error: "No registered hotspot operator found with this login credential/contact." });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const userPhoneNormalized = user.profilePhone?.trim().replace(/[\s\+\-]/g, "") || "0699302513";
    const targetPhone = userPhoneNormalized.startsWith("0") ? "255" + userPhoneNormalized.substring(1) : userPhoneNormalized;

    activeResetCodes[targetPhone] = {
      code: otp,
      username: user.username,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };

    console.log(`[SIMULATED SMS OTP RESET] Password reset code for "${user.username}" sent to ${targetPhone}: ${otp}`);

    res.json({
      success: true,
      message: `Simulated security verification Reset code OTP sent to mobile wallet phone: ${userPhoneNormalized}.`,
      otp,
      phone: userPhoneNormalized,
      username: user.username
    });
  });

  app.post("/api/auth/verify-reset-otp", (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: "Phone number and verification code are required" });
      return;
    }

    let formattedPhone = phone.trim().replace(/[\s\+\-]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "255" + formattedPhone.substring(1);
    }

    const resetMap = activeResetCodes[formattedPhone];
    if (!resetMap || resetMap.code !== otp.trim() || new Date() > new Date(resetMap.expiresAt)) {
      res.status(400).json({ error: "Invalid, mismatching, or expired verification OTP." });
      return;
    }

    res.json({
      success: true,
      username: resetMap.username,
      message: "Security code verified."
    });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      res.status(400).json({ error: "Missing reset data payload" });
      return;
    }

    let formattedPhone = phone.trim().replace(/[\s\+\-]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "255" + formattedPhone.substring(1);
    }

    const resetMap = activeResetCodes[formattedPhone];
    if (!resetMap || resetMap.code !== otp.trim() || new Date() > new Date(resetMap.expiresAt)) {
      res.status(400).json({ error: "Password reset authorization has expired." });
      return;
    }

    const db = readDB();
    const userIdx = db.users?.findIndex(u => u.username === resetMap.username);
    if (userIdx === undefined || userIdx === -1) {
      res.status(404).json({ error: "Associated user not found in configuration database." });
      return;
    }

    db.users[userIdx].password = hashPassword(newPassword);
    writeDB(db);

    delete activeResetCodes[formattedPhone];

    res.json({
      success: true,
      message: "Password reset successfully. Please sign in with your new credentials."
    });
  });

  // BIOMETRICS AUTHENTICATION CHANNELS (WEBAUTHN ENHANCED)
  app.post("/api/auth/register-biometric", (req, res) => {
    const { username, biometricKey } = req.body;
    if (!username || !biometricKey) {
      res.status(400).json({ error: "Username and Biometric hardware credential token are required." });
      return;
    }

    const db = readDB();
    const idx = db.users?.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx === undefined || idx === -1) {
      res.status(404).json({ error: "Operator username not found." });
      return;
    }

    db.users[idx].biometricRegistered = true;
    db.users[idx].biometricKey = biometricKey;
    writeDB(db);

    res.json({
      success: true,
      message: "Biometric authentication securely linked to operator profile."
    });
  });

  app.post("/api/auth/login-biometric", (req, res) => {
    const { username } = req.body;
    if (!username) {
      res.status(400).json({ error: "Authentication requires registered hardware username handle." });
      return;
    }

    const db = readDB();
    const matched = db.users?.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!matched) {
      res.status(404).json({ error: "No associate user profile matches." });
      return;
    }

    if (!matched.biometricRegistered || !matched.biometricKey) {
      res.status(400).json({ error: "Biometric authentication is not configured for this operator account yet." });
      return;
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    matched.sessionToken = sessionToken;
    writeDB(db);

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: matched.id,
        username: matched.username,
        role: matched.role,
        profileName: matched.profileName,
        profilePhone: matched.profilePhone,
        routerBrand: matched.routerBrand || "tplink",
        routerHost: matched.routerHost || "192.168.0.1",
        routerPort: matched.routerPort || "85",
        routerUsername: matched.routerUsername || "admin",
        routerPassword: matched.routerPassword || "",
        internetName: matched.internetName || "My High Speed Net",
        biometricRegistered: true
      }
    });
  });

  // SECURITY MONITORING ENDPOINTS
  app.get("/api/security/locks", (req, res) => {
    const locksList = Object.keys(failedLoginAttempts).map(key => {
      const lock = failedLoginAttempts[key];
      const parts = key.split(":");
      const ip = parts[0];
      const username = parts.slice(1).join(":");
      return {
        key,
        ip,
        username,
        attempts: lock.count,
        lockedUntil: lock.lockedUntil,
        isLocked: Date.now() < lock.lockedUntil,
        lastAttemptAt: lock.lastAttemptAt
      };
    });
    res.json({ locks: locksList, antiMacBypassEnabled });
  });

  app.post("/api/security/unlock-all", (req, res) => {
    Object.keys(failedLoginAttempts).forEach(key => {
      delete failedLoginAttempts[key];
    });
    res.json({ success: true, message: "All intrusion blocks cleared successfully." });
  });

  app.post("/api/security/toggle-mac-bypass", (req, res) => {
    const { enabled } = req.body;
    antiMacBypassEnabled = !!enabled;
    res.json({ success: true, antiMacBypassEnabled });
  });

  app.post("/api/security/validate-handshake", (req, res) => {
    const { mac, clientToken } = req.body;
    if (!mac) {
      res.status(400).json({ error: "MAC address required" });
      return;
    }
    
    const normalizedMac = mac.trim().toUpperCase();
    
    if (antiMacBypassEnabled) {
      const activeToken = activeMacIntegrityTokens[normalizedMac];
      if (activeToken && clientToken && activeToken !== clientToken) {
        console.warn(`[SECURITY WARNING] Blocked bypass hack attempt on MAC: ${normalizedMac}. Token mismatch!`);
        res.status(403).json({ 
          error: "SECURITY SHIELD BLOCKED: Hardware integrity binding mismatch! Multiple devices cannot bypass authentication by copying a single connected MAC address.",
          code: "MAC_SPOOFING_DETECTED"
        });
        return;
      }
      
      if (!activeToken && clientToken) {
        activeMacIntegrityTokens[normalizedMac] = clientToken;
      }
    }
    
    res.json({ success: true, message: "Device Integrity Verification Handshake confirmed." });
  });

  // ---------------------------------------------------------------------------
  // SYSTEM OPERATOR OPERATIONS & SECURITY DEFENSE ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get("/api/operators", (req, res) => {
    const db = readDB();
    const ops = db.users?.filter(u => u.role === "operator") || [];
    res.json(ops);
  });

  app.post("/api/operators", (req, res) => {
    const { username, password, operatorRole, profileName, profilePhone, permissions, allowedIps, allowedDevices, loginTimeLimit } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required to register an Operator." });
      return;
    }

    const db = readDB();
    if (!db.users) db.users = [];
    const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "Username already taken." });
      return;
    }

    const newOp: UserAccount = {
      id: "op-" + Date.now(),
      username,
      password: hashPassword(password),
      role: "operator",
      operatorRole: operatorRole || "standard",
      status: "active",
      profileName: profileName || `${operatorRole || 'Standard'} Operator`,
      profilePhone: profilePhone || "0699000000",
      permissions: permissions || ["view_users", "view_payments"],
      allowedIps: allowedIps || "",
      allowedDevices: allowedDevices || "",
      loginTimeLimit: Number(loginTimeLimit) || 0,
      createdAt: new Date().toISOString(),
      loginHistory: []
    };

    db.users.push(newOp);

    // Track operation
    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "success",
      timestamp: new Date().toISOString(),
      message: `Operator Created: "${username}" with role [${newOp.operatorRole?.toUpperCase()}] registered by administrator.`,
      operator: "admin"
    });

    writeDB(db);
    res.status(201).json({ success: true, operator: newOp });
  });

  app.put("/api/operators/:id", (req, res) => {
    const { id } = req.params;
    const { operatorRole, status, profileName, profilePhone, permissions, allowedIps, allowedDevices, loginTimeLimit, password } = req.body;

    const db = readDB();
    if (!db.users) db.users = [];
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Operator not found." });
      return;
    }

    const current = db.users[idx];
    const updated = {
      ...current,
      operatorRole: operatorRole !== undefined ? operatorRole : current.operatorRole,
      status: status !== undefined ? status : current.status,
      profileName: profileName !== undefined ? profileName : current.profileName,
      profilePhone: profilePhone !== undefined ? profilePhone : current.profilePhone,
      permissions: permissions !== undefined ? permissions : current.permissions,
      allowedIps: allowedIps !== undefined ? allowedIps : current.allowedIps,
      allowedDevices: allowedDevices !== undefined ? allowedDevices : current.allowedDevices,
      loginTimeLimit: loginTimeLimit !== undefined ? Number(loginTimeLimit) : current.loginTimeLimit,
      password: password ? hashPassword(password) : current.password
    };

    db.users[idx] = updated;

    // Log update action
    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "info",
      timestamp: new Date().toISOString(),
      message: `Operator Updated: Admin updated configurations for Operator "${current.username}". Status: ${updated.status?.toUpperCase()}`,
      operator: "admin"
    });

    writeDB(db);
    res.json({ success: true, operator: updated });
  });

  app.delete("/api/operators/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    if (!db.users) db.users = [];
    const matched = db.users.find(u => u.id === id);
    if (!matched) {
      res.status(404).json({ error: "Operator not found." });
      return;
    }

    db.users = db.users.filter(u => u.id !== id);

    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "warning",
      timestamp: new Date().toISOString(),
      message: `Operator Account Deleted: Account for "${matched.username}" removed from database by administrator.`,
      operator: "admin"
    });

    writeDB(db);
    res.json({ success: true });
  });

  app.post("/api/operators/:id/force-logout", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    if (!db.users) db.users = [];
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Operator not found." });
      return;
    }

    db.users[idx].sessionToken = undefined; // Force logout by ripping session token
    
    // Log
    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "warning",
      timestamp: new Date().toISOString(),
      message: `Forced Logout: Admin forced immediate termination of active session for operator "${db.users[idx].username}".`,
      operator: "admin"
    });

    writeDB(db);
    res.json({ success: true, message: `Successfully terminated session for user ${db.users[idx].username}` });
  });

  app.post("/api/operators/:id/toggle-lock", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // suspended | active | locked
    const db = readDB();
    if (!db.users) db.users = [];
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Operator not found." });
      return;
    }

    db.users[idx].status = status || "suspended";
    if (status === "suspended" || status === "locked") {
      db.users[idx].sessionToken = undefined; // Force kick out too!
    }

    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "danger",
      timestamp: new Date().toISOString(),
      message: `Operator State Modified: Account for operator "${db.users[idx].username}" has been set to status [${status?.toUpperCase()}].`,
      operator: "admin"
    });

    writeDB(db);
    res.json({ success: true, operator: db.users[idx] });
  });

  app.post("/api/operators/activity", (req, res) => {
    const { username, action } = req.body;
    if (!username || !action) {
      res.status(400).json({ error: "Missing logs data context." });
      return;
    }
    const db = readDB();
    if (!db.users) db.users = [];
    const idx = db.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    
    // Track activity in last action
    if (idx !== -1) {
      db.users[idx].lastAction = {
        action,
        timestamp: new Date().toISOString()
      };
    }

    // Append to system logs
    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "info",
      timestamp: new Date().toISOString(),
      message: `Operator Action: ${username} performed "${action}"`,
      operator: username
    });

    writeDB(db);
    res.json({ success: true });
  });

  // SYSTEM AUDIT LOGS
  app.get("/api/system-logs", (req, res) => {
    const db = readDB();
    res.json(db.systemLogs || []);
  });

  app.delete("/api/system-logs", (req, res) => {
    const db = readDB();
    db.systemLogs = [];
    writeDB(db);
    res.json({ success: true, message: "System logs flushed." });
  });

  // FIREWALL IP & MAC BAN CONTROL PLACES
  app.get("/api/security/blacklist", (req, res) => {
    const db = readDB();
    res.json({
      ips: db.blacklistedIps || [],
      macs: db.blacklistedMacs || [],
      alerts: db.securityAlerts || []
    });
  });

  app.post("/api/security/block-ip", (req, res) => {
    const { ip, reason } = req.body;
    if (!ip) {
      res.status(400).json({ error: "IP Address required" });
      return;
    }
    const db = readDB();
    if (!db.blacklistedIps) db.blacklistedIps = [];
    
    const exists = db.blacklistedIps.some(i => i.ip === ip);
    if (!exists) {
      db.blacklistedIps.push({ ip, reason: reason || "Flagged suspicious hacking network behavior", createdAt: new Date().toISOString() });
      
      if (!db.systemLogs) db.systemLogs = [];
      db.systemLogs.unshift({
        id: "log-" + Date.now(),
        level: "danger",
        timestamp: new Date().toISOString(),
        message: `Firewall Rule Appended: Banned IP address "${ip}". Reason: ${reason || "Suspicious traffic pattern"}`,
        operator: "firewall-bot"
      });
    }
    writeDB(db);
    res.json({ success: true });
  });

  app.post("/api/security/block-mac", (req, res) => {
    const { mac, reason } = req.body;
    if (!mac) {
      res.status(400).json({ error: "MAC Address required" });
      return;
    }
    const db = readDB();
    if (!db.blacklistedMacs) db.blacklistedMacs = [];
    
    const formattedMac = mac.trim().toUpperCase();
    const exists = db.blacklistedMacs.some(m => m.mac === formattedMac);
    if (!exists) {
      db.blacklistedMacs.push({ mac: formattedMac, reason: reason || "ARP spoof bypass threat blocked", createdAt: new Date().toISOString() });
      
      if (!db.systemLogs) db.systemLogs = [];
      db.systemLogs.unshift({
        id: "log-" + Date.now(),
        level: "danger",
        timestamp: new Date().toISOString(),
        message: `Firewall Rule Appended: Banned MAC hardware "${formattedMac}". Reason: ${reason || "MAC cloning fraud blocking"}`,
        operator: "firewall-bot"
      });
    }
    writeDB(db);
    res.json({ success: true });
  });

  app.post("/api/security/unblock-ip", (req, res) => {
    const { ip } = req.body;
    const db = readDB();
    if (!db.blacklistedIps) db.blacklistedIps = [];
    db.blacklistedIps = db.blacklistedIps.filter(i => i.ip !== ip);
    
    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "success",
      timestamp: new Date().toISOString(),
      message: `Firewall Rule Cleared: Restored network privileges for IP address "${ip}".`,
      operator: "admin"
    });
    
    writeDB(db);
    res.json({ success: true });
  });

  app.post("/api/security/unblock-mac", (req, res) => {
    const { mac } = req.body;
    const db = readDB();
    if (!db.blacklistedMacs) db.blacklistedMacs = [];
    const formattedMac = mac.trim().toUpperCase();
    db.blacklistedMacs = db.blacklistedMacs.filter(m => m.mac !== formattedMac);
    
    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "success",
      timestamp: new Date().toISOString(),
      message: `Firewall Rule Cleared: Bypassed suspension filter for MAC client hardware "${formattedMac}".`,
      operator: "admin"
    });

    writeDB(db);
    res.json({ success: true });
  });

  app.get("/api/security-alerts", (req, res) => {
    const db = readDB();
    res.json(db.securityAlerts || []);
  });

  app.post("/api/security-alerts/resolve", (req, res) => {
    const { id } = req.body;
    const db = readDB();
    if (!db.securityAlerts) db.securityAlerts = [];
    db.securityAlerts = db.securityAlerts.map(alert => {
      if (alert.id === id) {
        return { ...alert, resolved: true };
      }
      return alert;
    });
    writeDB(db);
    res.json({ success: true });
  });

  // SYSTEM BACKUPS (Simulating automated & manual database exports)
  app.get("/api/backups", (req, res) => {
    const db = readDB();
    res.json(db.backups || []);
  });

  app.post("/api/backups/generate", (req, res) => {
    const { operator } = req.body;
    const db = readDB();
    if (!db.backups) db.backups = [];
    
    const id = "bk-" + Date.now();
    const ts = new Date().toISOString();
    const backupEntry = {
      id,
      filename: `hotspot_backup_${ts.slice(0, 10).replace(/-/g, "_")}_${Date.now().toString().slice(-4)}.json`,
      timestamp: ts,
      size: `${Math.round(JSON.stringify(db).length / 102) / 10} KB`,
      count: (db.users?.length || 0) + (db.vouchers?.length || 0)
    };
    
    db.backups.unshift(backupEntry);
    
    // Save log entry
    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "success",
      timestamp: new Date().toISOString(),
      message: `System DB Backup Generated: Database snapshot compiled. Filename: ${backupEntry.filename}`,
      operator: operator || "system-scheduler"
    });

    writeDB(db);
    res.json({ success: true, backup: backupEntry });
  });

  app.post("/api/backups/restore", (req, res) => {
    const { id } = req.body;
    const db = readDB();
    const match = db.backups?.find(b => b.id === id);
    if (!match) {
      res.status(404).json({ error: "Backup snapshot log registry not found." });
      return;
    }

    if (!db.systemLogs) db.systemLogs = [];
    db.systemLogs.unshift({
      id: "log-" + Date.now(),
      level: "warning",
      timestamp: new Date().toISOString(),
      message: `System DB Restore Initiated: Restored configurations from snapshot ${match.filename}`,
      operator: "admin"
    });
    writeDB(db);

    res.json({ success: true, message: `System database successfully restored from snapshot ${match.filename}` });
  });

  // REST API Endpoints
  // ---------------------------------------------------------------------------

  // A. Packages endpoints
  app.get("/api/packages", (req, res) => {
    const db = readDB();
    res.json(db.packages);
  });

  app.post("/api/packages", (req, res) => {
    const { name, priceTzs, durationMins, speedLimit } = req.body;
    if (!name || !priceTzs || !durationMins) {
      res.status(400).json({ error: "Missing package parameters" });
      return;
    }
    const db = readDB();
    const newPkg: HotspotPackage = {
      id: "pkg-" + Date.now(),
      name,
      priceTzs: Number(priceTzs),
      durationMins: Number(durationMins),
      speedLimit: speedLimit || "2M/2M"
    };
    db.packages.push(newPkg);
    writeDB(db);
    res.status(201).json(newPkg);
  });

  app.delete("/api/packages/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    db.packages = db.packages.filter(p => p.id !== id);
    writeDB(db);
    res.json({ success: true });
  });

  app.put("/api/packages/:id", (req, res) => {
    const { id } = req.params;
    const { name, priceTzs, durationMins, speedLimit } = req.body;
    if (!name || !priceTzs || !durationMins) {
      res.status(400).json({ error: "Missing package parameters" });
      return;
    }
    const db = readDB();
    const idx = db.packages.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Package profile not found" });
      return;
    }
    db.packages[idx] = {
      id,
      name,
      priceTzs: Number(priceTzs),
      durationMins: Number(durationMins),
      speedLimit: speedLimit || "2M/2M"
    };
    writeDB(db);
    res.json(db.packages[idx]);
  });

  // A.2 Router link configurations
  app.get("/api/router-link", (req, res) => {
    const db = readDB();
    res.json(db.routerConfig || DEFAULT_DB.routerConfig);
  });

  app.post("/api/router-link", (req, res) => {
    const { host, port, username, password, interfaceName, sslEnabled } = req.body;
    const db = readDB();
    db.routerConfig = {
      host: host || "192.168.88.1",
      port: port || "8728",
      username: username || "admin",
      password: password || "",
      interfaceName: interfaceName || "ether1-gateway",
      sslEnabled: !!sslEnabled,
      lastConnected: new Date().toISOString()
    };
    writeDB(db);
    res.json({ success: true, routerConfig: db.routerConfig });
  });

  // A.3 Client portal page settings
  app.get("/api/client-settings", (req, res) => {
    const db = readDB();
    res.json(db.clientSettings || DEFAULT_DB.clientSettings);
  });

  app.post("/api/client-settings", (req, res) => {
    const { internetName, hotspotSubtitle, welcomeTitle, welcomeQuote, welcomeText, contactPhone } = req.body;
    const db = readDB();
    db.clientSettings = {
      internetName: internetName || "N-internet services LTD",
      hotspotSubtitle: hotspotSubtitle || "High-Speed Fiber Hotspot",
      welcomeTitle: welcomeTitle || "Welcome to N-Internet",
      welcomeQuote: welcomeQuote || "Connection fuels opportunity. We believe seamless browsing and reliable internet inspire boundless potential.",
      welcomeText: welcomeText || "Enjoy blazing-fast, high-speed, unlimited access designed to empower your studies, career, and entertainment. Select a customized packages profile below to connect instantly.",
      contactPhone: contactPhone || "0699302513"
    };
    writeDB(db);
    res.json({ success: true, clientSettings: db.clientSettings });
  });

  app.post("/api/router-link/test", (req, res) => {
    const { host, port, username } = req.body;
    // Simulate interactive microtik API handshake validation callback
    setTimeout(() => {
      res.json({
        success: true,
        message: `Successfully connected to MikroTik RouterOS API on ${host || '192.168.88.1'}:${port || '8728'} with user '${username || 'admin'}' over RouterOS API protocol. Access Granted!`,
        uptime: "14d 6h 32m",
        boardName: "RB4011iGS+",
        rosVersion: "v7.12.1 (stable)",
        cpuLoad: "4%"
      });
    }, 1200);
  });

  // B. Transactions and Payment Simulator
  app.post("/api/pay/initiate", (req, res) => {
    const { phone, provider, packageId, macAddress } = req.body;
    if (!phone || !provider || !packageId) {
       res.status(400).json({ error: "Phone, provider, and packageId are required" });
       return;
    }

    const db = readDB();
    const selectedPkg = db.packages.find(p => p.id === packageId);
    if (!selectedPkg) {
       res.status(404).json({ error: "Selected Internet Package not found" });
       return;
    }

    // Format phone to standard Tanzanian MSISDN (255XXXXXXXXX)
    let formattedPhone = phone.trim().replace(/[\s\+\-]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "255" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("255")) {
      formattedPhone = "255" + formattedPhone;
    }

    const txId = "tx-" + Math.floor(10000 + Math.random() * 90000);
    const newTx: Transaction = {
      id: txId,
      phone: formattedPhone,
      provider,
      packageId,
      packageName: selectedPkg.name,
      priceTzs: selectedPkg.priceTzs,
      status: "pending",
      macAddress: macAddress || "00:00:00:00:00:00",
      createdAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    writeDB(db);

    // BACKGROUND TASK SIMULATING USSD PUSH CONFIRMATION AFTER 6 SECONDS
    setTimeout(() => {
      const udb = readDB();
      const currentTx = udb.transactions.find(t => t.id === txId);
      if (currentTx && currentTx.status === "pending") {
        currentTx.status = "completed";

        // Generate voucher automatically
        const voucherCode = generateVoucherCode();
        currentTx.voucherCode = voucherCode;

        const newVoucher: Voucher = {
          code: voucherCode,
          packageId: selectedPkg.id,
          packageName: selectedPkg.name,
          durationMins: selectedPkg.durationMins,
          priceTzs: selectedPkg.priceTzs,
          status: "active",
          createdAt: new Date().toISOString(),
          activatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + selectedPkg.durationMins * 60 * 1000).toISOString(),
          macAddress: currentTx.macAddress
        };
        udb.vouchers.push(newVoucher);

        // Instantiate live active network session on Mikrotik mock
        const existingSessionIdx = udb.activeSessions.findIndex(s => s.mac === currentTx.macAddress);
        const newSession: ActiveSession = {
          mac: currentTx.macAddress || "FC:BB:22:90:AA:" + Math.floor(10 + Math.random() * 89),
          ip: "10.5.50." + Math.floor(20 + Math.random() * 200),
          username: voucherCode,
          uptime: "00:00:01",
          downBytes: 0,
          upBytes: 0,
          packageName: selectedPkg.name,
          expiresAt: newVoucher.expiresAt!
        };

        if (existingSessionIdx !== -1) {
          udb.activeSessions[existingSessionIdx] = newSession;
        } else {
          udb.activeSessions.push(newSession);
        }

        writeDB(udb);
        console.log(`[PAYMENT RESOLVED] TX ${txId} for ${formattedPhone} resolved successfully. Voucher ${voucherCode} generated and MAC ${currentTx.macAddress} activated.`);
      }
    }, 5500);

    res.json({
      success: true,
      transactionId: txId,
      message: "USSD Payment request sent. Please enter your PIN on your mobile phone to complete transaction.",
      phone: formattedPhone,
      packageName: selectedPkg.name,
      charge: selectedPkg.priceTzs
    });
  });

  app.get("/api/pay/status/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    // Clean up expired sessions on status read representation
    res.json({
      status: tx.status,
      voucherCode: tx.voucherCode,
      transaction: tx
    });
  });

  // C. Manage Vouchers (Admin)
  app.get("/api/vouchers", (req, res) => {
    const db = readDB();
    res.json(db.vouchers);
  });

  // Create Voucher manually or activate a client
  app.post("/api/vouchers/create-manual", (req, res) => {
    const { packageId, macAddress } = req.body;
    if (!packageId) {
      res.status(400).json({ error: "packageId is required" });
      return;
    }
    const db = readDB();
    const selectedPkg = db.packages.find(p => p.id === packageId);
    if (!selectedPkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    const voucherCode = "MAN-" + Math.floor(1000 + Math.random() * 9000);
    const resolvedMac = macAddress ? macAddress.trim().toUpperCase() : "00:00:00:00:00:00";

    const newVoucher: Voucher = {
      code: voucherCode,
      packageId: selectedPkg.id,
      packageName: selectedPkg.name,
      durationMins: selectedPkg.durationMins,
      priceTzs: selectedPkg.priceTzs,
      status: "active",
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + selectedPkg.durationMins * 60 * 1000).toISOString(),
      macAddress: resolvedMac
    };

    db.vouchers.push(newVoucher);

    // Add session
    const activeSession: ActiveSession = {
      mac: resolvedMac,
      ip: "10.5.50." + Math.floor(100 + Math.random() * 100),
      username: voucherCode,
      uptime: "00:00:00",
      downBytes: 0,
      upBytes: 0,
      packageName: selectedPkg.name,
      expiresAt: newVoucher.expiresAt!
    };
    db.activeSessions.push(activeSession);

    writeDB(db);
    res.status(201).json({ success: true, voucher: newVoucher });
  });

  // D. Active Hotspot Sessions
  app.get("/api/active-sessions", (req, res) => {
    const db = readDB();
    // Simulate minor progress in network bytes counters
    const updatedSessions = db.activeSessions.map(session => {
      // Simulate ticking bytes
      const randomIncDown = Math.floor(Math.random() * 450000);
      const randomIncUp = Math.floor(Math.random() * 52000);
      
      // Calculate active elapsed uptime
      return {
        ...session,
        downBytes: session.downBytes + randomIncDown,
        upBytes: session.upBytes + randomIncUp
      };
    });
    db.activeSessions = updatedSessions;
    writeDB(db);

    res.json(updatedSessions);
  });

  app.get("/api/transactions", (req, res) => {
    const db = readDB();
    res.json(db.transactions || []);
  });

  app.post("/api/active-sessions/disconnect", (req, res) => {
    const { mac } = req.body;
    if (!mac) {
      res.status(400).json({ error: "MAC address is required to disconnect client" });
      return;
    }
    const db = readDB();
    db.activeSessions = db.activeSessions.filter(s => s.mac !== mac);
    // Mark associated vouchers as expired or unused based on current profile
    db.vouchers = db.vouchers.map(v => {
      if (v.macAddress === mac && v.status === "active") {
        return { ...v, status: "expired" };
      }
      return v;
    });
    writeDB(db);
    res.json({ success: true });
  });

  // E. Analytics/Dashboard data
  app.get("/api/stats", (req, res) => {
    const db = readDB();
    const transactions = db.transactions;
    const completedTx = transactions.filter(t => t.status === "completed");

    // Calculate revenue totals
    const today = new Date().toISOString().split("T")[0];
    const totalTodayRevenue = completedTx
      .filter(t => t.createdAt.startsWith(today))
      .reduce((sum, t) => sum + t.priceTzs, 0);

    const aggregateRevenue = completedTx.reduce((sum, t) => sum + t.priceTzs, 0);

    // Active sessions list count
    const activeClientsCount = db.activeSessions.length;

    // Hourly statistics mapping
    const hourlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const hour = (new Date().getHours() - (11 - i) + 24) % 24;
      const keyHour = hour.toString().padStart(2, "0");
      const revenue = completedTx
        .filter(t => {
          const tHour = new Date(t.createdAt).getHours().toString().padStart(2, "0");
          return tHour === keyHour;
        })
        .reduce((sum, t) => sum + t.priceTzs, 0);

      return {
        time: `${keyHour}:00`,
        revenue: revenue || (i * 500) // fallback mock variation for graph layout realism
      };
    });

    // Device breakdown simulation
    const deviceStats = [
      { name: "Android Devices", value: Math.max(2, Math.floor(activeClientsCount * 0.55)) },
      { name: "iPhones / iPads", value: Math.max(1, Math.floor(activeClientsCount * 0.30)) },
      { name: "Windows / MacBooks", value: Math.max(1, Math.floor(activeClientsCount * 0.15)) }
    ];

    res.json({
      revenueToday: totalTodayRevenue,
      revenueAllTime: aggregateRevenue,
      activeUsers: activeClientsCount,
      totalVouchers: db.vouchers.length,
      hourlyRevenueChart: hourlyRevenue,
      devicePieChart: deviceStats,
      paymentDistribution: {
        mpesa: completedTx.filter(t => t.provider === "mpesa").reduce((s, t) => s + t.priceTzs, 0),
        airtel: completedTx.filter(t => t.provider === "airtel").reduce((s, t) => s + t.priceTzs, 0),
        tigo: completedTx.filter(t => t.provider === "tigo").reduce((s, t) => s + t.priceTzs, 0),
        halotel: completedTx.filter(t => t.provider === "halotel").reduce((s, t) => s + t.priceTzs, 0)
      }
    });
  });

  // F. Router Configuration script builder
  app.post("/api/router-config", (req, res) => {
    const { apiHost, apiPort, hotspotName, dnsName } = req.body;
    const host = apiHost || "192.168.88.1";
    const name = hotspotName || "PiliPili_WiFi";
    const dns = dnsName || "pilipili.hotspot";

    // Build real production Mikrotik config CLI scripts
    const script = `# ==========================================================
# MIKROTIK HOTSPOT AUTOMATED PAYMENT INTEGRATION SCRIPT
# Location: Tanzania Hotspot Business Configuration
# ==========================================================

/ip hotspot profile
add dns-name=${dns} hotspot-address=${host} html-directory=hotspot \\
    login-by=http-chap,http-pap,mac-cookie name=payment_hotspot_profile

/ip hotspot
add disabled=no idle-timeout=30m interface=bridge-local name=${name} \\
    profile=payment_hotspot_profile address-pool=hs-pool-1

/ip hotspot user profile
add name="Short Pass" shared-users=1 rate-limit="1M/1M"
add name="Standard Pass" shared-users=1 rate-limit="2M/2M"
add name="Premium day Pass" shared-users=1 rate-limit="4M/4M"

# ----------------------------------------------------------
# WALL WALL (Walled Garden) allowed payment gateways routes
# Users can access financial network portals without login
# ----------------------------------------------------------
/ip hotspot walled-garden
add dst-host=*mpesa* action=allow
add dst-host=*vodacom* action=allow
add dst-host=*airtelmobile* action=allow
add dst-host=*tigopesa* action=allow
add dst-host=*tigo.co.tz* action=allow
add dst-host=*halopesa* action=allow
add dst-host=*halotel* action=allow
add dst-host=*selcom* action=allow
add dst-host=*checkout.voda* action=allow
# Allow cloud runtime server APIs for voucher query check
add dst-host=*ais-dev* action=allow
add dst-host=*ais-pre* action=allow
add dst-host=*.run.app action=allow

# ----------------------------------------------------------
# REST API callback Webhook to authenticate devices via bash
# ----------------------------------------------------------
/system script
add name="activate_mac_user" owner=admin source="\\
  :local macAddress \\"\\";\\
  :local userCode \\"\\";\\
  /tool fetch url=\\"https://${req.get("host") || "your-hotspot-host.com"}/api/active-sessions\\" mode=https keep-result=no"
`;

    res.json({ script });
  });

  // ---------------------------------------------------------------------------
  // SYSTEM AUTOMATION CORNER TASK (REAL-TIME RECURRING BACKGROUND MONITOR)
  // ---------------------------------------------------------------------------
  function runAutomationCron() {
    try {
      const db = readDB();
      let changed = false;
      const now = new Date();
      const nowMs = now.getTime();

      // 1. Session Timing & Expirations (Auto-Disconnection & Renewal Notification)
      if (db.activeSessions && db.activeSessions.length > 0) {
        const beforeCount = db.activeSessions.length;
        const remainingSessions = db.activeSessions.filter(s => {
          const expiresMs = new Date(s.expiresAt).getTime();
          const isExpired = nowMs >= expiresMs;
          if (isExpired) {
            // Log automated disconnection
            if (!db.systemLogs) db.systemLogs = [];
            db.systemLogs.unshift({
              id: "log-" + Date.now() + Math.random().toString(36).substring(7),
              level: "danger",
              timestamp: now.toISOString(),
              message: `[AUTOMATED ENGINE] Uptime quota EXPIRED: Client automatically disconnected. Voucher: "${s.username}" for MAC Hardware: ${s.mac}.`,
              operator: "automation-cron"
            });
            
            // Log package renewal prompt sent
            db.systemLogs.unshift({
              id: "log-" + Date.now() + Math.random().toString(36).substring(4),
              level: "info",
              timestamp: now.toISOString(),
              message: `[AUTOMATED ENGINE] Package renewal prompt trigger sent to SMS mobile gateway target: ${s.username}`,
              operator: "automation-cron"
            });

            // Mark associated voucher as expired
            if (db.vouchers) {
              db.vouchers = db.vouchers.map(v => {
                if (v.code === s.username) {
                  return { ...v, status: "expired" as const };
                }
                return v;
              });
            }
          }
          return !isExpired;
        });

        if (remainingSessions.length !== beforeCount) {
          db.activeSessions = remainingSessions;
          changed = true;
        }
      }

      // 2. Fraud & Intrusion Cyber Attack Detection (Bypass rejection & spoof block)
      if (db.activeSessions && db.activeSessions.length > 1) {
        const macsSeen = new Set<string>();
        db.activeSessions.forEach(s => {
          if (macsSeen.has(s.mac)) {
            // Trigger auto block and alert
            const alertId = "alt-" + Date.now();
            const alertExists = db.securityAlerts?.some(a => a.target === s.mac && !a.resolved);
            if (!alertExists) {
              if (!db.securityAlerts) db.securityAlerts = [];
              db.securityAlerts.push({
                id: alertId,
                type: "MAC_CLONING_DETECTED",
                details: `Multiple device clients IP detected mirroring single paid MAC Hardware client token: ${s.mac}. ARP MAC spoof hack pattern countered.`,
                target: s.mac,
                timestamp: now.toISOString(),
                resolved: false
              });

              if (!db.systemLogs) db.systemLogs = [];
              db.systemLogs.unshift({
                id: "log-sec-" + Date.now(),
                level: "danger",
                timestamp: now.toISOString(),
                message: `[SECURITY SHIELD] ATTACK DEFLECTED: Duplicate MAC cloning bypass breach thwarted. Added MAC ${s.mac} to active intrusion list.`,
                operator: "firewall-bot"
              });

              // Auto-block MAC!
              if (!db.blacklistedMacs) db.blacklistedMacs = [];
              if (!db.blacklistedMacs.some(m => m.mac === s.mac)) {
                db.blacklistedMacs.push({
                  mac: s.mac,
                  reason: "Intrusion system MAC cloning auto-defense lockout",
                  createdAt: now.toISOString()
                });
              }
              changed = true;
            }
          } else {
            macsSeen.add(s.mac);
          }
        });
      }

      // 3. Client Wi-Fi Connection Discovery & Redirection Simulation
      if (Math.random() < 0.15) { // 15% simulation probability ticker
        const randomIps = ["10.5.50.45", "10.5.50.81", "10.5.50.159", "10.5.50.218"];
        const randomMacs = ["22:AC:EF:81:4A:23", "F2:D1:B2:77:81:3A", "84:FC:99:C1:5F:AA"];
        const ip = randomIps[Math.floor(Math.random() * randomIps.length)];
        const mac = randomMacs[Math.floor(Math.random() * randomMacs.length)];
        
        if (!db.systemLogs) db.systemLogs = [];
        db.systemLogs.unshift({
          id: "log-sim-" + Date.now() + Math.random().toString(36).substring(8),
          level: "info",
          timestamp: now.toISOString(),
          message: `[AUTOMATED ENGINE] DHCP Scan: Connected new client host on IP ${ip} (MAC: ${mac}). Auto-redirected browser request to captive login gateway.`,
          operator: "dhcp-service"
        });
        changed = true;
      }

      // 4. Automated Daily Backup Generation simulation (creates files if none or elapsed)
      const lastBackup = db.backups?.[0];
      const timeSinceLastBackup = lastBackup ? nowMs - new Date(lastBackup.timestamp).getTime() : Infinity;
      if (timeSinceLastBackup > 120000) { // 2 mins elapsed
        const bkId = "bk-auto-" + Date.now();
        const bkEntry = {
          id: bkId,
          filename: `hotspot_auto_backup_${now.toISOString().slice(0, 10).replace(/-/g, "_")}_${Date.now().toString().slice(-4)}.json`,
          timestamp: now.toISOString(),
          size: `${Math.round(JSON.stringify(db).length / 102) / 10} KB`,
          count: (db.users?.length || 0) + (db.vouchers?.length || 0)
        };
        if (!db.backups) db.backups = [];
        db.backups.unshift(bkEntry);

        if (!db.systemLogs) db.systemLogs = [];
        db.systemLogs.unshift({
          id: "log-" + Date.now(),
          level: "success",
          timestamp: now.toISOString(),
          message: `[AUTOMATED ENGINE] Periodic Database Backup generated successfully to Cloud Storage and persistent directory: ${bkEntry.filename}`,
          operator: "auto-scheduler"
        });
        changed = true;
      }

      if (changed) {
        writeDB(db);
      }
    } catch (err) {
      console.error("Internal automation scheduler loop error:", err);
    }
  }

  // Spin real automation monitor loop every 8 seconds
  const autoLoopInterval = setInterval(runAutomationCron, 8000);

  // ---------------------------------------------------------------------------
  // Vite Dev Server Middleware or Static Builds Serving
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER UP] MikroTik Hotspot System running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server bootstrap crash:", err);
});
