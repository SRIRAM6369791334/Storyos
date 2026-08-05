export interface UniverseDTO {
  universeId: string;
  organizationId: string;
  title: string;
  description?: string | undefined;
  createdBy: string;
  createdAt: string;
}

export interface CharacterDTO {
  characterId: string;
  universeId: string;
  primaryName: string;
  biography?: string | undefined;
  createdBy: string;
  createdAt: string;
}

export interface LocationDTO {
  locationId: string;
  universeId: string;
  parentLocationId?: string | undefined;
  name: string;
  locationType: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}

export interface RelationshipDTO {
  relationshipId: string;
  universeId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationshipType: string;
  direction: string;
  status: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}

export interface EventParticipantDTO {
  characterId: string;
  role?: string | undefined;
}

export interface EventDTO {
  eventId: string;
  universeId: string;
  title: string;
  description: string;
  locationId?: string | undefined;
  status: string;
  participants: EventParticipantDTO[];
  createdBy: string;
  createdAt: string;
}

export interface ApiError {
  error: string;
  message: string;
  field?: string | undefined;
  rule?: string | undefined;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: "HTTP_ERROR",
        message: `HTTP request failed with status ${response.status} ${response.statusText}`,
      };
    }
    throw new Error(errorData.message || `API error ${response.status}`);
  }

  return response.json();
}

export const apiClient = {
  // Story Universe Endpoints
  getUniverses: (): Promise<UniverseDTO[]> => request<UniverseDTO[]>("/universes"),
  getUniverseById: (id: string): Promise<UniverseDTO> => request<UniverseDTO>(`/universes/${id}`),
  createUniverse: (data: {
    organizationId: string;
    title: string;
    description?: string | undefined;
    createdBy: string;
    universeId?: string | undefined;
  }): Promise<UniverseDTO> =>
    request<UniverseDTO>("/universes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Character Endpoints
  getCharactersByUniverse: (universeId: string): Promise<CharacterDTO[]> =>
    request<CharacterDTO[]>(`/universes/${universeId}/characters`),
  getCharacterById: (id: string): Promise<CharacterDTO> =>
    request<CharacterDTO>(`/characters/${id}`),
  createCharacter: (
    universeId: string,
    data: {
      primaryName: string;
      biography?: string | undefined;
      createdBy: string;
      characterId?: string | undefined;
    },
  ): Promise<CharacterDTO> =>
    request<CharacterDTO>(`/universes/${universeId}/characters`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Location Endpoints
  getLocationsByUniverse: (universeId: string): Promise<LocationDTO[]> =>
    request<LocationDTO[]>(`/universes/${universeId}/locations`),
  getLocationById: (id: string): Promise<LocationDTO> => request<LocationDTO>(`/locations/${id}`),
  getChildLocations: (id: string): Promise<LocationDTO[]> =>
    request<LocationDTO[]>(`/locations/${id}/children`),
  createLocation: (
    universeId: string,
    data: {
      name: string;
      locationType?: string | undefined;
      parentLocationId?: string | undefined;
      createdBy: string;
      locationId?: string | undefined;
    },
  ): Promise<LocationDTO> =>
    request<LocationDTO>(`/universes/${universeId}/locations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Relationship Endpoints
  getRelationshipsByCharacter: (characterId: string): Promise<RelationshipDTO[]> =>
    request<RelationshipDTO[]>(`/characters/${characterId}/relationships`),
  getRelationshipById: (id: string): Promise<RelationshipDTO> =>
    request<RelationshipDTO>(`/relationships/${id}`),
  createRelationship: (
    universeId: string,
    data: {
      sourceCharacterId: string;
      targetCharacterId: string;
      relationshipType: string;
      direction?: string | undefined;
      createdBy: string;
      relationshipId?: string | undefined;
    },
  ): Promise<RelationshipDTO> =>
    request<RelationshipDTO>(`/universes/${universeId}/relationships`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Timeline Event Endpoints
  getEventsByUniverse: (universeId: string): Promise<EventDTO[]> =>
    request<EventDTO[]>(`/universes/${universeId}/events`),
  getEventsByCharacter: (characterId: string): Promise<EventDTO[]> =>
    request<EventDTO[]>(`/characters/${characterId}/events`),
  getEventById: (id: string): Promise<EventDTO> => request<EventDTO>(`/events/${id}`),
  createEvent: (
    universeId: string,
    data: {
      title: string;
      description: string;
      locationId?: string | undefined;
      status?: string | undefined;
      participants?: Array<{ characterId: string; role?: string | undefined }> | undefined;
      createdBy: string;
      eventId?: string | undefined;
    },
  ): Promise<EventDTO> =>
    request<EventDTO>(`/universes/${universeId}/events`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
