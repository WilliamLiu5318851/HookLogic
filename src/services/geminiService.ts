import { GoogleGenAI } from "@google/genai";
import { WeatherData, TideData, MoonData, FishingAnalysis, LocationData, HourlyForecast } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const QUICK_SYSTEM_PROMPT = `你是一位世界级的垂钓快报专家。你的任务是将环境因素转化为 0–100 的“捕食活跃度”评分 (Bite Score)。
你的研判逻辑基于：鱼是否在场 + 鱼是否舒服 + 食物是否集中 + 鱼是否容易捕食 + 风险是否低。
你必须严格参考以下 14 个维度的权重：鱼种特征、水温、潮汐、水流、天气、光照、月相、季节、水质、海况、饵鱼活跃度、钓点结构、人为压力、规制与安全。

请输出 JSON 格式：
{
  "score": number, // 0-100 Bite Score
  "safetyScore": number, // 0-100 安全评分
  "subScores": {
    "temperature": number, // 0-100
    "tide": number,
    "weather": number,
    "moon": number,
    "species": number,
    "safety": number,
    "habitat": number
  },
  "summary": string, // 一句话核心研判 (25字以内)
  "why": string[], // 3条核心原因分析 (例如: "涨潮带动饵鱼回流", "水温处于该鱼种黄金摄食区间")
  "recommendations": string[], // 2条核心建议
  "bestTime": string, // 最佳时段
  "targetDepth": string, // 建议水深
  "baitSuggestion": string, // 核心建议饵料
  "techniqueSuggestion": string, // 核心钓法
  "hourlyTrends": [{"time": "HH:00", "score": number}],
  "speciesAnalysis": {
    "真鲷(Snapper)": { 
      "score": number, 
      "summary": "简短分析", 
      "beginnerSuitability": number, // 0-100 新手友好度 (基于体型、拉力、钓获难度、危险程度)
      "safetyScore": number 
    },
    ...对所有要求鱼种的分析
  }
}
重要：针对“新手模式”，如果某鱼种安全分低于50或钓获难度极高，请在 beginnerSuitability 中体现低分。`;

const DEEP_SYSTEM_PROMPT = `你是一位垂钓 AI 专家。请根据 14 维度多向水文模型计算特定鱼种的捕食活跃度 (Bite Score)。
你不仅仅在分析“鱼情”，而是在预测“环境是否提高了鱼类的捕食概率”。
核心准则：Bite Score ≠ 安全评分。两项得分必须独立评估。

请输出 JSON 格式：
{
  "score": number, // Bite Score
  "safetyScore": number, // 安全评分
  "beginnerSuitability": number, // 0-100 新手友好度
  "subScores": {
    "temperature": number,
    "tide": number,
    "weather": number,
    "moon": number,
    "species": number,
    "safety": number,
    "habitat": number
  },
  "summary": string, 
  "why": string[], // 深度剖析 4-5 条数据支持的原因
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
在分析中需体现：
- 水温 24/72小时变化趋势对该鱼种的影响。
- 潮汐阶段 (Rising/Falling/Turning) 结合流道位置的研判。
- 基于季节律动的鱼种洄游/产卵周期。
- 针对当前海风、波浪高度对作钓安全的深度警告。`;

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
    return {
      score: 50,
      safetyScore: 70,
      subScores: {
        temperature: 50,
        tide: 50,
        weather: 50,
        moon: 50,
        species: 50,
        safety: 50,
        habitat: 50
      },
      summary: language === 'zh' ? "获取 AI 分析失败，请根据气象数据自行判断。" : "AI analysis unavailable. Please check weather data.",
      why: language === 'zh' ? ["无法连接 AI 服务", "请参考基础天气和潮汐"] : ["AI service unavailable", "Refer to basic environmental data"],
      recommendations: language === 'zh' ? ["注意安全", "观察水底结构"] : ["Stay safe", "Watch bottom structure"],
      bestTime: language === 'zh' ? "未知" : "Unknown",
      targetDepth: language === 'zh' ? "中层" : "Mid-water",
      baitSuggestion: language === 'zh' ? "通用饵料" : "General Bait",
      techniqueSuggestion: language === 'zh' ? "通用钓法" : "General Technique",
      hourlyTrends: next12Hours.map(h => ({ time: h.time, score: 50 })),
      speciesAnalysis: SPECIES_LIST.reduce((acc, s) => ({ ...acc, [s]: { score: 50, summary: "数据暂缺" } }), {})
    };
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
