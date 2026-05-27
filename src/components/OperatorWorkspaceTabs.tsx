import React, { useState, useEffect } from "react";
import { UserCheck, Eye, BookOpen, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

interface OperatorWorkspaceTabsProps {
  currentUser: any;
  currentTab: string;
  packages: any[];
  vouchers: any[];
  activeSessions: any[];
  systemLogsList: any[];
  onRefresh: () => void;
}

// Countdown timer helper for leases
function SessionTimeLeft({ expiresAt }: { expiresAt: string }) {
  const [timeLeftStr, setTimeLeftStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr("Expired (0s limit reached)");
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      setTimeLeftStr(`${hours > 0 ? hours + "h " : ""}${mins}m ${secs}s left`);
    };

    updateTime();
    const subTimer = setInterval(updateTime, 1000);
    return () => clearInterval(subTimer);
  }, [expiresAt]);

  return <span className="text-amber-400 font-bold font-mono text-[11px]">{timeLeftStr}</span>;
}

export default function OperatorWorkspaceTabs({
  currentUser,
  currentTab,
  packages,
  vouchers,
  activeSessions,
  systemLogsList,
  onRefresh
}: OperatorWorkspaceTabsProps) {
  // Manual activation form state
  const [manPkgId, setManPkgId] = useState("");
  const [manMacAddress, setManMacAddress] = useState("");
  const [manPhone, setManPhone] = useState("");
  const [manMessage, setManMessage] = useState("");
  const [manError, setManError] = useState("");
  const [loading, setLoading] = useState(false);

  const performManualActivation = async () => {
    setManMessage("");
    setManError("");
    if (!manPkgId) {
      setManError("Select Hotspot Package before activating.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/vouchers/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: manPkgId, macAddress: manMacAddress })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setManError(data.error || "Manual bypass failed.");
        return;
      }

      setManMessage(`Generated Successfully! Voucher Code TZ-Bypass: ${data.voucher.code} is active for 1 Hour(s). MAC ${data.voucher.macAddress} is connected.`);
      setManMacAddress("");
      setManPhone("");
      setManPkgId("");
      onRefresh();

      // Log operator audit activity
      await fetch("/api/operators/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, action: `Manually activated device MAC ${data.voucher.macAddress} using code ${data.voucher.code}` })
      });
    } catch (e) {
      console.error(e);
      setManError("Server comms delay.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectSession = async (mac: string) => {
    try {
      const res = await fetch("/api/active-sessions/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac })
      });
      if (res.ok) {
        onRefresh();
        // Log operator activity
        await fetch("/api/operators/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser.username, action: `Terminated active wireless lease and kicked client with MAC ${mac}` })
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. OPERATOR LIMITED REPORTS PANEL */}
      {currentTab === "op-overview" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <span className="text-[9px] bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded font-black uppercase tracking-wider font-mono">
              OPERATOR PANEL (LIMITED ACCESS)
            </span>
            <h3 className="text-xl font-black text-white mt-2 font-sans">
              Welcome, {currentUser.profileName || currentUser.username}
            </h3>
            <p className="text-slate-400 text-xs mt-1.5 leading-normal max-w-2xl">
              Credential level authenticated on Operator rank status [
              <span className="font-mono text-amber-500 uppercase font-black">{currentUser.operatorRole || "standard"}</span>
              ]. Tasks and system visual areas are allocated below under Super Admin authority metrics.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 rounded-xl text-emerald-400 border border-emerald-900/60 font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                OPERATIONS CONSOLE: LIVE & ONLINE
              </div>
              <div className="px-3 py-1 bg-slate-950 rounded-xl text-slate-450 border border-slate-850 text-[10px] font-mono">
                Assigned host node: {currentUser.allowedIps || "Permissive (unbound IP)"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl md:col-span-5 h-fit text-left space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 select-none">Assigned Leases Matrix</h4>
              <div className="space-y-2">
                {[
                  { id: "view_users", label: "Inspect online active clients lists" },
                  { id: "view_payments", label: "Inspect customer vouchers payments feed" },
                  { id: "create_vouchers", label: "Generate manual voucher pin codes" },
                  { id: "assist_activation", label: "Manual activation override overrides" },
                  { id: "view_logs", label: "Access connection list DHCP logs" },
                  { id: "suspend_sessions", label: "Disconnect client wireless nodes" },
                  { id: "view_reports", label: "Browse limited operational summary reports" }
                ].map(item => {
                  const active = currentUser.permissions?.includes(item.id);
                  return (
                    <div key={item.id} className={`p-2 rounded-xl border flex items-center justify-between text-xs ${active ? "bg-slate-950/40 border-emerald-950 text-slate-200" : "bg-slate-950/20 border-slate-850 text-slate-600 line-through"}`}>
                      <span>{item.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono border ${active ? "bg-emerald-950 text-emerald-400 border-emerald-900/40" : "bg-red-950 text-red-400/80 border-red-900/30"}`}>
                        {active ? "LEASED" : "BLOCKED"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl md:col-span-7 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-4 select-none">Operational Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Connected Leases</span>
                    <p className="text-3xl font-bold font-mono text-amber-500 mt-2">{activeSessions.length}</p>
                    <span className="text-[9px] text-emerald-400 mt-1.5 block">Active Wi-Fi clients</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Saved Vouchers</span>
                    <p className="text-3xl font-bold font-mono text-amber-500 mt-2">{vouchers.length}</p>
                    <span className="text-[9px] text-zinc-400 mt-1.5 block">Registered on local DB</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl mt-5">
                <h5 className="text-xs font-bold text-slate-350 uppercase select-none">Account Session settings</h5>
                <div className="space-y-1.5 text-xs text-slate-450 font-mono mt-3">
                  <div>⏰ Idle Lockout Threshold: <span className="text-slate-200">{currentUser.loginTimeLimit ? `${currentUser.loginTimeLimit} Minutes` : "No limit"}</span></div>
                  <div>🚨 Assigned Location Node: <span className="text-slate-200">Local Hotspot LAN Bridge</span></div>
                  <div>👤 Current user: <span className="text-amber-500">{currentUser.username}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. OPERATOR ACTIVATION TOOL */}
      {currentTab === "op-activation" && (
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-500" />
              Manual Client Activation Gateway
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Fulfill bypass requests for offline payments or cellular topups. Submissions are audited and bound under your operator username log traces.
            </p>
          </div>

          {!currentUser.permissions?.includes("create_vouchers") && !currentUser.permissions?.includes("assist_activation") ? (
            <div className="bg-red-950/40 border border-red-900/60 p-4 rounded-xl text-xs text-red-400 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Access Blocked: Manual activation leases are suspended on this profile by the administrator.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3.5">
                <div>
                  <label className="text-[10px] text-slate-550 uppercase font-black block mb-1 font-mono">Select Hotspot Package</label>
                  <select
                    value={manPkgId}
                    onChange={e => setManPkgId(e.target.value)}
                    className="w-full bg-slate-905 bg-slate-905 bg-slate-900 border border-slate-800 text-slate-200 p-2.5 rounded-lg text-xs"
                  >
                    <option value="">-- Choose Hotspot package bandwidth profile --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.priceTzs.toLocaleString()} TZS ({p.durationMins} Mins - Speed: {p.speedLimit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-550 uppercase font-black block mb-1 font-mono">Hardware MAC Address Binding</label>
                  <input
                    type="text"
                    placeholder="e.g. BB:EE:11:90:35:FF"
                    value={manMacAddress}
                    onChange={e => setManMacAddress(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-550 uppercase font-black block mb-1 font-mono">Billing mobile number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0699111222"
                    value={manPhone}
                    onChange={e => setManPhone(e.target.value.replace(/\s/g, ""))}
                    className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs text-slate-100 font-mono"
                  />
                </div>

                {manError && (
                  <div className="bg-red-950/30 border border-red-900/40 p-3 rounded-lg text-xs text-red-400 font-bold">
                    {manError}
                  </div>
                )}

                {manMessage && (
                  <div className="bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-lg text-xs text-emerald-400 font-bold">
                    {manMessage}
                  </div>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={performManualActivation}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Completing Activation..." : "Generate & Force Activate Lease"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. OPERATOR ACTIVE SESSIONS */}
      {currentTab === "op-sessions" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-500" />
              Connected Hotspot Client Scribes
            </h3>
            <p className="text-xs text-slate-400 mt-1">Displays wireless cards currently leasing internet throughput through the router gateway.</p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl mt-5">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-slate-950 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="p-3">Device MAC address</th>
                  <th className="p-3">DHCP Lease IP</th>
                  <th className="p-3">Account Voucher Code</th>
                  <th className="p-3">Allocated Service Package</th>
                  <th className="p-3">Bandwidth Usage</th>
                  <th className="p-3">Expires timer</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {activeSessions.map((session, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/20">
                    <td className="p-3 font-semibold text-white">{session.mac}</td>
                    <td className="p-3 text-purple-400">{session.ip}</td>
                    <td className="p-3 font-bold text-white">{session.username}</td>
                    <td className="p-3 text-amber-500 font-sans">{session.packageName || "Unknown"}</td>
                    <td className="p-3 text-slate-500 font-sans">
                      📥 {((session.downBytes || 0) / (1024 * 1024)).toFixed(2)} MB{" "}
                      📤 {((session.upBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="p-3">
                      {session.expiresAt ? <SessionTimeLeft expiresAt={session.expiresAt} /> : "Persistent Lease"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        {currentUser.permissions?.includes("suspend_sessions") ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnectSession(session.mac)}
                            className="px-2.5 py-1 text-[9px] bg-red-950/25 hover:bg-red-900 hover:text-white border border-red-900/40 font-bold uppercase rounded-lg text-red-400 cursor-pointer"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-600 font-sans">Suspension rights blocked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {activeSessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-600">No active leases recorded on local bridge gateway.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. OPERATOR CONNECTION LOGS */}
      {currentTab === "op-logs" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <BookOpen className="w-5 h-5 text-amber-500" />
            Connection Lease lists & DHCP logs
          </h3>

          {!currentUser.permissions?.includes("view_logs") ? (
            <div className="bg-red-950/40 border border-red-900/60 p-4 rounded-xl text-xs text-red-200 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Access Blocked: connection log display permission limits applied.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-4 font-mono text-xs space-y-2">
              {systemLogsList.map((log) => {
                const isDanger = log.level === "danger";
                const isWarning = log.level === "warning";
                const isSuccess = log.level === "success";
                return (
                  <div key={log.id} className="flex items-start gap-3 border-b border-slate-900 pb-1.5 leading-relaxed">
                    <span className="text-slate-600 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase shrink-0 select-none ${isDanger ? "bg-red-955 bg-red-950 text-red-400" : isWarning ? "bg-amber-950 text-amber-400" : isSuccess ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                      {log.level}
                    </span>
                    <span className={`flex-1 ${isDanger ? "text-red-400" : isWarning ? "text-amber-500" : isSuccess ? "text-slate-200" : "text-slate-400"}`}>
                      {log.message}
                    </span>
                    {log.operator && (
                      <span className="text-[10px] text-zinc-550 bg-zinc-900 px-1 rounded select-none shrink-0 font-sans font-bold">👤 {log.operator}</span>
                    )}
                  </div>
                );
              })}
              {systemLogsList.length === 0 && (
                <p className="text-slate-600 italic text-center py-6">DHCP trace leases list empty.</p>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
