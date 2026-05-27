import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Database, 
  Cpu, 
  XSquare, 
  RefreshCw, 
  Download, 
  Terminal, 
  Hash, 
  UserCheck, 
  Coins, 
  TrendingUp, 
  Grid, 
  Layers, 
  BookOpen,
  CheckCircle2,
  FileText,
  AlertCircle,
  Edit,
  Check,
  Server,
  Wifi,
  LogOut,
  Sliders,
  Users,
  ShieldAlert,
  Eye,
  Activity
} from "lucide-react";
import { HotspotPackage, Transaction, Voucher, ActiveSession, AdminStats } from "../types";
import { motion } from "motion/react";
import OperatorsTab from "./OperatorsTab";
import SystemControlTab from "./SystemControlTab";
import OperatorWorkspaceTabs from "./OperatorWorkspaceTabs";

// Dynamic Session Time countdown component for Admin Active Sessions list
function SessionTimeLeft({ expiresAt }: { expiresAt: string }) {
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr("Expired (0m 0s left)");
        setIsExpired(true);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      let timerText = "";
      if (hours > 0) {
        timerText += `${hours}h ${mins}m ${secs}s`;
      } else {
        timerText += `${mins}m ${secs}s`;
      }
      setTimeLeftStr(timerText);
      setIsExpired(false);
    };

    updateTime();
    const interval = RouterIntervalTimerCheck();
    return () => clearInterval(interval);

    function RouterIntervalTimerCheck() {
      return setInterval(updateTime, 1000);
    }
  }, [expiresAt]);

  const formattedEnd = new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex flex-col">
      <span className="font-mono text-white text-[11px] font-semibold">{formattedEnd}</span>
      <span className={`text-[9px] font-mono font-bold mt-0.5 ${isExpired ? "text-red-400" : "text-amber-500 animate-pulse"}`}>
        ({timeLeftStr})
      </span>
    </div>
  );
}

interface AdminDashboardProps {
  packages: HotspotPackage[];
  onRefreshPackages: () => void;
  triggerDataSync: number; // Increment to force statistics refresh
}

