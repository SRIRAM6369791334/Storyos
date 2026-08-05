"use client";

import { type UniverseDTO, apiClient } from "@/lib/api-client";
import type React from "react";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [universes, setUniverses] = useState<UniverseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Universe Form state
  const [title, setTitle] = useState("");
  const [orgId, setOrgId] = useState("org_default");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchUniverses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getUniverses();
        setUniverses(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchUniverses();
  }, []);

  const handleCreateUniverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError(null);
      await apiClient.createUniverse({
        title: title.trim(),
        organizationId: orgId.trim(),
        description: description.trim() || undefined,
        createdBy: "usr_web_demo",
      });
      setTitle("");
      setDescription("");
      const updated = await apiClient.getUniverses();
      setUniverses(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Story Universes</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage isolated story bounded contexts (Entities, Graph Relationships & Timeline Events).
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create Universe Form */}
      <section className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Create New Story Universe</h2>
        <form onSubmit={handleCreateUniverse} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Universe Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Arthurian Legend"
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Organization ID *
            </label>
            <input
              type="text"
              required
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="org_default"
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. High fantasy mythical world"
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-md text-sm transition disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Universe"}
            </button>
          </div>
        </form>
      </section>

      {/* Universes Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-200">Active Universes</h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading Universes...</div>
        ) : universes.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No Story Universes created yet. Use the form above to add your first Universe!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {universes.map((u) => (
              <a
                key={u.universeId}
                href={`/universes/${u.universeId}`}
                className="block bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl p-5 transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition">
                    {u.title}
                  </h3>
                  <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
                    {u.universeId}
                  </span>
                </div>
                {u.description && <p className="text-sm text-slate-400 mb-3">{u.description}</p>}
                <div className="text-xs text-slate-500 flex justify-between items-center pt-3 border-t border-slate-800">
                  <span>Org: {u.organizationId}</span>
                  <span>Created: {new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
