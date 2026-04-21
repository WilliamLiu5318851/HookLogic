import { GoogleGenAI } from "@google/genai";
import { WeatherData, TideData, MoonData, FishingAnalysis, LocationData, HourlyForecast } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const QUICK_SYSTEM_PROMPT = `你是一位世界级的垂钓快报专家。你的任务是根据气象、潮汐和地理数据，提供极速的鱼情概览。
请输出 JSON 格式：
{
  "score": number, // 通用得分
  "summary": string, // 一句话核心研判 (20字以内)
  "recommendations": string[], // 2条核心建议
  "bestTime": string, // 最佳时段
  "targetDepth": string, // 建议水深
  "baitSuggestion": string, // 核心建议饵料
  "techniqueSuggestion": string, // 核心钓法
  "hourlyTrends": [{"time": "HH:00", "score": number}],
  "speciesAnalysis": {
    "真鲷(Snapper)": { "score": number, "summary": "简短分析" },
    ...针对所有要求鱼种的极简分析
  }
}
保持输出精简，确保极速生成。`;

const DEEP_SYSTEM_PROMPT = `你是一位深度垂钓专家。针对特定鱼种，请结合提供的详细气象、潮汐、月相数据，给出“骨灰级”的实战分析。
请输出 JSON 格式：
{
  "score": number,
  "summary": string, 
  "recommendations": string[],
  "bestTime": string,
  "targetDepth": string,
  "baitSuggestion": string,
  "techniqueSuggestion": string,
  "rodSuggestion": string,
  "reelSuggestion": string,
  "lineSuggestion": string,
  "leaderSuggestion": string,
  "tackleSuggestion": string,
  "hourlyTrends": [{"time": "HH:00", "score": number}]
}
分析应包含：针对该地点的水文学特征、该鱼种在当前条件的活动规律、详尽的钓组规格建议。`;

const SPECIES_LIST = [
  "真鲷(Snapper)", "黑鲷(Black Bream)", "扁头鱼(Flathead)", "澳洲三文鱼(Australian Salmon)", 
  "鱿鱼(Squid)", "青甘鱼(Kingfish)", "黄尾鱼(Yakka)", "多齿蛇鲻(Lizardfish)", 
  "银鲈(Silver Trevally)", "笛鲷(Mangrove Jack)", "尖吻鲈(Barramundi)"
];

export async function fetchQuickAnalysis(
  location: LocationData,
  weather: WeatherData,
  tide: TideData,
  moon: MoonData,
  hourlyWeather: HourlyForecast[] = [],
  isForecast: boolean = false,
  language: 'zh' | 'en' = 'zh'
): Promise<FishingAnalysis> {
  const currentTimeStr = weather.time.slice(0, 13) + ":00";
  const startIndex = hourlyWeather.findIndex(h => h.time >= currentTimeStr);
  const relevantHourly = startIndex !== -1 ? hourlyWeather.slice(startIndex, startIndex + 12) : hourlyWeather.slice(0, 12);

  const next12Hours = relevantHourly.map(h => ({
    time: h.time.split('T')[1].substring(0, 5),
    temp: h.temperature,
    wind: h.windSpeed
  }));

  const prompt = `
    【极速模式】${language === 'en' ? 'Provide in English' : '中文输出'}
    位置: ${location.city || '未知'} lat:${location.latitude} lon:${location.longitude}
    天气: ${weather.temperature}°C, ${weather.pressure}hPa, ${weather.windSpeed}km/h, ${weather.condition}
    潮汐: ${tide.state}, ${Math.round(tide.tideProgress * 100)}%
    未来预报: ${JSON.stringify(next12Hours)}
    针对以下鱼种给出得分和简评: ${SPECIES_LIST.join(', ')}
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [QUICK_SYSTEM_PROMPT, prompt],
      config: { responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(result.text);
    
    if (parsed.hourlyTrends && next12Hours.length > 0) {
      parsed.hourlyTrends = parsed.hourlyTrends.slice(0, next12Hours.length).map((item: any, idx: number) => ({
        ...item,
        time: next12Hours[idx].time
      }));
    }
    return parsed;
  } catch (error) {
    console.error("Quick Analysis failed:", error);
    throw error;
  }
}

export async function fetchDeepAnalysis(
  species: string,
  location: LocationData,
  weather: WeatherData,
  tide: TideData,
  moon: MoonData,
  hourlyWeather: HourlyForecast[] = [],
  isForecast: boolean = false,
  language: 'zh' | 'en' = 'zh'
): Promise<any> {
  const currentTimeStr = weather.time.slice(0, 13) + ":00";
  const startIndex = hourlyWeather.findIndex(h => h.time >= currentTimeStr);
  const relevantHourly = startIndex !== -1 ? hourlyWeather.slice(startIndex, startIndex + 12) : hourlyWeather.slice(0, 12);

  const next12Hours = relevantHourly.map(h => ({
    time: h.time.split('T')[1].substring(0, 5),
    temp: h.temperature,
    wind: h.windSpeed,
    precip: h.precipitationProbability
  }));

  const prompt = `
    【深度模式】目标鱼种: ${species}
    语言: ${language === 'en' ? 'Strictly English' : '完全中文'}
    位置: ${location.city || '未知'}(${location.latitude}, ${location.longitude})
    实时气象: ${weather.temperature}°C, ${weather.pressure}hPa, ${weather.windSpeed}km/h, ${weather.condition}
    潮汐: ${tide.state}, 进度${Math.round(tide.tideProgress * 100)}%
    月相: ${moon.phaseName}(${Math.round(moon.phase * 100)}%)
    未来预报: ${JSON.stringify(next12Hours)}
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview", // 使用更高级的模型进行深度研判
      contents: [DEEP_SYSTEM_PROMPT, prompt],
      config: { responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(result.text);
    if (parsed.hourlyTrends && next12Hours.length > 0) {
      parsed.hourlyTrends = parsed.hourlyTrends.slice(0, next12Hours.length).map((item: any, idx: number) => ({
        ...item,
        time: next12Hours[idx].time
      }));
    }
    return parsed;
  } catch (error) {
    console.error("Deep Analysis failed:", error);
    throw error;
  }
}
