"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Expert {
  expertId: string;
  email: string | null;
  capacity: number;
  isAvailable: boolean;
  rrPosition: number;
  activeLoad: number;
}

export default function AdminExperts() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCapacity, setInviteCapacity] = useState(10);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/experts");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setExperts(json.experts ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async () => {
    setInviting(true);
    try {
      const res = await fetch("/api/admin/experts/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, capacity: inviteCapacity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteCapacity(10);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setInviting(false);
    }
  };

  const toggle = async (expert: Expert) => {
    try {
      const res = await fetch("/api/admin/experts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId: expert.expertId, isAvailable: !expert.isAvailable }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const setCapacity = async (expert: Expert, capacity: number) => {
    try {
      const res = await fetch("/api/admin/experts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId: expert.expertId, capacity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Service Experts</h1>
        <p className="text-sm text-muted-foreground">Invite experts by email and manage the round-robin pool.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Expert email</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="expert@example.com"
            className="border rounded px-3 py-2 text-sm w-72 bg-transparent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Capacity</label>
          <input
            type="number"
            min={1}
            value={inviteCapacity}
            onChange={(e) => setInviteCapacity(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm w-24 bg-transparent"
          />
        </div>
        <button
          onClick={invite}
          disabled={inviting || !inviteEmail}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {inviting ? "Inviting..." : "Invite expert"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading experts...</p>
      ) : experts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No experts yet. Invite the first one above.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Active load</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Available</th>
              </tr>
            </thead>
            <tbody>
              {experts.map((expert) => (
                <tr key={expert.expertId} className="border-b last:border-0">
                  <td className="px-4 py-3">{expert.email ?? expert.expertId}</td>
                  <td className="px-4 py-3">
                    <span className={expert.activeLoad >= expert.capacity ? "text-red-500 font-medium" : ""}>
                      {expert.activeLoad} / {expert.capacity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      defaultValue={expert.capacity}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value > 0 && value !== expert.capacity) setCapacity(expert, value);
                      }}
                      className="border rounded px-2 py-1 w-20 text-sm bg-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(expert)}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        expert.isAvailable
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {expert.isAvailable ? "Available" : "Paused"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

