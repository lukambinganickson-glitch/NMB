import React, { useState } from "react";
import { ShieldAlert, Activity, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";

interface SystemControlTabProps {
  currentUser: any;
  systemLogsList: any[];
  backupList: any[];
  blacklistedIpsList: any[];
  blacklistedMacsList: any[];
  securityAlertsList: any[];
  onRefresh: () => void;
}

export default function SystemControlTab({
  currentUser,
  systemLogsList,
  backupList,
  blacklistedIpsList,
  blacklistedMacsList,
  securityAlertsList,
  onRefresh
}: SystemControlTabProps) {
  // Ban form bindings
  const [manualBanIp, setManualBanIp] = useState("");
  const [manualBanIpReason, setManualBanIpReason] = useState("");
  const [manualBanMac, setManualBanMac] = useState("");
  const [manualBanMacReason, setManualBanMacReason] = useState("");

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
        onRefresh();
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
        onRefresh();
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
      if (res.ok) onRefresh();
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
      if (res.ok) onRefresh();
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
      if (res.ok) onRefresh();
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
        onRefresh();
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
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AUTOMATION ENGINE SERVICES */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-4 h-fit">
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-4 flex items-center gap-1.5 select-none">
            <Activity className="w-4 h-4" />
            AUTOMATION SCHEDULERS
          </h4>
          <div className="space-y-3">
            {[
              { title: "DHCP Tracer Engine", status: "Active Ticking", desc: "Monitors and logs newly attached client devices on the LAN bridge." },
              { title: "Portal Captive redirects", status: "Active Ticking", desc: "Routes port 80 actions to our billing checkout panel." },
              { title: "SMS OTP Reset scheduler", status: "Active Ticking", desc: "Auto-destroys SMS reset OTP keys after 5-minute expirations." },
              { title: "Client Auto-disconnect Cron", status: "Active Ticking", desc: "De-authenticates expired vouchers instantly." },
              { title: "Backup storage compiler", status: "Active Ticking", desc: "Compiles secure database snapshots to the disk." },
              { title: "Anti-cloning / MAC protection", status: "Active Ticking", desc: "Shields routing gateway from MAC spoofing." }
            ].map((service, idx) => (
              <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl relative overflow-hidden">
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[8px] font-mono text-emerald-400 uppercase font-black">{service.status}</span>
                </div>
                <p className="text-xs font-bold text-slate-200">{service.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FIREWALL CYBER ENTRYS & IP/MAC FILTER */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-8 flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5 select-none">
              <ShieldAlert className="w-4 h-4" />
              CYBER INTRUSION DEFENSE FIREWALL
            </h4>
            <p className="text-xs text-slate-400">
              Apply static ban filters targeting hardware MAC clones, or handle immediate real-time automated threat alerts.
            </p>
          </div>

          {/* Real-time Alerts */}
          <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl space-y-3">
            <h5 className="text-xs font-bold text-red-400 uppercase flex items-center gap-1">
              🚨 Active Security Intrusions Checked
            </h5>
            <div className="max-h-36 overflow-y-auto space-y-2 font-mono text-[10px]">
              {securityAlertsList.length === 0 ? (
                <p className="text-slate-500 italic p-1.5">No cyber hardware spoofing detected currently.</p>
              ) : (
                securityAlertsList.map(alert => (
                  <div key={alert.id} className="p-2 bg-slate-950/80 rounded border border-red-900/40 flex justify-between items-start gap-4">
                    <div className="text-left space-y-0.5">
                      <span className="bg-red-900 text-red-200 text-[8px] px-1 rounded uppercase font-bold">{alert.type}</span>
                      <p className="text-slate-300 mt-1">{alert.details}</p>
                      <span className="text-slate-500 text-[8px]">Target: {alert.target} | {new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {!alert.resolved && (
                      <button
                        type="button"
                        onClick={() => {
                          fetch("/api/security-alerts/resolve", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: alert.id })
                          }).then(() => onRefresh());
                        }}
                        className="px-1.5 py-0.5 bg-red-900/50 text-red-200 text-[8px] rounded font-mono hover:bg-red-800 cursor-pointer text-center"
                      >
                        RESOLVE
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form onSubmit={handleBanIP} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <h5 className="text-xs font-bold text-slate-350">Blacklist Client IP</h5>
              <input
                type="text"
                required
                placeholder="e.g. 10.5.50.150"
                value={manualBanIp}
                onChange={e => setManualBanIp(e.target.value.replace(/\s/g, ""))}
                className="w-full bg-slate-900 border border-slate-850 px-3 py-2 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
              />
              <input
                type="text"
                placeholder="IP block reason"
                value={manualBanIpReason}
                onChange={e => setManualBanIpReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 px-3 py-2 rounded-lg text-xs font-sans text-slate-200 focus:outline-none focus:border-red-500"
              />
              <button type="submit" className="w-full py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-900 text-red-400 font-bold uppercase text-[10px] cursor-pointer">
                ADD IP FIREWALL BLOCK
              </button>
            </form>

            <form onSubmit={handleBanMAC} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <h5 className="text-xs font-bold text-slate-350">Blacklist Client MAC</h5>
              <input
                type="text"
                required
                placeholder="e.g. AA:BB:CC:DD:EE:FF"
                value={manualBanMac}
                onChange={e => setManualBanMac(e.target.value.toUpperCase().replace(/\s/g, ""))}
                className="w-full bg-slate-900 border border-slate-850 px-3 py-2 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
              />
              <input
                type="text"
                placeholder="MAC block reason"
                value={manualBanMacReason}
                onChange={e => setManualBanMacReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 px-3 py-2 rounded-lg text-xs font-sans text-slate-200 focus:outline-none focus:border-red-500"
              />
              <button type="submit" className="w-full py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-900 text-red-400 font-bold uppercase text-[10px] cursor-pointer">
                ADD MAC FIREWALL BAN
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-855 rounded-xl p-3 max-h-48 overflow-y-auto text-left">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Blocked IP Leases</p>
              <div className="space-y-1">
                {blacklistedIpsList.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No blocked IPs found on hardware list.</p>
                ) : (
                  blacklistedIpsList.map(item => (
                    <div key={item.ip} className="flex justify-between items-center text-[10px] p-2 bg-slate-900 rounded border border-slate-850 font-mono">
                      <div>
                        <span className="text-amber-500 font-bold">{item.ip}</span>
                        <p className="text-[8px] text-slate-500 font-sans mt-0.5">"{item.reason || "Suspicious node"}"</p>
                      </div>
                      <button type="button" onClick={() => handleUnbanIP(item.ip)} className="text-red-400 hover:text-red-300 font-bold cursor-pointer">REVOKE</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-855 rounded-xl p-3 max-h-48 overflow-y-auto text-left">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Blocked Client MACs</p>
              <div className="space-y-1">
                {blacklistedMacsList.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No blocked hardware MAC addresses.</p>
                ) : (
                  blacklistedMacsList.map(item => (
                    <div key={item.mac} className="flex justify-between items-center text-[10px] p-2 bg-slate-900 rounded border border-slate-850 font-mono">
                      <div>
                        <span className="text-amber-500 font-bold">{item.mac}</span>
                        <p className="text-[8px] text-slate-500 font-sans mt-0.5">"{item.reason || "Suspicious hardware code"}"</p>
                      </div>
                      <button type="button" onClick={() => handleUnbanMAC(item.mac)} className="text-red-400 hover:text-red-300 font-bold cursor-pointer">REVOKE</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STORAGE SNAPSHOT BACKUPS */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 select-none">PERSISTENT SNAPSHOT BACKUPS</h4>
            <p className="text-xs text-slate-400 mt-1">Automatic backups trigger every 2 minutes. You can compile manual snapshots below.</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateBackupManual}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
          >
            Create Snapshot Backup Now
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl mt-4">
          <table className="w-full text-left font-mono text-xs text-slate-350 border-collapse">
            <thead className="bg-slate-950 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Filename (.json)</th>
                <th className="p-3">Timestamp Created</th>
                <th className="p-3">Disk Size</th>
                <th className="p-3">Rows</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {backupList.map(item => (
                <tr key={item.id} className="hover:bg-slate-850/20 text-slate-300">
                  <td className="p-3 font-semibold text-amber-500/80">{item.id}</td>
                  <td className="p-3 text-white font-bold">{item.filename}</td>
                  <td className="p-3 text-slate-400">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="p-3 text-slate-500">{item.size}</td>
                  <td className="p-3 text-slate-500">{item.count} rows</td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRestoreBackupManual(item.id, item.filename)}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 cursor-pointer"
                    >
                      Restore Backup
                    </button>
                  </td>
                </tr>
              ))}
              {backupList.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-600">No backup snapshot directories compiled.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SYSTEM LOGS JOURNAL */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">Intrusion & Core Audit Log Trail</h4>
          <button
            type="button"
            onClick={handleFlushLogsManual}
            className="px-3 py-1 text-[10px] font-bold tracking-wide border border-red-900 text-red-500 bg-red-950/20 hover:bg-red-905 rounded transition-colors cursor-pointer font-mono"
          >
            FLUSH JOURNAL
          </button>
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-4 font-mono text-[11px] space-y-2">
          {systemLogsList.length === 0 ? (
            <p className="text-slate-650 italic text-center py-6">Log journal is clean.</p>
          ) : (
            systemLogsList.map(log => {
              const isDanger = log.level === "danger";
              const isWarning = log.level === "warning";
              const isSuccess = log.level === "success";
              return (
                <div key={log.id} className="flex items-start gap-2.5 border-b border-slate-900 pb-1.5 text-left leading-relaxed">
                  <span className="text-slate-600 shrink-0 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase shrink-0 select-none ${isDanger ? "bg-red-950 text-red-400" : isWarning ? "bg-amber-950 text-amber-400 animate-pulse" : isSuccess ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                    {log.level}
                  </span>
                  <span className={`flex-1 ${isDanger ? "text-red-400 font-semibold" : isWarning ? "text-amber-500 font-semibold" : isSuccess ? "text-slate-300" : "text-slate-400"}`}>
                    {log.message}
                  </span>
                  {log.operator && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded shrink-0 font-sans font-bold">
                      👤 {log.operator}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
