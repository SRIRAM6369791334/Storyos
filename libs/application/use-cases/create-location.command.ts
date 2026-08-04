export interface CreateLocationCommand {
  locationId?: string;
  universeId: string;
  parentLocationId?: string;
  name: string;
  locationType?: string;
  createdBy: string;
}

export interface LocationDTO {
  locationId: string;
  universeId: string;
  parentLocationId?: string;
  name: string;
  locationType: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}
