"use client";

import {
  type CharacterDTO,
  type EventDTO,
  type RelationshipDTO,
  apiClient,
} from "@/lib/api-client";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function CharacterDetailPage() {
  const params = useParams();
  const characterId = params.id as string;

  const [character, setCharacter] = useState<CharacterDTO | null>(null);
  const [relationships, setRelationships] = useState<RelationshipDTO[]>([]);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCharacterData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [cData, rData, eData] = await Promise.all([
          apiClient.getCharacterById(characterId),
          apiClient.getRelationshipsByCharacter(characterId),
          apiClient.getEventsByCharacter(characterId),
        ]);
        setCharacter(cData);
        setRelationships(rData);
        setEvents(eData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    if (characterId) {
      loadCharacterData();
    }
  }, [characterId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Character Profile...</div>;
  }

  if (!character) {
    return <div className="p-8 text-center text-rose-400">Character not found.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white">{character.primaryName}</h1>
            <span className="text-xs font-mono bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded border border-indigo-800">
              ID: {character.characterId}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {character.biography || "No biography recorded."}
          </p>
        </div>
        <a
          href={`/universes/${character.universeId}`}
          className="text-xs text-slate-400 hover:text-white transition"
        >
          ← Back to Universe
        </a>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Graph Relationships (Neo4j) */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-100">
            Graph Relationships ({relationships.length})
          </h2>

          <div className="space-y-3">
            {relationships.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No graph relationships connected to this character.
              </p>
            ) : (
              relationships.map((rel) => {
                const isSource = rel.sourceCharacterId === character.characterId;
                const otherCharId = isSource ? rel.targetCharacterId : rel.sourceCharacterId;
                return (
                  <div
                    key={rel.relationshipId}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-emerald-400 mr-2">
                        [{rel.relationshipType}]
                      </span>
                      <span className="text-xs text-slate-300">
                        {isSource ? `→ ${otherCharId}` : `← ${otherCharId}`}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      {rel.direction}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Timeline Events History */}
        <section className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Event History ({events.length})</h2>

          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No recorded events for this character.
              </p>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.eventId}
                  className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-300">{evt.title}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
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
