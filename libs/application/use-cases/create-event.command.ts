export interface CreateEventCommand {
  eventId?: string;
  universeId: string;
  title: string;
  description: string;
  locationId?: string;
  status?: string;
  participants?: Array<{ characterId: string; role?: string }>;
  createdBy: string;
}

export interface EventDTO {
  eventId: string;
  universeId: string;
  title: string;
  description: string;
  locationId?: string;
  status: string;
  participants: Array<{ characterId: string; role?: string }>;
  createdBy: string;
  createdAt: string;
}
