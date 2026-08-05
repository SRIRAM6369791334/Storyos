"use client";

import {
  type CharacterDTO,
  type EventDTO,
  type LocationDTO,
  type UniverseDTO,
  apiClient,
} from "@/lib/api-client";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

export default function UniverseDetailPage() {
  const params = useParams();
  const universeId = params.id as string;

  const [universe, setUniverse] = useState<UniverseDTO | null>(null);
  const [characters, setCharacters] = useState<CharacterDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms state
  // 1. Character Form
  const [charName, setCharName] = useState("");
  const [charBio, setCharBio] = useState("");
  const [creatingChar, setCreatingChar] = useState(false);

  // 2. Location Form
  const [locName, setLocName] = useState("");
  const [locType, setLocType] = useState("REGION");
  const [parentLocId, setParentLocId] = useState("");
  const [creatingLoc, setCreatingLoc] = useState(false);

  // 3. Relationship Form
  const [relSrcId, setRelSrcId] = useState("");
  const [relTgtId, setRelTgtId] = useState("");
  const [relType, setRelType] = useState("ALLY");
  const [relDirection, setRelDirection] = useState("DIRECTED");
  const [creatingRel, setCreatingRel] = useState(false);

  // 4. Event Form
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDesc, setEvtDesc] = useState("");
  const [evtLocId, setEvtLocId] = useState("");
  const [evtStatus, setEvtStatus] = useState("CANON");
  const [evtPartId, setEvtPartId] = useState("");
  const [creatingEvt, setCreatingEvt] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [uData, cData, lData, eData] = await Promise.all([
          apiClient.getUniverseById(universeId),
          apiClient.getCharactersByUniverse(universeId),
          apiClient.getLocationsByUniverse(universeId),
          apiClient.getEventsByUniverse(universeId),
        ]);
        setUniverse(uData);
        setCharacters(cData);
        setLocations(lData);
        setEvents(eData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (universeId) {
      loadAllData();
    }
  }, [universeId]);

  // Submit Handlers
  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim()) return;
    try {
      setCreatingChar(true);
      setError(null);
      await apiClient.createCharacter(universeId, {
        primaryName: charName.trim(),
        biography: charBio.trim() || undefined,
        createdBy: "usr_web_demo",
      });
      setCharName("");
      setCharBio("");
      const updatedChars = await apiClient.getCharactersByUniverse(universeId);
      setCharacters(updatedChars);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingChar(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;
    try {
      setCreatingLoc(true);
      setError(null);
      await apiClient.createLocation(universeId, {
        name: locName.trim(),
        locationType: locType,
        parentLocationId: parentLocId.trim() || undefined,
        createdBy: "usr_web_demo",
      });
      setLocName("");
      setParentLocId("");
      const updatedLocs = await apiClient.getLocationsByUniverse(universeId);
      setLocations(updatedLocs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingLoc(false);
    }
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relSrcId || !relTgtId || relSrcId === relTgtId) return;
    try {
      setCreatingRel(true);
      setError(null);
      await apiClient.createRelationship(universeId, {
        sourceCharacterId: relSrcId,
        targetCharacterId: relTgtId,
        relationshipType: relType,
        direction: relDirection,
        createdBy: "usr_web_demo",
      });
      alert(`Relationship '${relType}' established between characters!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingRel(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle.trim() || !evtDesc.trim()) return;
    try {
      setCreatingEvt(true);
      setError(null);
      await apiClient.createEvent(universeId, {
        title: evtTitle.trim(),
        description: evtDesc.trim(),
        locationId: evtLocId || undefined,
        status: evtStatus,
        participants: evtPartId ? [{ characterId: evtPartId, role: "PARTICIPANT" }] : [],
        createdBy: "usr_web_demo",
      });
      setEvtTitle("");
      setEvtDesc("");
      const updatedEvents = await apiClient.getEventsByUniverse(universeId);
      setEvents(updatedEvents);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingEvt(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Universe Data...</div>;
  }

  if (!universe) {
    return <div className="p-8 text-center text-rose-400">Universe not found.</div>;
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white">{universe.title}</h1>
            <span className="text-xs font-mono bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded border border-indigo-800">
              ID: {universe.universeId}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {universe.description || "No description provided."}
          </p>
        </div>
        <a href="/" className="text-xs text-slate-400 hover:text-white transition">
          ← Back to Universes
        </a>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Characters */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-100 flex items-center justify-between">
            <span>Characters ({characters.length})</span>
          </h2>

          <form
            onSubmit={handleAddCharacter}
            className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Add Character
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                required
                placeholder="Primary Name (e.g. King Arthur)"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
              />
              <input
                type="text"
                placeholder="Biography (Optional)"
                value={charBio}
                onChange={(e) => setCharBio(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={creatingChar}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded transition"
              >
                {creatingChar ? "Adding..." : "Add Character"}
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {characters.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No characters added yet.</p>
            ) : (
              characters.map((c) => (
                <a
                  key={c.characterId}
                  href={`/characters/${c.characterId}`}
                  className="block p-3 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 rounded-lg transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-indigo-300">{c.primaryName}</span>
                    <span className="text-[10px] font-mono text-slate-500">{c.characterId}</span>
                  </div>
                  {c.biography && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{c.biography}</p>
                  )}
                </a>
              ))
            )}
          </div>
        </section>

        {/* Section 2: Graph Relationships (Neo4j) */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-100">Graph Relationships (Neo4j)</h2>

          <form
            onSubmit={handleAddRelationship}
            className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Establish Relationship
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-[10px] uppercase text-slate-400">
                  Source Character
                </label>
                <select
                  value={relSrcId}
                  onChange={(e) => setRelSrcId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="">-- Select Source Character --</option>
                  {characters.map((c) => (
                    <option key={c.characterId} value={c.characterId}>
                      {c.primaryName} ({c.characterId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400">
                  Target Character
                </label>
                <select
                  value={relTgtId}
                  onChange={(e) => setRelTgtId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="">-- Select Target Character --</option>
                  {characters.map((c) => (
                    <option key={c.characterId} value={c.characterId}>
                      {c.primaryName} ({c.characterId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Type</label>
                  <select
                    value={relType}
                    onChange={(e) => setRelType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="ALLY">ALLY</option>
                    <option value="ENEMY">ENEMY</option>
                    <option value="RIVAL">RIVAL</option>
                    <option value="MENTOR">MENTOR</option>
                    <option value="FAMILY">FAMILY</option>
                    <option value="SPOUSE_OF">SPOUSE_OF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Direction</label>
                  <select
                    value={relDirection}
                    onChange={(e) => setRelDirection(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="DIRECTED">DIRECTED</option>
                    <option value="MUTUAL">MUTUAL</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingRel || !relSrcId || !relTgtId}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded transition disabled:opacity-50 mt-1"
              >
                {creatingRel ? "Saving to Neo4j..." : "Establish Cypher Relationship"}
              </button>
            </div>
          </form>
        </section>

        {/* Section 3: World Building Locations (Adjacency List Tree) */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-100">
            Locations Hierarchy ({locations.length})
          </h2>

          <form
            onSubmit={handleAddLocation}
            className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Add Location
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                required
                placeholder="Location Name (e.g. Camelot)"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Type</label>
                  <select
                    value={locType}
                    onChange={(e) => setLocType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="REGION">REGION</option>
                    <option value="CITY">CITY</option>
                    <option value="BUILDING">BUILDING</option>
                    <option value="ROOM">ROOM</option>
                    <option value="PLANET">PLANET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">
                    Parent Location
                  </label>
                  <select
                    value={parentLocId}
                    onChange={(e) => setParentLocId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="">-- None (Root) --</option>
                    {locations.map((l) => (
                      <option key={l.locationId} value={l.locationId}>
                        {l.name} ({l.locationType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={creatingLoc}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded transition"
              >
                {creatingLoc ? "Adding..." : "Add Location"}
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {locations.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No locations added yet.</p>
            ) : (
              locations.map((l) => (
                <a
                  key={l.locationId}
                  href={`/locations/${l.locationId}`}
                  className="block p-3 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 rounded-lg transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {l.locationType}
                      </span>
                      <span className="font-semibold text-sm text-indigo-300">{l.name}</span>
                    </div>
                    {l.parentLocationId && (
                      <span className="text-[10px] text-slate-500">
                        Parent: {l.parentLocationId}
                      </span>
                    )}
                  </div>
                </a>
              ))
            )}
          </div>
        </section>

        {/* Section 4: Timeline Events */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-100">Timeline Events ({events.length})</h2>

          <form
            onSubmit={handleAddEvent}
            className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Add Timeline Event
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                required
                placeholder="Event Title (e.g. Battle of Camlann)"
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
              />
              <textarea
                required
                placeholder="Event Description..."
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                rows={2}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Location</label>
                  <select
                    value={evtLocId}
                    onChange={(e) => setEvtLocId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="">-- Optional Location --</option>
                    {locations.map((l) => (
                      <option key={l.locationId} value={l.locationId}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Participant</label>
                  <select
                    value={evtPartId}
                    onChange={(e) => setEvtPartId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="">-- Optional Participant --</option>
                    {characters.map((c) => (
                      <option key={c.characterId} value={c.characterId}>
                        {c.primaryName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Status</label>
                  <select
                    value={evtStatus}
                    onChange={(e) => setEvtStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="CANON">CANON</option>
                    <option value="RUMORED">RUMORED</option>
                    <option value="DISPUTED">DISPUTED</option>
                    <option value="ERASED">ERASED</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={creatingEvt}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded transition"
              >
                {creatingEvt ? "Adding..." : "Add Event"}
              </button>
            </div>
          </form>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No timeline events recorded yet.
              </p>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.eventId}
                  className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-300">{evt.title}</span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                      {evt.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{evt.description}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
