export type Language = 'zh' | 'en';
export type ExperienceMode = 'beginner' | 'advanced';
export type RecommendationFlow = 'spot-first' | 'species-first';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  postcode?: string;
}

export interface WeatherData {
  time: string;
  temperature: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  condition: string;
  isRaining: boolean;
  weatherCode: number;
  precipitation?: number;
}

export interface TideData {
  height: number;
  state: 'rising' | 'falling' | 'high' | 'low';
  nextHighTide: Date;
  nextLowTide: Date;
  tideProgress: number;
  hourlyHeights: { time: string; height: number }[];
  maxHeight: number;
  minHeight: number;
}

export interface MoonData {
  phase: number;
  phaseName: string;
  isMajorPeriod: boolean;
  isMinorPeriod: boolean;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  precipitationProbability?: number;
}

export interface SpeciesProfile {
  id: string;
  commonName: string;
  scientificName: string;
  waterBodyType: 'saltwater' | 'freshwater' | 'estuary';
  regions: string[];
  seasonalityMonths: number[];
  legalMinSize?: number;
  bagLimit?: number;
  closedMonths?: number[];
  preferredTempMin: number;
  preferredTempMax: number;
  preferredTideStages: TideData['state'][];
  preferredLunarPhases: string[];
  preferredTimeWindows: string[];
  preferredHabitatTags: string[];
  noviceFriendlinessScore: number;
  dataConfidence: number;
  techniques: string[];
  baits: string[];
  depthAdvice: string;
}

export interface SpotProfile {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  waterBodyType: 'saltwater' | 'freshwater' | 'estuary';
  shoreOrBoat: 'shore' | 'boat';
  accessibilityScore: number;
  parking: boolean;
  walkMinutes: number;
  cellCoverage: number;
  hazardTags: string[];
  habitatTags: string[];
  depthProfile: string;
  artificialReefNearby: boolean;
  fadNearby: boolean;
  marineParkZone: boolean;
  localGuideRegion: string;
  userDensityScore: number;
  status: 'open' | 'limited' | 'avoid';
}

export interface RegulationRule {
  speciesId: string;
  regionCode: string;
  minSize?: number;
  bagLimit?: number;
  closedMonths?: number[];
  gearConstraints?: string;
  sourceLabel: string;
}

export interface SafetyNotice {
  id: string;
  regionCode: string;
  noticeType: 'weather' | 'surf' | 'wind' | 'access';
  severity: 'low' | 'medium' | 'high';
  title: string;
  detail: string;
  isHardStop: boolean;
}

export interface UserObservation {
  baitfishSeen: boolean;
  birdActivity: boolean;
  waterClarity: 'clear' | 'mixed' | 'murky';
  weedDensity: 'low' | 'medium' | 'high';
  snagLevel: 'low' | 'medium' | 'high';
  crowdingLevel: 'low' | 'medium' | 'high';
  note: string;
}

export interface TripRecord {
  id: string;
  createdAt: string;
  spotId: string;
  intentSpeciesId?: string;
  mode: ExperienceMode;
  outcome: 'caught' | 'blank' | 'left-early';
  method: string;
  catchCount: number;
  note: string;
  privacyLevel: 'private' | 'water-only' | 'exact';
  observation: UserObservation;
}

export interface RecommendationFeedback {
  id: string;
  recommendationId: string;
  label: 'accurate' | 'okay' | 'missed';
  reasonTags: string[];
  createdAt: string;
}

export interface SearchLocationResult {
  lat: number;
  lon: number;
  name: string;
  country?: string;
  admin1?: string;
  postcode?: string;
}

export interface ScoreBreakdown {
  bitePotential: number;
  habitatFit: number;
  tideWindow: number;
  comfort: number;
  seasonality: number;
  changeSignal: number;
  observation: number;
  preference: number;
}

export interface RecommendationCard {
  id: string;
  flow: RecommendationFlow;
  spot: SpotProfile;
  primarySpecies: SpeciesProfile[];
  score: number;
  weightedScore: number;
  confidenceGate: number;
  safetyGate: number;
  legalityGate: number;
  confidenceLabel: string;
  bestWindow: string;
  summary: string;
  reasons: string[];
  warnings: string[];
  regulationNotes: string[];
  gearPlan: string[];
  breakdown: ScoreBreakdown;
}

export interface EnvironmentBundle {
  weather: WeatherData;
  tide: TideData;
  moon: MoonData;
  hourlyForecast: HourlyForecast[];
  notices: SafetyNotice[];
}

export interface FishingAnalysis {
  score: number;
  safetyScore?: number;
  subScores?: Record<string, number>;
  summary: string;
  why?: string[];
  recommendations: string[];
  bestTime: string;
  targetDepth: string;
  baitSuggestion: string;
  techniqueSuggestion: string;
  rodSuggestion?: string;
  reelSuggestion?: string;
  lineSuggestion?: string;
  leaderSuggestion?: string;
  tackleSuggestion?: string;
  hourlyTrends?: { time: string; score: number }[];
  speciesAnalysis: Record<string, any>;
}

export interface RuleCheckResult {
  legal: boolean;
  notes: string[];
}

export interface SafetyRegionResponse {
  regionCode: string;
  notices: SafetyNotice[];
}

export interface RecommendationsResponse {
  location: LocationData;
  locationName: string;
  environment: EnvironmentBundle;
  recommendations: RecommendationCard[];
}
