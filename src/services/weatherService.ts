import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, TideData, MoonData, LocationData, HourlyForecast } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Fetch weather data using Open-Meteo API
 */
export async function fetchWeatherData(lat: number, lon: number): Promise<{ 
  current: WeatherData; 
  hourly: HourlyForecast[];
  tomorrow?: {
    avgTemp: number;
    maxWind: number;
    weatherCode: number;
    precipSum?: number;
    precipProb?: number;
  }
}> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&hourly=temperature_2m,weather_code,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=2`;
  
  const response = await fetch(url);
  const data = await response.json();
  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;

  const hourlyForecasts: HourlyForecast[] = hourly.time.map((time: string, index: number) => ({
    time,
    temperature: hourly.temperature_2m[index],
    weatherCode: hourly.weather_code[index],
    windSpeed: hourly.wind_speed_10m[index],
    precipitationProbability: hourly.precipitation_probability[index]
  }));

  return {
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      pressure: current.surface_pressure,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      isRaining: current.precipitation > 0,
      condition: current.precipitation > 0 ? 'Rainy' : 'Clear',
      weatherCode: current.weather_code,
      precipitation: current.precipitation,
    },
    hourly: hourlyForecasts,
    tomorrow: daily ? {
      avgTemp: (daily.temperature_2m_max[1] + daily.temperature_2m_min[1]) / 2,
      maxWind: daily.wind_speed_10m_max[1],
      weatherCode: daily.weather_code[1],
      precipSum: daily.precipitation_sum[1],
      precipProb: daily.precipitation_probability_max[1]
    } : undefined
  };
}

/**
 * Fetch marine/tide data using Open-Meteo Marine API
 */
export async function fetchMarineData(lat: number, lon: number, date: Date = new Date()): Promise<TideData> {
  // Simulating tide data for the demo since high-precision tide APIs are usually paid.
  const now = date.getTime();
  const cycle = 12.42; // M2 semi-diurnal tide cycle in hours

  const getTideAt = (t: number) => {
    const hoursSinceEpoch = t / 3600000;
    // Use a fixed epoch for consistent cycles across calls
    const phase = ((hoursSinceEpoch % cycle) / cycle) * Math.PI * 2;
    return Math.sin(phase) * 1.5 + 2; // 0.5m to 3.5m
  };

  const currentHeight = getTideAt(now);
  const h1Height = getTideAt(now + 360000); // 6 mins later to determine state
  const state = h1Height > currentHeight ? 'rising' : 'falling';

  // Generate 24h curve
  const hourlyHeights: { time: string; height: number }[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  for (let i = 0; i < 24; i++) {
    const t = startOfDay.getTime() + i * 3600000;
    hourlyHeights.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      height: parseFloat(getTideAt(t).toFixed(2))
    });
  }

  // Find next high/low
  let nextHigh = now;
  let nextLow = now;
  
  // Search forward up to 13h
  for (let i = 0; i < 13 * 60; i++) {
    const t = now + i * 60000;
    const h = getTideAt(t);
    const prevH = getTideAt(t - 60000);
    const nextH = getTideAt(t + 60000);
    if (h > prevH && h > nextH && nextHigh === now) nextHigh = t;
    if (h < prevH && h < nextH && nextLow === now) nextLow = t;
  }

  return {
    height: parseFloat(currentHeight.toFixed(2)),
    state: state as any,
    nextHighTide: new Date(nextHigh),
    nextLowTide: new Date(nextLow),
    tideProgress: (now % (cycle * 3600000)) / (cycle * 3600000),
    hourlyHeights,
    maxHeight: 3.5,
    minHeight: 0.5
  };
}

/**
 * Calculate moon phase
 */
export function getMoonData(date: Date): MoonData {
  // Simplified moon phase calculation
  const lp = 2551443; 
  const now = new Date(date.getTime());
  const newMoon = new Date(1970, 0, 7, 20, 35, 0);
  const phase = ((now.getTime() - newMoon.getTime()) / 1000) % lp;
  const phasePercent = phase / lp;

  let name = "";
  if (phasePercent < 0.05) name = "newMoon";
  else if (phasePercent < 0.25) name = "waxingCrescent";
  else if (phasePercent < 0.30) name = "firstQuarter";
  else if (phasePercent < 0.45) name = "waxingGibbous";
  else if (phasePercent < 0.55) name = "fullMoon";
  else if (phasePercent < 0.70) name = "waningGibbous";
  else if (phasePercent < 0.75) name = "lastQuarter";
  else name = "waningCrescent";

  // Solunar periods simulation
  const hour = date.getHours();
  const isMajor = (hour >= 11 && hour <= 13) || (hour >= 23 || hour <= 1);
  const isMinor = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);

  return {
    phase: phasePercent,
    phaseName: name,
    isMajorPeriod: isMajor,
    isMinorPeriod: isMinor,
  };
}

/**
 * Geocode a location name to coordinates using Google Maps grounding via Gemini
 */
export async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; name: string; country?: string; admin1?: string }[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the precise coordinates (latitude and longitude), city/suburb, and country for: "${query}". 
      Please prioritize results in Australia.
      Return only a JSON array of objects: [{"lat": number, "lon": number, "name": string, "country": string, "admin1": string}]. 
      Do not include any conversational text, only the JSON.`,
      config: {
        tools: [{ googleMaps: {} }],
        // Note: responseMimeType and responseSchema are NOT supported when using the googleMaps tool.
      }
    });

    const text = response.text || "[]";
    // Extract JSON array from potential markdown blocks or extra text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const results = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    
    if (Array.isArray(results) && results.length > 0) {
      // Filter for Australia if possible, or just return as is but prompt prioritized it
      return results;
    }
  } catch (error) {
    console.error('Google Maps Grounding error:', error);
  }

  // First, try Nominatim (OpenStreetMap) as a strong fallback, restricted to Australia
  const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=zh,en&countrycodes=au`;
  
  try {
    const response = await fetch(osmUrl, {
      headers: {
        // MUST NOT contain non-ISO-8859-1 characters (like Chinese) in headers
        'User-Agent': 'FishingForecastApp/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((result: any) => ({
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          name: result.display_name.split(',')[0] + (result.address?.suburb ? ` (${result.address.suburb})` : ''),
          country: result.address?.country,
          admin1: result.address?.state || result.address?.city
        }));
      }
    }
  } catch (error) {
    console.error('OSM Geocoding error:', error);
  }

  // Fallback to Open-Meteo for broader city-level search
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=zh&format=json`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results.map((result: any) => ({
        lat: result.latitude,
        lon: result.longitude,
        name: result.name,
        country: result.country,
        admin1: result.admin1
      }));
    }
    return [];
  } catch (error) {
    console.error('Open-Meteo Geocoding error:', error);
    return [];
  }
}
