import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { regulationCatalog, speciesCatalog, spotCatalog } from '../src/data/catalog';
import { RecommendationFeedback, RegulationRule, SpeciesProfile, SpotProfile, TripRecord } from '../src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../runtime-data');
const dbPath = path.join(dataDir, 'hooklogic.sqlite');

mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function serialize(value: unknown) {
  return JSON.stringify(value);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  return JSON.parse(value) as T;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS species_profiles (
      id TEXT PRIMARY KEY,
      common_name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      water_body_type TEXT NOT NULL,
      regions_json TEXT NOT NULL,
      seasonality_months_json TEXT NOT NULL,
      legal_min_size REAL,
      bag_limit INTEGER,
      closed_months_json TEXT,
      preferred_temp_min REAL NOT NULL,
      preferred_temp_max REAL NOT NULL,
      preferred_tide_stages_json TEXT NOT NULL,
      preferred_lunar_phases_json TEXT NOT NULL,
      preferred_time_windows_json TEXT NOT NULL,
      preferred_habitat_tags_json TEXT NOT NULL,
      novice_friendliness_score REAL NOT NULL,
      data_confidence REAL NOT NULL,
      techniques_json TEXT NOT NULL,
      baits_json TEXT NOT NULL,
      depth_advice TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spot_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      water_body_type TEXT NOT NULL,
      shore_or_boat TEXT NOT NULL,
      accessibility_score REAL NOT NULL,
      parking INTEGER NOT NULL,
      walk_minutes INTEGER NOT NULL,
      cell_coverage REAL NOT NULL,
      hazard_tags_json TEXT NOT NULL,
      habitat_tags_json TEXT NOT NULL,
      depth_profile TEXT NOT NULL,
      artificial_reef_nearby INTEGER NOT NULL,
      fad_nearby INTEGER NOT NULL,
      marine_park_zone INTEGER NOT NULL,
      local_guide_region TEXT NOT NULL,
      user_density_score REAL NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS regulation_rules (
      species_id TEXT NOT NULL,
      region_code TEXT NOT NULL,
      min_size REAL,
      bag_limit INTEGER,
      closed_months_json TEXT,
      gear_constraints TEXT,
      source_label TEXT NOT NULL,
      PRIMARY KEY (species_id, region_code)
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      spot_id TEXT NOT NULL,
      intent_species_id TEXT,
      mode TEXT NOT NULL,
      outcome TEXT NOT NULL,
      method TEXT NOT NULL,
      catch_count INTEGER NOT NULL,
      note TEXT NOT NULL,
      privacy_level TEXT NOT NULL,
      observation_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      recommendation_id TEXT NOT NULL,
      label TEXT NOT NULL,
      reason_tags_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function seedSpecies() {
  const count = db.prepare('SELECT COUNT(*) as count FROM species_profiles').get() as { count: number };
  if (count.count > 0) return;

  const stmt = db.prepare(`
    INSERT INTO species_profiles (
      id, common_name, scientific_name, water_body_type, regions_json, seasonality_months_json,
      legal_min_size, bag_limit, closed_months_json, preferred_temp_min, preferred_temp_max,
      preferred_tide_stages_json, preferred_lunar_phases_json, preferred_time_windows_json,
      preferred_habitat_tags_json, novice_friendliness_score, data_confidence, techniques_json,
      baits_json, depth_advice
    ) VALUES (
      @id, @commonName, @scientificName, @waterBodyType, @regionsJson, @seasonalityMonthsJson,
      @legalMinSize, @bagLimit, @closedMonthsJson, @preferredTempMin, @preferredTempMax,
      @preferredTideStagesJson, @preferredLunarPhasesJson, @preferredTimeWindowsJson,
      @preferredHabitatTagsJson, @noviceFriendlinessScore, @dataConfidence, @techniquesJson,
      @baitsJson, @depthAdvice
    )
  `);

  const insertMany = db.transaction((rows: SpeciesProfile[]) => {
    for (const row of rows) {
      stmt.run({
        id: row.id,
        commonName: row.commonName,
        scientificName: row.scientificName,
        waterBodyType: row.waterBodyType,
        regionsJson: serialize(row.regions),
        seasonalityMonthsJson: serialize(row.seasonalityMonths),
        legalMinSize: row.legalMinSize ?? null,
        bagLimit: row.bagLimit ?? null,
        closedMonthsJson: row.closedMonths ? serialize(row.closedMonths) : null,
        preferredTempMin: row.preferredTempMin,
        preferredTempMax: row.preferredTempMax,
        preferredTideStagesJson: serialize(row.preferredTideStages),
        preferredLunarPhasesJson: serialize(row.preferredLunarPhases),
        preferredTimeWindowsJson: serialize(row.preferredTimeWindows),
        preferredHabitatTagsJson: serialize(row.preferredHabitatTags),
        noviceFriendlinessScore: row.noviceFriendlinessScore,
        dataConfidence: row.dataConfidence,
        techniquesJson: serialize(row.techniques),
        baitsJson: serialize(row.baits),
        depthAdvice: row.depthAdvice,
      });
    }
  });

  insertMany(speciesCatalog);
}

function seedSpots() {
  const count = db.prepare('SELECT COUNT(*) as count FROM spot_profiles').get() as { count: number };
  if (count.count > 0) return;

  const stmt = db.prepare(`
    INSERT INTO spot_profiles (
      id, name, region, latitude, longitude, water_body_type, shore_or_boat, accessibility_score,
      parking, walk_minutes, cell_coverage, hazard_tags_json, habitat_tags_json, depth_profile,
      artificial_reef_nearby, fad_nearby, marine_park_zone, local_guide_region, user_density_score, status
    ) VALUES (
      @id, @name, @region, @latitude, @longitude, @waterBodyType, @shoreOrBoat, @accessibilityScore,
      @parking, @walkMinutes, @cellCoverage, @hazardTagsJson, @habitatTagsJson, @depthProfile,
      @artificialReefNearby, @fadNearby, @marineParkZone, @localGuideRegion, @userDensityScore, @status
    )
  `);

  const insertMany = db.transaction((rows: SpotProfile[]) => {
    for (const row of rows) {
      stmt.run({
        id: row.id,
        name: row.name,
        region: row.region,
        latitude: row.latitude,
        longitude: row.longitude,
        waterBodyType: row.waterBodyType,
        shoreOrBoat: row.shoreOrBoat,
        accessibilityScore: row.accessibilityScore,
        parking: row.parking ? 1 : 0,
        walkMinutes: row.walkMinutes,
        cellCoverage: row.cellCoverage,
        hazardTagsJson: serialize(row.hazardTags),
        habitatTagsJson: serialize(row.habitatTags),
        depthProfile: row.depthProfile,
        artificialReefNearby: row.artificialReefNearby ? 1 : 0,
        fadNearby: row.fadNearby ? 1 : 0,
        marineParkZone: row.marineParkZone ? 1 : 0,
        localGuideRegion: row.localGuideRegion,
        userDensityScore: row.userDensityScore,
        status: row.status,
      });
    }
  });

  insertMany(spotCatalog);
}

function seedRules() {
  const count = db.prepare('SELECT COUNT(*) as count FROM regulation_rules').get() as { count: number };
  if (count.count > 0) return;

  const stmt = db.prepare(`
    INSERT INTO regulation_rules (
      species_id, region_code, min_size, bag_limit, closed_months_json, gear_constraints, source_label
    ) VALUES (
      @speciesId, @regionCode, @minSize, @bagLimit, @closedMonthsJson, @gearConstraints, @sourceLabel
    )
  `);

  const insertMany = db.transaction((rows: RegulationRule[]) => {
    for (const row of rows) {
      stmt.run({
        speciesId: row.speciesId,
        regionCode: row.regionCode,
        minSize: row.minSize ?? null,
        bagLimit: row.bagLimit ?? null,
        closedMonthsJson: row.closedMonths ? serialize(row.closedMonths) : null,
        gearConstraints: row.gearConstraints ?? null,
        sourceLabel: row.sourceLabel,
      });
    }
  });

  insertMany(regulationCatalog);
}

export function initializeDatabase() {
  createSchema();
  seedSpecies();
  seedSpots();
  seedRules();
}

export function getSpeciesProfiles(): SpeciesProfile[] {
  const rows = db.prepare('SELECT * FROM species_profiles ORDER BY common_name').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    waterBodyType: row.water_body_type,
    regions: parseJson(row.regions_json, []),
    seasonalityMonths: parseJson(row.seasonality_months_json, []),
    legalMinSize: row.legal_min_size ?? undefined,
    bagLimit: row.bag_limit ?? undefined,
    closedMonths: row.closed_months_json ? parseJson(row.closed_months_json, []) : undefined,
    preferredTempMin: row.preferred_temp_min,
    preferredTempMax: row.preferred_temp_max,
    preferredTideStages: parseJson(row.preferred_tide_stages_json, []),
    preferredLunarPhases: parseJson(row.preferred_lunar_phases_json, []),
    preferredTimeWindows: parseJson(row.preferred_time_windows_json, []),
    preferredHabitatTags: parseJson(row.preferred_habitat_tags_json, []),
    noviceFriendlinessScore: row.novice_friendliness_score,
    dataConfidence: row.data_confidence,
    techniques: parseJson(row.techniques_json, []),
    baits: parseJson(row.baits_json, []),
    depthAdvice: row.depth_advice,
  }));
}

