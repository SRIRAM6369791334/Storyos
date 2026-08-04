export interface CreateUniverseCommand {
  universeId?: string;
  organizationId: string;
  title: string;
  createdBy: string;
  synopsis?: string;
  genre?: string[];
  primaryMedium?: string;
  targetAudience?: string;
  maturityRating?: string;
}

export interface UniverseDTO {
  universeId: string;
  organizationId: string;
  title: string;
  status: string;
  createdBy: string;
  createdAt: string;
  synopsis?: string;
  genre: string[];
  primaryMedium?: string;
  targetAudience?: string;
  maturityRating?: string;
  linkedUniverseIds: string[];
  archivedAt?: string;
  archivedBy?: string;
}
