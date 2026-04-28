import { buildRecommendations } from '../src/lib/recommendationEngine';
import { fetchMarineData, fetchWeatherData, getMoonData } from '../src/services/weatherService';
import {
  EnvironmentBundle,
  ExperienceMode,
  LocationData,
  RecommendationFlow,
  RecommendationsResponse,
  RuleCheckResult,
  SafetyNotice,
  SafetyRegionResponse,
} from '../src/types';
import { getRegulationRules, getSpeciesProfiles, getSpotProfiles } from './db';

function buildSafetyNotices(weather: EnvironmentBundle['weather']): SafetyNotice[] {
  const notices: SafetyNotice[] = [];
  if (weather.windSpeed >= 30) {
    notices.push({
      id: 'high-wind',
      regionCode: 'NSW',
      noticeType: 'wind',
      severity: 'high',
      title: '强风窗口，不建议把它当稳妥出行日',
      detail: '风速已进入高风险区间，岸边和礁台执行性都会明显下降。',
      isHardStop: true,
    });
  } else if (weather.windSpeed >= 22) {
    notices.push({
      id: 'moderate-wind',
      regionCode: 'NSW',
      noticeType: 'wind',
      severity: 'medium',
      title: '风浪开始影响抛投和站位',
      detail: '建议优先找避风内湾、码头或河口边。',
      isHardStop: false,
    });
  }

  if (weather.weatherCode >= 95) {
    notices.push({
      id: 'storm',
      regionCode: 'NSW',
      noticeType: 'weather',
      severity: 'high',
      title: '雷暴风险，推荐暂停执行',
      detail: '这类天气不适合把推荐分数当作主要决策依据。',
      isHardStop: true,
    });
  } else if (weather.isRaining) {
    notices.push({
      id: 'rain',
      regionCode: 'NSW',
      noticeType: 'weather',
      severity: 'medium',
      title: '降雨会影响岸边舒适度与能见度',
      detail: '河口和淡水点位可以关注入水变化，但执行前先看安全。',
      isHardStop: false,
    });
  }

  return notices;
}

export async function loadEnvironment(lat: number, lon: number): Promise<EnvironmentBundle> {
  const [weatherResponse, tide] = await Promise.all([fetchWeatherData(lat, lon), fetchMarineData(lat, lon)]);
  const moon = getMoonData(new Date(weatherResponse.current.time));
  return {
    weather: weatherResponse.current,
    tide,
    moon,
    hourlyForecast: weatherResponse.hourly,
    notices: buildSafetyNotices(weatherResponse.current),
  };
}

export async function buildRecommendationResponse(params: {
  flow: RecommendationFlow;
  mode: ExperienceMode;
  lat: number;
  lon: number;
  name?: string;
  speciesId?: string;
}): Promise<RecommendationsResponse> {
  const environment = await loadEnvironment(params.lat, params.lon);
  const location: LocationData = {
    latitude: params.lat,
    longitude: params.lon,
    city: params.name,
  };

  const recommendations = buildRecommendations({
    flow: params.flow,
    mode: params.mode,
    selectedSpeciesId: params.speciesId,
    userLat: params.lat,
    userLon: params.lon,
    env: environment,
    spots: getSpotProfiles(),
    species: getSpeciesProfiles(),
    regulations: getRegulationRules(),
  });

  return {
    location,
    locationName: params.name ?? `${params.lat.toFixed(3)}, ${params.lon.toFixed(3)}`,
    environment,
    recommendations,
  };
}

export function checkRules(speciesId: string, spotId: string): RuleCheckResult {
  const spot = getSpotProfiles().find((entry) => entry.id === spotId);
  const species = getSpeciesProfiles().find((entry) => entry.id === speciesId);
  const rule = getRegulationRules().find((entry) => entry.speciesId === speciesId);
  const notes: string[] = [];

  if (!spot) notes.push('未找到点位');
  if (!species) notes.push('未找到鱼种');

  if (rule?.minSize) notes.push(`最小尺寸 ${rule.minSize}cm`);
  if (rule?.bagLimit) notes.push(`袋数限制 ${rule.bagLimit}`);
  if (spot?.marineParkZone) notes.push('该点位涉及 marine park，请复核现场标识与官方地图');

  return {
    legal: Boolean(spot && species),
    notes: notes.length ? notes : ['请以最新 NSW 官方规则为准'],
  };
}

export function getSafetyRegion(): SafetyRegionResponse {
  return {
    regionCode: 'NSW',
    notices: [],
  };
}