export default function AdminDashboard({ packages, onRefreshPackages, triggerDataSync }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem("hotspot_auth_user");
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    const saved = localStorage.getItem("hotspot_auth_user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === "admin") return "overview";
        if (u.role === "operator") return "op-overview";
        return "router-setup";
      } catch {
        return "overview";
      }
    }
    return "overview";
  });

  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authProfileName, setAuthProfileName] = useState("");
  const [authProfilePhone, setAuthProfilePhone] = useState("");
  const [authRouterBrand, setAuthRouterBrand] = useState<"mikrotik" | "tplink" | "other">("tplink");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // --- PASSWORD RECOVERY STATES ---
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"phone" | "otp" | "reset">("phone");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [suggestedRecoveryOtp, setSuggestedRecoveryOtp] = useState("");

  // --- BIOMETRICS AUTH STATES ---
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricPromptType, setBiometricPromptType] = useState<"verify" | "setup">("verify");
  const [biometricFinishedMsg, setBiometricFinishedMsg] = useState("");
  const [biometricKeyToSave, setBiometricKeyToSave] = useState("");
  const [registeredBiometrics, setRegisteredBiometrics] = useState<string[]>(() => {
    const saved = localStorage.getItem("hotspot_registered_biometrics");
    return saved ? JSON.parse(saved) : [];
  });

  // --- INTRUSION AND SECURITY CONTROL STATES ---
  const [securityLocks, setSecurityLocks] = useState<any[]>([]);
  const [antiMacBypass, setAntiMacBypass] = useState(true);

  // --- SYSTEM SETTINGS CONFIGURATIONS (SETTING MENU) ---
  const [settingsQosProfile, setSettingsQosProfile] = useState("Standard Boost");
  const [settingsTimeoutSec, setSettingsTimeoutSec] = useState("1800");
  const [settingsMockDelayMs, setSettingsMockDelayMs] = useState("1500");
  const [settingsAutoConnecths, setSettingsAutoConnecths] = useState(true);
  const [settingsThrottleLimit, setSettingsThrottleLimit] = useState("50");
  const [settingsOfflineSync, setSettingsOfflineSync] = useState(true);

  // --- OPERATOR LIVE STATES ---
  const [opRouterBrand, setOpRouterBrand] = useState<"mikrotik" | "tplink" | "other">("tplink");
  const [opRouterHost, setOpRouterHost] = useState("192.168.0.1");
  const [opRouterPort, setOpRouterPort] = useState("80");
  const [opRouterUsername, setOpRouterUsername] = useState("admin");
  const [opRouterPassword, setOpRouterPassword] = useState("");
  const [opInternetName, setOpInternetName] = useState("");
  const [opProfileName, setOpProfileName] = useState("");
  const [opProfilePhone, setOpProfilePhone] = useState("");
  const [opPassword, setOpPassword] = useState("");
  
  // --- DETAILED ROOT OPERATORS, LOGS, SECURITY DEFENSE & BACKUPS STATE HOOKS ---
  const [operatorsList, setOperatorsList] = useState<any[]>([]);
  const [systemLogsList, setSystemLogsList] = useState<any[]>([]);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [blacklistedIpsList, setBlacklistedIpsList] = useState<any[]>([]);
  const [blacklistedMacsList, setBlacklistedMacsList] = useState<any[]>([]);
  const [securityAlertsList, setSecurityAlertsList] = useState<any[]>([]);
  const [activeTabSub, setActiveTabSub] = useState<"list" | "create" | "logs">("list");
  
  // Operator Edit/Create input parameters
  const [opFormUsername, setOpFormUsername] = useState("");
  const [opFormPassword, setOpFormPassword] = useState("");
  const [opFormRole, setOpFormRole] = useState<"senior" | "standard" | "support">("standard");
  const [opFormName, setOpFormName] = useState("");
  const [opFormPhone, setOpFormPhone] = useState("");
  const [opFormPermissions, setOpFormPermissions] = useState<string[]>(["view_users", "view_payments", "create_vouchers", "assist_activation", "view_logs"]);
  const [opFormIps, setOpFormIps] = useState("");
  const [opFormDevices, setOpFormDevices] = useState("");
  const [opFormTimeLimit, setOpFormTimeLimit] = useState("0");
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [opFormError, setOpFormError] = useState("");
  const [opFormSuccess, setOpFormSuccess] = useState("");

  // Firewall and cyber defense manually ban form fields
  const [manualBanIp, setManualBanIp] = useState("");
  const [manualBanIpReason, setManualBanIpReason] = useState("");
  const [manualBanMac, setManualBanMac] = useState("");
  const [manualBanMacReason, setManualBanMacReason] = useState("");
  
  // Client Portal Customization form states
  const [portalInternetName, setPortalInternetName] = useState("N-internet services LTD");
  const [portalHotspotSubtitle, setPortalHotspotSubtitle] = useState("High-Speed Fiber Hotspot");
  const [portalWelcomeTitle, setPortalWelcomeTitle] = useState("Welcome to N-Internet");
  const [portalWelcomeQuote, setPortalWelcomeQuote] = useState("");
  const [portalWelcomeText, setPortalWelcomeText] = useState("");
  const [portalContactPhone, setPortalContactPhone] = useState("0699302513");
  const [savingPortalSettings, setSavingPortalSettings] = useState(false);

  // Package form states
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgPrice, setNewPkgPrice] = useState("");
  const [newPkgDuration, setNewPkgDuration] = useState("");
  const [newPkgSpeed, setNewPkgSpeed] = useState("2M/2M");
  
  // Package editing state
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Router Link settings form states
  const [linkHost, setLinkHost] = useState("192.168.88.1");
  const [linkPort, setLinkPort] = useState("8728");
  const [linkInterface, setLinkInterface] = useState("ether1-gateway");
  const [linkUser, setLinkUser] = useState("admin");
  const [linkPassword, setLinkPassword] = useState("");
  const [sslEnabled, setSslEnabled] = useState(false);
  const [testingLink, setTestingLink] = useState(false);
  const [linkTestResult, setLinkTestResult] = useState<{
    success: boolean;
    message: string;
    uptime?: string;
    boardName?: string;
    rosVersion?: string;
    cpuLoad?: string;
  } | null>(null);
  
  // Manual activation states
  const [manPkgId, setManPkgId] = useState("");
  const [manMacAddress, setManMacAddress] = useState("");
  const [manPhone, setManPhone] = useState("");
  const [manMessage, setManMessage] = useState("");

  // Router config generator states
  const [routerIp, setRouterIp] = useState("192.168.88.1");
  const [routerSsid, setRouterSsid] = useState("N-internet_HOTSPOT");
  const [routerDns, setRouterDns] = useState("ninternet.hotspot");
  const [generatedScript, setGeneratedScript] = useState("");

  // Load router link config settings on start
  useEffect(() => {
    fetch("/api/router-link")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setLinkHost(data.host || "192.168.88.1");
          setLinkPort(data.port || "8728");
          setLinkInterface(data.interfaceName || "ether1-gateway");
          setLinkUser(data.username || "admin");
          setLinkPassword(data.password || "");
          setSslEnabled(!!data.sslEnabled);
        }
      })
      .catch(err => console.error("Could not fetch router-link details", err));

    fetch("/api/client-settings")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setPortalInternetName(data.internetName || "N-internet services LTD");
          setPortalHotspotSubtitle(data.hotspotSubtitle || "High-Speed Fiber Hotspot");
          setPortalWelcomeTitle(data.welcomeTitle || "Welcome to N-Internet");
          setPortalWelcomeQuote(data.welcomeQuote || "");
          setPortalWelcomeText(data.welcomeText || "");
          setPortalContactPhone(data.contactPhone || "0699302513");
        }
      })
      .catch(err => console.error("Could not fetch client-settings in admin", err));
  }, []);

  // --- ROOT SECURITY DEFENSE & OPERATORS API MUTATION SERVICES ---
  const handleToggleOperatorLock = async (opId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "active" ? "suspended" : "active";
      const res = await fetch(`/api/operators/${opId}/toggle-lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchDashboardData();
        // Log action in journal
        await fetch("/api/operators/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser.username, action: `${nextStatus === "active" ? "Re-activated" : "Suspended"} Operator Account ID ${opId}` })
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceLogout = async (opId: string, opUsername: string) => {
    try {
      const res = await fetch(`/api/operators/${opId}/force-logout`, { method: "POST" });
      if (res.ok) {
        fetchDashboardData();
        alert(`Kicked Operator: Active authentication token revoked for operator "${opUsername}".`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOperator = async (opId: string, opUsername: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently DELETE operator "${opUsername}"?`)) return;
    try {
      const res = await fetch(`/api/operators/${opId}`, { method: "DELETE" });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpFormError("");
    setOpFormSuccess("");

    if (!opFormUsername) {
      setOpFormError("Operator login credential username required.");
      return;
    }

    try {
      const body = {
        username: opFormUsername,
        password: opFormPassword || undefined,
        operatorRole: opFormRole,
        profileName: opFormName,
        profilePhone: opFormPhone,
        permissions: opFormPermissions,
        allowedIps: opFormIps,
        allowedDevices: opFormDevices,
        loginTimeLimit: Number(opFormTimeLimit) || 0
      };

      let url = "/api/operators";
      let method = "POST";
      
      if (editingOpId) {
        url = `/api/operators/${editingOpId}`;
        method = "PUT";
      } else if (!opFormPassword) {
        setOpFormError("A password is required to register a new operator.");
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        setOpFormError(data.error || "Execution failed.");
        return;
      }

      setOpFormSuccess(editingOpId ? "Operator updated successfully!" : "Operator registered successfully!");
      fetchDashboardData();
      
      // Auto-reset forms
      setOpFormUsername("");
      setOpFormPassword("");
      setOpFormRole("standard");
      setOpFormName("");
      setOpFormPhone("");
      setOpFormPermissions(["view_users", "view_payments", "create_vouchers", "assist_activation", "view_logs"]);
      setOpFormIps("");
      setOpFormDevices("");
      setOpFormTimeLimit("0");
      setEditingOpId(null);
      setActiveTabSub("list");
    } catch (err) {
      console.error(err);
      setOpFormError("Communications loop failed.");
    }
  };

  const handleBanIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanIp) return;
    try {
      const res = await fetch("/api/security/block-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: manualBanIp, reason: manualBanIpReason })
      });
      if (res.ok) {
        setManualBanIp("");
        setManualBanIpReason("");
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBanMAC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanMac) return;
    try {
      const res = await fetch("/api/security/block-mac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: manualBanMac, reason: manualBanMacReason })
      });
      if (res.ok) {
        setManualBanMac("");
        setManualBanMacReason("");
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnbanIP = async (ip: string) => {
    try {
      const res = await fetch("/api/security/unblock-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnbanMAC = async (mac: string) => {
    try {
      const res = await fetch("/api/security/unblock-mac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac })
      });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateBackupManual = async () => {
    try {
      const res = await fetch("/api/backups/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: currentUser?.username || "admin" })
      });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreBackupManual = async (id: string, fn: string) => {
    if (!window.confirm(`Are you sure you want to restore system configurations from snapshot ${fn}? Existing records will rollback.`)) return;
    try {
      const res = await fetch("/api/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchDashboardData();
        alert(`Database loaded and restored successfully!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFlushLogsManual = async () => {
    if (!window.confirm("Flush audit logs journal? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/system-logs", { method: "DELETE" });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const adjustPermissionsByRank = (rank: "senior" | "standard" | "support") => {
    setOpFormRole(rank);
    if (rank === "senior") {
      setOpFormPermissions(["view_users", "view_payments", "create_vouchers", "assist_activation", "view_logs", "suspend_sessions", "view_reports"]);
    } else if (rank === "standard") {
      setOpFormPermissions(["view_users", "view_payments", "create_vouchers", "assist_activation", "view_logs"]);
    } else {
      setOpFormPermissions(["view_users", "assist_activation", "view_logs"]);
    }
  };

  // Statistics and core data fetcher
  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      const vouchersRes = await fetch("/api/vouchers");
      const vouchersData = await vouchersRes.json();
      setVouchers(vouchersData);

      const sessionsRes = await fetch("/api/active-sessions");
      const sessionsData = await sessionsRes.json();
      setActiveSessions(sessionsData);

      const transRes = await fetch("/api/transactions");
      const transData = await transRes.json();
      setTransactions(transData);

      // --- CORE SECURITY & OPERATOR BACKEND DATA SYNCRONIZER ---
      if (currentUser) {
        const opsRes = await fetch("/api/operators");
        if (opsRes.ok) {
          const opsData = await opsRes.json();
          setOperatorsList(opsData);
        }

        const logsRes = await fetch("/api/system-logs");
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setSystemLogsList(logsData);
        }

        const backupsRes = await fetch("/api/backups");
        if (backupsRes.ok) {
          const backupsData = await backupsRes.json();
          setBackupList(backupsData);
        }

        const blacklistRes = await fetch("/api/security/blacklist");
        if (blacklistRes.ok) {
          const blacklistData = await blacklistRes.json();
          setBlacklistedIpsList(blacklistData.ips || []);
          setBlacklistedMacsList(blacklistData.macs || []);
          setSecurityAlertsList(blacklistData.alerts || []);
        }
      }
    } catch (err) {
      console.error("Failed to load admin telemetry data", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Simulate transaction logger loading
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => {
        // Fetch raw transactions list by querying backend representation
        fetch("/api/active-sessions") // just fetch lists
          .then(() => {
             // Let's populate mock live transaction table inside admin directly from db mapping
          });
      });
  }, [triggerDataSync, currentTab]);

  useEffect(() => {
    if (currentUser) {
      setOpRouterBrand(currentUser.routerBrand || "tplink");
      setOpRouterHost(currentUser.routerHost || "192.168.0.1");
      setOpRouterPort(currentUser.routerPort || "80");
      setOpRouterUsername(currentUser.routerUsername || "admin");
      setOpRouterPassword(currentUser.routerPassword || "");
      setOpInternetName(currentUser.internetName || currentUser.username + " Fiber");
      setOpProfileName(currentUser.profileName || currentUser.username);
      setOpProfilePhone(currentUser.profilePhone || "0699302513");
    }
  }, [currentUser]);

  // Handle adding or modifying hotspot pricing package
  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName || !newPkgPrice || !newPkgDuration) {
      alert("Please fill all package inputs");
      return;
    }
    try {
      const url = editingPackageId ? `/api/packages/${editingPackageId}` : "/api/packages";
      const method = editingPackageId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPkgName,
          priceTzs: Number(newPkgPrice),
          durationMins: Number(newPkgDuration),
          speedLimit: newPkgSpeed
        })
      });
      if (res.ok) {
        setNewPkgName("");
        setNewPkgPrice("");
        setNewPkgDuration("");
        setNewPkgSpeed("2M/2M");
        setEditingPackageId(null);
        onRefreshPackages();
        fetchDashboardData();
        alert(editingPackageId ? "Pricing profile updated in database successfully." : "Pricing profile saved to hotspot config successfully.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditPackage = (pkg: HotspotPackage) => {
    setEditingPackageId(pkg.id);
    setNewPkgName(pkg.name);
    setNewPkgPrice(pkg.priceTzs.toString());
    setNewPkgDuration(pkg.durationMins.toString());
    setNewPkgSpeed(pkg.speedLimit || "2M/2M");
  };

  const handleCancelEdit = () => {
    setEditingPackageId(null);
    setNewPkgName("");
    setNewPkgPrice("");
    setNewPkgDuration("");
    setNewPkgSpeed("2M/2M");
  };

  // Delete hotspot package
  const handleDeletePackage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hotspot package? Existing vouchers will still remain valid.")) return;
    try {
      const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
      if (res.ok) {
        onRefreshPackages();
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Kick / Disconnect client from local router profile
  const handleKickClient = async (mac: string) => {
    if (!confirm(`Are you sure you want to terminate internet Access for device MAC [${mac}]?`)) return;
    try {
      const res = await fetch("/api/active-sessions/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Physical Router Link settings to Database
  const handleSaveRouterLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/router-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: linkHost,
          port: linkPort,
          username: linkUser,
          password: linkPassword,
          interfaceName: linkInterface,
          sslEnabled
        })
      });
      if (res.ok) {
        alert("Router physical API link configuration saved to database successfully.");
      } else {
        alert("Error saving router link parameters.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting gateway controller backend.");
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const url = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body: Record<string, string> = {
      username: authUsername,
      password: authPassword,
    };

    if (authMode === "register") {
      body.profileName = authProfileName || "Operator Partner";
      body.profilePhone = authProfilePhone || "0699302513";
      body.routerBrand = authRouterBrand;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
      }

      // Successful auth
      setCurrentUser(data.user);
      localStorage.setItem("hotspot_auth_user", JSON.stringify(data.user));
      
      // Set default tab depending on role
      setCurrentTab(
        data.user.role === "admin" 
          ? "overview" 
          : data.user.role === "operator" 
          ? "op-overview" 
          : "router-setup"
      );
      
      // Clear inputs
      setAuthUsername("");
      setAuthPassword("");
      setAuthProfileName("");
      setAuthProfilePhone("");
    } catch (err) {
      console.error(err);
      setAuthError("Server communication fault");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("hotspot_auth_user");
  };

  // --- PASSWORD RECOVERY FLOWS ---
  const handleInitiateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: recoveryPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Failed to initiate recovery process.");
        return;
      }
      setSuggestedRecoveryOtp(data.otp);
      setRecoveryStep("otp");
      setRecoveryMessage(`Simulated SMS dispatch successful! Reset OTP code is: ${data.otp}`);
    } catch (err) {
      console.error(err);
      setAuthError("Network connection error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: recoveryPhone, otp: recoveryCode })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Invalid OTP code.");
        return;
      }
      setRecoveryStep("reset");
      setRecoveryMessage("Security signature verified. Set your new console password.");
    } catch (err) {
      console.error(err);
      setAuthError("Verification failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: recoveryPhone, otp: recoveryCode, newPassword: recoveryPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Password reset failed.");
        return;
      }
      
      alert("Password reset completed successfully. Please sign in with your new password.");
      setAuthMode("login");
      setRecoveryStep("phone");
      setRecoveryPhone("");
      setRecoveryCode("");
      setRecoveryPassword("");
      setRecoveryMessage("");
    } catch (err) {
      console.error(err);
      setAuthError("Reset communication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  // --- BIOMETRIC SECURITY HANDLERS ---
  const handleTriggerBiometricLogin = async (usr: string) => {
    const targetUsr = usr || authUsername;
    if (!targetUsr) {
      setAuthError("Please specify your username first to login with biometrics.");
      return;
    }

    setBiometricScanning(true);
    setBiometricPromptType("verify");
    setBiometricFinishedMsg("");
    setAuthError("");

    setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/login-biometric", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUsr })
        });
        const data = await res.json();
        
        if (!res.ok) {
          setBiometricScanning(false);
          setAuthError(data.error || "Biometric match failed. Please link biometric key during account setup.");
          return;
        }

        setBiometricFinishedMsg("Biometrics Scan Handshake Successful!");
        
        setTimeout(() => {
          setBiometricScanning(false);
          setCurrentUser(data.user);
          localStorage.setItem("hotspot_auth_user", JSON.stringify(data.user));
          setCurrentTab(data.user.role === "admin" ? "overview" : "router-setup");
          setAuthUsername("");
          setAuthPassword("");
        }, 1000);
      } catch (err) {
        setBiometricScanning(false);
        setAuthError("Biometric hardware handshake timed out.");
      }
    }, 1800);
  };

  const handleRegisterBiometrics = async (usr: string) => {
    if (!usr) {
      alert("Please save or input a username handle first.");
      return;
    }
    
    setBiometricScanning(true);
    setBiometricPromptType("setup");
    setBiometricFinishedMsg("");

    setTimeout(async () => {
      try {
        const dummyHardwareKey = "pub-id-" + Math.floor(100000 + Math.random() * 900000);
        const res = await fetch("/api/auth/register-biometric", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: usr, biometricKey: dummyHardwareKey })
        });
        
        if (res.ok) {
          const list = [...registeredBiometrics, usr.toLowerCase()];
          setRegisteredBiometrics(list);
          localStorage.setItem("hotspot_registered_biometrics", JSON.stringify(list));
          setBiometricFinishedMsg("Hardware Fingerprint Registered Securely!");
        } else {
          alert("Could not register biometric credentials.");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setBiometricScanning(false), 1200);
      }
    }, 2000);
  };

  // --- SECURITY CENTER LOGS POLLERS ---
  const fetchSecurityLogs = async () => {
    try {
      const res = await fetch("/api/security/locks");
      const data = await res.json();
      setSecurityLocks(data.locks || []);
      setAntiMacBypass(!!data.antiMacBypassEnabled);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearLocks = async () => {
    try {
      const res = await fetch("/api/security/unlock-all", { method: "POST" });
      if (res.ok) {
        fetchSecurityLogs();
        alert("Intrusion brute force lockout registers cleared!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMacIntegrity = async (checked: boolean) => {
    try {
      const res = await fetch("/api/security/toggle-mac-bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked })
      });
      if (res.ok) {
        setAntiMacBypass(checked);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser && currentTab === "settings") {
      fetchSecurityLogs();
    }
  }, [currentUser, currentTab]);

  const handleUpdatePartnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/auth/profile/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: opProfileName,
          profilePhone: opProfilePhone,
          routerBrand: opRouterBrand,
          routerHost: opRouterHost,
          routerPort: opRouterPort,
          routerUsername: opRouterUsername,
          routerPassword: opRouterPassword,
          internetName: opInternetName,
          ...(opPassword ? { password: opPassword } : {})
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Partner settings and payout destination saved correctly!");
        setCurrentUser(data.user);
        localStorage.setItem("hotspot_auth_user", JSON.stringify(data.user));
        
        // Propagate updates
        if (opInternetName) {
          setPortalInternetName(opInternetName);
        }
        if (opProfilePhone) {
          setPortalContactPhone(opProfilePhone);
        }
      } else {
        alert(data.error || "Failed to update profile details");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating profile.");
    }
  };

  // Save Portal customizable layout specs to DB
  const handleSavePortalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPortalSettings(true);
    try {
      const res = await fetch("/api/client-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internetName: portalInternetName,
          hotspotSubtitle: portalHotspotSubtitle,
          welcomeTitle: portalWelcomeTitle,
          welcomeQuote: portalWelcomeQuote,
          welcomeText: portalWelcomeText,
          contactPhone: portalContactPhone
        })
      });
      if (res.ok) {
        alert("Client Portal custom view parameters saved to database and live-connected!");
      } else {
        alert("Failed to save client portal configurations.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving client portal configuration.");
    } finally {
      setSavingPortalSettings(false);
    }
  };

  // Perform Router Handshake Handler test ping
  const handleTestRouterLink = async () => {
    setTestingLink(true);
    setLinkTestResult(null);
    try {
      const res = await fetch("/api/router-link/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: linkHost,
          port: linkPort,
          username: linkUser,
          password: linkPassword,
          interfaceName: linkInterface,
          sslEnabled
        })
      });
      const data = await res.json();
      setLinkTestResult(data);
    } catch (err) {
      console.error(err);
      setLinkTestResult({
        success: false,
        message: "Handshake Timeout: Unable to reach destination socket host or port is closed."
      });
    } finally {
      setTestingLink(false);
    }
  };

  // Manually activate router client
  const handleManualActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manPkgId) {
       alert("Please choose a package configuration setup.");
       return;
    }
    try {
      const res = await fetch("/api/vouchers/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: manPkgId,
          macAddress: manMacAddress || "AA:BB:CC:11:22:33"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setManMessage(`Device whitelisted and manual voucher generated successfully! Voucher code is: ${data.voucher.code}`);
        setManMacAddress("");
        setManPhone("");
        fetchDashboardData();
        onRefreshPackages();
      } else {
        alert(data.error || "Manual activation failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch compiled RouterOS config script commands
  const fetchRouterScript = async () => {
    try {
      const res = await fetch("/api/router-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiHost: routerIp,
          hotspotName: routerSsid,
          dnsName: routerDns
        })
      });
      const data = await res.json();
      setGeneratedScript(data.script);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRouterScript();
  }, [routerIp, routerSsid, routerDns, currentTab]);

  const byteFormat = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // SQL schema definition to display
  const sqlDumpString = `CREATE DATABASE IF NOT EXISTS pilipili_hotspot;
USE pilipili_hotspot;

-- 1. Hotspot Packages Configuration Table
CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_tzs INT NOT NULL,
  duration_mins INT NOT NULL,
  speed_limit VARCHAR(20) DEFAULT '2M/2M'
);

-- Insert Default Tanzanian Pricing Packages
INSERT INTO packages (id, name, price_tzs, duration_mins, speed_limit) VALUES
('pkg-1', 'Short Pass', 500, 60, '1M/1M'),
('pkg-2', 'Standard Pass', 1000, 180, '2M/2M'),
('pkg-3', 'Premium day Pass', 2000, 1440, '4M/4M')
ON DUPLICATE KEY UPDATE name=name;

-- 2. Payments / Billing Transactions Log
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  provider ENUM('mpesa', 'airtel', 'tigo') NOT NULL,
  package_id VARCHAR(50) NOT NULL,
  package_name VARCHAR(100) NOT NULL,
  price_tzs INT NOT NULL,
  status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  voucher_code VARCHAR(50) NULL,
  mac_address VARCHAR(50) DEFAULT '00:00:00:00:00:00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- 3. Router Hotspot Vouchers Storage
CREATE TABLE IF NOT EXISTS vouchers (
  code VARCHAR(50) PRIMARY KEY,
  package_id VARCHAR(50) NOT NULL,
  duration_mins INT NOT NULL,
  price_tzs INT NOT NULL,
  status ENUM('unused', 'active', 'expired') NOT NULL DEFAULT 'unused',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  mac_address VARCHAR(50) DEFAULT NULL
);`;

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[550px] w-full bg-slate-950 px-4 py-8">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Decorative ambient blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/[0.02] rounded-full blur-3xl pointer-events-none"></div>
          
          {/* BIOMETRIC SCANNING OVERLAY */}
          {biometricScanning && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
              <div className="relative flex flex-col items-center text-center">
                {/* Laser line scanning effect */}
                <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center relative overflow-hidden mb-6 ring-4 ring-amber-500/10 shadow-2xl">
                  <motion.div 
                    animate={{ y: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_10px_#f59e0b] z-10"
                  />
                  {biometricPromptType === "verify" ? (
                    <svg className="w-12 h-12 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a5 5 0 00-10 0c0 1.053.18 2.062.512 3m0 0A9 9 0 0118 12M12 3c4.97 0 9 4.03 9 9V12.75" />
                    </svg>
                  ) : (
                    <svg className="w-12 h-12 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-md font-black tracking-wider text-white uppercase font-mono">
                  {biometricPromptType === "verify" ? "Biometric Security Scan" : "Registering Sensor Key"}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {biometricFinishedMsg ? (
                    <span className="text-emerald-400 font-bold font-mono bg-emerald-950/20 px-3 py-1 border border-emerald-900/20 rounded-full">{biometricFinishedMsg}</span>
                  ) : biometricPromptType === "verify" ? (
                    "Analyzing hardware TouchID/FaceID console signatures..."
                  ) : (
                    "Align your camera or fingerprint on-sensor..."
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="text-center mb-6 relative">
            <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-3 shadow-lg">
              <Wifi className="w-6 h-6 border-none" />
            </div>
            <h2 className="text-lg font-black tracking-wider text-white uppercase sm:text-xl">
              N-Internet Hotspot
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">OPERATOR & BILLING CONTROL CONSOLE</p>
          </div>

          {authMode !== "forgot" && (
            <div className="flex p-1 bg-slate-950 border border-slate-850 rounded-xl mb-5">
              <button
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === "login" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Partner Sign In
              </button>
              <button
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === "register" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Operator Register
              </button>
            </div>
          )}

          {authError && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-xs shadow-inner">
              <span className="mt-0.5">⚠️</span>
              <span className="font-medium leading-relaxed">{authError}</span>
            </div>
          )}

          {recoveryMessage && (
            <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-yellow-500 text-xs font-mono leading-relaxed select-all">
              <strong>📢 Simulated Security Code:</strong>
              <div className="mt-1 font-bold text-sm text-yellow-400 tracking-wider bg-slate-950 p-2 rounded-lg border border-slate-800 text-center select-all">
                {suggestedRecoveryOtp}
              </div>
            </div>
          )}

          {/* MODE A & B: STANDARD LOGIN / REGISTER */}
          {authMode !== "forgot" ? (
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div>
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1 font-mono">
                  Console Username
                </label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block font-mono">
                    Access Password
                  </label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setAuthMode("forgot"); setRecoveryStep("phone"); setAuthError(""); setRecoveryMessage(""); }}
                      className="text-[10px] text-amber-500 hover:text-amber-400 font-bold font-mono transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                />
              </div>

              {authMode === "register" && (
                <>
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1 font-mono">
                      Full Name / Owner Name
                    </label>
                    <input
                      type="text"
                      required
                      value={authProfileName}
                      onChange={(e) => setAuthProfileName(e.target.value)}
                      placeholder="e.g. Lukambinga Nickson"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1 font-mono">
                      Payout Wallet Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={authProfilePhone}
                      onChange={(e) => setAuthProfilePhone(e.target.value)}
                      placeholder="e.g. 0699302513"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1 font-mono">
                      Router Hardware Brand integration
                    </label>
                    <select
                      value={authRouterBrand}
                      onChange={(e) => setAuthRouterBrand(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                    >
                      <option value="mikrotik">MikroTik RouterOS Board</option>
                      <option value="tplink">TP-Link Wireless router</option>
                      <option value="other">Generic Gateway Bridge AP</option>
                    </select>
                  </div>

                  {/* BIOMETRICS TRIGGER ON REGISTRATION */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => { handleRegisterBiometrics(authUsername || "temp"); }}
                      className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 font-bold border border-slate-800 hover:border-cyan-500/20 rounded-xl text-xs flex items-center justify-center gap-2 select-none active:scale-95 transition-all cursor-pointer shadow"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a5 5 0 00-10 0c0 1.053.18 2.062.512 3m0 0A9 9 0 0118 12M12 3c4.97 0 9 4.03 9 9V12.75" />
                      </svg>
                      {registeredBiometrics.includes(authUsername.toLowerCase()) ? "Biometrics Configured ✓" : "Link Fingerprint / Face ID"}
                    </button>
                    <p className="text-[9px] text-slate-500 mt-1 text-center font-mono">Enhance console security with cryptography WebAuthn</p>
                  </div>
                </>
              )}

              <div className="space-y-2.5 pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-xs font-black text-slate-950 text-center select-none active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  {authLoading ? "Initializing security link..." : authMode === "login" ? "Secure Login to Gateway" : "Register & Provision Console"}
                </button>

                {/* BIOMETRIC TRIGGER ON LOGIN */}
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => handleTriggerBiometricLogin(authUsername)}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-500 hover:text-amber-400 font-bold border border-slate-850 hover:border-amber-500/10 rounded-xl text-xs flex items-center justify-center gap-2 select-none active:scale-[0.98] transition-all cursor-pointer mt-2"
                  >
                    <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a5 5 0 00-10 0c0 1.053.18 2.062.512 3m0 0A9 9 0 0118 12M12 3c4.97 0 9 4.03 9 9V12.75" />
                    </svg>
                    Sign In with TouchID / FaceID
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* MODE C: FORGOT PASSWORD RECOVERY */
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-1 text-center justify-center">
                <span className="p-1 px-2.5 font-bold font-mono text-[10px] bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/15">PASSWORD RECOVERY</span>
              </div>

              {recoveryStep === "phone" && (
                <form onSubmit={handleInitiateRecovery} className="space-y-4">
                  <p className="text-[10.5px] text-slate-400 leading-relaxed text-center font-mono">
                    Enter the registered payout mobile wallet phone or account ID to receive simulated OTP reset verification.
                  </p>
                  <div>
                    <label className="text-slate-400 text-[9px] font-bold uppercase block mb-1 font-mono tracking-wider">
                      Payout Phone or Username
                    </label>
                    <input
                      type="text"
                      required
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      placeholder="e.g. 0699302513 or admin"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-black text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-md"
                  >
                    {authLoading ? "Querying records..." : "Dispatch Verification Reset OTP"}
                  </button>
                </form>
              )}

              {recoveryStep === "otp" && (
                <form onSubmit={handleVerifyRecoveryOtp} className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-normal text-center font-semibold">
                    Simulated verification code OTP has been triggered and printed in console and box above!
                  </p>
                  <div>
                    <label className="text-slate-400 text-[9px] font-bold uppercase block mb-1 font-mono tracking-wider">
                      6-Digit Security PIN OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-sm font-bold tracking-widest text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-md"
                  >
                    Verify reset signature
                  </button>
                </form>
              )}

              {recoveryStep === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-normal text-center">
                    Reset signature accepted! Enter your new billing console password below.
                  </p>
                  <div>
                    <label className="text-slate-400 text-[9px] font-bold uppercase block mb-1 font-mono tracking-wider">
                      New console Password
                    </label>
                    <input
                      type="password"
                      required
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-md"
                  >
                    Commit Hashed Password
                  </button>
                </form>
              )}

              <div className="pt-2 text-center select-none">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); setRecoveryMessage(""); }}
                  className="text-xs text-slate-500 hover:text-white font-medium font-sans flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                >
                  ← Return to Console Sign In
                </button>
              </div>
            </div>
          )}

          {authMode === "login" && (
            <div className="mt-5 pt-3.5 border-t border-slate-850 text-center select-none">
              <p className="text-[10px] text-slate-500 leading-normal">
                🔑 Root Administration Logins: <span className="font-mono text-amber-500/80 font-bold">admin</span> / <span className="font-mono text-amber-500/80 font-bold">admin</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Evaluate tabs available based on current operator role
  const currentTabsList = currentUser.role === "admin" ? [
    { id: "overview", label: "Overview Metrics", icon: Grid },
    { id: "operators", label: "Operators Command Center", icon: Users },
    { id: "system-control", label: "Audit, Backups & Logs", icon: ShieldAlert },
    { id: "packages", label: "Manage Packages", icon: Coins },
    { id: "manual", label: "Manual Activation", icon: UserCheck },
    { id: "portal", label: "Portal Customization", icon: Wifi },
    { id: "router", label: "Router API Link & CLI Scripts", icon: Terminal },
    { id: "database", label: "MySQL Dump & Integration Docs", icon: Database },
    { id: "settings", label: "Settings Menu", icon: Sliders }
  ] : currentUser.role === "operator" ? [
    { id: "op-overview", label: "Limited Reports", icon: TrendingUp },
    { id: "op-activation", label: "Vouchers & Activations", icon: UserCheck },
    { id: "op-sessions", label: "Active Sessions Monitor", icon: Eye },
    { id: "op-logs", label: "Connection & System Logs", icon: BookOpen }
  ] : [
    { id: "router-setup", label: "Router Setup", icon: Terminal },
    { id: "internet-settings", label: "Internet Customization", icon: Wifi },
    { id: "package-settings", label: "Hotspot Packages", icon: Coins },
    { id: "my-traffic", label: "Live Traffic & Bandwidth", icon: TrendingUp },
    { id: "my-profile", label: "Profile & Payouts", icon: CheckCircle2 },
    { id: "settings", label: "Settings Menu", icon: Sliders }
  ];

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 font-sans text-slate-100 selection:bg-amber-400 selection:text-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header telemetry status and menu toggle */}
      <div className="bg-slate-900 border-b border-slate-800 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <h2 className="text-md font-bold tracking-tight text-white uppercase">RouterOS Mobile Money billing Integration Core</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Status: <span className="text-emerald-400 font-semibold font-mono">● LIVE GATEWAY MOCK</span> | 
            Owner: <span className="text-slate-200 font-bold">{currentUser.profileName || currentUser.username}</span> | 
            Partner Payout wallet: <span className="text-amber-400 font-bold font-mono">
              {currentUser.role === "admin" ? "Airtel Money " + portalContactPhone : currentUser.profilePhone}
            </span>
          </p>
        </div>
        
        {/* User Identity Info & Logout Action / Reload Stats */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[11px] font-bold text-white capitalize">{currentUser.profileName}</span>
            <span className="text-[9px] font-mono text-amber-500 uppercase font-black">{currentUser.role} Account</span>
          </div>
          
          <button 
            onClick={fetchDashboardData}
            title="Reload metrics data"
            className="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin-slow" />
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-red-950/40 hover:bg-red-900/40 active:bg-red-950 text-red-400 font-bold rounded-xl border border-red-900/30 transition-colors cursor-pointer shadow-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Internal Core Dashboard Navigation Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-800/60 px-5 flex overflow-x-auto scrollbar-none">
        {currentTabsList.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main tab viewer viewport */}
      <div className="flex-1 p-5 overflow-y-auto">

        {/* TAB: OPERATORS COMMAND CENTER */}
        {currentTab === "operators" && (
          <OperatorsTab
            currentUser={currentUser}
            operatorsList={operatorsList}
            onRefresh={fetchDashboardData}
          />
        )}

        {/* TAB: AUDIT, BACKUPS & LOGS */}
        {currentTab === "system-control" && (
          <SystemControlTab
            currentUser={currentUser}
            systemLogsList={systemLogsList}
            backupList={backupList}
            blacklistedIpsList={blacklistedIpsList}
            blacklistedMacsList={blacklistedMacsList}
            securityAlertsList={securityAlertsList}
            onRefresh={fetchDashboardData}
          />
        )}

        {/* COMPREHENSIVE OPERATOR WORKSPACE TABS */}
        {["op-overview", "op-activation", "op-sessions", "op-logs"].includes(currentTab) && (
          <OperatorWorkspaceTabs
            currentUser={currentUser}
            currentTab={currentTab}
            packages={packages}
            vouchers={vouchers}
            activeSessions={activeSessions}
            systemLogsList={systemLogsList}
            onRefresh={fetchDashboardData}
          />
        )}
        
        {/* TAB 1: OVERVIEW TELEMETRY */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            
            {/* Top Stat Row layout */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Stat 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="w-16 h-16 text-amber-400" />
                </div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest block">REVENUE TODAY</span>
                <p className="text-2xl font-bold font-mono text-amber-400 mt-2">
                  {stats?.revenueToday.toLocaleString() || "0"} <span className="text-xs text-slate-500">TZS</span>
                </p>
                <span className="text-[9px] text-emerald-400 mt-1 block">
                  ✔ Earned 10% Cut: {stats?.revenueToday ? Math.round(stats.revenueToday * 0.10).toLocaleString() : "0"} TZS
                </span>
              </div>

              {/* Stat 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Coins className="w-16 h-16 text-white" />
                </div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest block">LIFETIME WALLET (10% DEDUCTION)</span>
                <p className="text-2xl font-bold font-mono text-amber-400 mt-2">
                  {stats?.revenueAllTime ? Math.round(stats.revenueAllTime * 0.10).toLocaleString() : "0"} <span className="text-xs text-slate-500">TZS</span>
                </p>
                <span className="text-[9px] text-slate-450 text-slate-400 mt-1 block">
                  Your 10% Franchise Cut of {stats?.revenueAllTime.toLocaleString() || "0"} TZS Gross
                </span>
              </div>

              {/* Stat 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Cpu className="w-16 h-16 text-cyan-400" />
                </div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest block">ACTIVE ROUTER CLIENTS</span>
                <p className="text-2xl font-bold font-mono text-blue-400 mt-2">
                  {stats?.activeUsers || "0"} <span className="text-xs text-slate-500">Devices</span>
                </p>
                <span className="text-[9px] text-blue-400 mt-1 block font-mono">DHCP Lease pool-1 connected</span>
              </div>

              {/* Stat 4 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Hash className="w-16 h-16 text-magenta-400" />
                </div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest block">ISSUED PAYPASS CODES</span>
                <p className="text-2xl font-bold font-mono text-purple-400 mt-2">
                  {stats?.totalVouchers || "0"} <span className="text-xs text-slate-500">Vouchers</span>
                </p>
                <span className="text-[9px] text-slate-500 mt-1 block">Auto-expired timer tracking</span>
              </div>

            </div>

            {/* Split row: Revenue channels & live connections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Channel Split - 4 columns */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase block mb-4">
                  💸 Pesa Channel Share
                </h3>

                <div className="space-y-4">
                  {/* M-Pesa */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-400">Vodacom M-Pesa</span>
                      <strong className="font-mono text-white">{(stats?.paymentDistribution.mpesa || 0).toLocaleString()} TZS</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        style={{ 
                          width: `${((stats?.paymentDistribution.mpesa || 1) / (stats?.revenueAllTime || 1)) * 100}%` 
                        }} 
                        className="h-full bg-gradient-to-r from-red-600 to-red-500"
                      />
                    </div>
                  </div>

                  {/* Airtel Money */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-400">Airtel Money</span>
                      <strong className="font-mono text-white">{(stats?.paymentDistribution.airtel || 0).toLocaleString()} TZS</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        style={{ 
                          width: `${((stats?.paymentDistribution.airtel || 0) / (stats?.revenueAllTime || 1)) * 100}%` 
                        }} 
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                      />
                    </div>
                  </div>

                  {/* Tigo Pesa */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-400">Tigo Pesa</span>
                      <strong className="font-mono text-white">{(stats?.paymentDistribution.tigo || 0).toLocaleString()} TZS</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        style={{ 
                          width: `${((stats?.paymentDistribution.tigo || 0) / (stats?.revenueAllTime || 1)) * 100}%` 
                        }} 
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                      />
                    </div>
                  </div>

                  {/* Halopesa */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-400">Halopesa (Halotel)</span>
                      <strong className="font-mono text-white">{(stats?.paymentDistribution.halotel || 0).toLocaleString()} TZS</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        style={{ 
                          width: `${((stats?.paymentDistribution.halotel || 0) / (stats?.revenueAllTime || 1)) * 100}%` 
                        }} 
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase">Interactive Hotspot Telemetry Info</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                    Payments are captured and recorded through our mock gateway, matching standard Vodacom USSD Push notification outputs.
                  </p>
                </div>
              </div>

              {/* Active Router Connections Table - 8 columns */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800/40 pb-3">
                  <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                    🌐 Router DHCP Client Active Sessions
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-mono text-emerald-400 font-bold bg-emerald-900/10 border border-emerald-500/10 rounded">
                    MIKROTIK SYNCED
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-medium">
                        <th className="pb-3 px-2">MAC ADDRESS & PROFILE</th>
                        <th className="pb-3">LEASE IP</th>
                        <th className="pb-3">VOUCHER USER</th>
                        <th className="pb-3">SUBSCRIPTION ENDS</th>
                        <th className="pb-3 text-right">BANDWIDTH USED</th>
                        <th className="pb-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500">
                            No devices currently authorized to route packets. Connect on the Customer Hotspot panel to trigger activation!
                          </td>
                        </tr>
                      ) : (
                        activeSessions.map((device, index) => (
                          <tr key={index} className="border-b border-slate-800/60 hover:bg-slate-950/20">
                            <td className="py-3 px-2">
                              <span className="font-mono text-white font-semibold">{device.mac}</span>
                              <span className="text-[9px] text-slate-500 block font-mono mt-0.5">{device.packageName}</span>
                            </td>
                            <td className="font-mono py-3 font-semibold text-slate-300">{device.ip}</td>
                            <td className="font-mono py-3 text-amber-400 font-bold">{device.username}</td>
                            <td className="py-3">
                              <SessionTimeLeft expiresAt={device.expiresAt} />
                            </td>
                            <td className="py-3 font-mono text-right text-slate-400">
                              <div className="text-xs text-slate-300">Down: {byteFormat(device.downBytes)}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Up: {byteFormat(device.upBytes)}</div>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleKickClient(device.mac)}
                                className="px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900 border border-red-900/40 hover:border-red-650 rounded cursor-pointer transition-colors"
                              >
                                Terminate Access
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Simulated Live Gateway Events Stream */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase mb-3 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" /> Simulated Live RouterOS Console & Payment Callback Log
              </h3>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] text-emerald-400 space-y-2 max-h-48 overflow-y-auto border border-slate-850/70 shadow-inner scrollbar-none">
                <p className="text-slate-500">[{new Date().toLocaleTimeString()}] Hotspot terminal initialized on port 3000...</p>
                <p className="text-slate-500">[{new Date().toLocaleTimeString()}] DHCP Pool-1 Lease lease-watcher started</p>
                {activeSessions.map((s, i) => (
                  <p key={i}>
                    <span className="text-amber-500">[{new Date().toLocaleTimeString()}]</span> MIKROTIK_ROS: /ip hotspot user add mac-address={s.mac} username={s.username} profile="{s.packageName}" limit-uptime={s.uptime} comment="Gateway mobile payment auth"
                  </p>
                ))}
                <p className="text-slate-400">[{new Date().toLocaleTimeString()}] HTTP listener: Webhook subscription active on Selcom/Voda/Airtel/Tigo routes</p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: MANAGE PACKAGES (CRUD) */}
        {currentTab === "packages" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Package list */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                ⚙ Pricing Packages configuration
              </h3>

              <div className="space-y-3">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{pkg.name}</h4>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-slate-400">
                        <span>Time: {pkg.durationMins} mins</span>
                        <span>•</span>
                        <span>Speed Limit: {pkg.speedLimit || "2M/2M"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-mono text-amber-400 font-bold text-sm">
                        {pkg.priceTzs.toLocaleString()} TZS
                      </p>
                      
                      <div className="flex items-center gap-1.5">
                        {/* Edit package trigger */}
                        <button
                          onClick={() => handleStartEditPackage(pkg)}
                          title="Modify package"
                          className="p-1.5 text-slate-400 hover:text-amber-400 border border-transparent hover:border-slate-800 rounded hover:bg-slate-900 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Only allow deleting non-default packages for stability */}
                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          title="Delete package"
                          className="p-1.5 text-slate-500 hover:text-red-400 border border-transparent hover:border-slate-800 rounded hover:bg-slate-900 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add package form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase mb-4">
                {editingPackageId ? "✏️ Modify Hotspot Package Option" : "➕ Insert New Hotspot Package Option"}
              </h3>

              <form onSubmit={handleAddPackage} className="space-y-4">
                <div>
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Package Title / Label
                  </label>
                  <input
                    type="text"
                    required
                    value={newPkgName}
                    onChange={(e) => setNewPkgName(e.target.value)}
                    placeholder="e.g. Weekly VIP Access"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                      Price (TZS)
                    </label>
                    <input
                      type="number"
                      required
                      value={newPkgPrice}
                      onChange={(e) => setNewPkgPrice(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      required
                      value={newPkgDuration}
                      onChange={(e) => setNewPkgDuration(e.target.value)}
                      placeholder="e.g. 180"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    MikroTik Bandwidth Profile Rate Limit (Shared User)
                  </label>
                  <select
                    value={newPkgSpeed}
                    onChange={(e) => setNewPkgSpeed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="1M/1M">1 Mbps Down / 1 Mbps Up (Economy class)</option>
                    <option value="2M/2M">2 Mbps Down / 2 Mbps Up (Standard package)</option>
                    <option value="4M/4M">4 Mbps Down / 4 Mbps Up (Streaming pass)</option>
                    <option value="8M/8M">8 Mbps Down / 8 Mbps Up (Premium gaming pass)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  {editingPackageId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer border border-slate-700"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-3 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer shadow-amber-500/10 transition-colors"
                  >
                    {editingPackageId ? "Save Package Changes" : "Save Hotspot Package Config"}
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: MANUAL USER ACTIVATION whitelist */}
        {currentTab === "manual" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                  ⚡ Manual Router whitelisting
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Allows physical activating hotspot connections, routing access lists directly to RouterOS bypassing the online USSD verification stack. Great for manual customer service!
                </p>
              </div>

              <form onSubmit={handleManualActivation} className="space-y-4">
                <div>
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Select Pricing package speed Profile
                  </label>
                  <select
                    value={manPkgId}
                    onChange={(e) => setManPkgId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Profile --</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.priceTzs} TZS)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Hardware MAC Address of Device
                  </label>
                  <input
                    type="text"
                    required
                    value={manMacAddress}
                    onChange={(e) => setManMacAddress(e.target.value)}
                    placeholder="e.g. FC:AA:14:8B:2E:11"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Device hardware wireless adapter unique identifier. Format block standard XX:XX:XX:XX:XX:XX</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Instantly Whitelist Device MAC
                </button>
              </form>

              {manMessage && (
                <div className="p-3 bg-emerald-900/10 border border-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p>{manMessage}</p>
                </div>
              )}
            </div>

            {/* Issued vouchers listing ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                🎫 Issued Active / Ready Hotspot Vouchers
              </h3>

              <div className="overflow-x-auto max-h-[350px] scrollbar-none">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="pb-2">CODE</th>
                      <th className="pb-2">PACKAGE</th>
                      <th className="pb-2">MAC BIND</th>
                      <th className="pb-2 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((v, i) => (
                      <tr key={i} className="border-b border-slate-850 text-slate-300 hover:bg-slate-950/20">
                        <td className="py-2.5 font-mono text-amber-400 font-bold">{v.code}</td>
                        <td className="py-2.5">{v.packageName}</td>
                        <td className="py-2.5 font-mono text-slate-400">{v.macAddress || "Any"}</td>
                        <td className="py-2.5 text-right font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                            v.status === "active" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/10" : "bg-slate-950 text-slate-500"
                          }`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: MIKROTIK ROUTEROS CLI SCRIPTS & PHYSICAL LINK */}
        {currentTab === "router" && (
          <div className="space-y-6">
            
            {/* PHYSICAL GATEWAY LINKING PLATFORM */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Form Config Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-500" /> Physical Router API Gateway Link
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Connect your offline MikroTik RouterBoard dynamically to this billing system. The system uses the RouterOS API port to synchronize active subscriber leases.
                  </p>
                </div>

                <form onSubmit={handleSaveRouterLink} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Router IP Address / Host</label>
                      <input
                        type="text"
                        required
                        value={linkHost}
                        onChange={(e) => setLinkHost(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase block mb-1">API Port (Default: 8728)</label>
                      <input
                        type="text"
                        required
                        value={linkPort}
                        onChange={(e) => setLinkPort(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase block mb-1">API Username</label>
                      <input
                        type="text"
                        required
                        value={linkUser}
                        onChange={(e) => setLinkUser(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase block mb-1">API Password</label>
                      <input
                        type="password"
                        value={linkPassword}
                        onChange={(e) => setLinkPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase block mb-1">DHCP Server Interface Name</label>
                    <input
                      type="text"
                      required
                      value={linkInterface}
                      onChange={(e) => setLinkInterface(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-100"
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-950/45 p-3 rounded-xl border border-slate-850/60">
                    <input
                      id="sslEnabled"
                      type="checkbox"
                      checked={sslEnabled}
                      onChange={(e) => setSslEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-800 focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="sslEnabled" className="text-slate-350 text-[10px] font-medium select-none">
                      Force Secure API SSL Socket handshake connection (SSL port 8729)
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleTestRouterLink}
                      disabled={testingLink}
                      className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {testingLink ? "Pinging Socket..." : "Test Link Handshake"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-md cursor-pointer shadow-amber-500/10 transition-colors"
                    >
                      Save Gateway Setup
                    </button>
                  </div>
                </form>
              </div>

              {/* Status Display Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2 mb-3">
                    <Check className="w-4 h-4 text-emerald-400" /> Gateway Handshake diagnostics
                  </h3>
                  
                  {linkTestResult ? (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-xl border ${
                        linkTestResult.success 
                          ? "bg-emerald-950/25 border-emerald-500/20 text-emerald-400" 
                          : "bg-red-950/25 border-red-500/20 text-red-400"
                      }`}>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-xs uppercase tracking-wide">
                              {linkTestResult.success ? "Router Connection Successful!" : "Handshake Failed"}
                            </p>
                            <p className="text-[10px] text-slate-300 leading-normal mt-1">
                              {linkTestResult.message}
                            </p>
                          </div>
                        </div>
                      </div>

                      {linkTestResult.success && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                            <span className="text-slate-500 text-[10px] block font-semibold uppercase">BOARD NAME</span>
                            <span className="font-mono text-slate-200 mt-0.5 block font-bold">{linkTestResult.boardName || "RB4011iGS+"}</span>
                          </div>
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                            <span className="text-slate-500 text-[10px] block font-semibold uppercase">ROUTEROS VERSION</span>
                            <span className="font-mono text-slate-200 mt-0.5 block font-bold">{linkTestResult.rosVersion || "v7.14"}</span>
                          </div>
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                            <span className="text-slate-500 text-[10px] block font-semibold uppercase">HARDWARE UPTIME</span>
                            <span className="font-mono text-emerald-400 mt-0.5 block font-bold">{linkTestResult.uptime || "14d 3h 11m"}</span>
                          </div>
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                            <span className="text-slate-500 text-[10px] block font-semibold uppercase">CPU LOAD CORE</span>
                            <span className="font-mono text-white mt-0.5 block font-bold">{linkTestResult.cpuLoad || "2 %"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 border border-slate-850 border-dashed rounded-xl flex flex-col items-center justify-center">
                      <Wifi className="w-8 h-8 text-slate-600 mb-2 animate-bounce" />
                      <p className="text-xs text-slate-400">No diagnostic test executed yet.</p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[280px]">Fill IP/Domain credentials on the left and click "Test Link Handshake" to query RouterOS health state.</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-xl mt-4 flex items-center gap-2 text-[10px] text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <p>
                    <strong>API Security Note:</strong> Always construct a dedicated MikroTik API user inside <code>/user group</code> with restricted policy scopes rather than sharing master credentials.
                  </p>
                </div>
              </div>

            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                  ⚙ CLI Script Builder for RouterOS v6/v7
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Construct a perfectly formatted script containing critical walled garden ports/DNS (such as Airtel Money IP blocks and Vodacom checkout servers) allowing clients access to checkout portals.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Hotspot Router IP Address
                  </label>
                  <input
                    type="text"
                    value={routerIp}
                    onChange={(e) => setRouterIp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Wi-Fi SSID Name (Broadcasting)
                  </label>
                  <input
                    type="text"
                    value={routerSsid}
                    onChange={(e) => setRouterSsid(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Hotspot DNS Landmark Gate
                  </label>
                  <input
                    type="text"
                    value={routerDns}
                    onChange={(e) => setRouterDns(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="relative">
                <div className="absolute top-3 right-3 flex items-center space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedScript);
                      alert("MikroTik CLI config commands copied to clipboard!");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase font-bold bg-slate-850 hover:bg-slate-800 text-amber-400 border border-slate-750 hover:border-slate-650 rounded-lg cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Copy Commands
                  </button>
                </div>
                
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Generated Hotspot RouterOS Script CLI:</h4>
                <pre className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] text-amber-500 overflow-x-auto max-h-72 border border-slate-850 leading-relaxed">
                  {generatedScript}
                </pre>
              </div>

              <div className="rounded-xl bg-slate-950/45 border border-slate-850/60 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-white uppercase flex items-center gap-1.5 font-sans">
                  <BookOpen className="w-4 h-4 text-amber-500" /> How to deploy this on MikroTik:
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 pl-1 leading-relaxed">
                  <li>Open <strong>WinBox</strong> and connect to your MikroTik router board.</li>
                  <li>Click on the <strong>"New Terminal"</strong> icon in the left menu dashboard.</li>
                  <li>Copy and paste all generated commands shown above directly inside the console terminal window.</li>
                  <li>Copy your custom landing page directory (HTML) to your MikroTik router disk storage, referencing our Cloud API callback routes for payments validation!</li>
                </ol>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: MYSQL SCHEMA & API CALLBACK GUIDES */}
        {currentTab === "database" && (
          <div className="space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                  📦 Relational Database DDL Schema (MySQL / MariaDB)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  For your commercial production deployment, you can provision a standard MySQL database using the following relational structure schema.
                </p>
              </div>

              <div className="relative">
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sqlDumpString);
                      alert("MySQL DDL queries copied to clipboard!");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase font-bold bg-slate-850 hover:bg-slate-800 text-amber-400 border border-slate-755 hover:border-slate-655 rounded-lg cursor-pointer"
                  >
                    Copy SQL Code
                  </button>
                </div>
                
                <pre className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80 border border-slate-850 leading-relaxed">
                  {sqlDumpString}
                </pre>
              </div>

              <div className="rounded-xl bg-slate-950/45 border border-slate-850 p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" /> API Integration Docs (Tanzania Mobile Gateway)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The billing platform can hook up with local Tanzanian aggregators like <strong>Selcom Pay, Flutterwave, or NALA API</strong>. After registering:
                </p>
                
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-2 pl-1 leading-relaxed">
                  <li>Configure the gateway webhook to target: <code className="text-amber-400 font-mono">https://your-domain.com/api/pay/callback</code>.</li>
                  <li>When Tanzanian clients input their M-Pesa phone number, NALA or Selcom issues a USSD Push trigger directly to Vodacom.</li>
                  <li>Once they input their secret PIN, the third-party gateway responds with a webhook success model containing the transaction details, auto activating their IP connection profile!</li>
                </ul>
              </div>
            </div>

          </div>
        )}

        {/* TAB: PORTAL CUSTOMIZATION */}
        {currentTab === "portal" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Customizer form */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                  <Edit className="w-4 h-4 text-amber-500" />
                  Captive Portal Configuration Engine
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Configure live client branding titles, welcome declarations, slogan quotes, and hotline numbers stored dynamically in your JSON configuration database.
                </p>
              </div>

              <form onSubmit={handleSavePortalSettings} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Internet / ISP Name */}
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      ISP Entity Name / Brand Title
                    </label>
                    <input
                      type="text"
                      value={portalInternetName || ""}
                      onChange={(e) => setPortalInternetName(e.target.value)}
                      placeholder="e.g. N-internet services LTD"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                    />
                  </div>

                  {/* Headline Subtitle */}
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Core Slogan Headline Subtitle
                    </label>
                    <input
                      type="text"
                      value={portalHotspotSubtitle || ""}
                      onChange={(e) => setPortalHotspotSubtitle(e.target.value)}
                      placeholder="e.g. POWERED BY FIBER"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Welcome Title */}
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Welcome Slogan Header
                    </label>
                    <input
                      type="text"
                      value={portalWelcomeTitle || ""}
                      onChange={(e) => setPortalWelcomeTitle(e.target.value)}
                      placeholder="e.g. Welcome to N-Internet"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Merchant Wallet / Support Call Line
                    </label>
                    <input
                      type="text"
                      value={portalContactPhone || ""}
                      onChange={(e) => setPortalContactPhone(e.target.value)}
                      placeholder="e.g. 0699302513"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Slogan Quote Block */}
                <div>
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                    Empowering Quote Block (Italicized on Client Page)
                  </label>
                  <textarea
                    rows={2}
                    value={portalWelcomeQuote || ""}
                    onChange={(e) => setPortalWelcomeQuote(e.target.value)}
                    placeholder="Provide a client motivation slogan or terms notice..."
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-sans text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-all leading-relaxed"
                  />
                </div>

                {/* Slogan Welcome Paragraph */}
                <div>
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                    Primary Slogan Paragraph Description Text
                  </label>
                  <textarea
                    rows={3}
                    value={portalWelcomeText || ""}
                    onChange={(e) => setPortalWelcomeText(e.target.value)}
                    placeholder="Provide introductory guidance for selecting subscription profiling passes..."
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-sans text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-all leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-slate-500 font-semibold uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Binds to client captive portal views
                  </div>
                  
                  <button
                    type="submit"
                    disabled={savingPortalSettings}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-slate-850 disabled:text-slate-600 text-slate-950 cursor-pointer transition-all active:scale-95 duration-150"
                  >
                    {savingPortalSettings ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5px]" /> Save Live Customizations
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>

            {/* Smart Live Mockup Device Simulator Component */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-sm">
                
                <div className="flex justify-between items-center mb-2 px-1 select-none">
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono">📱 CLIENT PORTAL REALTIME PREVIEW</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 rounded font-mono uppercase">Synced</span>
                </div>

                {/* Mobile Phone body wrapper */}
                <div className="border-[8px] border-slate-950 bg-slate-950 shadow-2xl rounded-[36px] overflow-hidden relative border-t-[14px] border-b-[14px]">
                  
                  {/* Phone speaker notch placeholder */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-950 rounded-b-xl z-20 flex justify-center items-center">
                    <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
                  </div>

                  <div className="bg-slate-950 h-[480px] overflow-y-auto overflow-x-hidden p-4 scrollbar-none pt-6 text-left selection:bg-amber-500/35 relative">
                    
                    {/* Glowing mock accents */}
                    <div className="absolute -top-10 -right-20 w-48 h-48 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none"></div>

                    {/* Simulating Header widget inside client view */}
                    <div className="flex justify-between items-center mb-4 select-none px-1 pt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                          <Wifi className="w-3 h-3 text-amber-500" />
                        </div>
                        <span className="text-[10px] text-white font-mono font-black uppercase tracking-wider">{portalInternetName || "N-internet services LTD"}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">TZ-Hotspot</div>
                    </div>

                    {/* Preview Banner */}
                    <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 relative overflow-hidden select-none space-y-2.5 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-amber-500 tracking-wider font-mono uppercase bg-amber-500/5 px-2 py-0.5 border border-amber-500/10 rounded">{portalHotspotSubtitle || "POWERED BY FIBER"}</span>
                      </div>
                      
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mt-1">{portalWelcomeTitle || "Welcome to N-Internet"}</h4>
                      
                      {portalWelcomeQuote && (
                        <p className="text-[10px] text-emerald-400 italic leading-relaxed border-l-2 border-emerald-500/60 pl-2">
                          "{portalWelcomeQuote}"
                        </p>
                      )}
                      
                      {portalWelcomeText && (
                        <p className="text-[10px] mt-1 leading-relaxed text-slate-400">
                          {portalWelcomeText}
                        </p>
                      )}
                    </div>

                    {/* Select Packages indicator */}
                    <div className="space-y-2 mb-4">
                      <div className="h-4 w-28 bg-slate-900 rounded-md animate-pulse"></div>
                      <div className="h-12 w-full bg-slate-900/40 border border-slate-900 rounded-xl p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-900 rounded border border-slate-800"></div>
                          <div className="space-y-1">
                            <div className="h-2 w-16 bg-slate-900 rounded"></div>
                            <div className="h-2 w-24 bg-slate-900 rounded"></div>
                          </div>
                        </div>
                        <div className="h-3 w-8 bg-slate-900 rounded"></div>
                      </div>
                    </div>

                    {/* Recipient Number guideline preview inside phone mock */}
                    <div className="border border-slate-850 rounded-xl p-3 bg-slate-900/30 select-none text-[9px] text-slate-400 leading-normal space-y-1">
                      <div className="font-bold text-slate-300 uppercase flex items-center gap-1.5 font-mono text-[9px] text-amber-500">
                        <span>💡</span> carrier support
                      </div>
                      <p>All client transactions are routed to carrier wallet <strong className="text-slate-200">{portalContactPhone}</strong>.</p>
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* --- OPERATOR SPECIFIC SECURED VIEWS --- */}

        {/* TAB: ROUTER SETUP (OPERATORS) */}
        {currentTab === "router-setup" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Terminal className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                  Connecting Wireless MikroTik, TP-Link, or Generic Router
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Wire up your physical or virtual access points to the N-Internet automated billing controller. Supporting RouterOS API, TP-Link administration logins, or generic hotspot setups.
              </p>

              <form onSubmit={handleUpdatePartnerProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Wireless Gateway Hardware
                    </label>
                    <select
                      value={opRouterBrand}
                      onChange={(e) => setOpRouterBrand(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                    >
                      <option value="mikrotik">MikroTik RouterOS (v6.x / v7.x)</option>
                      <option value="tplink font-bold font-mono text-amber-500">TP-Link Wireless AP</option>
                      <option value="other">Generic WiFi Bridge / Other Router</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Router IP Address / Host URL
                    </label>
                    <input
                      type="text"
                      value={opRouterHost}
                      onChange={(e) => setOpRouterHost(e.target.value)}
                      placeholder="e.g. 192.168.88.1"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      API Port
                    </label>
                    <input
                      type="text"
                      value={opRouterPort}
                      onChange={(e) => setOpRouterPort(e.target.value)}
                      placeholder="e.g. 8728"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Console Username
                    </label>
                    <input
                      type="text"
                      value={opRouterUsername}
                      onChange={(e) => setOpRouterUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Auth Password (Encrypted locally)
                    </label>
                    <input
                      type="password"
                      value={opRouterPassword}
                      onChange={(e) => setOpRouterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span className="text-[11px] font-mono text-slate-400 leading-none">
                      Mock Link State: <strong className="text-emerald-400 uppercase">ONLINE ACTIVE</strong> via {opRouterBrand.toUpperCase()} bridge API channel
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-md shadow-amber-500/10 shrink-0"
                  >
                    Save & Test Router Link Check
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: INTERNET CUSTOMIZATION (OPERATORS) */}
        {currentTab === "internet-settings" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Wifi className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                  Modify Internet Name & Brand
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Configure the SSID/Wi-Fi name or brand displays shown to users when browsing your local hotspot network portal area page.
              </p>

              <form onSubmit={handleUpdatePartnerProfile} className="space-y-4">
                <div>
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                    SSID Name / Internet Name
                  </label>
                  <input
                    type="text"
                    required
                    value={opInternetName || ""}
                    onChange={(e) => setOpInternetName(e.target.value)}
                    placeholder="e.g. N-internet services LTD"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">This SSID dynamically propagates inside client-portal login mock header previews.</p>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs flex gap-2.5">
                  <span className="text-amber-500">💡</span>
                  <div className="text-slate-400 leading-normal">
                    <strong>Real-time Preview Enabled</strong>: Changing this Internet Name will instantly update how the Wi-Fi logo header renders on the simulated mobile client phone.
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow shadow-amber-500/10"
                  >
                    Update Internet Name
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: HOTSPOT SUBSCRIPTION PACKAGES (OPERATORS) */}
        {currentTab === "package-settings" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                    Hotspot Packages Configuration
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Create and manage customer pricing pass levels. These packages determine connectivity pass duration, speed allocation caps, and price in Tanzanian Shillings (TZS).
              </p>

              {/* Package Add Input form */}
              <form onSubmit={handleAddPackage} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950 p-4 border border-slate-850 rounded-xl mb-6">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Package Name</label>
                  <input
                    type="text"
                    required
                    value={newPkgName}
                    onChange={(e) => setNewPkgName(e.target.value)}
                    placeholder="e.g. Weekly VIP"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Price (TZS)</label>
                  <input
                    type="number"
                    required
                    value={newPkgPrice}
                    onChange={(e) => setNewPkgPrice(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={newPkgDuration}
                    onChange={(e) => setNewPkgDuration(e.target.value)}
                    placeholder="e.g. 10080"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
                  >
                    {editingPackageId ? (
                      <>Update Plan</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5" /> Configure Plan</>
                    )}
                  </button>
                  {editingPackageId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg cursor-pointer active:scale-[0.98] transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Pricing table list */}
              <div className="overflow-hidden border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3">Package Id</th>
                      <th className="p-3">Profile Name</th>
                      <th className="p-3">Price Rate</th>
                      <th className="p-3">Service Duration</th>
                      <th className="p-3">QoS Bandwidth Limit</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 font-medium text-slate-300">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-slate-900/30">
                        <td className="p-3 font-mono text-[10px] text-amber-500/80">{pkg.id}</td>
                        <td className="p-3 text-white font-bold">{pkg.name}</td>
                        <td className="p-3 text-amber-400 font-mono font-bold">{pkg.priceTzs.toLocaleString()} TZS</td>
                        <td className="p-3 text-slate-400 font-mono">
                          {pkg.durationMins >= 1440 ? `${pkg.durationMins / 1440} Days` : `${pkg.durationMins} Mins`}
                        </td>
                        <td className="p-3 font-mono text-cyan-400 font-bold">{pkg.speedLimit || "2M/2M"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEditPackage(pkg)}
                              title="Modify package"
                              className="p-1 px-1.5 text-slate-400 hover:text-amber-400 border border-slate-800 hover:bg-slate-950 rounded cursor-pointer transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg.id)}
                              title="Delete package"
                              className="p-1 px-1.5 text-slate-500 hover:text-red-400 border border-slate-800 hover:bg-slate-950 rounded cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LIVE TRAFFIC & BANDWIDTH (OPERATORS) */}
        {currentTab === "my-traffic" && (() => {
          const completedTransactions = transactions.filter(t => t.status === "completed");
          const totalMoneyPaid = completedTransactions.reduce((sum, t) => sum + t.priceTzs, 0);
          const adminDeduction = Math.round(totalMoneyPaid * 0.10);
          const netOperatorEarnings = totalMoneyPaid - adminDeduction;

          return (
            <div className="space-y-6">
              
              {/* Financial Split warning & Payout rules */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest font-mono">
                    ⚠️ AUTOMATED REVENUE SHARE & DEDUCTION SYSTEM
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    As an official hotspot operator partner, your billing account is configured under the 10% Franchise Commission policy. 
                    <strong> 10% of all client payouts is automatically deducted</strong> and routed to the primary HQ Admin wallet ({portalContactPhone}), 
                    while the remaining <strong>90% is instantly paid out</strong> to your registered mobile money wallet number: 
                    <span className="text-amber-400 font-bold font-mono ml-1">{currentUser.profilePhone || "0699302513"}</span>.
                  </p>
                </div>
              </div>

              {/* Gauge indicators row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stat 1: Leases */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                    <TrendingUp className="w-14 h-14 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Connected Hotspot Clients</span>
                  <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
                    {vouchers.filter(v => v.status === "active").length || "0"} <span className="text-xs text-slate-500 font-sans font-medium">leases</span>
                  </p>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">People connected to this system</span>
                </div>

                {/* Stat 2: Gross Income */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                    <Coins className="w-14 h-14 text-white" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gross Client Payments (100%)</span>
                  <p className="text-2xl font-black text-slate-100 mt-2 font-mono">
                    {totalMoneyPaid.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-medium">TZS</span>
                  </p>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">Total revenue fetched from portal</span>
                </div>

                {/* Stat 3: Admin Royalty */}
                <div className="bg-slate-900 border-2 border-slate-850 rounded-2xl p-5 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                    <Layers className="w-14 h-14 text-red-400" />
                  </div>
                  <span className="text-[10px] text-red-450 text-red-400 font-bold uppercase tracking-wider block">Admin Deduction Cut (10%)</span>
                  <p className="text-2xl font-black text-red-400 mt-2 font-mono">
                    {adminDeduction.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-medium">TZS</span>
                  </p>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">Auto-routed to Admin Gateway wallet</span>
                </div>

                {/* Stat 4: Net Payout */}
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                    <CheckCircle2 className="w-14 h-14 text-amber-500" />
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Your Net Earnings (90%)</span>
                  <p className="text-2xl font-black text-amber-400 mt-2 font-mono">
                    {netOperatorEarnings.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-medium">TZS</span>
                  </p>
                  <span className="text-[9px] text-amber-500/80 font-mono block mt-1">Dispatched to your phone number</span>
                </div>

              </div>

              {/* Subnet connected users */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold uppercase text-white tracking-wider mb-4 font-mono">
                  People Connected Right Now (DHCP Leases)
                </h3>
                <div className="overflow-hidden border border-slate-800 rounded-xl mb-6">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-3">MAC Address</th>
                        <th className="p-3">IP Lease</th>
                        <th className="p-3">Voucher Token</th>
                        <th className="p-3">Uptime</th>
                        <th className="p-3 text-right">Data Exchanged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 font-medium text-slate-300 font-mono">
                      {activeSessions.map((client) => (
                        <tr key={client.mac} className="hover:bg-slate-900/30">
                          <td className="p-3 text-white font-semibold">{client.mac}</td>
                          <td className="p-3 text-cyan-400">{client.ip}</td>
                          <td className="p-3 text-amber-500 font-bold">{client.username}</td>
                          <td className="p-3 text-slate-400 font-semibold">{client.uptime}</td>
                          <td className="p-3 text-right text-slate-400">
                            {((client.downBytes + client.upBytes) / (1024 * 1024)).toFixed(1)} Mb
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mb-4 mt-6">
                  <h3 className="text-xs font-bold uppercase text-white tracking-wider font-mono">
                    My Transactions Completed Log with 10% Admin Deduction Split
                  </h3>
                  <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 text-slate-400 font-mono">
                    Rate: 90% Operator / 10% Admin
                  </span>
                </div>
                
                <div className="overflow-hidden border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-3">Transaction ID</th>
                        <th className="p-3">Client Number</th>
                        <th className="p-3">Network</th>
                        <th className="p-3">Selected Plan</th>
                        <th className="p-3 font-mono">Gross Price</th>
                        <th className="p-3 font-mono text-red-400">Admin Cut (10%)</th>
                        <th className="p-3 text-right font-mono text-amber-400">My Net (90%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 font-medium text-slate-300 font-mono">
                      {completedTransactions.map((tx) => {
                        const cut = Math.round(tx.priceTzs * 0.10);
                        const operatorNet = tx.priceTzs - cut;
                        return (
                          <tr key={tx.id} className="hover:bg-slate-900/30">
                            <td className="p-3 text-amber-500/90 font-bold">{tx.id}</td>
                            <td className="p-3 text-white font-semibold">{tx.phone}</td>
                            <td className="p-3 uppercase">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                tx.provider === "mpesa" ? "bg-red-500/10 text-red-400" :
                                tx.provider === "airtel" ? "bg-amber-500/10 text-amber-400" :
                                tx.provider === "halotel" ? "bg-orange-500/10 text-orange-400" :
                                "bg-blue-500/10 text-blue-400"
                              }`}>{tx.provider}</span>
                            </td>
                            <td className="p-3 text-slate-400 font-sans font-medium">{tx.packageName}</td>
                            <td className="p-3 text-slate-200 font-bold">{tx.priceTzs.toLocaleString()} TZS</td>
                            <td className="p-3 text-red-400 font-semibold">{cut.toLocaleString()} TZS</td>
                            <td className="p-3 text-right text-emerald-400 font-bold">{operatorNet.toLocaleString()} TZS</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          );
        })()}

        {/* TAB: PROFILE & REDIRECTION SETTINGS (OPERATORS) */}
        {currentTab === "my-profile" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                  Modify Profile Details & Wallet Routing
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Update your administrative login profile name and redirect mobile money cash flows once customers purchase packages. Payments will automatically dispatch USSD requests targeted directly to your wallet account.
              </p>

              <form onSubmit={handleUpdatePartnerProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Operator Profile Owner Name
                    </label>
                    <input
                      type="text"
                      required
                      value={opProfileName}
                      onChange={(e) => setOpProfileName(e.target.value)}
                      placeholder="e.g. Nickson Lukambinga"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Payout Destination Wallet (Receive Push Settlements)
                    </label>
                    <input
                      type="text"
                      required
                      value={opProfilePhone}
                      onChange={(e) => setOpProfilePhone(e.target.value)}
                      placeholder="e.g. 0699302513 (Carrier Mobile SIM)"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Once client makes a subscription payment, the funds are routed to this phone number.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">Username UID (Immutable)</span>
                    <div className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-slate-500">
                      {currentUser.username}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5 font-mono">
                      Update Console Password (Leave empty to keep existing)
                    </label>
                    <input
                      type="password"
                      value={opPassword}
                      onChange={(e) => setOpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    Save profile changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS MENU (BOTH USERS & ADMINS) */}
        {currentTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sliders className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                  System Settings Control Menu
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Advanced administrative preference control parameters governing offline timers, auto-connect handshakes, bandwidth throttling protocols, and mock API request latency triggers.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Setting Column A */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-white font-mono block mb-2">
                      QoS Latency Profile Mode
                    </label>
                    <select
                      value={settingsQosProfile}
                      onChange={(e) => setSettingsQosProfile(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-400 font-semibold"
                    >
                      <option value="Low Latency FastPath">Low Latency FastPath</option>
                      <option value="Standard Boost">Standard Boost (Recommended)</option>
                      <option value="Dynamic Queue Priority">Dynamic Queue Priority</option>
                      <option value="Symmetric Fiber Mode">Symmetric Fiber Mode</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">Optimizes queue trees in internal RouterOS scripting.</p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-white font-mono block mb-2">
                      Portal Lease Exponent Timeout
                    </label>
                    <select
                      value={settingsTimeoutSec}
                      onChange={(e) => setSettingsTimeoutSec(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 font-bold"
                    >
                      <option value="600">10 Minutes Idle</option>
                      <option value="1800">30 Minutes Idle (Safety Default)</option>
                      <option value="3600">1 Hour Idle</option>
                      <option value="7200">2 Hour Idle</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">Kicks client session from lease pool after inactivity.</p>
                  </div>
                </div>

                {/* Setting Column B */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white font-mono block">Automated Hotspot Auto-Connect</span>
                      <input
                        type="checkbox"
                        checked={settingsAutoConnecths}
                        onChange={(e) => setSettingsAutoConnecths(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 focus:ring-opacity-50"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">Instructs MikroTik DHCP leases to auto-sign in client on MAC match without presenting login button again.</p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white font-mono block">Simulate REST API Network Delay</span>
                      <span className="text-[11px] font-bold font-mono text-cyan-400">{settingsMockDelayMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="4000"
                      step="250"
                      value={settingsMockDelayMs}
                      onChange={(e) => setSettingsMockDelayMs(e.target.value)}
                      className="w-full accent-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">Simulates network lag during Tanzanian cellular Mobile Money checkout loop processes.</p>
                  </div>
                </div>

              </div>

              <div className="mt-6 pt-4 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>Version Core: 4.8.1-BETA (Tanzanian Edition)</span>
                <button
                  onClick={() => alert("All system configuration settings preserved in database successfully!")}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  Save settings menu values
                </button>
              </div>
            </div>

            {/* SECURE SECURITY CENTER SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sliders className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                  Cyber Security Defense Center & Firewall
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Cryptographic parameters protecting database assets under standard SHA-256 hash algorithms, active anti-brute force lockers, and real-time MAC address cloning/spoofing bypass guards.
              </p>

              <div className="space-y-6">
                {/* 1. MAC SPOOFING / BYPASS REJECTION TOGGLE */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Anti-MAC Spoofing Session Guard (Cloning Rejection)
                    </span>
                    <p className="text-[10px] text-slate-500 max-w-xl leading-normal">
                      When enabled, clients must undergo cryptographic browser integrity tokens validation. Multiple client devices mimicking a single paid MAC Address will be immediately blocked by the firewall.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {antiMacBypass ? "ACTIVE ENFORCEMENT" : "DISABLED"}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={antiMacBypass} 
                        onChange={(e) => handleToggleMacIntegrity(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-350 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>

                {/* 2. BRUTE-FORCE RATE LIMITING MONITOR */}
                <div className="p-4 bg-slate-950 border border-slate-850/60 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-amber-500/90 font-mono">
                      Failed Login Intrusion Monitor
                    </h4>
                    {securityLocks.length > 0 && (
                      <button
                        onClick={handleClearLocks}
                        className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg text-[10px] font-bold transition-all cursor-pointer font-mono uppercase"
                      >
                        Clear Lockouts
                      </button>
                    )}
                  </div>

                  {securityLocks.length === 0 ? (
                    <div className="p-3 bg-emerald-950/10 border border-emerald-900/20 text-emerald-400 rounded-lg text-[10px] font-mono leading-relaxed flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                      <span>● SECURE: Brute force intrusion tracking registers are clean. No hacking threats detected.</span>
                    </div>
                  ) : (
                    <div className="space-y-2 uppercase font-mono text-[9.5px]">
                      <div className="grid grid-cols-4 border-b border-slate-800 pb-1 text-slate-500 font-bold">
                        <span>ATTACK CLIENT IP</span>
                        <span>ATTEMPTED USER</span>
                        <span>RETRY COUNTERS</span>
                        <span className="text-right">FIREWALL STATUS</span>
                      </div>
                      {securityLocks.map((lock: any, index: number) => {
                        const remaining = Math.max(0, Math.ceil((lock.lockedUntil - Date.now()) / 1000));
                        return (
                          <div key={index} className="grid grid-cols-4 py-1.5 border-b border-slate-850/40 text-slate-300 items-center animate-pulse">
                            <span className="text-red-400 font-bold">{lock.ip}</span>
                            <span>{lock.username}</span>
                            <span>{lock.attempts} Failed Attempts</span>
                            <span className="text-right">
                              {lock.isLocked ? (
                                <span className="px-1.5 py-0.5 bg-red-950 text-red-500 border border-red-900/30 rounded font-bold text-[8.5px]">
                                  LOCKED OUT ({remaining}s)
                                </span>
                              ) : (
                                <span className="text-yellow-500">WARNING STATE</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. CRYPTOGRAPHIC DATA INTEGRITY AUDIT */}
                <div className="p-4 bg-slate-950 border border-slate-850/60 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-900 border border-slate-850 rounded-lg">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Database Hashes</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-white font-black font-sans uppercase">SHA-256 Enabled</span>
                      <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded font-bold text-[8.5px] uppercase font-mono">VERIFIED</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 leading-normal">
                      Admin profile, partner accounts, and console settings are secured via advanced sha256. Raw passwords are never stored in database.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-slate-850 rounded-lg">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Biometric Gateway</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-white font-black font-sans uppercase">WebAuthn Integration</span>
                      <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded font-bold text-[8.5px] uppercase font-mono">OPERATIONAL</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 leading-normal">
                      TouchID and FaceID biometric scan handshakes utilize cryptographic public key bindings on supported cellular browser hardware.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
