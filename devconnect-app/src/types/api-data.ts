/**
 * TypeScript type definitions for the data API response
 * Generated from /api/data endpoint
 */

export interface Supporter {
  name: string;
  layerName: string;
  districtId: string | null;
  locationId: string | null;
  supporterId?: string;
  logo: string;
  description: string;
}

export interface POI {
  name: string;
  layerName: string;
  districtId: string | null;
  locationId: string | null;
  groupId: string | null;
  logo: string;
  description: string;
}

export interface District {
  name: string;
  layerName: string;
  backgroundColor?: string;
}

export interface Location {
  name: string;
  layerName: string;
}

export interface PoiGroup {
  name: string;
}

export interface PoiGroups {
  [key: string]: PoiGroup;
}

export interface Districts {
  [key: string]: District;
}

export interface Locations {
  [key: string]: Location;
}

export interface DataResponse {
  supporters: Record<string, Supporter>;
  pois: POI[];
  districts: Districts;
  locations: Locations;
  poiGroups: PoiGroups;
}

export interface ApiResponse {
  success: boolean;
  data: DataResponse;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details: string;
  timestamp: string;
}
