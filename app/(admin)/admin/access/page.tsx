"use client";

import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AdminUser {
  id: string;
  stanford_uid: string;
  email: string;
  display_name: string;
  status: "pending" | "approved" | "denied";
  approved_by: string | null;
  created_at: string;
}

export default function AccessManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/access-requests");
      if (!response.ok) return;
      const data = await response.json();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function updateStatus(stanfordUid: string, status: "approved" | "denied") {
    setUpdating(stanfordUid);
    try {
      await fetch("/api/admin/access-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stanford_uid: stanfordUid, status })
      });
      await fetchUsers();
    } finally {
      setUpdating(null);
    }
  }

  const pending = users.filter((u) => u.status === "pending");
  const approved = users.filter((u) => u.status === "approved");
  const denied = users.filter((u) => u.status === "denied");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--ink-soft)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Manage Admin Access</h1>
        <p className="body-copy mt-1">Approve or deny Stanford SSO access requests.</p>
      </div>

      {/* Pending requests */}
      {pending.length > 0 ? (
        <section className="panel p-5">
          <p className="eyebrow">Pending Requests</p>
          <div className="mt-3 space-y-3">
            {pending.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[rgba(244,185,66,0.3)] bg-[rgba(244,185,66,0.06)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--ink)] truncate">{user.display_name}</p>
                  <p className="text-xs text-[color:var(--ink-soft)] truncate">{user.email} &middot; {user.stanford_uid}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateStatus(user.stanford_uid, "approved")}
                    disabled={updating === user.stanford_uid}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(user.stanford_uid, "denied")}
                    disabled={updating === user.stanford_uid}
                    className="inline-flex items-center gap-1 rounded-full bg-[color:var(--crimson)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Approved admins */}
      <section className="panel p-5">
        <p className="eyebrow">Approved Admins</p>
        {approved.length === 0 ? (
          <p className="body-copy mt-2">No approved admins yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {approved.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--ink)] truncate">{user.display_name}</p>
                    <p className="text-xs text-[color:var(--ink-soft)] truncate">{user.stanford_uid} &middot; approved by {user.approved_by ?? "system"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Denied */}
      {denied.length > 0 ? (
        <section className="panel p-5">
          <p className="eyebrow">Denied</p>
          <div className="mt-3 space-y-2">
            {denied.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--ink-soft)] truncate">{user.display_name}</p>
                  <p className="text-xs text-[color:var(--ink-soft)] truncate">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateStatus(user.stanford_uid, "approved")}
                  disabled={updating === user.stanford_uid}
                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-medium text-[color:var(--ink)] transition hover:bg-white disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
