import {
  EnvironmentBundle,
  ExperienceMode,
  RecommendationCard,
  RegulationRule,
  SpeciesProfile,
  SpotProfile,
} from '../types';

const round = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

function getTimeBucket(hour: number) {
  if (hour >= 4 && hour < 8) return 'dawn';
  if (hour >= 17 && hour < 20) return 'sunset';
  if (hour >= 20 || hour < 4) return 'night';
  return 'day';
}

function getSpeciesScore(species: SpeciesProfile, spot: SpotProfile, env: EnvironmentBundle, mode: ExperienceMode) {
  const month = new Date(env.weather.time).getMonth() + 1;
  const hour = new Date(env.weather.time).getHours();
  const tempMid = (species.preferredTempMin + species.preferredTempMax) / 2;
  const tempDelta = Math.abs(env.weather.temperature - tempMid);
  const tempScore = round(100 - tempDelta * 12);
  const habitatHits = species.preferredHabitatTags.filter((tag) => spot.habitatTags.includes(tag)).length;
  const habitatScore = round((habitatHits / species.preferredHabitatTags.length) * 100);
  const tideScore = species.preferredTideStages.includes(env.tide.state) ? 92 : 58;
  const moonScore = species.preferredLunarPhases.includes(env.moon.phaseName) ? 88 : 66;
  const seasonalScore = species.seasonalityMonths.includes(month) ? 92 : 52;
  const timeScore = species.preferredTimeWindows.includes(getTimeBucket(hour)) ? 90 : 64;
  const beginnerPenalty = mode === 'beginner' ? (100 - species.noviceFriendlinessScore) * 0.25 : 0;

  return round(
    tempScore * 0.26 +
      habitatScore * 0.22 +
      tideScore * 0.18 +
      moonScore * 0.08 +
      seasonalScore * 0.16 +
      timeScore * 0.1 -
      beginnerPenalty,
  );
}

function getSafetyGate(spot: SpotProfile, env: EnvironmentBundle, mode: ExperienceMode) {
  const hardStop = env.notices.some((notice) => notice.isHardStop);
  if (hardStop) return 0;
  if (mode === 'beginner' && spot.hazardTags.includes('rock-platform') && env.weather.windSpeed >= 24) return 0.35;
  if (env.weather.windSpeed >= 32) return 0.35;
  if (env.weather.windSpeed >= 24 || env.weather.weatherCode >= 95) return 0.65;
  if (spot.hazardTags.includes('swell-exposed') && env.weather.windSpeed >= 20) return 0.65;
  return 1;
}

function getLegalityGate(speciesList: SpeciesProfile[], regulations: RegulationRule[], month: number) {
  const blocked = speciesList.some((species) => {
    const rule = regulations.find((entry) => entry.speciesId === species.id);
    return rule?.closedMonths?.includes(month) || species.closedMonths?.includes(month);
  });
  return blocked ? 0 : 1;
}

function getConfidenceGate(spot: SpotProfile, env: EnvironmentBundle) {
  let confidence = 0.82;
  if (spot.waterBodyType !== 'saltwater') confidence += 0.04;
  if (env.hourlyForecast.length >= 12) confidence += 0.04;
  if (env.weather.precipitation === undefined) confidence -= 0.02;
  if (spot.status === 'limited') confidence -= 0.04;
  return Math.max(0.6, Math.min(1, confidence));
}

function getObservationScore(spot: SpotProfile) {
  return round(100 - spot.userDensityScore * 0.35 + (spot.parking ? 8 : 0) - spot.walkMinutes * 1.5);
}

function getPreferenceScore(spot: SpotProfile, userLat: number, userLon: number) {
  const distance = distanceKm(userLat, userLon, spot.latitude, spot.longitude);
  return round(100 - Math.min(distance, 80) * 1.1);
}

function buildRegulationNotes(speciesList: SpeciesProfile[], regulations: RegulationRule[]) {
  return speciesList.map((species) => {
    const rule = regulations.find((entry) => entry.speciesId === species.id);
    const size = rule?.minSize ? `最小尺寸 ${rule.minSize}cm` : '查看最新尺寸规则';
    const bag = rule?.bagLimit ? `袋数 ${rule.bagLimit}` : '袋数依官方公告';
    return `${species.commonName}: ${size} / ${bag}`;
  });
}

function buildWarnings(spot: SpotProfile, env: EnvironmentBundle, mode: ExperienceMode) {
  const warnings = env.notices.map((notice) => notice.title);
  if (spot.hazardTags.includes('rock-platform')) warnings.push(mode === 'beginner' ? '新手不建议独自上礁' : '礁台湿滑，注意退路');
  if (spot.walkMinutes >= 10) warnings.push('步行距离偏长，带轻装更合适');
  return warnings.slice(0, 3);
}

function buildSummary(flow: 'spot-first' | 'species-first', spot: SpotProfile, speciesList: SpeciesProfile[]) {
  if (flow === 'species-first') {
    return `${spot.name} 更像 ${speciesList[0].commonName} 今天的窗口，理由是栖息地与潮位对得上。`;
  }
  return `${spot.name} 适合先去执行，核心强项是可达性、潮位窗口和新手友好度比较均衡。`;
}

