import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Simple In-memory Cache for AI Analysis
// Key: string (stringify params), Value: { data: any, timestamp: number }
const analysisCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

app.use(express.json());

// API Key Load Balancing Logic
const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(',')
  .map(k => k.trim())
  .filter(k => k.length > 0);

let currentKeyIndex = 0;

function getAiClient() {
  if (apiKeys.length === 0) throw new Error("No GEMINI_API_KEY provided");
  
  const key = apiKeys[currentKeyIndex];
  console.log(`[AI] Using key index ${currentKeyIndex} (Total keys: ${apiKeys.length})`);
  
  // Rotate index for next call
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  
  return new GoogleGenAI({ apiKey: key });
}

// API Routes
app.post('/api/analyze', async (req, res) => {
  const { location, weather, tide, moon, hourlyForecast, isForecast, language } = req.body;
  
  // Create a stable cache key
  const cacheKey = `analyze_${location.latitude}_${location.longitude}_${isForecast}_${language}`;
  const now = Date.now();
  
  const cached = analysisCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`[Cache Hit] Serving analysis for: ${cacheKey}`);
    return res.json(cached.data);
  }

  const langInstruction = language === 'en' 
    ? 'Output perfectly in English.' 
    : '请完全使用中文进行分析。';

  let attempts = 0;
  const maxAttempts = Math.min(apiKeys.length, 3); // Retry at most 3 times or number of keys

  while (attempts < maxAttempts) {
    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [{
              text: `
                SYSTEM: 你是一位世界级的垂钓专家和水文生态学家。你的任务是根据提供的气象、潮汐、月相和地理位置数据，为钓鱼者提供深度分析。输出 JSON 格式。
                
                USER:
                ${isForecast ? '分析明日/未来鱼情' : '分析当前鱼情'}
                ${langInstruction}
                位置: ${location.latitude}, ${location.longitude}
                天气: ${JSON.stringify(weather)}
                潮汐: ${JSON.stringify(tide)}
                月相: ${JSON.stringify(moon)}
                未来12h预报: ${JSON.stringify(hourlyForecast.slice(0, 12))}
                生成一个包含 score, summary, recommendations[], bestTime, targetDepth, baitSuggestion, techniqueSuggestion, rodSuggestion, reelSuggestion, lineSuggestion, leaderSuggestion, tackleSuggestion, hourlyTrends[], speciesAnalysis{} 的 JSON。
              `
            }]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      // Cache the result
      analysisCache.set(cacheKey, { data, timestamp: now });
      
      return res.json(data);
    } catch (error: any) {
      attempts++;
      console.error(`[AI Effort ${attempts}] Error:`, error.message);
      
      // If it's a rate limit error (429), try the next key immediately
      if (error.message?.includes('429') && attempts < maxAttempts) {
        console.warn(`[AI] Key ${currentKeyIndex - 1} rate limited. Retrying with next key...`);
        continue;
      }
      
      // Otherwise, or if max attempts reached, return error
      if (attempts >= maxAttempts) {
        return res.status(500).json({ error: error.message });
      }
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched on port ${PORT}`);
  });
}

startServer();
