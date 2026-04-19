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
  "rodSuggestion": string, // 鱼竿建议 (例如: 2.7m MH)
  "reelSuggestion": string, // 卷线器建议 (例如: 3000型)
  "lineSuggestion": string, // 主线建议 (例如: 1.5# PE)
  "leaderSuggestion": string, // 前导线建议 (例如: 4.0# 碳素)
  "tackleSuggestion": string, // 钓组配件建议 (例如: 子弹铅)
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
重要：对于“鱼竿/卷线器/线组”的建议，请根据目标鱼种的体型、拉力和作钓环境（如礁石区、沙滩等）给出专业规格。
重要：hourlyTrends 中的 "time" 必须严格使用下文 prompt 中 "未来12小时天气预报" 列表里提供的原始时间点（HH:00 格式），确保 X 轴时间与实时天气预报完全同步。`;

export async function analyzeFishingConditions(
  location: LocationData,
  weather: WeatherData,
  tide: TideData,
  moon: MoonData,
  hourlyWeather: HourlyForecast[] = [],
  isForecast: boolean = false,
  language: 'zh' | 'en' = 'zh'
): Promise<FishingAnalysis> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        weather,
        tide,
        moon,
        hourlyForecast: hourlyWeather,
        isForecast,
        language
      })
    });

    if (!response.ok) throw new Error('Backend analysis failed');
    
    const parsed = await response.json();
    return parsed;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      score: 50,
      summary: language === 'zh' ? "无法获取 AI 深度分析，请参考基础数据。" : "AI analysis unavailable. Please refer to basic data.",
      recommendations: language === 'zh' ? ["注意安全", "观察水面活动", "尝试不同深度"] : ["Stay safe", "Watch water surface", "Try different depths"],
      bestTime: language === 'zh' ? "未知" : "Unknown",
      targetDepth: language === 'zh' ? "中层" : "Mid-water",
      baitSuggestion: language === 'zh' ? "通用饵料" : "General Bait",
      techniqueSuggestion: language === 'zh' ? "通用钓法" : "Standard Technique",
      rodSuggestion: language === 'zh' ? "2.4m - 2.7m M/MH 调性路亚竿" : "2.4m - 2.7m M/MH Fast Action Rod",
      reelSuggestion: language === 'zh' ? "2500 - 3000 型纺车轮" : "2500 - 3000 Series Spinning Reel",
      lineSuggestion: language === 'zh' ? "1.2# - 1.5# PE 线" : "PE 1.2 - 1.5 Braided Line",
      leaderSuggestion: language === 'zh' ? "3.0# - 4.0# 碳素线" : "12lb - 16lb Fluorocarbon Leader",
      tackleSuggestion: language === 'zh' ? "加固别针 + 快速子弹铅" : "Power Snap + Bullet Sinker",
      speciesAnalysis: {}
    };
  }
}
