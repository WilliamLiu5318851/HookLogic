export type Language = 'zh' | 'en';

export const i18n = {
  zh: {
    appName: 'HOOKLOGIC',
    appDesc: '捕食活跃度预测系统',
    realTimeUpdate: '实时更新',
    currentLocation: '当前作业坐标',
    searchPlaceholder: '搜索澳洲城市或钓点 (如: Sans Souci)...',
    auOnly: '仅限澳洲',
    selectLocation: '请选择精确位置',
    noLocation: '未找到该地点，请尝试输入更准确的名称。',
    analyzing: '正在研判鱼情...',
    analyzingDesc: '正在获取实时气象、潮汐与月相数据，并交由 AI 垂钓专家进行多维分析。',
    loadingAnalysis: '专家研判中...',
    loadingDescription: '正在调取澳大利亚水文气象数据，结合 AI 模型计算最佳钓点与鱼情，请稍候。',
    landing: {
      title: '科学钓鱼，数据决策',
      subtitle: '基于 14 维度水文生态模型的捕食活跃度预测系统',
      detectLocation: '自动定位当前钓点',
      search: '搜索',
      startPrompt: '输入钓点名称开启专业分析',
      popularSpots: '热门钓点推荐'
    },
    error: '出错了',
    retry: '重试',
    targetSpecies: '目标鱼种',
    userMode: '作业模式',
    modes: {
      beginner: {
        name: '新手模式',
        desc: '一键获取今日最适合鱼种与极速钓鱼建议'
      },
      intermediate: {
        name: '进阶模式',
        desc: '选择特定鱼种并查看详细模型研判数据'
      },
      expert: {
        name: '老手模式',
        desc: '全数据监控，包含 14 维度多向水文精算'
      }
    },
    todayLive: '今日实时',
    tomorrowForecast: '明日预测',
    fishingIndex: '捕食活跃度 (Bite Score)',
    safetyScore: '海况安全评分 (Safety)',
    beginnerSuitability: '新手友好度',
    whyTitle: '核心研判依据',
    subScores: {
      temperature: '水温适合度',
      tide: '潮汐/水流',
      weather: '天气稳定性',
      moon: '月相/光照',
      species: '鱼种季节性',
      safety: '海况安全',
      habitat: '钓点匹配度'
    },
    tomorrowMoon: '明日月相',
    moonPhase: '月相数据',
    illumination: '照明度',
    expertInsight: '💡 专家研判',
    weather: '实时天气',
    tomorrowWeather: '明日预报',
    temp: '温度',
    pressure: '气压',
    windSpeed: '风速',
    humidity: '湿度',
    precipProb: '降雨概率',
    hourlyForecast: '逐小时预报',
    next12h: '未来 12 小时',
    tomorrowHourly: '明日逐小时预报',
    tideStation: '潮汐实时站',
    tomorrowTide: '明日潮汐',
    rising: '涨潮中',
    falling: '退潮中',
    lowTide: '干潮',
    highTide: '满潮',
    recentHigh: '近期高潮',
    recentLow: '近期低潮',
    tideGraph: '潮汐图表',
    recommendations: '目标鱼种建议',
    tomorrowRecs: '明日目标鱼种建议',
    suggestedDepth: '建议深度',
    activeTime: '活跃时段',
    baitSuggestion: '建议饵料',
    technique: '专业钓法',
    biteTimes: '最佳咬钩时段',
    journal: {
      title: '垂钓日志 (Catch Journal)',
      add: '记录新的垂钓结果',
      noData: '暂无记录，开启你的作业日志吧。',
      fields: {
        species: '鱼种',
        length: '长度 (cm)',
        weight: '重量 (kg)',
        bait: '使用饵料',
        time: '时间',
        count: '数量'
      }
    },
    majorPeriod: '主要活跃期',
    minorPeriod: '次要活跃期',
    goldenWindow: '黄金窗口期',
    sunsetTide: '日落前 1 小时 + 满潮',
    scoreDesc: '预测：较差',
    scoreDescFair: '鱼情：一般',
    scoreDescGood: '鱼情：良好',
    scoreDescExcellent: '爆护预警：极佳',
    forecastPoor: '预测：较差',
    forecastFair: '预测：一般',
    forecastGood: '预测：良好',
    forecastExcellent: '预测：爆护',
    findSpecies: '搜索鱼种 (如 Snapper)...',
    noSpecies: '未找到匹配鱼种',
    more: '+ 搜索/更多',
    gearAdvice: '查看详细装备建议',
    fishGeneral: '通用',
    tideUnits: 'm',
    close: '确认并返回',
    deepAnalysis: '深度研判',
    requestDeep: '点击开启深度高算力研判 (耗时较长)',
    deepLoading: '正在调动高级 AI 模型进行多维测算...',
    footer: {
      copy: '© 2026 HOOKLOGIC - Fish Feeding Probability System',
      disclaimer: '数据基于 14 维度多向水文分析模型与 AI 研判，仅供参考。'
    },
    weatherAlerts: {
      thunderstorm: {
        title: '雷暴极致警报',
        message: '检测到雷电和强风风险，请立即停止所有水面作业并寻找安全避所。'
      },
      snow: {
        title: '极端低温/降雪警报',
        message: '检测到降雪或寒流风险，能见度低且气压波动剧烈，请注意防冻并评估作业安全。'
      },
      rain: {
        title: '强降水警报',
        message: '水面视线受阻且伴有颠簸浪涌，建议新手及小型船只停止作业。'
      }
    },
    windDirection: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'],
    weatherLabels: {
      sunny: '晴朗',
      cloudy: '多云',
      foggy: '有雾',
      drizzle: '毛毛雨',
      rainy: '中雨',
      snowy: '降雪',
      showers: '阵雨',
      thunder: '雷雨'
    },
    moonPhases: {
      newMoon: '新月',
      waxingCrescent: '峨眉月',
      firstQuarter: '上弦月',
      waxingGibbous: '盈凸月',
      fullMoon: '满月',
      waningGibbous: '亏凸月',
      lastQuarter: '下弦月',
      waningCrescent: '残月'
    },
    gearModal: {
      title: '专业装备建议清单',
      subtitle: '基于当前环境分析生成',
      sections: {
        rodReel: '鱼竿与卷线器',
        lineLeader: '线组搭配',
        lureBait: '拟饵与活饵',
        terminal: '终端配件'
      },
      labels: {
        rod: '鱼竿 (Rod)',
        reel: '卷线器 (Reel)',
        line: '主线 (Main Line)',
        leader: '子线 (Leader)',
        lure: '拟饵 (Lure)',
        tackle: '钓组 (Tackle)'
      }
    }
  },
  en: {
    appName: 'HOOKLOGIC',
    appDesc: 'Fish Feeding Probability System',
    realTimeUpdate: 'LIVE',
    currentLocation: 'CURRENT COORD',
    searchPlaceholder: 'Search AU city or spot (e.g. Sans Souci)...',
    auOnly: 'AU ONLY',
    selectLocation: 'Select exact location',
    noLocation: 'Location not found. Please try a more specific name.',
    analyzing: 'Analyzing Conditions...',
    analyzingDesc: 'Gathering weather, tide, and moon data for AI expert analysis.',
    loadingAnalysis: 'AI Expert Analysis...',
    loadingDescription: 'Retrieving AU hydro-meteorological data. AI is calculating best spots and bite activity, please wait.',
    landing: {
      title: 'Science-Based Fishing',
      subtitle: 'Bite Score Prediction System based on 14-dimensional Eco-models',
      detectLocation: 'Locate My Current Spot',
      search: 'Search',
      startPrompt: 'Enter a location to start analysis',
      popularSpots: 'Popular Fishing Spots'
    },
    error: 'Error',
    retry: 'Retry',
    targetSpecies: 'Target Species',
    userMode: 'Operation Mode',
    modes: {
      beginner: {
        name: 'Newbie',
        desc: 'One-click best species & quick advice'
      },
      intermediate: {
        name: 'Advanced',
        desc: 'Select species & detailed model data'
      },
      expert: {
        name: 'Pro',
        desc: 'Full 14-dimension hydrological monitoring'
      }
    },
    todayLive: 'TODAY LIVE',
    tomorrowForecast: 'TOMORROW',
    fishingIndex: 'Bite Score',
    safetyScore: 'Safety Score (Safety)',
    beginnerSuitability: 'Beginner Friendly',
    whyTitle: 'Core Analysis Basis',
    subScores: {
      temperature: 'Temp Suitability',
      tide: 'Tide/Current',
      weather: 'Weather Stability',
      moon: 'Moon/Light',
      species: 'Seasonality',
      safety: 'Marine Safety',
      habitat: 'Habitat Match'
    },
    tomorrowMoon: 'Tomorrow Moon',
    moonPhase: 'Moon Phase',
    illumination: 'Illumination',
    expertInsight: '💡 Expert Insight',
    weather: 'Current Weather',
    tomorrowWeather: 'Tomorrow Weather',
    temp: 'Temp',
    pressure: 'Pressure',
    windSpeed: 'Wind',
    humidity: 'Humidity',
    precipProb: 'Rain Prob',
    hourlyForecast: 'Hourly Forecast',
    next12h: 'Next 12h',
    tomorrowHourly: 'Tomorrow Hourly',
    tideStation: 'Tide Station',
    tomorrowTide: 'Tomorrow Tide',
    rising: 'Rising',
    falling: 'Falling',
    lowTide: 'Low',
    highTide: 'High',
    recentHigh: 'Next High',
    recentLow: 'Next Low',
    tideGraph: 'Tide Graph',
    recommendations: 'Species Advice',
    tomorrowRecs: 'Tomorrow Advice',
    suggestedDepth: 'Best Depth',
    activeTime: 'Active Window',
    baitSuggestion: 'Bait/Lure',
    technique: 'Technique',
    biteTimes: 'Bite Times',
    journal: {
      title: 'Catch Journal',
      add: 'Record New Catch',
      noData: 'No records yet. Start your logbook today.',
      fields: {
        species: 'Species',
        length: 'Length (cm)',
        weight: 'Weight (kg)',
        bait: 'Bait Used',
        time: 'Time',
        count: 'Count'
      }
    },
    majorPeriod: 'Major Period',
    minorPeriod: 'Minor Period',
    goldenWindow: 'Golden Window',
    sunsetTide: 'Sunset -1h + High Tide',
    scoreDesc: 'Condition: Poor',
    scoreDescFair: 'Condition: Fair',
    scoreDescGood: 'Condition: Good',
    scoreDescExcellent: 'Condition: Excellent',
    forecastPoor: 'Forecast: Poor',
    forecastFair: 'Forecast: Fair',
    forecastGood: 'Forecast: Good',
    forecastExcellent: 'Forecast: Excellent',
    findSpecies: 'Find fish (e.g. Snapper)...',
    noSpecies: 'No fish found',
    more: '+ Search/More',
    gearAdvice: 'Show Gear Advice',
    fishGeneral: 'General',
    tideUnits: 'm',
    close: 'Got it',
    deepAnalysis: 'Deep Analysis',
    requestDeep: 'Request Deep AI Analysis (Takes longer)',
    deepLoading: 'Mobilizing Advanced AI for multi-dimensional calculation...',
    footer: {
      copy: '© 2026 HOOKLOGIC - Fish Feeding Probability System',
      disclaimer: 'Data based on 14-dimensional hydrological models and AI analysis. Ref use only.'
    },
    weatherAlerts: {
      thunderstorm: {
        title: 'Thunderstorm Warning',
        message: 'Lightning and strong wind risks detected. Stop all water activities and find shelter.'
      },
      snow: {
        title: 'Cold/Snow Warning',
        message: 'Snow or cold front detected. Low visibility and pressure fluctuations. Stay warm.'
      },
      rain: {
        title: 'Heavy Rain Warning',
        message: 'Restricted visibility and rough waves. Small boats should avoid water.'
      }
    },
    windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    weatherLabels: {
      sunny: 'Sunny',
      cloudy: 'Cloudy',
      foggy: 'Foggy',
      drizzle: 'Drizzle',
      rainy: 'Rainy',
      snowy: 'Snowy',
      showers: 'Showers',
      thunder: 'Thunder'
    },
    moonPhases: {
      newMoon: 'New Moon',
      waxingCrescent: 'Waxing Crescent',
      firstQuarter: 'First Quarter',
      waxingGibbous: 'Waxing Gibbous',
      fullMoon: 'Full Moon',
      waningGibbous: 'Waning Gibbous',
      lastQuarter: 'Last Quarter',
      waningCrescent: 'Waning Crescent'
    },
    gearModal: {
      title: 'Professional Gear Checklist',
      subtitle: 'Generated based on current conditions',
      sections: {
        rodReel: 'Rod & Reel',
        lineLeader: 'Line & Leader',
        lureBait: 'Lure & Bait',
        terminal: 'Terminal Tackle'
      },
      labels: {
        rod: 'Rod',
        reel: 'Reel',
        line: 'Main Line',
        leader: 'Leader',
        lure: 'Lure',
        tackle: 'Tackle'
      }
    }
  }
};
