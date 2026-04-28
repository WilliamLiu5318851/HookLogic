import {
  RecommendationFeedback,
  RecommendationsResponse,
  RuleCheckResult,
  SafetyRegionResponse,
  SearchLocationResult,
  SpeciesProfile,
  TripRecord,
} from '../types';

const API_BASE = '/api';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function searchLocations(query: string) {
  return requestJson<SearchLocationResult[]>(`/v1/locations/search?q=${encodeURIComponent(query)}`);
}

export function fetchSpotRecommendations(params: {
  lat: number;
  lon: number;
  mode: 'beginner' | 'advanced';
  name?: string;
}) {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    mode: params.mode,
  });

  if (params.name) query.set('name', params.name);
  return requestJson<RecommendationsResponse>(`/v1/recommendations/spots?${query.toString()}`);
}

export function fetchSpeciesRecommendations(params: {
  lat: number;
  lon: number;
  mode: 'beginner' | 'advanced';
  speciesId: string;
  name?: string;
}) {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    mode: params.mode,
    species_id: params.speciesId,
  });

  if (params.name) query.set('name', params.name);
  return requestJson<RecommendationsResponse>(`/v1/recommendations/species?${query.toString()}`);
}

export function fetchSpeciesCatalog() {
  return requestJson<SpeciesProfile[]>('/v1/species');
}

export function fetchTrips() {
  return requestJson<TripRecord[]>('/v1/trips');
}

export function createTrip(input: Omit<TripRecord, 'id' | 'createdAt'>) {
  return requestJson<TripRecord>('/v1/trips', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchFeedback() {
  return requestJson<RecommendationFeedback[]>('/v1/feedback');
}

export function createFeedback(input: Omit<RecommendationFeedback, 'id' | 'createdAt'>) {
  return requestJson<RecommendationFeedback>('/v1/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function checkRules(speciesId: string, spotId: string) {
  return requestJson<RuleCheckResult>('/v1/rules/check', {
    method: 'POST',
    body: JSON.stringify({ species_id: speciesId, spot_id: spotId }),
  });
}

export function fetchSafetyRegion(lat: number, lon: number) {
  return requestJson<SafetyRegionResponse>(`/v1/safety/region?lat=${lat}&lon=${lon}`);
}
