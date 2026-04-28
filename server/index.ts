import express from 'express';
import { geocodeLocation } from '../src/services/weatherService';
import { RecommendationFeedback, SearchLocationResult, TripRecord } from '../src/types';
import { buildRecommendationResponse, checkRules, getSafetyRegion, loadEnvironment } from './domain';
import {
  getDatabasePath,
  getSpeciesProfiles,
  getSpotProfiles,
  initializeDatabase,
  insertFeedback,
  insertTrip,
  listFeedback,
  listTrips,
} from './db';

const app = express();
const port = Number(process.env.PORT ?? 8787);
initializeDatabase();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/v1/locations/search', async (req, res) => {
  try {
    const query = String(req.query.q ?? '').trim();
    if (!query) {
      res.json([] satisfies SearchLocationResult[]);
      return;
    }
    const results = await geocodeLocation(query);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('Location search failed');
  }
});

app.get('/v1/environment', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const environment = await loadEnvironment(lat, lon);
    res.json(environment);
  } catch (error) {
    console.error(error);
    res.status(500).send('Environment lookup failed');
  }
});

app.get('/v1/species', (_req, res) => {
  res.json(getSpeciesProfiles());
});

app.get('/v1/spots', (_req, res) => {
  res.json(getSpotProfiles());
});

app.get('/v1/recommendations/spots', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const mode = (req.query.mode === 'advanced' ? 'advanced' : 'beginner') as 'beginner' | 'advanced';
    const name = req.query.name ? String(req.query.name) : undefined;
    const payload = await buildRecommendationResponse({ flow: 'spot-first', mode, lat, lon, name });
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).send('Spot recommendations failed');
  }
});

app.get('/v1/recommendations/species', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const mode = (req.query.mode === 'advanced' ? 'advanced' : 'beginner') as 'beginner' | 'advanced';
    const speciesId = String(req.query.species_id ?? '');
    const name = req.query.name ? String(req.query.name) : undefined;
    const payload = await buildRecommendationResponse({ flow: 'species-first', mode, lat, lon, name, speciesId });
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).send('Species recommendations failed');
  }
});

app.post('/v1/rules/check', (req, res) => {
  const { species_id: speciesId, spot_id: spotId } = req.body as { species_id: string; spot_id: string };
  res.json(checkRules(speciesId, spotId));
});

app.get('/v1/safety/region', (_req, res) => {
  res.json(getSafetyRegion());
});

app.get('/v1/trips', async (_req, res) => {
  res.json(listTrips());
});

app.post('/v1/trips', async (req, res) => {
  const input = req.body as Omit<TripRecord, 'id' | 'createdAt'>;
  const nextTrip = insertTrip(input);
  res.status(201).json(nextTrip);
});

app.get('/v1/feedback', async (_req, res) => {
  res.json(listFeedback());
});

app.post('/v1/feedback', async (req, res) => {
  const input = req.body as Omit<RecommendationFeedback, 'id' | 'createdAt'>;
  const nextFeedback = insertFeedback(input);
  res.status(201).json(nextFeedback);
});

app.listen(port, () => {
  console.log(`HookLogic API listening on http://localhost:${port} using SQLite at ${getDatabasePath()}`);
});
