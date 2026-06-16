"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useFinancialData } from "@/lib/useFinancialData";
import { usePlan } from "@/lib/usePlan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { User, Bell, Shield, Link2, Download, Check } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-[#ffffff1a]"}`}
      style={{ height: 22 }}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#16120f] shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { plan } = usePlan();
  const { accounts } = useFinancialData();
  const institutions = Array.from(new Set(accounts.map((a) => a.institution)));
  const DEFAULT_PREFS = {
    emailDigest: true,
    budgetAlerts: true,
    largeTxnAlerts: true,
    aiInsights: true,
    dataSharing: false,
  };
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved preferences from the user's profile
  useEffect(() => {
    const stored = user?.publicMetadata?.preferences as Partial<typeof DEFAULT_PREFS> | undefined;
    if (stored) setPrefs({ ...DEFAULT_PREFS, ...stored });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (res.ok) {
        await user?.reload();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Settings</h1>
        <p className="text-sm text-stone-400">Manage your account, notifications, and privacy</p>
      </div>

      {/* Profile */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {user?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-lg font-bold">
                {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") || "?"}
              </div>
            )}
            <div>
              <p className="font-semibold text-stone-100">{user?.fullName ?? "—"}</p>
              <p className="text-sm text-stone-400">{user?.primaryEmailAddress?.emailAddress ?? "—"}</p>
              <Badge variant={plan === "FREE" ? "muted" : "success"} className="mt-1 text-xs">{plan} plan</Badge>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => openUserProfile()}>Edit profile</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Full name</label>
              <input readOnly value={user?.fullName ?? ""} className="w-full text-sm border border-[#ffffff14] rounded-lg px-3 py-2 bg-[#ffffff08] text-stone-400" title="Managed via Edit profile" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Email</label>
              <input readOnly value={user?.primaryEmailAddress?.emailAddress ?? ""} className="w-full text-sm border border-[#ffffff14] rounded-lg px-3 py-2 bg-[#ffffff08] text-stone-400" title="Managed via Edit profile" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Currency</label>
              <select defaultValue="USD" className="w-full text-sm border border-[#ffffff14] rounded-lg px-3 py-2 bg-[#16120f] focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Budget period</label>
              <select defaultValue="monthly" className="w-full text-sm border border-[#ffffff14] rounded-lg px-3 py-2 bg-[#16120f] focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: "emailDigest", label: "Weekly email digest", desc: "Summary of your spending and budget status" },
              { key: "budgetAlerts", label: "Budget alerts", desc: "Notify when a category exceeds 80% of budget" },
              { key: "largeTxnAlerts", label: "Large transaction alerts", desc: "Alert for transactions over $200" },
              { key: "aiInsights", label: "AI insights", desc: "Proactive tips based on your spending patterns" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-100">{label}</p>
                  <p className="text-xs text-stone-500">{desc}</p>
                </div>
                <Toggle checked={prefs[key as keyof typeof prefs]} onChange={() => toggle(key as keyof typeof prefs)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts */}
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Link2 className="w-4 h-4" /> Connected Accounts</CardTitle>
          <Button size="sm" variant="outline"><Link2 className="w-3.5 h-3.5" /> Add institution</Button>
        </CardHeader>
        <div>
          {institutions.map((inst, i) => (
            <div key={inst} className={`flex items-center gap-3 px-6 py-3.5 hover:bg-[#ffffff0a] transition-colors ${i < institutions.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-indigo-500 to-violet-600">
                {inst[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-100">{inst}</p>
                <p className="text-xs text-stone-500">{accounts.filter((a) => a.institution === inst).length} account(s) connected · via Plaid</p>
              </div>
              <Badge variant="success" className="text-xs">Active</Badge>
            </div>
          ))}
          {institutions.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-stone-500">No institutions connected yet.</div>
          )}
        </div>
      </Card>

      {/* Privacy & Security */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> Privacy & Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-100">Data sharing for improvements</p>
                <p className="text-xs text-stone-500">Share anonymized usage data to improve Finza</p>
              </div>
              <Toggle checked={prefs.dataSharing} onChange={() => toggle("dataSharing")} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[#ffffff0a] pt-4">
            <Button variant="outline" size="sm">
              <Download className="w-3.5 h-3.5" /> Export my data
            </Button>
            <Button variant="ghost" size="sm" className="text-stone-400" onClick={() => openUserProfile()}>Change password</Button>
            <Button variant="ghost" size="sm" className="text-stone-400" onClick={() => openUserProfile()}>Two-factor auth</Button>
            <Button variant="danger" size="sm" className="ml-auto">Delete account</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