export function getSpotProfiles(): SpotProfile[] {
  const rows = db.prepare('SELECT * FROM spot_profiles ORDER BY region, name').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    waterBodyType: row.water_body_type,
    shoreOrBoat: row.shore_or_boat,
    accessibilityScore: row.accessibility_score,
    parking: Boolean(row.parking),
    walkMinutes: row.walk_minutes,
    cellCoverage: row.cell_coverage,
    hazardTags: parseJson(row.hazard_tags_json, []),
    habitatTags: parseJson(row.habitat_tags_json, []),
    depthProfile: row.depth_profile,
    artificialReefNearby: Boolean(row.artificial_reef_nearby),
    fadNearby: Boolean(row.fad_nearby),
    marineParkZone: Boolean(row.marine_park_zone),
    localGuideRegion: row.local_guide_region,
    userDensityScore: row.user_density_score,
    status: row.status,
  }));
}

export function getRegulationRules(): RegulationRule[] {
  const rows = db.prepare('SELECT * FROM regulation_rules ORDER BY region_code, species_id').all() as any[];
  return rows.map((row) => ({
    speciesId: row.species_id,
    regionCode: row.region_code,
    minSize: row.min_size ?? undefined,
    bagLimit: row.bag_limit ?? undefined,
    closedMonths: row.closed_months_json ? parseJson(row.closed_months_json, []) : undefined,
    gearConstraints: row.gear_constraints ?? undefined,
    sourceLabel: row.source_label,
  }));
}

