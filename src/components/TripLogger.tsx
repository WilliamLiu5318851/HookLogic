import { TripRecord } from '../types';

const defaultObservation = {
  baitfishSeen: false,
  birdActivity: false,
  waterClarity: 'mixed' as const,
  weedDensity: 'medium' as const,
  snagLevel: 'medium' as const,
  crowdingLevel: 'medium' as const,
  note: '',
};

export function createEmptyTrip(): Omit<TripRecord, 'id' | 'createdAt'> {
  return {
    spotId: '',
    intentSpeciesId: undefined,
    mode: 'beginner',
    outcome: 'caught',
    method: '轻沉底',
    catchCount: 0,
    note: '',
    privacyLevel: 'water-only',
    observation: defaultObservation,
  };
}
