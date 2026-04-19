export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
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
  tideProgress: number; // 0 to 1
  hourlyHeights: { time: string; height: number }[]; // 24h tide curve
  maxHeight: number;
  minHeight: number;
}

export interface MoonData {
  phase: number; // 0 to 1
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

export interface SpeciesSpecificAnalysis {
  score: number;
  summary: string;
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
}

export interface FishingAnalysis {
  score: number; // 0 to 100 (General)
  summary: string;
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
  hourlyTrends?: { time: string; score: number }[]; // 0-100 scores for upcoming hours
  speciesAnalysis: Record<string, SpeciesSpecificAnalysis>;
}
