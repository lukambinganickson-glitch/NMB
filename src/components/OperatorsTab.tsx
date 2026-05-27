import React, { useState } from "react";
import { Users, Plus, Trash2, Edit, AlertCircle, CheckCircle2 } from "lucide-react";

interface OperatorsTabProps {
  currentUser: any;
  operatorsList: any[];
  onRefresh: () => void;
}

export default function OperatorsTab({ currentUser, operatorsList, onRefresh }: OperatorsTabProps) {
  const [activeTabSub, setActiveTabSub] = useState<"list" | "create">("list");
  
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

  const handleToggleOperatorLock = async (opId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "active" ? "suspended" : "active";
      const res = await fetch(`/api/operators/${opId}/toggle-lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        onRefresh();
        // Log action
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
        onRefresh();
        alert(`Successfully terminated active login session for "${opUsername}". Token revoked.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOperator = async (opId: string, opUsername: string) => {
    if (!window.confirm(`Are you absolutely sure you want to hard DELETE operator "${opUsername}"?`)) return;
    try {
      const res = await fetch(`/api/operators/${opId}`, { method: "DELETE" });
      if (res.ok) {
        onRefresh();
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
      setOpFormError("Operator username required.");
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
        setOpFormError("Password is required for a new operator.");
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        setOpFormError(data.error || "Provision failed.");
        return;
      }

      setOpFormSuccess(editingOpId ? "Operator updated successfully!" : "Operator registered successfully!");
      onRefresh();
      
      // Auto-reset form
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
      setOpFormError("Communication failure.");
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

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Operators Command Center
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Super-parent control panel mapping dynamic operator permission matrices, live login audits, IP binders, and remote session termination.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTabSub("list"); setEditingOpId(null); setOpFormError(""); setOpFormSuccess(""); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${activeTabSub === "list" ? "bg-amber-500 text-slate-950" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
            >
              Active Operators ({operatorsList.length})
            </button>
            <button
              onClick={() => { 
                setActiveTabSub("create"); 
                setEditingOpId(null); 
                setOpFormUsername("");
                setOpFormPassword("");
                setOpFormRole("standard");
                setOpFormName("");
                setOpFormPhone("");
                setOpFormPermissions(["view_users", "view_payments", "create_vouchers", "assist_activation", "view_logs"]);
                setOpFormIps("");
                setOpFormDevices("");
                setOpFormTimeLimit("0");
                setOpFormError(""); 
                setOpFormSuccess(""); 
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTabSub === "create" ? "bg-amber-500 text-slate-950" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Provision Operator
            </button>
          </div>
        </div>

        {activeTabSub === "list" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Operators</p>
                <p className="text-xl font-mono font-black text-white mt-1">{operatorsList.length}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active</p>
                <p className="text-xl font-mono font-black text-emerald-400 mt-1">
                  {operatorsList.filter(o => o.status === "active" || !o.status).length}
                </p>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Suspended</p>
                <p className="text-xl font-mono font-black text-amber-500 mt-1">
                  {operatorsList.filter(o => o.status === "suspended").length}
                </p>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Intrusion Locked</p>
                <p className="text-xl font-mono font-black text-red-500 mt-1">
                  {operatorsList.filter(o => o.status === "locked").length}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-[10px] font-bold tracking-widest uppercase text-slate-400 border-b border-slate-800">
                    <th className="p-4">Profile Info</th>
                    <th className="p-4">Permissions Lease</th>
                    <th className="p-4">Restrictions</th>
                    <th className="p-4">Last Activity logged</th>
                    <th className="p-4">Session</th>
                    <th className="p-4 text-center">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {operatorsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-slate-500">No operators registered. Click Provision button above.</td>
                    </tr>
                  ) : (
                    operatorsList.map((op) => (
                      <tr key={op.id} className="hover:bg-slate-850/20 text-xs text-slate-300">
                        <td className="p-4">
                          <div className="font-bold text-white">{op.profileName || op.username}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">usr: {op.username} | {op.profilePhone || "No Phone"}</div>
                          <div className="mt-1.5 flex gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono ${op.operatorRole === "senior" ? "bg-purple-950 text-purple-400" : op.operatorRole === "support" ? "bg-blue-950 text-blue-400" : "bg-amber-900/30 text-amber-450"}`}>
                              {op.operatorRole || "standard"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${op.status === "suspended" ? "bg-amber-950 text-amber-500" : op.status === "locked" ? "bg-red-950 text-red-500 animate-pulse" : "bg-emerald-950 text-emerald-400"}`}>
                              {op.status || "active"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {op.permissions?.map((p: string) => (
                              <span key={p} className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-400 font-mono">
                                {p.replace("_", " ")}
                              </span>
                            )) || <span className="text-[9px] text-slate-600">None</span>}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[10px]">
                          <div className="space-y-1">
                            <div>IPS: <span className="text-amber-550">{op.allowedIps || "Any"}</span></div>
                            <div>Limit: <span className="text-slate-400">{op.loginTimeLimit ? `${op.loginTimeLimit} Mins` : "Unlimited"}</span></div>
                          </div>
                        </td>
                        <td className="p-4">
                          {op.lastAction ? (
                            <div className="space-y-0.5">
                              <p className="text-slate-200">"{op.lastAction.action}"</p>
                              <span className="text-[9px] font-mono text-slate-500">{new Date(op.lastAction.timestamp).toLocaleTimeString()}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No logs yet</span>
                          )}
                        </td>
                        <td className="p-4">
                          {op.sessionToken ? (
                            <span className="text-emerald-400 font-sans font-bold flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-emerald-450 rounded-full"></span> Active
                            </span>
                          ) : (
                            <span className="text-slate-500">Offline</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleToggleOperatorLock(op.id, op.status || "active")}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${op.status === "suspended" ? "bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800" : "bg-amber-955 bg-amber-950/20 hover:bg-amber-900/10 text-amber-500 border border-amber-900/30"} cursor-pointer`}
                            >
                              {op.status === "suspended" ? "RESUME" : "SUSPEND"}
                            </button>

                            {op.sessionToken && (
                              <button
                                onClick={() => handleForceLogout(op.id, op.username)}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 cursor-pointer"
                              >
                                KICK
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingOpId(op.id);
                                setOpFormUsername(op.username);
                                setOpFormRole(op.operatorRole || "standard");
                                setOpFormName(op.profileName || "");
                                setOpFormPhone(op.profilePhone || "");
                                setOpFormPermissions(op.permissions || []);
                                setOpFormIps(op.allowedIps || "");
                                setOpFormDevices(op.allowedDevices || "");
                                setOpFormTimeLimit(op.loginTimeLimit?.toString() || "0");
                                setActiveTabSub("create");
                              }}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                            >
                              EDIT
                            </button>

                            <button
                              onClick={() => handleDeleteOperator(op.id, op.username)}
                              className="p-1 rounded bg-red-950 hover:bg-red-900 text-red-400 border border-red-900 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Operator login audits */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 text-left">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Login Audit Trails</h4>
              <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left font-mono text-xs text-slate-400">
                  <thead className="bg-slate-900 text-[9px] tracking-wide text-slate-500 border-b border-slate-800 uppercase font-black">
                    <tr>
                      <th className="p-2.5">Operator</th>
                      <th className="p-2.5">IP Node</th>
                      <th className="p-2.5">Date Stamp</th>
                      <th className="p-2.5">Status Leased</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {operatorsList.flatMap(op => 
                      (op.loginHistory || []).map((lh: any, idx: number) => ({
                        username: op.username,
                        rank: op.operatorRole,
                        ...lh,
                        keyID: `${op.id}-${idx}`
                      }))
                    ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map(item => (
                      <tr key={item.keyID} className="hover:bg-slate-900/30">
                        <td className="p-2.5 font-bold text-slate-300">{item.username} ({item.rank})</td>
                        <td className="p-2.5 text-amber-550">{item.ip}</td>
                        <td className="p-2.5">{new Date(item.timestamp).toLocaleString()}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${item.duration === "Active Session" ? "bg-emerald-950 text-emerald-400 font-bold" : "bg-slate-800 text-slate-400"}`}>
                            {item.duration || "Closed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {operatorsList.flatMap(o => o.loginHistory || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-600 font-medium">No log reports recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTabSub === "create" && (
          <form onSubmit={handleCreateOrUpdateOperator} className="mt-6 space-y-6">
            {opFormError && (
              <div className="bg-red-950/40 border border-red-900/50 p-3.5 rounded-xl text-xs text-red-450 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                {opFormError}
              </div>
            )}
            {opFormSuccess && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 p-3.5 rounded-xl text-xs text-emerald-450 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {opFormSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold uppercase">Operator Login Username *</label>
                <input
                  type="text"
                  disabled={!!editingOpId}
                  value={opFormUsername}
                  onChange={(e) => setOpFormUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="e.g. lukambinga"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {editingOpId ? "Reset Password (Leave blank to keep same)" : "Login Password *"}
                </label>
                <input
                  type="password"
                  value={opFormPassword}
                  onChange={(e) => setOpFormPassword(e.target.value)}
                  placeholder="e.g. Enter secure password keys"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold uppercase">Operator Full Profile Name</label>
                <input
                  type="text"
                  value={opFormName}
                  onChange={(e) => setOpFormName(e.target.value)}
                  placeholder="e.g. Lukambinga Services"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold uppercase">Operator Mobile Number</label>
                <input
                  type="text"
                  value={opFormPhone}
                  onChange={(e) => setOpFormPhone(e.target.value)}
                  placeholder="e.g. 0699111222"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 p-5 bg-slate-950 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Access Category & Permissions</h4>
              <div className="flex gap-2">
                {(["senior", "standard", "support"] as const).map((rank) => (
                  <button
                    key={rank}
                    type="button"
                    onClick={() => adjustPermissionsByRank(rank)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all ${opFormRole === rank ? "bg-amber-500 text-slate-950 border-amber-600" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                  >
                    {rank} Operator
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: "view_users", label: "View Connected Clients List" },
                  { id: "view_payments", label: "Inspect Customer Vouchers Feed" },
                  { id: "create_vouchers", label: "Generate Vouchers Manually" },
                  { id: "assist_activation", label: "Click Assist Customer Activation" },
                  { id: "view_logs", label: "Browse Session Connection logs" },
                  { id: "suspend_sessions", label: "Permit Disconnecting active MACs" },
                  { id: "view_reports", label: "Access reports dashboard summary" }
                ].map((perm) => {
                  const hasPerm = opFormPermissions.includes(perm.id);
                  return (
                    <label key={perm.id} className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800/50 hover:border-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasPerm}
                        onChange={() => {
                          if (hasPerm) {
                            setOpFormPermissions(prev => prev.filter(x => x !== perm.id));
                          } else {
                            setOpFormPermissions(prev => [...prev, perm.id]);
                          }
                        }}
                        className="accent-amber-505 accent-amber-500 rounded font-mono w-4 h-4 cursor-pointer"
                      />
                      <span className="text-slate-300 font-medium font-sans text-xs">{perm.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase">IP & Lockout Limits</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Allowed IP constraints (Optional)</span>
                  <input
                    type="text"
                    value={opFormIps}
                    onChange={(e) => setOpFormIps(e.target.value)}
                    placeholder="e.g. 192.168.1.100 (Comma-separated. Leave empty for any IP)"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Uptime Expiration limit (Minutes)</span>
                  <input
                    type="number"
                    value={opFormTimeLimit}
                    onChange={(e) => setOpFormTimeLimit(e.target.value)}
                    placeholder="e.g. 60 (Minutes, 0 means unrestricted)"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 justify-end border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => { setActiveTabSub("list"); setEditingOpId(null); }}
                className="px-5 py-2.5 text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 rounded-xl text-slate-950 transition-colors cursor-pointer shadow-lg"
              >
                {editingOpId ? "Update Configurations" : "Confirm Operator Provisioning"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