export function listTrips(): TripRecord[] {
  const rows = db.prepare('SELECT * FROM trips ORDER BY created_at DESC LIMIT 50').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    spotId: row.spot_id,
    intentSpeciesId: row.intent_species_id ?? undefined,
    mode: row.mode,
    outcome: row.outcome,
    method: row.method,
    catchCount: row.catch_count,
    note: row.note,
    privacyLevel: row.privacy_level,
    observation: parseJson(row.observation_json, {}),
  })) as TripRecord[];
}

export function insertTrip(input: Omit<TripRecord, 'id' | 'createdAt'>): TripRecord {
  const nextTrip: TripRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO trips (
      id, created_at, spot_id, intent_species_id, mode, outcome, method, catch_count, note, privacy_level, observation_json
    ) VALUES (
      @id, @createdAt, @spotId, @intentSpeciesId, @mode, @outcome, @method, @catchCount, @note, @privacyLevel, @observationJson
    )
  `).run({
    ...nextTrip,
    intentSpeciesId: nextTrip.intentSpeciesId ?? null,
    observationJson: serialize(nextTrip.observation),
  });

  return nextTrip;
}

export function listFeedback(): RecommendationFeedback[] {
  const rows = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 100').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    recommendationId: row.recommendation_id,
    label: row.label,
    reasonTags: parseJson(row.reason_tags_json, []),
    createdAt: row.created_at,
  })) as RecommendationFeedback[];
}

export function insertFeedback(input: Omit<RecommendationFeedback, 'id' | 'createdAt'>): RecommendationFeedback {
  const nextFeedback: RecommendationFeedback = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO feedback (
      id, recommendation_id, label, reason_tags_json, created_at
    ) VALUES (
      @id, @recommendationId, @label, @reasonTagsJson, @createdAt
    )
  `).run({
    id: nextFeedback.id,
    recommendationId: nextFeedback.recommendationId,
    label: nextFeedback.label,
    reasonTagsJson: serialize(nextFeedback.reasonTags),
    createdAt: nextFeedback.createdAt,
  });

  return nextFeedback;
}

export function getDatabasePath() {
  return dbPath;
}
