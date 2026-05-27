import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  Smartphone, 
  Cpu, 
  Info, 
  HelpCircle, 
  Layers, 
  BookOpen, 
  ArrowRight,
  Database,
  Coins
} from "lucide-react";
import CaptivePortal from "./components/CaptivePortal";
import AdminDashboard from "./components/AdminDashboard";
import { HotspotPackage } from "./types";

export default function App() {
  const [packages, setPackages] = useState<HotspotPackage[]>([]);
  const [triggerDataSync, setTriggerDataSync] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"both" | "client" | "admin">("both");

  // Fetch all internet billing packages on start
  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/packages");
      const data = await res.json();
      setPackages(data);
    } catch (err) {
      console.error("Failed to load billing packages.", err);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  // Callback triggered when a mobile money simulator payment resolves
  const handlePaymentSuccess = () => {
    // Increment statistical synchronizer state to force reload metrics
    setTriggerDataSync((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-105 font-sans flex flex-col antialiased">
      
      {/* Platform Branding Hub */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3.5">
              <span className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-amber-500 block shadow-lg shadow-amber-500/5 hover:border-amber-500/30 transition-all">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 20V4L12 14V4H16V20L8 10V20H4Z" fill="currentColor" />
                  <path d="M18 6C19.5 7.5 20 9.5 20 12C20 14.5 19.5 16.5 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M21 3C23.25 5.25 24 8.25 24 12C24 15.75 23.25 18.75 21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                </svg>
              </span>
              <div>
                <h1 className="text-md font-black tracking-wider text-white uppercase flex items-center gap-2 font-sans">
                  N-internet services LTD
                  <span className="text-[9px] font-mono lowercase tracking-normal text-amber-500 font-bold px-2 py-0.5 bg-slate-950 border border-amber-500/10 rounded-full">
                    Core billing gateway
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">High Speed Hotspot Integration & Mobile billing controller</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Production-Ready Automated Wi-Fi Portal with MikroTik RouterOS API integration, Tanzanian Mobile Money payments (M-Pesa, Airtel & Tigo Pesa).
            </p>
          </div>

          {/* Interactive Screen Layout Mode Switcher */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
            <button
              onClick={() => setViewMode("both")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "both" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Dual Split View
            </button>
            <button
              onClick={() => setViewMode("client")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "client" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              📱 Mobile Portal Only
            </button>
            <button
              onClick={() => setViewMode("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "admin" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              ⚙ Admin Console Only
            </button>
          </div>
        </div>
      </header>

      {/* Main Sandbox Workspace Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col">
        
        {/* Dynamic Warning Alert on sandboxed simulated environments */}
        <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-white block font-semibold mb-0.5">Automated Mobile Checkout Demonstration</strong>
              <p className="text-slate-400 leading-relaxed">
                You can act as both the <strong>Hotspot Client</strong> (paying with Tanzania mobile network sim) and the <strong>hotspot administrator</strong>. Enter any cellular phone and submit a transaction. The system simulates a secure USSD PIN pop-up box, registers transaction, and activates Router QoS profiles automatically.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>REST API Endpoint Listening</span>
          </div>
        </div>

        {/* Workspace Layout rendering depending on Toggle choices */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Column A: Simulated User Mobile Phone Captive Portal */}
          {(viewMode === "both" || viewMode === "client") && (
            <div className={`${
              viewMode === "both" ? "lg:col-span-4" : "lg:col-span-12"
            } flex flex-col items-center justify-start`}>
              
              {/* Optional Phone casing visual container for side-by-side mode */}
              <div className="w-full max-w-sm rounded-[32px] bg-slate-950 p-3 shadow-2xl border border-slate-800 relative ring-4 ring-slate-900 shadow-slate-950">
                
                {/* Simulated Notch */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-28 h-4 rounded-full bg-slate-900 z-20 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500/10"></span>
                </div>
                
                <div className="w-full aspect-[9/19] h-[680px] rounded-[24px] overflow-hidden">
                  <CaptivePortal 
                    packages={packages} 
                    onPaymentSuccess={handlePaymentSuccess} 
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center select-none italic font-mono uppercase">
                Interactive mobile captive client layout
              </p>
            </div>
          )}

          {/* Column B: Professional System Administration console */}
          {(viewMode === "both" || viewMode === "admin") && (
            <div className={`${
              viewMode === "both" ? "lg:col-span-8" : "lg:col-span-12"
            } flex flex-col`}>
              <AdminDashboard 
                packages={packages} 
                onRefreshPackages={fetchPackages}
                triggerDataSync={triggerDataSync}
              />
            </div>
          )}

        </div>

      </main>

      {/* Production Infrastructure Architecture Banner */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12 py-6 px-6 font-mono text-xs text-slate-500 text-center select-none leading-relaxed">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-600" />
            <span>Storage: SQLite / JSON File persistent storage model active</span>
          </div>
          <div>
            <span>Developed for Tanzanian Public hotspot network operators</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Production ready RouterOS wrapper v6.x & v7.x compatible</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