function buildReasons(flow: 'spot-first' | 'species-first', spot: SpotProfile, env: EnvironmentBundle, speciesList: SpeciesProfile[], mode: ExperienceMode) {
  const reasons = [
    `${env.tide.state === 'rising' ? '涨潮推进' : '潮位转换'}更利于 ${speciesList.map((item) => item.commonName.split(' ')[0]).join(' / ')} 靠近结构边。`,
    `${spot.habitatTags.slice(0, 3).join(' + ')} 这类地形，和候选鱼种的栖息偏好匹配度较高。`,
    mode === 'beginner' ? '这个点位停车、步行和手机信号都比较友好，执行成本低。' : '这里更适合做对比复盘，环境变化能直接映射到鱼种窗口。',
  ];
  if (flow === 'species-first') reasons[2] = `建议优先用 ${speciesList[0].techniques[0]}，把时间压在 ${speciesList[0].preferredTimeWindows[0]} 时段。`;
  return reasons;
}

function buildGearPlan(speciesList: SpeciesProfile[]) {
  const species = speciesList[0];
  return [
    `主打法: ${species.techniques[0]}`,
    `核心饵料: ${species.baits[0]}`,
    `建议水层: ${species.depthAdvice}`,
  ];
}

export function buildRecommendations({
  flow,
  mode,
  selectedSpeciesId,
  userLat,
  userLon,
  env,
  spots,
  species,
  regulations,
}: {
  flow: 'spot-first' | 'species-first';
  mode: ExperienceMode;
  selectedSpeciesId?: string;
  userLat: number;
  userLon: number;
  env: EnvironmentBundle;
  spots: SpotProfile[];
  species: SpeciesProfile[];
  regulations: RegulationRule[];
}) {
  const month = new Date(env.weather.time).getMonth() + 1;
  const relevantSpecies =
    flow === 'species-first' && selectedSpeciesId
      ? species.filter((entry) => entry.id === selectedSpeciesId)
      : species
          .filter((entry) => mode === 'advanced' || entry.noviceFriendlinessScore >= 65)
          .slice(0, 5);

  return spots
    .map((spot) => {
      const sortedSpecies = [...relevantSpecies]
        .map((entry) => ({ entry, score: getSpeciesScore(entry, spot, env, mode) }))
        .sort((a, b) => b.score - a.score);

      const topSpecies = sortedSpecies.slice(0, flow === 'species-first' ? 1 : 3).map((item) => item.entry);
      const bitePotential =
        flow === 'species-first'
          ? sortedSpecies[0]?.score ?? 0
          : round((sortedSpecies[0]?.score ?? 0) * 0.6 + ((sortedSpecies[1]?.score ?? 0) + (sortedSpecies[2]?.score ?? 0)) * 0.2);
      const habitatFit = round((spot.accessibilityScore + topSpecies[0].noviceFriendlinessScore) / 2);
      const tideWindow = env.tide.state === 'rising' || env.tide.state === 'high' ? 84 : 68;
      const comfort = round(100 - env.weather.windSpeed * 1.6 - (env.weather.isRaining ? 12 : 0));
      const seasonality = round(topSpecies.reduce((sum, item) => sum + (item.seasonalityMonths.includes(month) ? 86 : 58), 0) / topSpecies.length);
      const changeSignal = round(74 - ((env.hourlyForecast[0]?.precipitationProbability ?? 20) * 0.2));
      const observation = getObservationScore(spot);
      const preference = getPreferenceScore(spot, userLat, userLon);
      const safetyGate = getSafetyGate(spot, env, mode);
      const legalityGate = getLegalityGate(topSpecies, regulations, month);
      const confidenceGate = getConfidenceGate(spot, env);
      const weightedScore = round(
        bitePotential * (flow === 'species-first' ? 0.35 : 0.3) +
          habitatFit * (flow === 'species-first' ? 0.2 : 0.18) +
          tideWindow * 0.15 +
          comfort * (flow === 'species-first' ? 0.1 : 0.15) +
          seasonality * 0.1 +
          changeSignal * 0.05 +
          observation * (flow === 'species-first' ? 0.05 : 0.04) +
          preference * (flow === 'species-first' ? 0 : 0.03),
      );
      const score = round(weightedScore * safetyGate * legalityGate * confidenceGate);
      const confidenceLabel = confidenceGate >= 0.86 ? '高' : confidenceGate >= 0.76 ? '中' : '低';

      const recommendation: RecommendationCard = {
        id: `${flow}-${spot.id}-${topSpecies.map((item) => item.id).join('-')}`,
        flow,
        spot,
        primarySpecies: topSpecies,
        score,
        weightedScore,
        confidenceGate,
        safetyGate,
        legalityGate,
        confidenceLabel,
        bestWindow: topSpecies[0]?.preferredTimeWindows?.[0] === 'dawn' ? '05:30-08:00' : topSpecies[0]?.preferredTimeWindows?.[0] === 'sunset' ? '16:30-19:00' : '未来 24 小时看潮窗',
        summary: buildSummary(flow, spot, topSpecies),
        reasons: buildReasons(flow, spot, env, topSpecies, mode),
        warnings: buildWarnings(spot, env, mode),
        regulationNotes: buildRegulationNotes(topSpecies, regulations),
        gearPlan: buildGearPlan(topSpecies),
        breakdown: {
          bitePotential,
          habitatFit,
          tideWindow,
          comfort,
          seasonality,
          changeSignal,
          observation,
          preference,
        },
      };

      return recommendation;
    })
    .sort((a, b) => b.score - a.score);
}
