import { GoogleGenAI } from "@google/genai";
import { WeatherData, TideData, MoonData, FishingAnalysis, LocationData, HourlyForecast } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `你是一位世界级的垂钓专家和水文生态学家。你的任务是根据提供的气象、潮汐、月相和地理位置数据，结合《综合水文生态学视家的鱼类活动节律与摄食活跃度多维预测模型研究报告》中的逻辑，为钓鱼者提供深度分析。

请输出 JSON 格式的分析结果，包含一个通用的分析字段以及针对特定鱼种的详细分析字典。

JSON 结构要求：
{
  "score": number, // 通用鱼情得分
  "summary": string, // 通用核心研判
  "recommendations": string[], // 通用建议
  "bestTime": string, // 通用最佳时段
  "targetDepth": string,
  "baitSuggestion": string,
  "techniqueSuggestion": string,
  "hourlyTrends": [{"time": "HH:00", "score": number}], // 通用趋势，必须严格对应下文中提供的未来12小时具体时间点
  "speciesAnalysis": {
    "真鲷(Snapper)": { ...同上述字段结构 },
    "黑鲷(Black Bream)": { ...同上述字段结构 },
    "扁头鱼(Flathead)": { ...同上述字段结构 },
    "澳洲三文鱼(Australian Salmon)": { ...同上述字段结构 },
    "鱿鱼(Squid)": { ...同上述字段结构 },
    "青甘鱼(Kingfish)": { ...同上述字段结构 },
    "黄尾鱼(Yakka)": { ...同上述字段结构 },
    "多齿蛇鲻(Lizardfish)": { ...同上述字段结构 },
    "银鲈(Silver Trevally)": { ...同上述字段结构 },
    "笛鲷(Mangrove Jack)": { ...同上述字段结构 },
    "尖吻鲈(Barramundi)": { ...同上述字段结构 }
  }
}

在具体鱼种分析中，请务必结合该鱼种的习性（如栖息水深、喜好饵料、活跃温度、在该地点该潮汐下的活动规律）给出建议。
重要：hourlyTrends 中的 "time" 必须严格使用下文 prompt 中 "未来12小时天气预报" 列表里提供的原始时间点（HH:00 格式），确保 X 轴时间与实时天气预报完全同步。`;

export async function analyzeFishingConditions(
  location: LocationData,
  weather: WeatherData,
  tide: TideData,
  moon: MoonData,
  hourlyWeather: HourlyForecast[] = [],
  isForecast: boolean = false
): Promise<FishingAnalysis> {
  const currentHour = new Date().getHours();
  const next12Hours = hourlyWeather.slice(0, 12).map(h => ({
    time: h.time.split('T')[1].substring(0, 5),
    temp: h.temperature,
    wind: h.windSpeed,
    precip: h.precipitationProbability
  }));

  const prompt = `
    ${isForecast ? '【预测模式：分析明日/未来鱼情】' : '【实时模式：分析当前鱼情】'}
    当前位置: ${location.city || '未知'} (纬度: ${location.latitude}, 经度: ${location.longitude})
    实时气象: 温度 ${weather.temperature}°C, 气压 ${weather.pressure} hPa, 风速 ${weather.windSpeed} km/h, 风向 ${weather.windDirection}°, 天气 ${weather.condition}
    潮汐数据: 状态 ${tide.state}, 潮汐进度 ${Math.round(tide.tideProgress * 100)}%
    月相数据: ${moon.phaseName}
    
    未来12小时天气预报:
    ${JSON.stringify(next12Hours)}
    
    请根据以上数据，一次性生成“通用”以及以下鱼种的深度定制分析：
    “真鲷(Snapper)”、“黑鲷(Black Bream)”、“扁头鱼(Flathead)”、“澳洲三文鱼(Australian Salmon)”、“鱿鱼(Squid)”、“青甘鱼(Kingfish)”、“黄尾鱼(Yakka)”、“多齿蛇鲻(Lizardfish)”、“银鲈(Silver Trevally)”、“笛鲷(Mangrove Jack)”、“尖吻鲈(Barramundi)”。
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [SYSTEM_PROMPT, prompt],
      config: { responseMimeType: "application/json" }
    });
    const aiText = result.text;
    const parsed = JSON.parse(aiText) as FishingAnalysis;
    
    // Force hourlyTrends times to match source weather forecast times for consistency
    if (parsed.hourlyTrends && next12Hours.length > 0) {
      parsed.hourlyTrends = parsed.hourlyTrends.slice(0, next12Hours.length).map((item, idx) => ({
        ...item,
        time: next12Hours[idx].time
      }));
    }
    
    // Do the same for species analysis
    if (parsed.speciesAnalysis) {
      Object.keys(parsed.speciesAnalysis).forEach(species => {
        const sa = parsed.speciesAnalysis[species];
        if (sa.hourlyTrends && next12Hours.length > 0) {
          sa.hourlyTrends = sa.hourlyTrends.slice(0, next12Hours.length).map((item, idx) => ({
            ...item,
            time: next12Hours[idx].time
          }));
        }
      });
    }

    return parsed;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      score: 50,
      summary: "无法获取 AI 深度分析，请参考基础数据。",
      recommendations: ["注意安全", "观察水面活动", "尝试不同深度"],
      bestTime: "未知",
      targetDepth: "中层",
      baitSuggestion: "通用饵料",
      techniqueSuggestion: "通用钓法",
      speciesAnalysis: {}
    };
  }
}
