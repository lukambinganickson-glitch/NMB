import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wifi, 
  Smartphone, 
  ChevronRight, 
  Clock, 
  CircleAlert, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Globe, 
  Zap,
  Ticket,
  Sparkles,
  Phone,
  MessageSquare,
  ShieldCheck,
  Copy,
  WifiOff,
  AlertOctagon
} from "lucide-react";
import { HotspotPackage, Transaction, ClientSettings } from "../types";

interface CaptivePortalProps {
  packages: HotspotPackage[];
  onPaymentSuccess: () => void;
}

export default function CaptivePortal({ packages, onPaymentSuccess }: CaptivePortalProps) {
  // Client customization settings
  const [settings, setSettings] = useState<ClientSettings>({
    internetName: "N-internet services LTD",
    hotspotSubtitle: "High-Speed Fiber Hotspot",
    welcomeTitle: "Welcome to N-Internet",
    welcomeQuote: "Connection fuels opportunity. We believe seamless browsing and reliable internet inspire boundless potential.",
    welcomeText: "Enjoy blazing-fast, high-speed, unlimited access designed to empower your studies, career, and entertainment. Select a customized packages profile below to connect instantly.",
    contactPhone: "0699302513"
  });

  const [macAddress] = useState("FC:AA:14:8B:2E:11");
  const [selectedPackage, setSelectedPackage] = useState<HotspotPackage | null>(null);
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<"mpesa" | "airtel" | "tigo" | "halotel">("airtel");

  // Load customizable portal view specifications
  useEffect(() => {
    fetch("/api/client-settings")
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then((data) => {
        if (data) {
          setSettings(data);
        }
      })
      .catch((err) => console.error("Error loading client portal settings on bootstrap", err));
  }, []);
  
  // Payment transaction processing states
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"pending" | "completed" | "failed" | null>(null);
  const [showUssdPrompt, setShowUssdPrompt] = useState(false);
  const [ussdPin, setUssdPin] = useState("");
  const [ussdError, setUssdError] = useState("");

  // Automated connection settings & step loader
  const [autoConnect, setAutoConnect] = useState(true);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [autoStep, setAutoStep] = useState(0);
  
  // Active Connection stats State
  const [activeVoucher, setActiveVoucher] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [activeDuration, setActiveDuration] = useState<number>(0); // in minutes
  const [onlineSince, setOnlineSince] = useState<string | null>(null);

  // --- CUSTOM CLIENT PORTAL SIMULATED NOTIFICATIONS ---
  const [isCopied, setIsCopied] = useState(false);
  const [isTethering, setIsTethering] = useState(false);
  const [expiryNotificationSent, setExpiryNotificationSent] = useState(false);
  const [incomingSMS, setIncomingSMS] = useState<{ sender: string; body: string; time: string } | null>(null);

  const triggerSmsAlert = (sender: string, body: string) => {
    setIncomingSMS({
      sender,
      body,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    // Auto remove warning after 9.5s
    setTimeout(() => {
      setIncomingSMS((prev) => {
        if (prev && prev.body === body) {
          return null;
        }
        return prev;
      });
    }, 9500);
  };

  const handleCopyVoucher = () => {
    if (!activeVoucher) return;
    navigator.clipboard.writeText(activeVoucher);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Poll for payment statuses
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (txId && txStatus === "pending") {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/pay/status/${txId}`);
          const data = await res.json();
          if (data.status === "completed") {
            setTxStatus("completed");
            const code = data.voucherCode || "HOT-DEMO";
            setActiveVoucher(code);
            setExpiryNotificationSent(false); // Reset warning state
            if (selectedPackage) {
              setTimeLeft(selectedPackage.durationMins * 60);
              setActiveDuration(selectedPackage.durationMins);
              setOnlineSince(new Date().toLocaleTimeString());
            }
            setShowUssdPrompt(false);
            setLoading(false);
            clearInterval(interval);
            onPaymentSuccess();
            // Trigger Instant Confirm and SMS Notification with Copyable voucher values
            triggerSmsAlert(
              "N-INTERNET",
              `INSTANT CONFIRMED! Your high-speed voucher code is [ ${code} ]. Bound to device MAC: FC:AA:14:8B:2E:11. Internet sharing/tethering is disabled.`
            );
          } else if (data.status === "failed") {
            setTxStatus("failed");
            setShowUssdPrompt(false);
            setLoading(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Poller status retrieve failed", err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [txId, txStatus, selectedPackage, onPaymentSuccess]);

  // Countdown timer for active voucher
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeVoucher && timeLeft > 0) {
      timer = setInterval(() => {
         setTimeLeft((prev) => {
           if (prev <= 1) {
             setActiveVoucher(null);
             return 0;
           }
           return prev - 1;
         });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeVoucher, timeLeft]);

  // Automated under-1-hour instant message alert loop
  useEffect(() => {
    if (activeVoucher && timeLeft > 0 && timeLeft < 3600 && !expiryNotificationSent) {
      setExpiryNotificationSent(true);
      triggerSmsAlert(
        "N-INTERNET-EXPIRY",
        `ALERT: Kifurushi chako kinaisha hivi punde! Chini ya saa 1 (${Math.ceil(timeLeft / 60)} dakika) zimesalia. Lipia sasa kuzuia kukatiwa intaneti.`
      );
    }
  }, [timeLeft, activeVoucher, expiryNotificationSent]);

  // Handle billing payment trigger
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    
    // Simplistic Tanzanian cellular prefix validation
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!/^(0[67]|255[67])\d{8}$/.test(cleanPhone)) {
      alert("Tanzania format error: Please enter a valid 10-digit phone starting with 06 or 07 (e.g., 0754XXXXXX) or format 255");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          provider,
          packageId: selectedPackage.id,
          macAddress
        })
      });
      const data = await res.json();
      if (data.success) {
        setTxId(data.transactionId);
        setTxStatus("pending");
        
        if (autoConnect) {
          // Trigger automatic execution!
          setIsAutoExecuting(true);
          setAutoStep(1);
          
          // Phase 1: Contacting Operator API and generating USSD sequence (600ms)
          setTimeout(() => {
            setAutoStep(2);
            
            // Phase 2: Processing PIN push feedback internally (800ms)
            setTimeout(() => {
              setAutoStep(3);
              
              // Phase 3: Activating lease on MikroTik RouterOS API directly (900ms)
              setTimeout(async () => {
                setAutoStep(4);
                
                try {
                  // Finalizing lease automatically on the server
                  const forceRes = await fetch(`/api/pay/status/${data.transactionId}`);
                  const forceData = await forceRes.json();
                  
                  // Let's force transaction completed
                  setTxStatus("completed");
                  const code = forceData.voucherCode || "HOT-929A";
                  setActiveVoucher(code);
                  setExpiryNotificationSent(false); // Reset warning state
                  setTimeLeft(selectedPackage.durationMins * 60);
                  setActiveDuration(selectedPackage.durationMins);
                  setOnlineSince(new Date().toLocaleTimeString());
                  
                  // Trigger instant SMS alert
                  triggerSmsAlert(
                    "N-INTERNET",
                    `INSTANT CONFIRMED! Your high-speed voucher code is [ ${code} ]. Bound to device MAC. Tethering/sharing will block access.`
                  );
                  
                  setTimeout(() => {
                    setIsAutoExecuting(false);
                    setLoading(false);
                    onPaymentSuccess();
                  }, 800);
                  
                } catch (err) {
                  console.error("Auto executing fallback to normal flow", err);
                  setShowUssdPrompt(true);
                  setIsAutoExecuting(false);
                  setLoading(false);
                }
              }, 900);
            }, 800);
          }, 600);
          
        } else {
          // Fallback to manual PIN popup interaction
          setShowUssdPrompt(true);
          setUssdPin("");
          setUssdError("");
        }
      } else {
        alert(data.error || "Could not initiate payment");
        setLoading(false);
      }
    } catch (err) {
      console.error("Payment initiation error", err);
      alert("Error reaching billing server. Please try again.");
      setLoading(false);
    }
  };

  // Simulating the user entering their PIN in the SIM Card USSD push
  const handleSimulatePinSubmit = async () => {
    if (ussdPin.length < 4) {
      setUssdError("Please enter a 4-digit mobile money wallet PIN.");
      return;
    }
    // Simulate resolving the transaction immediately inside the server
    try {
      const res = await fetch(`/api/pay/status/${txId}`);
      const info = await res.json();
      
      // We instruct the server database by mimicking a hook call
      // to expedite the process
      setUssdError("");
      setShowUssdPrompt(false);
      setLoading(true); // show loader on captive portal while we wait for verification callback loop
    } catch (err) {
      console.error(err);
    }
  };

  // Skip state for testing (Instant Activate)
  const handleQuickDemoActivate = async (pkg: HotspotPackage) => {
    setLoading(true);
    try {
      const demoPhone = provider === "mpesa" ? "0754111222" : provider === "airtel" ? "0684111222" : provider === "tigo" ? "0713111222" : "0621111222";
      const res = await fetch("/api/pay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: demoPhone,
          provider,
          packageId: pkg.id,
          macAddress
        })
      });
      const data = await res.json();
      
      // Instantly trigger success for demo purposes bypassing wait state
      if (data.success) {
        // Let's force speed activation immediately
        const forceRes = await fetch(`/api/pay/status/${data.transactionId}`);
        const forceData = await forceRes.json();
        
        // Mock client instantly
        setTxId(data.transactionId);
        setTxStatus("completed");
        setSelectedPackage(pkg);
        const code = forceData.voucherCode || "HOT-929A";
        setActiveVoucher(code);
        setExpiryNotificationSent(false); // Reset warning state
        setTimeLeft(pkg.durationMins * 60);
        setActiveDuration(pkg.durationMins);
        setOnlineSince(new Date().toLocaleTimeString());
        
        // Trigger instant SMS with voucher
        triggerSmsAlert(
          "N-INTERNET",
          `INSTANT CONFIRMED! Your high-speed voucher code is [ ${code} ]. Bound to device MAC. Tethering/sharing will block access.`
        );

        setLoading(false);
        onPaymentSuccess();
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-slate-900 overflow-y-auto font-sans text-slate-100 selection:bg-amber-500 selection:text-slate-900 rounded-2xl border border-slate-800">
      
      {/* Sliding Instant SMS Notification Simulator Popup */}
      <AnimatePresence>
        {incomingSMS && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.92 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="absolute top-16 left-4 right-4 z-50 bg-slate-950 border-2 border-amber-500 rounded-2xl p-4 shadow-[0_12px_40px_rgba(245,158,11,0.3)] flex gap-3 text-slate-100 items-start cursor-pointer select-none"
            onClick={() => setIncomingSMS(null)}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase font-mono">
                  ✉️ RECEIPT SMS: {incomingSMS.sender}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">{incomingSMS.time}</span>
              </div>
              <p className="text-xs text-slate-200 mt-1 leading-snug font-sans font-medium">
                {incomingSMS.body}
              </p>
              <p className="mt-2.5 text-[8.5px] text-amber-500/60 font-bold font-mono uppercase">
                ☝️ CLICK CONTAINER TO CLOSE MESSAGE
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Network Brand Header */}
      <div className="top-0 sticky p-5 bg-slate-950/90 backdrop-blur-md flex items-center justify-between border-b border-slate-800 z-10 select-none">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center shadow-lg text-amber-500">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 20V4L12 14V4H16V20L8 10V20H4Z" fill="currentColor" />
              <path d="M18 6C19.5 7.5 20 9.5 20 12C20 14.5 19.5 16.5 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M21 3C23.25 5.25 24 8.25 24 12C24 15.75 23.25 18.75 21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wide text-white font-sans uppercase">N-internet services LTD</h1>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <p className="text-[9px] text-slate-400 font-semibold uppercase">High-Speed Fiber Hotspot</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 text-[10px] font-semibold bg-slate-800 rounded text-slate-300 font-mono">
            {macAddress}
          </span>
        </div>
      </div>

      <div className="flex-1 p-5 max-w-md mx-auto w-full flex flex-col justify-start">
        
        {/* Connection Exists Panel */}
        <AnimatePresence mode="wait">
          {activeVoucher ? (
            <motion.div 
              key="active-state"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 py-6"
            >
              {/* If tethering is enabled, block the internet instantly */}
              {isTethering ? (
                <div className="bg-rose-950/70 border-2 border-rose-500/40 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-4">
                    <WifiOff className="w-8 h-8 text-rose-450 text-rose-400" />
                  </div>
                  <h3 className="text-rose-400 font-bold text-lg select-none uppercase tracking-wider">
                    🚫 INTERNET SHARING BLOCKED
                  </h3>
                  <p className="text-xs text-rose-200 mt-2 leading-relaxed">
                    Under Tanzania N-Internet secure binding rules, hotspot vouchers are limited to <strong>only one phone connection</strong>. Sharing/tethering our speed lease to another phone is forbidden.
                  </p>
                  
                  {/* Blinking notice */}
                  <div className="mt-5 w-full bg-slate-950/85 rounded-xl p-3 border border-rose-500/20 text-left">
                    <div className="flex items-start gap-2.5 text-xs text-rose-300">
                      <AlertOctagon className="w-4.5 h-4.5 mt-0.5 shrink-0 text-rose-450" />
                      <div>
                        <p className="font-semibold text-[11px] text-white">SYSTEM AUTO DEFENSES ENFORCED</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Our active packet detectors detected multi-client sharing packets. Your internet route remains blocked.
                        </p>
                        <p className="text-[11px] font-bold text-amber-400 mt-2 underline decoration-wavy">
                          👉 Turn off your hotspot/tethering sharing to instantly restore internet!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status Indicator Card */}
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
                    </div>
                    <h3 className="text-emerald-400 font-semibold text-lg">Internet Connection Active</h3>
                    <p className="text-xs text-slate-300 mt-1">Your device is authenticated and authorized on RouterOS</p>
                    
                    {/* Countdown display */}
                    <div className="mt-6 w-full bg-slate-950/75 rounded-2xl py-4 px-6 border border-slate-800">
                      <span className="text-[10px] text-slate-500 tracking-widest font-mono uppercase block mb-1">REMAINING RUNTIME</span>
                      <span className="text-3xl font-bold font-mono text-white tracking-wider">
                        {formatTime(timeLeft)}
                      </span>
                    </div>

                    {/* Low timer banner (Shown when timeLeft < 3600) */}
                    {timeLeft < 3600 && (
                      <div className="mt-4 p-3 bg-red-950/30 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-left animate-bounce">
                        <span className="text-xl">⚠️</span>
                        <div>
                          <p className="text-slate-200 text-xs font-bold leading-none">Voucher Expiring Soon!</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Less than an hour remains. Recharge to prevent interruption.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Copyable Voucher & Sent via text indicator */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                      <Ticket className="w-3.5 h-3.5 text-amber-500" /> Voucher Information
                    </h4>

                    {/* Highly styled Copy interaction segment */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">YOUR SECURE VOUCHER (FOR 1 DEVICE ONLY)</span>
                        <span className="font-mono font-black text-lg text-amber-400 tracking-wider h-7 block">{activeVoucher}</span>
                      </div>
                      <button
                        onClick={handleCopyVoucher}
                        className="p-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1.5 text-[11px] font-bold"
                      >
                        {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    {/* Receipt Status and text proof indicator */}
                    <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-0.5">
                      <span className="text-emerald-400">✓</span>
                      <p>
                        <strong>Payment Confirmed Instantly.</strong> Your internet access credentials have been successfully transmitted via text SMS message.
                      </p>
                    </div>
                  </div>

                  {/* Real-time Cyber Security & Anti-Spoof status banner */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5.5 h-5.5 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Anti-Bypass Firewall Status</span>
                        <span className="px-1.5 text-[8.5px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded">ACTIVE</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        Session hardware token binding validated. Hotspot firewall is actively protecting against MAC spoofing/cloning hacking bypass attempts.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Network statistics parameters */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5 space-y-4">
                <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-amber-500" /> Hotspot Connection Info
                </h4>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">AUTH VOUCHER</span>
                    <span className="font-mono font-semibold text-amber-400 mt-1 block">{activeVoucher}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">PACKAGE COST</span>
                    <span className="font-mono font-semibold text-white mt-1 block">
                      {selectedPackage?.priceTzs.toLocaleString() || "0"} TZS
                    </span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">ASSIGNED IP</span>
                    <span className="font-mono text-slate-300 mt-1 block">10.5.50.{Math.floor(100 + Math.random() * 100)}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">ONLINE SINCE</span>
                    <span className="font-mono text-slate-300 mt-1 block">{onlineSince}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-3">
                  <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    <strong>Tanzania Hotspot Note:</strong> Keeping this browser tab open helps monitor your balance. However, even if you close this window, you will remain fully connected until expiry.
                  </p>
                </div>
              </div>

              {/* CUSTOM WORK: Interactive Simulation testing dashboard for reviews */}
              <div className="bg-slate-950/45 p-5 border border-slate-800/80 rounded-2xl space-y-3.5 text-left">
                <span className="text-[10px] font-mono font-bold tracking-wider text-amber-500 uppercase px-2 py-0.5 bg-amber-500/5 border border-amber-500/20 rounded-full block w-fit">
                  ⚙️ Active Hotspot Simulator controls
                </span>
                
                <div className="space-y-3">
                  {/* Toggle Tethering */}
                  <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 hover:border-amber-500/20 cursor-pointer select-none transition-all" onClick={() => setIsTethering(!isTethering)}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTethering ? "bg-rose-500/15 text-rose-450 text-rose-350" : "bg-slate-850 text-slate-400"}`}>
                        <Wifi className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className="text-slate-200 text-xs font-bold leading-normal">Simulate Tethering Hotspot</p>
                        <p className="text-[9px] text-slate-500">Connect another phone to share internet</p>
                      </div>
                    </div>
                    
                    {/* Switch Toggle visual representation */}
                    <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors ${isTethering ? "bg-rose-500" : "bg-slate-700"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isTethering ? "translate-x-4" : "translate-x-0"}`}></div>
                    </div>
                  </div>

                  {/* Trigger Under 60 Min count alarm simulation */}
                  <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 hover:border-amber-500/20 transition-all select-none">
                    <div>
                      <p className="text-slate-200 text-xs font-bold leading-normal">Simulate Countdown Warnings</p>
                      <p className="text-[9px] text-slate-500">Fast-forward timer to less than 1 hour remaining</p>
                    </div>
                    <button
                      onClick={() => setTimeLeft(3545)} // 59 minutes and 5 seconds
                      disabled={timeLeft < 3600}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/35 text-amber-400 text-[10px] font-bold transition-all disabled:opacity-40"
                    >
                      Set &lt; 1 Hour left
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-center border-t border-slate-800/80">
                  <button 
                    onClick={() => {
                      setActiveVoucher(null);
                      setSelectedPackage(null);
                    }}
                    className="px-4 py-2 w-full text-xs bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-medium rounded-xl transition-colors"
                  >
                    Simulate Hotspot Log Out
                  </button>
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div 
              key="payment-flows"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 py-4"
            >
              
              {/* Decorated Welcoming Banner */}
              <div className="bg-slate-950/45 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-2xl select-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 tracking-widest uppercase font-mono">{settings.hotspotSubtitle}</span>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider -mt-0.5 font-sans">{settings.welcomeTitle}</h2>
                  </div>
                </div>
                
                <p className="text-xs text-slate-200 mt-3 italic leading-relaxed">
                  "{settings.welcomeQuote}"
                </p>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {settings.welcomeText}
                </p>

                <div className="mt-3 flex items-center gap-2 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 px-3 py-1.5 rounded-xl w-fit">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  CORE INTERNET CHANNELS OPERATIONAL
                </div>
              </div>

              {/* Package Select Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  1. Choose Internet Package
                </h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex items-center justify-between ${
                          isSelected 
                            ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5" 
                            : "bg-slate-950/55 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className={`p-2.5 rounded-xl border transition-colors ${
                            isSelected ? "bg-amber-500/20 border-amber-500/30 text-amber-500" : "bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-300"
                          }`}>
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] tracking-widest uppercase font-semibold">TANZANIA HOTSPOT</span>
                            <h3 className="text-white font-semibold text-sm mt-0.5">{pkg.name}</h3>
                            <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-slate-400">
                              <span className="font-semibold text-amber-500">{pkg.priceTzs.toLocaleString()} TZS</span>
                              <span>•</span>
                              <span>Duration: {pkg.durationMins >= 1440 ? `${pkg.durationMins / 1440} day(s)` : `${pkg.durationMins / 60} hr(s)`}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className={`text-md font-bold font-mono tracking-tight ${isSelected ? "text-amber-400" : "text-slate-200"}`}>
                              {pkg.priceTzs.toLocaleString()} TZS
                            </p>
                            <span className="text-[9px] text-slate-500 font-medium">Auto Expire</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-amber-500 translate-x-1" : "text-slate-600 group-hover:text-slate-400"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Details Card */}
              {selectedPackage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4"
                >
                  <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    2. Payment Details
                  </h4>

                  <form onSubmit={handleInitiatePayment} className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                    
                    {/* Provider Select Row */}
                    <div>
                      <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block mb-2">
                        Mobile Money Operator
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        
                        {/* Vodacom M-Pesa */}
                        <button
                          type="button"
                          onClick={() => setProvider("mpesa")}
                          className={`relative py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                            provider === "mpesa"
                              ? "bg-red-500/15 border-red-500 text-red-400"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full absolute top-1.5 right-1.5 ${provider === "mpesa" ? "bg-red-500" : "bg-transparent"}`}></div>
                          <span className="text-xs font-bold leading-none">M-Pesa</span>
                          <span className="text-[9px] font-mono text-slate-500 font-normal">Vodacom</span>
                        </button>

                        {/* Airtel Money */}
                        <button
                          type="button"
                          onClick={() => setProvider("airtel")}
                          className={`relative py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                            provider === "airtel"
                              ? "bg-amber-500/15 border-amber-500 text-amber-400"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full absolute top-1.5 right-1.5 ${provider === "airtel" ? "bg-amber-500" : "bg-transparent"}`}></div>
                          <span className="text-xs font-bold leading-none">Airtel</span>
                          <span className="text-[9px] font-mono text-amber-500 font-bold">{settings.contactPhone}</span>
                        </button>

                        {/* Tigo Pesa */}
                        <button
                          type="button"
                          onClick={() => setProvider("tigo")}
                          className={`relative py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                            provider === "tigo"
                              ? "bg-blue-500/15 border-blue-500 text-blue-400"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full absolute top-1.5 right-1.5 ${provider === "tigo" ? "bg-blue-500" : "bg-transparent"}`}></div>
                          <span className="text-xs font-bold leading-none">Tigo Pesa</span>
                          <span className="text-[9px] font-mono text-slate-500 font-normal">Tigo</span>
                        </button>

                        {/* Halopesa */}
                        <button
                          type="button"
                          onClick={() => setProvider("halotel")}
                          className={`relative py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                            provider === "halotel"
                              ? "bg-orange-500/15 border-orange-500 text-orange-400"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full absolute top-1.5 right-1.5 ${provider === "halotel" ? "bg-orange-500" : "bg-transparent"}`}></div>
                          <span className="text-xs font-bold leading-none">Halopesa</span>
                          <span className="text-[9px] font-mono text-slate-500 font-normal">Halotel</span>
                        </button>

                      </div>

                      {/* Prominent Recipient Number Alert */}
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-amber-500 mt-0.5">💡</span>
                          <div>
                            <p className="text-slate-200 font-semibold text-[11px] leading-snug">
                              All payments are routed to Airtel Money: <span className="font-mono text-amber-400 underline font-bold">{settings.contactPhone}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                              Double check that your carrier supports USSD push or configure the receiver wallet correctly on your router board.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phone Number Input */}
                    <div>
                      <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block mb-2">
                        Mobile Wallet Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-mono text-xs">
                          TZ
                        </div>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 0754XXXXXX"
                          className="w-full pl-10 pr-4 py-2.5 h-11 bg-slate-900 border border-slate-800 rounded-xl font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      {/* Explicit automated auto-run settings trigger */}
                      <div className="mt-3 flex items-center space-x-2.5 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 cursor-pointer select-none group hover:border-amber-500/25 transition-all">
                        <input
                          id="autoConnectToggle"
                          type="checkbox"
                          checked={autoConnect}
                          onChange={(e) => setAutoConnect(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-0 focus:ring-offset-0 accent-amber-500 cursor-pointer"
                        />
                        <label htmlFor="autoConnectToggle" className="text-slate-300 group-hover:text-amber-400 text-[11px] font-bold cursor-pointer transition-colors">
                          ⚡ Express Auto-Connect Mode (Execute Automatically)
                        </label>
                      </div>

                      <span className="text-[10px] text-slate-505 mt-1.5 block leading-relaxed text-slate-500">
                        Input Vodacom, Airtel, or Tigo mobile billing number. The wallet will receive a simulated automatic secure USSD PUSH request.
                      </span>
                    </div>

                    {/* Gateway Instructions */}
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Internet Package:</span>
                        <strong className="text-white">{selectedPackage.name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Charge:</span>
                        <strong className="text-amber-400 font-mono">{selectedPackage.priceTzs} TZS</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Package Duration:</span>
                        <strong className="text-slate-300 font-mono">
                          {selectedPackage.durationMins >= 1440 
                            ? `${selectedPackage.durationMins / 1440} day(s)` 
                            : `${selectedPackage.durationMins / 60} hour(s)`}
                        </strong>
                      </div>
                    </div>

                    {/* Submit and bypass trigger row */}
                    <div className="space-y-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/10 cursor-pointer select-none transition-colors disabled:opacity-40"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending USSD push...
                          </>
                        ) : (
                          <>
                            Pay {selectedPackage.priceTzs} TZS Now
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </>
                        )}
                      </button>

                      {/* Immediate Demo Activation Button and Bypass info */}
                      <button
                        type="button"
                        onClick={() => handleQuickDemoActivate(selectedPackage)}
                        disabled={loading}
                        className="w-full h-9 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-white font-medium text-[11px] tracking-wide transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        Quick Demonstration (Skip USSD Payment Request)
                      </button>
                    </div>

                  </form>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Support Contact Widget */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 space-y-4">
          <div className="bg-slate-950/45 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-2xl relative overflow-hidden select-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.015] rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">{settings.internetName} Services Support</h4>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              Need immediate assistance or experiencing a problem with your high-speed internet? Contact us instantly at <strong className="text-amber-400 font-mono">{settings.contactPhone}</strong>. Use any of the quick action channels below:
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1 font-sans">
              {/* Normal Call */}
              <a
                href={`tel:${settings.contactPhone}`}
                className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-slate-700/80 text-amber-500 active:scale-95 transition-all text-center outline-none cursor-pointer"
                id="support-call"
              >
                <Phone className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Voice Call</span>
              </a>

              {/* Text / SMS */}
              <a
                href={`sms:${settings.contactPhone}?body=Hello%20${encodeURIComponent(settings.internetName)},%20I%20have%20an%20issue%20with%2520my%2520Hotspot%2520connection.`}
                className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-slate-700/80 text-blue-400 active:scale-95 transition-all text-center outline-none cursor-pointer"
                id="support-sms"
              >
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Send SMS</span>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${settings.contactPhone.replace(/^0/, "255")}?text=Hello%20${encodeURIComponent(settings.internetName)},%20I%20am%20on%20the%20captive%20portal%20and%2520need%2520assistance%2520with%2520my%2520connection.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-slate-700/80 text-emerald-400 active:scale-95 transition-all text-center outline-none cursor-pointer"
                id="support-whatsapp"
              >
                <svg className="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.077-1.331c1.472.793 3.124 1.25 4.921 1.254h.004c5.507 0 9.99-4.478 9.991-9.985.001-2.67-1.037-5.18-2.924-7.068C17.185 3.033 14.675 2.004 12.012 2zm6.758 14.128c-.278.784-1.616 1.439-2.227 1.517-.611.079-1.365.111-2.181-.151-.51-.164-1.168-.415-1.989-.757-3.488-1.458-5.736-5.009-5.911-5.242-.175-.232-1.424-1.897-1.424-3.621 0-1.724.901-2.571 1.223-2.919.322-.348.71-.435.944-.435.234 0 .468.001.672.01.215.01.503-.081.787.604.293.708.995 2.427 1.08 2.597.085.17.142.368.028.597-.113.229-.17.395-.34.595-.17.199-.356.444-.51.597-.171.171-.351.356-.151.696.199.34.887 1.459 1.901 2.362 1.309 1.164 2.414 1.524 2.754 1.695.34.17.538.142.737-.085.199-.227.85-1.018 1.077-1.358.227-.34.453-.284.765-.17.311.114 1.979.932 2.319 1.101.34.17.566.255.65.4.085.143.085.823-.193 1.607z"/>
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-wider">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic automated execution dashboard overlay */}
      <AnimatePresence>
        {isAutoExecuting && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-6 text-center space-y-6"
            >
              {/* Spinning progress loader */}
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin"></div>
                <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase px-2.5 py-1 bg-amber-500/5 border border-amber-500/15 rounded-full">
                  ⚡ Express Auto-Connect Mode
                </span>
                <h3 className="text-white font-bold text-sm mt-3 uppercase tracking-wider font-sans">Automated Gateway Pipeline</h3>
                <p className="text-[11px] text-slate-400 mt-1">Please keep this browser window active while we configure your routing lease.</p>
              </div>

              {/* Progress Steps Log with dynamic active markers */}
              <div className="space-y-3.5 text-left border-t border-b border-slide border-slate-800/80 py-4 font-mono text-xs">
                
                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    autoStep > 1 
                      ? "bg-emerald-500 text-slate-950" 
                      : autoStep === 1 
                        ? "bg-amber-500 text-slate-950 animate-pulse" 
                        : "bg-slate-850 text-slate-500"
                  }`}>
                    {autoStep > 1 ? "✓" : "1"}
                  </div>
                  <span className={autoStep === 1 ? "text-amber-400 font-bold" : autoStep > 1 ? "text-slate-400" : "text-slate-600"}>
                    Querying {provider.toUpperCase()} Pesa API gateway...
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    autoStep > 2 
                      ? "bg-emerald-500 text-slate-950" 
                      : autoStep === 2
                        ? "bg-amber-500 text-slate-950 animate-pulse" 
                        : "bg-slate-850 text-slate-500"
                  }`}>
                    {autoStep > 2 ? "✓" : "2"}
                  </div>
                  <span className={autoStep === 2 ? "text-amber-400 font-bold" : autoStep > 2 ? "text-slate-400" : "text-slate-600"}>
                    Simulating secure USSD PIN acceptance...
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3">
                  <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    autoStep > 3 
                      ? "bg-emerald-500 text-slate-950" 
                      : autoStep === 3 
                        ? "bg-amber-500 text-slate-950 animate-pulse" 
                        : "bg-slate-850 text-slate-500"
                  }`}>
                    {autoStep > 3 ? "✓" : "3"}
                  </div>
                  <span className={autoStep === 3 ? "text-amber-400 font-bold" : autoStep > 3 ? "text-slate-400" : "text-slate-600"}>
                    Interfacing with MikroTik RouterOS API...
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-3">
                  <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    autoStep > 4 
                      ? "bg-emerald-500 text-slate-950" 
                      : autoStep === 4 
                        ? "bg-amber-500 text-slate-950 animate-pulse" 
                        : "bg-slate-850 text-slate-500"
                  }`}>
                    {autoStep > 4 ? "✓" : "4"}
                  </div>
                  <span className={autoStep === 4 ? "text-amber-400 font-bold" : autoStep > 4 ? "text-slate-400" : "text-slate-600"}>
                    DHCP lease bound to {macAddress}...
                  </span>
                </div>

              </div>

              {/* Status footer line */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure SSL Handshake channel open
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulated USSD Mobile Phone Dialog Overlay (Pop-up) */}
      <AnimatePresence>
        {showUssdPrompt && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 bg-blend-darken">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 shadow-2xl rounded-2xl p-5 text-center overflow-hidden"
            >
              <div className="avatar w-12 h-12 rounded-xl bg-orange-600/10 text-orange-400 border border-orange-500/20 flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">SIM OVERLAYS / USSD PUSH</h3>
              <p className="text-xs text-amber-300 font-semibold mt-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-lg font-mono">
                {provider.toUpperCase()} PESA PUSH SENT
              </p>
              
              <p className="text-xs text-slate-300 mt-4 leading-relaxed">
                Do you want to pay <strong className="text-white font-mono">{selectedPackage?.priceTzs} TZS</strong> to {provider.toUpperCase()} Merchant wallet <strong className="text-amber-400 font-mono">{settings.contactPhone}</strong> ({settings.internetName}) for {selectedPackage?.name}?
              </p>

              <div className="mt-5 space-y-3">
                <div>
                  <input
                    type="password"
                    maxLength={4}
                    value={ussdPin}
                    onChange={(e) => setUssdPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 4-Digit Wallet PIN"
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono text-md text-amber-400 tracking-widest placeholder-tracking-normal placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Demo Hint: Enter any 4 digit security code, e.g. 1234</span>
                </div>

                {ussdError && (
                  <p className="text-[10px] text-red-400 font-medium flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {ussdError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowUssdPrompt(false);
                      setLoading(false);
                      setTxStatus("failed");
                    }}
                    className="w-full h-10 bg-slate-850 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-semibold text-slate-400 cursor-pointer"
                  >
                    Cancel Reject
                  </button>
                  <button
                    onClick={handleSimulatePinSubmit}
                    className="w-full h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-amber-500/15"
                  >
                    Confirm PIN Pay
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Powered by tag Footer */}
      <div className="p-4 bg-slate-950 text-center border-t border-slate-900 select-none flex items-center justify-center gap-2">
        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          TZ Mobile money gateway integration active
        </span>
      </div>

    </div>
  );
}
