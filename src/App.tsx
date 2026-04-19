import React, { useState, useEffect } from 'react';
import { 
  Waves, 
  Wind, 
  Thermometer, 
  Gauge, 
  Moon, 
  Navigation, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Fish,
  Droplets,
  MapPin,
  RefreshCw,
  Info,
  X,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  CloudSnow,
  Search,
  Calendar,
  Star,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocationData, WeatherData, TideData, MoonData, FishingAnalysis, HourlyForecast } from './types';
import { fetchWeatherData, fetchMarineData, getMoonData, geocodeLocation } from './services/weatherService';
import { analyzeFishingConditions } from './services/geminiService';
import { i18n, type Language } from './translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getWindDirectionLabel = (deg: number, lang: Language) => {
  const directions = i18n[lang].windDirection;
  return directions[Math.round(deg / 45) % 8];
};

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="text-amber-400" size={24} />;
  if (code >= 1 && code <= 3) return <Cloud className="text-slate-400" size={24} />;
  if (code >= 45 && code <= 48) return <CloudFog className="text-slate-300" size={24} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className="text-blue-300" size={24} />;
  if (code >= 61 && code <= 67) return <CloudRain className="text-blue-400" size={24} />;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow className="text-blue-100" size={24} />;
  if (code >= 80 && code <= 82) return <CloudRain className="text-blue-500" size={24} />;
  if (code >= 95) return <CloudLightning className="text-purple-400" size={24} />;
  return <Sun className="text-amber-400" size={24} />;
};

const getWeatherLabel = (code: number, lang: Language) => {
  const labels = i18n[lang].weatherLabels;
  if (code === 0) return labels.sunny;
  if (code >= 1 && code <= 3) return labels.cloudy;
  if (code >= 45 && code <= 48) return labels.foggy;
  if (code >= 51 && code <= 55) return labels.drizzle;
  if (code >= 61 && code <= 67) return labels.rainy;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return labels.snowy;
  if (code >= 80 && code <= 82) return labels.showers;
  if (code >= 95) return labels.thunder;
  return labels.sunny;
};

const getWeatherAlert = (code: number, lang: Language) => {
  const alerts = i18n[lang].weatherAlerts;
  if (code >= 95) return alerts.thunderstorm;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return alerts.snow;
  if (code >= 61 && code <= 67 || (code >= 80 && code <= 82)) return alerts.rain;
  return null;
};

const getMoonPhaseLabel = (key: string, lang: Language) => {
  return (i18n[lang].moonPhases as any)[key] || key;
};

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const t = i18n[lang];
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tide, setTide] = useState<TideData | null>(null);
  const [moon, setMoon] = useState<MoonData | null>(null);
  const [analysis, setAnalysis] = useState<FishingAnalysis | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [forecastAnalysis, setForecastAnalysis] = useState<FishingAnalysis | null>(null);
  const [tomorrowWeather, setTomorrowWeather] = useState<WeatherData | null>(null);
  const [tomorrowTide, setTomorrowTide] = useState<TideData | null>(null);
  const [tomorrowMoon, setTomorrowMoon] = useState<MoonData | null>(null);
  const [isForecastMode, setIsForecastMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGearModalOpen, setIsGearModalOpen] = useState(false);
  const [isFishSelectorExpanded, setIsFishSelectorExpanded] = useState(false);
  const [fishSearchQuery, setFishSearchQuery] = useState('');
  const [selectedFish, setSelectedFish] = useState('通用');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{ lat: number; lon: number; name: string; country?: string; admin1?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDataForCoords = async (lat: number, lon: number, name?: string, forceLang?: Language) => {
    const currentLang = forceLang || lang;
    setLoading(true);
    setError(null);
    try {
      const loc: LocationData = { latitude: lat, longitude: lon };
      setLocation(loc);
      if (name) setLocationName(name);
      setForecastAnalysis(null);
      setIsForecastMode(false);

      const [weatherResponse, marineData] = await Promise.all([
        fetchWeatherData(lat, lon),
        fetchMarineData(lat, lon)
      ]);
      
      const moonData = getMoonData(new Date());
      
      setWeather(weatherResponse.current);
      setHourlyForecast(weatherResponse.hourly);
      setTide(marineData);
      setMoon(moonData);

      const aiResult = await analyzeFishingConditions(loc, weatherResponse.current, marineData, moonData, weatherResponse.hourly, false, currentLang);
      setAnalysis(aiResult);
    } catch (err: any) {
      console.error(err);
      setError(err.message || (currentLang === 'zh' ? "获取数据失败。" : "Failed to fetch data."));
    } finally {
      setLoading(false);
    }
  };

  const fetchForecastForTomorrow = async (forceLang?: Language) => {
    const currentLang = forceLang || lang;
    if (!location || !weather) return;
    
    setIsForecastLoading(true);
    try {
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate.setHours(12, 0, 0, 0); // Analyze for noon tomorrow

      // Get weather for tomorrow from our already fetched hourly/daily data if possible
      // But for simplicity and accuracy, we can just use the 'tomorrow' summary from weatherResponse
      // Or fetch specific data. Let's assume we have it or fetch it.
      
      // For now, let's use the current location and fetch tomorrow's specific parameters
      const weatherResp = await fetchWeatherData(location.latitude, location.longitude);
      if (weatherResp.tomorrow) {
        const tWeather: WeatherData = {
          time: tomorrowDate.toISOString().slice(0, 16),
          temperature: weatherResp.tomorrow.avgTemp,
          pressure: weather?.pressure || 1013,
          humidity: weather?.humidity || 50,
          windSpeed: weatherResp.tomorrow.maxWind,
          windDirection: weather?.windDirection || 0,
          isRaining: weatherResp.tomorrow.weatherCode >= 60,
          condition: getWeatherLabel(weatherResp.tomorrow.weatherCode, currentLang),
          weatherCode: weatherResp.tomorrow.weatherCode
        };
        
        const [tTide, tMoon] = await Promise.all([
          fetchMarineData(location.latitude, location.longitude, tomorrowDate),
          getMoonData(tomorrowDate)
        ]);

        setTomorrowWeather(tWeather);
        setTomorrowTide(tTide);
        setTomorrowMoon(tMoon);

        const aiResult = await analyzeFishingConditions(location, tWeather, tTide, tMoon, [], true, currentLang);
        setForecastAnalysis(aiResult);
      }
    } catch (err) {
      console.error("Forecast fetch failed:", err);
    } finally {
      setIsForecastLoading(false);
    }
  };

  const toggleForecastMode = async () => {
    if (!isForecastMode && !forecastAnalysis) {
      await fetchForecastForTomorrow();
    }
    setIsForecastMode(!isForecastMode);
  };

  const initData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
      });
      fetchDataForCoords(pos.coords.latitude, pos.coords.longitude);
    } catch (err: any) {
      console.error('Geolocation failed, defaulting to Sydney:', err);
      // Default to Sans Souci Park, Sydney area if GPS fails
      fetchDataForCoords(-33.9922, 151.1396, "Sans Souci, NSW, Australia");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await geocodeLocation(searchQuery);
    setIsSearching(false);

    if (results.length > 0) {
      setSearchResults(results);
      setShowDropdown(true);
    } else {
      alert(t.noLocation);
    }
  };

  const selectLocation = (result: typeof searchResults[0]) => {
    const fullName = `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}${result.country ? `, ${result.country}` : ''}`;
    fetchDataForCoords(result.lat, result.lon, fullName);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  useEffect(() => {
    if (location) {
      if (isForecastMode) {
        fetchForecastForTomorrow(lang);
      } else {
        fetchDataForCoords(location.latitude, location.longitude, locationName || undefined, lang);
      }
    }
  }, [lang]);

  useEffect(() => {
    initData();
  }, []);

  // Removed useEffect for selectedFish to prevent slow reloading.
  // The UI will dynamically switch between pre-fetched species analysis.

  const getActiveData = () => {
    const base = isForecastMode ? forecastAnalysis : analysis;
    if (!base) return null;
    if (selectedFish === '通用') return base;
    return base.speciesAnalysis?.[selectedFish] || base;
  };

  const activeData = getActiveData();

  const getFishDisplayName = (fish: string, currentLang: Language) => {
    if (fish === '通用') return t.fishGeneral;
    if (!fish.includes('(')) return fish;
    
    const [zh, en] = fish.split('(').map(s => s.replace(')', ''));
    return currentLang === 'zh' ? zh : en;
  };

  const getFishSecondaryName = (fish: string, currentLang: Language) => {
    if (currentLang === 'en' || fish === '通用' || !fish.includes('(')) return null;
    const [zh, en] = fish.split('(').map(s => s.replace(')', ''));
    return currentLang === 'zh' ? en : zh;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center text-primary p-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <RefreshCw size={48} className="text-accent" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t.loadingAnalysis}</h2>
        <p className="text-text-light text-center max-w-xs">
          {t.loadingDescription}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center text-text-dark p-6 text-center">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">{lang === 'zh' ? '出错了' : 'Something went wrong'}</h2>
        <p className="text-text-light mb-6 max-w-md">{error}</p>
        <button 
          onClick={initData}
          className="px-6 py-3 bg-primary text-white hover:bg-primary/90 rounded-lg font-medium transition-colors"
        >
          {lang === 'zh' ? '重试' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-text-dark font-sans selection:bg-accent/30 pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-white px-4 md:px-8 py-3 md:h-20 flex flex-col md:flex-row items-center justify-between shadow-md gap-3">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Fish size={24} className="text-accent" />
            <h1 className="text-base md:text-lg font-bold tracking-wider uppercase">HOOKLOGIC <span className="font-normal opacity-80 hidden sm:inline">{t.appDesc}</span></h1>
          </div>
          
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={() => {
                const newLang = lang === 'zh' ? 'en' : 'zh';
                setLang(newLang);
                if (location) fetchDataForCoords(location.latitude, location.longitude, locationName || undefined, newLang);
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors font-bold text-xs"
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>
            <button 
              onClick={initData}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="w-full md:flex-1 md:max-w-md md:mx-8 relative" ref={searchRef}>
          <form onSubmit={handleSearch} className="relative group">
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              autoComplete="off"
              className="w-full bg-white/10 border border-white/20 rounded-full py-2 pl-10 pr-24 text-sm focus:bg-white focus:text-primary focus:outline-none transition-all placeholder:text-white/50"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-primary" size={16} />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/40 border border-white/10 uppercase tracking-tighter">
                {t.auOnly}
              </span>
              {isSearching ? (
                <RefreshCw className="text-primary animate-spin" size={14} />
              ) : (
                <button 
                  type="submit"
                  className="p-1.5 hover:bg-primary/10 rounded-full text-white/50 group-focus-within:text-primary transition-colors"
                >
                  <Search size={14} />
                </button>
              )}
            </div>
          </form>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showDropdown && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[60]"
              >
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  <div className="px-3 py-2 text-[10px] font-bold text-text-light uppercase border-b border-slate-50">{t.selectLocation}</div>
                  {searchResults.map((result, idx) => (
                    <button
                      key={`${result.lat}-${result.lon}-${idx}`}
                      onClick={() => selectLocation(result)}
                      className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors flex items-start gap-3 border-b border-slate-50 last:border-none"
                    >
                      <MapPin className="text-accent mt-1 shrink-0" size={14} />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary">{result.name}</span>
                        <span className="text-[10px] text-text-light">
                          {result.admin1 ? `${result.admin1}, ` : ''}{result.country}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-xs font-bold text-accent">
              <MapPin size={12} />
              <span className="truncate max-w-[150px]">{locationName || (location ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : (lang === 'zh' ? '定位中...' : 'Locating...'))}</span>
            </div>
            <span className="text-[10px] opacity-60 uppercase tracking-tighter">{t.currentLocation}</span>
          </div>
          <span className="hidden lg:block bg-success px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter">
            {t.realTimeUpdate} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button 
            onClick={() => {
              const newLang = lang === 'zh' ? 'en' : 'zh';
              setLang(newLang);
              if (location) fetchDataForCoords(location.latitude, location.longitude, locationName || undefined, newLang);
            }}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors font-bold text-xs"
          >
            {lang === 'zh' ? 'English' : '中文'}
          </button>
          <button 
            onClick={initData}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title={lang === 'zh' ? '刷新数据' : 'Refresh Data'}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Location Info Bar */}
      <div className="md:hidden bg-slate-800 text-white px-4 py-2 flex items-center justify-between border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-bold text-accent">
          <MapPin size={10} />
          <span className="truncate max-w-[200px]">{locationName || (location ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : (lang === 'zh' ? '定位中...' : 'Locating...'))}</span>
        </div>
        <span className="bg-success/20 text-success px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
          {t.realTimeUpdate}
        </span>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 md:gap-6">
        {/* Sidebar */}
        <aside className="space-y-6 flex flex-col">
          {/* Weather Alert Banner */}
          {(isForecastMode ? tomorrowWeather : weather) && getWeatherAlert((isForecastMode ? tomorrowWeather : weather)!.weatherCode, lang) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 items-start"
            >
              <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <div>
                <div className="text-sm font-bold text-red-800">
                  {getWeatherAlert((isForecastMode ? tomorrowWeather : weather)!.weatherCode, lang)?.title}
                  {isForecastMode && <span className="ml-2 text-[10px] font-normal opacity-70">({t.tomorrowForecast})</span>}
                </div>
                <p className="text-xs text-red-700 leading-relaxed mt-1">
                  {getWeatherAlert((isForecastMode ? tomorrowWeather : weather)!.weatherCode, lang)?.message}
                </p>
              </div>
            </motion.div>
          )}

          {/* Target Fish Selection */}
          <div className="bg-card-bg border border-app-border rounded-xl shadow-sm mb-6 overflow-hidden">
            <button 
              onClick={() => setIsFishSelectorExpanded(!isFishSelectorExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="text-[10px] uppercase tracking-widest font-bold text-text-light flex items-center gap-1">
                <Fish size={14} className="text-accent" />
                {t.targetSpecies}: <span className="text-primary ml-1 truncate max-w-[120px]">{getFishDisplayName(selectedFish, lang)}</span>
              </div>
              {isFishSelectorExpanded ? <ChevronUp size={14} className="text-text-light" /> : <ChevronDown size={14} className="text-text-light" />}
            </button>
            
            <AnimatePresence>
              {isFishSelectorExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pb-4"
                >
                  {/* Fish Search Input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-light/50" size={12} />
                    <input 
                      type="text"
                      placeholder={t.findSpecies}
                      value={fishSearchQuery}
                      onChange={(e) => setFishSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-[10px] focus:outline-none focus:border-accent transition-colors"
                    />
                    {fishSearchQuery && (
                      <button 
                        onClick={() => setFishSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-light/30 hover:text-text-light"
                      >
                        <AlertCircle size={10} className="rotate-45" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {['通用', '真鲷(Snapper)', '黑鲷(Black Bream)', '扁头鱼(Flathead)', '澳洲三文鱼(Australian Salmon)', '鱿鱼(Squid)', '青甘鱼(Kingfish)', '黄尾鱼(Yakka)', '多齿蛇鲻(Lizardfish)', '银鲈(Silver Trevally)', '笛鲷(Mangrove Jack)', '尖吻鲈(Barramundi)']
                      .filter(fish => {
                        const searchLower = fishSearchQuery.toLowerCase();
                        return fish.toLowerCase().includes(searchLower) || (lang === 'en' && t.fishGeneral.toLowerCase().includes(searchLower));
                      })
                      .map((fish) => {
                        const mainName = getFishDisplayName(fish, lang);
                        const subName = getFishSecondaryName(fish, lang);
                        return (
                          <button
                            key={fish}
                            onClick={() => {
                              setSelectedFish(fish);
                              setFishSearchQuery('');
                            }}
                            className={cn(
                              "py-2 px-1 text-[9px] font-bold rounded-lg border transition-all text-center leading-tight flex flex-col items-center justify-center min-h-[40px]",
                              selectedFish === fish 
                                ? "bg-primary text-white border-primary shadow-md" 
                                : "bg-white text-text-light border-app-border hover:border-accent hover:text-accent"
                            )}
                          >
                            <span>{mainName}</span>
                            {subName && <span className="block opacity-60 font-normal scale-[0.85] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{subName}</span>}
                          </button>
                        );
                      })}
                    {['通用', '真鲷(Snapper)', '黑鲷(Black Bream)', '扁头鱼(Flathead)', '澳洲三文鱼(Australian Salmon)', '鱿鱼(Squid)', '青甘鱼(Kingfish)', '黄尾鱼(Yakka)', '多齿蛇鲻(Lizardfish)', '银鲈(Silver Trevally)', '笛鲷(Mangrove Jack)', '尖吻鲈(Barramundi)']
                      .filter(fish => fish.toLowerCase().includes(fishSearchQuery.toLowerCase())).length === 0 && (
                        <div className="col-span-full py-4 text-center text-[10px] text-text-light opacity-60">
                          {t.noSpecies}
                        </div>
                      )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isFishSelectorExpanded && (
              <div className="px-4 pb-4 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                {['通用', '真鲷(Snapper)', '黑鲷(Black Bream)', '扁头鱼(Flathead)'].map((fish) => (
                  <button
                    key={fish}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFish(fish);
                    }}
                    className={cn(
                      "flex-shrink-0 px-3 py-1 text-[9px] font-bold rounded-full border transition-all whitespace-nowrap",
                      selectedFish === fish ? "bg-accent text-primary border-accent" : "bg-slate-50 text-text-light border-slate-200"
                    )}
                  >
                    {getFishDisplayName(fish, lang)}
                  </button>
                ))}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFishSelectorExpanded(true);
                  }}
                  className="flex-shrink-0 px-3 py-1 text-[9px] font-bold rounded-full bg-slate-100 text-text-light border border-dashed border-slate-300"
                >
                  {t.more}
                </button>
              </div>
            )}
          </div>

          {/* Score Card */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-primary to-slate-800 text-white rounded-xl p-6 text-center shadow-lg border-none relative overflow-hidden"
          >
            {/* Forecast Toggle */}
            <div className="absolute top-0 left-0 right-0 p-1 bg-white/5 flex">
              <button 
                onClick={() => setIsForecastMode(false)}
                className={clsx(
                  "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-tighter transition-all",
                  !isForecastMode ? "bg-accent text-primary" : "text-white/40 hover:text-white"
                )}
              >
                {t.todayLive}
              </button>
              <button 
                onClick={toggleForecastMode}
                disabled={isForecastLoading}
                className={clsx(
                  "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-tighter transition-all flex items-center justify-center gap-1",
                  isForecastMode ? "bg-accent text-primary" : "text-white/40 hover:text-white"
                )}
              >
                {isForecastLoading ? <RefreshCw size={10} className="animate-spin" /> : <Calendar size={10} />}
                {t.tomorrowForecast}
              </button>
            </div>

            <div className="mt-8 text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4 md:mb-6">
              {isForecastMode ? `${t.tomorrowForecast} ${t.fishingIndex}` : t.fishingIndex}
            </div>
            
            <div className="relative w-28 h-28 md:w-36 md:h-36 mx-auto mb-4 md:mb-6 flex flex-col items-center justify-center border-8 border-white/10 rounded-full">
              <div className="absolute inset-0 border-t-8 border-accent rounded-full rotate-45" />
              <span className="text-4xl md:text-5xl font-black">
                {activeData?.score}
              </span>
              <span className="text-xs opacity-60">/ 100</span>
            </div>
            <div className="text-xl font-bold text-accent mb-4">
              {activeData?.score && activeData.score >= 80 ? (isForecastMode ? t.forecastExcellent : t.scoreDescExcellent) : 
               activeData?.score && activeData.score >= 60 ? (isForecastMode ? t.forecastGood : t.scoreDescGood) : 
               activeData?.score && activeData.score >= 40 ? (isForecastMode ? t.forecastFair : t.scoreDescFair) : (isForecastMode ? t.forecastPoor : t.scoreDesc)}
            </div>
            <p className="text-xs leading-relaxed opacity-80 min-h-[3em]">
              {activeData?.summary}
            </p>

            {/* Hourly Score Trend */}
            {activeData?.hourlyTrends && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4 flex items-center justify-center gap-2">
                  <Clock size={12} />
                  {t.next12h}
                </div>
                <div className="relative h-24 w-full group/trend pt-4 px-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Area fill */}
                    <path
                      d={`M 0 40 ${activeData.hourlyTrends.map((t, i) => {
                        const x = (i / (activeData.hourlyTrends!.length - 1)) * 100;
                        const y = 40 - (t.score / 100) * 32 - 4;
                        return `L ${x} ${y}`;
                      }).join(' ')} L 100 40 Z`}
                      fill="url(#scoreGradient)"
                    />
                    
                    {/* Line */}
                    <path
                      d={activeData.hourlyTrends.map((t, i) => {
                        const x = (i / (activeData.hourlyTrends!.length - 1)) * 100;
                        const y = 40 - (t.score / 100) * 32 - 4;
                        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent"
                    />

                    {/* Interactive Points & Tooltips */}
                    {activeData.hourlyTrends.map((t, i) => {
                      const x = (i / (activeData.hourlyTrends!.length - 1)) * 100;
                      const y = 40 - (t.score / 100) * 32 - 4;
                      return (
                        <g key={i} className="group/dot">
                          <circle 
                            cx={x} cy={y} r="1.5" 
                            fill="white" stroke="currentColor" strokeWidth="1"
                            className="text-accent transition-all group-hover/dot:r-2" 
                          />
                          {/* Invisible hit area */}
                          <rect 
                            x={x - 4} y="0" width="8" height="40" 
                            fill="transparent" 
                            className="cursor-pointer"
                          />
                          {/* Score Text on Hover - Adjusted anchor to prevent clipping */}
                          <text 
                            x={x} y={y - 5} 
                            fontSize="5" 
                            fontWeight="bold" 
                            textAnchor={i === 0 ? "start" : i === activeData.hourlyTrends!.length - 1 ? "end" : "middle"} 
                            fill="white"
                            className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none drop-shadow-md"
                          >
                            {t.score}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  
                  <div className="flex justify-between mt-3 px-0">
                    {activeData.hourlyTrends.map((trend, i) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <span className={`text-[7px] font-bold opacity-30 uppercase tracking-tighter whitespace-nowrap ${i === 0 ? 'translate-x-[2px]' : i === activeData.hourlyTrends!.length - 1 ? '-translate-x-[2px]' : ''}`}>
                          {i % 3 === 0 || i === activeData.hourlyTrends!.length - 1 ? trend.time : ''}
                        </span>
                        {(i % 3 === 0 || i === activeData.hourlyTrends!.length - 1) && <div className="w-px h-1 bg-white/10 mt-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          {/* Moon Card */}
          <div className="bg-card-bg border border-app-border rounded-xl p-6 shadow-sm">
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-4">
              {isForecastMode ? t.tomorrowMoon : t.moonPhase}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full bg-primary overflow-hidden shadow-inner">
                <div 
                  className="absolute inset-0 bg-white/20"
                  style={{ clipPath: `inset(0 ${100 - ((isForecastMode ? tomorrowMoon?.phase : moon?.phase) || 0) * 100}% 0 0)` }}
                />
              </div>
              <div>
                <div className="text-lg font-bold">{isForecastMode ? getMoonPhaseLabel(tomorrowMoon?.phaseName || '', lang) : getMoonPhaseLabel(moon?.phaseName || '', lang)}</div>
                <div className="text-xs text-text-light">{t.illumination}: {Math.round(((isForecastMode ? tomorrowMoon?.phase : moon?.phase) || 0) * 100)}%</div>
              </div>
            </div>
          </div>

          {/* Tips Box */}
          <div className="mt-auto bg-amber-50 border border-amber-200 p-5 rounded-xl">
            <div className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
              <Info size={16} />
              {t.expertInsight}
            </div>
            <p className="text-xs text-amber-800/80 leading-relaxed">
              {activeData?.recommendations[0] || (lang === 'zh' ? "气压上升期间，鱼类活性显著增强。建议尝试深浅交替区。" : "Fishing activity increases significantly during rising pressure. Try drop-off areas.")}
            </p>
          </div>
        </aside>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather Card */}
          <div className="bg-card-bg border border-app-border rounded-xl p-6 shadow-sm">
            {/* Weather Alerts */}
            {(isForecastMode ? tomorrowWeather : weather) && getWeatherAlert((isForecastMode ? tomorrowWeather : weather)!.weatherCode, lang) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 bg-red-50 border border-red-200 p-3 rounded-lg flex gap-3 items-center overflow-hidden"
              >
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-red-800 uppercase flex justify-between">
                    <span>{getWeatherAlert((isForecastMode ? tomorrowWeather : weather)!.weatherCode, lang)?.title} ({isForecastMode ? t.tomorrowForecast : t.todayLive})</span>
                    <span>{lang === 'zh' ? '代码' : 'Code'}: {(isForecastMode ? tomorrowWeather : weather)!.weatherCode}</span>
                  </div>
                  <p className="text-[11px] text-red-700 font-medium">
                    {getWeatherAlert((isForecastMode ? tomorrowWeather : weather)!.weatherCode, lang)?.message}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                  {isForecastMode ? t.tomorrowWeather : t.weather}
                </div>
                {(isForecastMode ? tomorrowWeather : weather) && getWeatherIcon((isForecastMode ? tomorrowWeather : weather)!.weatherCode)}
              </div>
              <div className="flex flex-col items-end">
                <span className="flex items-center gap-1 text-[10px] font-bold text-success uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {isForecastMode ? (lang === 'zh' ? '预报数据' : 'FORECAST') : (lang === 'zh' ? '适宜垂钓' : 'OPTIMAL')}
                </span>
                {isForecastMode && tomorrowWeather?.precipProb !== undefined && (
                  <span className="text-[9px] font-bold text-blue-500 mt-0.5">{t.precipProb}: {tomorrowWeather.precipProb}%</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-6">
              <div className="space-y-1">
                <span className="text-[10px] text-text-light uppercase font-bold">{t.temp}</span>
                <div className="text-xl font-bold">{(isForecastMode ? tomorrowWeather : weather)?.temperature}<span className="text-xs ml-0.5 font-normal">°C</span></div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-text-light uppercase font-bold">{t.pressure}</span>
                <div className="flex items-center gap-1.5">
                  <div className="text-xl font-bold">{(isForecastMode ? tomorrowWeather : weather)?.pressure}<span className="text-xs ml-0.5 font-normal">hPa</span></div>
                  <ArrowUp size={12} className="text-success" strokeWidth={3} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-text-light uppercase font-bold">{t.windSpeed}</span>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold">{(isForecastMode ? tomorrowWeather : weather)?.windSpeed}<span className="text-xs ml-0.5 font-normal">km/h</span></div>
                  <div 
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100"
                    title={`${lang === 'zh' ? '风向' : 'Wind'}: ${(isForecastMode ? tomorrowWeather : weather)?.windDirection}°`}
                  >
                    <motion.div
                      animate={{ rotate: (isForecastMode ? tomorrowWeather : weather)?.windDirection || 0 }}
                      transition={{ type: "spring", stiffness: 50 }}
                    >
                      <ArrowUp size={12} strokeWidth={3} />
                    </motion.div>
                    <span className="text-[10px] font-bold">{getWindDirectionLabel((isForecastMode ? tomorrowWeather : weather)?.windDirection || 0, lang)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-text-light uppercase font-bold">{t.humidity}</span>
                <div className="flex items-center gap-1.5">
                  <div className="text-xl font-bold">{(isForecastMode ? tomorrowWeather : weather)?.humidity}<span className="text-xs ml-0.5 font-normal">%</span></div>
                  <ArrowDown size={12} className="text-blue-400" strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Hourly Forecast */}
            <div className="mt-8 pt-6 border-t border-app-border">
              <div className="text-[10px] uppercase font-bold text-text-light mb-4 flex justify-between items-center">
                <span>{isForecastMode ? t.tomorrowHourly : t.hourlyForecast}</span>
                <Clock size={12} />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {hourlyForecast
                  .filter(hour => {
                    const hourTime = hour.time;
                    const locationNow = weather?.time || new Date().toISOString().slice(0, 16);
                    
                    if (isForecastMode) {
                      // Get tomorrow's date string from location's perspective
                      const locDate = new Date(locationNow);
                      locDate.setDate(locDate.getDate() + 1);
                      const tomorrowStr = locDate.toISOString().slice(0, 10); // YYYY-MM-DD
                      return hourTime.startsWith(tomorrowStr);
                    } else {
                      // Show next 12 hours from location's now
                      // String comparison works for ISO dates
                      const locNowHour = locationNow.slice(0, 13) + ":00"; // Round to current hour
                      
                      // We want items that are >= current hour
                      if (hourTime < locNowHour) return false;
                      
                      // limit to 12 items after filter
                      return true;
                    }
                  })
                  .slice(0, 12)
                  .map((hour, i) => (
                    <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[50px]">
                      <span className="text-[10px] font-medium text-text-light">
                        {new Date(hour.time).getHours()}:00
                      </span>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center gap-1">
                        {getWeatherIcon(hour.weatherCode)}
                        <span className="text-xs font-bold">{Math.round(hour.temperature)}°</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-[9px] text-text-light">
                        <Wind size={8} />
                        <span>{Math.round(hour.windSpeed)}</span>
                      </div>
                      {hour.precipitationProbability !== undefined && hour.precipitationProbability > 0 && (
                        <div className="flex items-center gap-0.5 text-[9px] text-blue-500 font-bold">
                          <CloudRain size={8} />
                          <span>{hour.precipitationProbability}%</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Solunar Bite Times - Filling the gap */}
            <div className="mt-8 pt-6 border-t border-app-border">
              <div className="text-[10px] uppercase font-bold text-text-light mb-4 flex justify-between items-center">
                <span>{isForecastMode ? (lang === 'zh' ? '明日最佳咬钩时段' : 'Tomorrow Bite Times') : t.biteTimes}</span>
                <Zap size={12} className="text-accent" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-accent/5 rounded-xl border border-accent/10 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-accent uppercase tracking-tighter">{t.majorPeriod} I</span>
                  <span className="text-sm font-black text-primary">05:45 - 07:45</span>
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-accent w-[90%]" />
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">{t.majorPeriod} II</span>
                  <span className="text-sm font-black text-primary">18:15 - 20:15</span>
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]" />
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-text-light uppercase tracking-tighter">{t.minorPeriod} I</span>
                  <span className="text-sm font-bold text-primary opacity-80">11:30 - 12:30</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-text-light uppercase tracking-tighter">{t.minorPeriod} II</span>
                  <span className="text-sm font-bold text-primary opacity-80">23:50 - 00:50</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-accent fill-accent" />
                  <span className="text-[10px] font-bold text-white uppercase italic">{t.goldenWindow}</span>
                </div>
                <span className="text-[10px] font-medium text-white/70">{t.sunsetTide}</span>
              </div>
            </div>
          </div>

          {/* Tide Card */}
          <div className="bg-card-bg border border-app-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                {isForecastMode ? t.tomorrowTide : t.tideStation}
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1",
                (isForecastMode ? tomorrowTide : tide)?.state === 'rising' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
              )}>
                {(isForecastMode ? tomorrowTide : tide)?.state === 'rising' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {(isForecastMode ? tomorrowTide : tide)?.state === 'rising' ? t.rising : t.falling}
              </div>
            </div>

            <div className="flex items-end gap-4 mb-8">
              <div className="text-4xl font-black text-primary flex items-baseline gap-1">
                {(isForecastMode ? tomorrowTide : tide)?.height}
                <span className="text-sm font-medium text-text-light">{t.tideUnits}</span>
              </div>
              <div className="flex-1 pb-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((isForecastMode ? tomorrowTide : tide)?.tideProgress || 0) * 100}%` }}
                    className="h-full bg-accent"
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[9px] font-bold text-text-light/50 uppercase">
                  <span>{t.lowTide}</span>
                  <span>{t.highTide}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="text-[9px] font-bold text-text-light uppercase mb-1 flex items-center gap-1">
                  <ChevronUp size={10} className="text-emerald-500" />
                  {t.recentHigh}
                </div>
                <div className="text-sm font-black text-primary">
                  {(isForecastMode ? tomorrowTide : tide)?.nextHighTide.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="text-[9px] font-bold text-text-light uppercase mb-1 flex items-center gap-1">
                  <ChevronDown size={10} className="text-blue-500" />
                  {t.recentLow}
                </div>
                <div className="text-sm font-black text-primary">
                  {(isForecastMode ? tomorrowTide : tide)?.nextLowTide.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Tide Graph */}
            <div className="relative h-28 w-full mt-auto">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-slate-100 w-full" />
                <div className="border-t border-slate-100 w-full" />
                <div className="border-t border-slate-100 w-full" />
              </div>
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* 24h Tide Curve */}
                <path
                  d={`M 0 40 ${ (isForecastMode ? tomorrowTide : tide)?.hourlyHeights
                    .map((h, i) => {
                      const x = (i / 23) * 100;
                      const y = 40 - ((h.height - 0.5) / 3) * 30 - 5;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 40 Z`}
                  fill="url(#tideGradient)"
                />
                <path
                  d={(isForecastMode ? tomorrowTide : tide)?.hourlyHeights
                    .map((h, i) => {
                      const x = (i / 23) * 100;
                      const y = 40 - ((h.height - 0.5) / 3) * 30 - 5;
                      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                    }).join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-accent"
                />

                {/* Current Time Indicator on Tide Graph */}
                {!isForecastMode && (
                  <motion.circle
                    cx={(new Date().getHours() / 23) * 100}
                    cy={40 - (((tide?.height || 2) - 0.5) / 3) * 30 - 5}
                    r="2"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-accent"
                    animate={{ r: [2, 3, 2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </svg>
              
              <div className="flex justify-between mt-2 text-[8px] font-bold text-text-light/40 uppercase">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
              </div>
            </div>
          </div>

          {/* Recommendations Card */}
          <div className="bg-card-bg border border-app-border rounded-xl p-4 md:p-6 shadow-sm md:col-span-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-4 md:mb-6 flex justify-between items-center">
              <span>{isForecastMode ? t.tomorrowRecs : t.recommendations}</span>
              <span className="text-accent font-black">[{getFishDisplayName(selectedFish, lang)}]</span>
            </div>
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
              <div className="w-full md:flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold text-primary">{t.suggestedDepth}: {activeData?.targetDepth}</div>
                  <div className="group relative">
                    <Info size={14} className="text-text-light cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-primary text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                      {lang === 'zh' ? '根据当前气压和光照强度计算。气压高时鱼类通常在深水区，气压低或阴天时可能在浅水区觅食。' : 'Calculated based on pressure and light. High pressure shifts fish deeper, while low pressure or clouds bring them shallower.'}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-text-light uppercase tracking-tight">{t.activeTime}: {activeData?.bestTime}</div>
                <p className="text-sm text-text-dark leading-relaxed">
                  {activeData?.recommendations[1]} {activeData?.recommendations[2]}
                </p>
              </div>
              <div className="w-full md:flex-1 space-y-3 border-t md:border-t-0 md:border-l border-app-border pt-6 md:pt-0 md:pl-8">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-primary">{t.baitSuggestion}: {activeData?.baitSuggestion}</div>
                    <div className="group relative">
                      <Info size={14} className="text-text-light cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-primary text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                        {lang === 'zh' ? '基于当前水温和季节推荐。冷水期建议使用活饵或慢速假饵，暖水期可尝试快速运动的亮片或米诺。' : 'Based on temp and season. Use lures with slow action in cold water; faster retrieval or reactive baits in warm water.'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-app-border pt-4">
                    <div className="text-xl font-bold text-accent">{t.technique}: {activeData?.techniqueSuggestion}</div>
                    <div className="group relative">
                      <ShieldCheck size={14} className="text-text-light cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                        {lang === 'zh' ? '根据当前潮汐阶段和风速推荐的针对性操作手法。' : 'Specific techniques recommended based on current tide phase and wind conditions.'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {activeData?.recommendations.slice(3).map((rec, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-text-dark">
                      <CheckCircle2 size={14} className="text-success" />
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsGearModalOpen(true)}
              className="mt-8 w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]"
            >
              {t.gearAdvice}
            </button>
          </div>
        </div>
      </main>

      {/* Gear Modal */}
      <AnimatePresence>
        {isGearModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGearModalOpen(false)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full md:max-w-4xl bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="bg-primary text-white p-6 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShieldCheck size={24} className="text-accent" />
                    {t.gearModal.title}
                  </h2>
                  <p className="text-xs opacity-70 mt-1">{t.gearModal.subtitle} ({activeData?.targetDepth})</p>
                </div>
                <button 
                  onClick={() => setIsGearModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rod & Reel */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-primary border-l-4 border-accent pl-2 uppercase tracking-wider">{t.gearModal.sections.rodReel}</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {t.gearModal.labels.rod}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{activeData?.rodSuggestion || (lang === 'zh' ? '2.4m - 2.7m M/MH 调性碳素路亚竿' : '2.4m - 2.7m M/MH Fast Action Carbon Rod')}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? 'M/MH 调性提供足够的腰力来应对当前水流，碳素材质保证了感度，能清晰感知轻微咬钩。' : 'M/MH action provides power for currents; carbon material ensures sensitivity to detect subtle bites.'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {t.gearModal.labels.reel}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{activeData?.reelSuggestion || (lang === 'zh' ? '2500 - 3000 型纺车轮 (高速比建议)' : '2500 - 3000 Series Spinning Reel (High Speed)')}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? '高速比卷线器有助于在复杂水域快速收线，防止挂底，3000型容量足以应对突发的大鱼冲击。' : 'High gear ratio helps retrieve quickly to avoid snags. 3000 size handles unexpected big fish strikes.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line & Hook */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-primary border-l-4 border-accent pl-2 uppercase tracking-wider">{t.gearModal.sections.lineLeader}</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {t.gearModal.labels.line}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{activeData?.lineSuggestion || (lang === 'zh' ? '1.2# - 1.5# 高强度 PE 线 (8编)' : '15-20lb Braided Line (PE 1.2-1.5)')}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? 'PE线零延展性提供极佳传导，8编工艺更圆滑，能有效增加抛投距离并降低风阻。' : 'Braid provides zero stretch for sensitivity. 8-strand weaving increases casting distance and reduces wind drag.'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {t.gearModal.labels.leader}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{activeData?.leaderSuggestion || (lang === 'zh' ? '3.0# - 4.0# 碳素前导线 (约 1.5m)' : '12-16lb Fluorocarbon Leader (1.5m)')}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? '碳素线耐磨性强，且在水中几乎透明，能防止主线被礁石磨断并降低鱼的警觉性。' : 'Fluoro is abrasion-resistant and invisible underwater, preventing cut-offs on rocks and spooking fish.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Float & Sinker */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-primary border-l-4 border-accent pl-2 uppercase tracking-wider">{t.gearModal.sections.lureBait}</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {t.gearModal.labels.lure}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{activeData?.baitSuggestion || (lang === 'zh' ? '10g-15g 沉水米诺或亮片' : '10g-15g Sinking Minnow or Spoon')}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? '根据当前水深推荐。沉水米诺能快速到达目标泳层，亮片则在光照充足时提供强烈的反光诱惑。' : 'Recommended based on depth. Sinking minnows reach the strike zone fast; spoons provide flash in high light.'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {t.gearModal.labels.tackle}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{activeData?.tackleSuggestion || (lang === 'zh' ? '#00 增强型加固别针 + 5g 快速子弹铅' : '#00 Power Snap + 5g Bullet Sinkers')}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? '加固别针防止大鱼拉开，子弹铅能增加抛投稳定性，并帮助假饵在强风中快速切入水面。' : 'Heavy-duty snaps prevent forced opens. Bullet sinkers increase stability and help lures cut through wind.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Safety & Others */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-primary border-l-4 border-accent pl-2 uppercase tracking-wider">{t.gearModal.sections.terminal}</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {lang === 'zh' ? '防护装备' : 'Protection'}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{lang === 'zh' ? '偏光太阳镜 + 防滑钓鱼鞋 (必备)' : 'Polarized Glasses + Non-Slip Shoes'}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? '偏光镜能消除水面反光，看清鱼情；防滑鞋在湿滑的岸边或礁石上是生命安全的保障。' : 'Polarized lenses eliminate surface glare; non-slip shoes are essential for safety on wet rocks or banks.'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group relative cursor-help">
                        <p className="text-[10px] text-text-light font-bold uppercase flex justify-between">
                          {lang === 'zh' ? '辅助工具' : 'Accessories'}
                          <Info size={10} />
                        </p>
                        <p className="text-sm font-medium">{lang === 'zh' ? '控鱼器 + 剪线钳 + 简易急救包' : 'Fish Grips + Line Cutters + First Aid Kit'}</p>
                        <div className="absolute inset-0 bg-primary/95 text-white p-3 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center leading-relaxed">
                          {lang === 'zh' ? '控鱼器能安全摘钩防止被鱼鳍刺伤，剪线钳和急救包是户外垂钓的标配工具。' : 'Grips allow safe hook removal. Cutters and first aid are standard requirements for outdoor fishing.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-success/10 border border-success/20 rounded-xl flex gap-3">
                  <ShieldCheck size={20} className="text-success flex-shrink-0" />
                  <p className="text-xs text-success font-medium leading-relaxed">
                    {lang === 'zh' 
                      ? `专家提示：当前的 ${(isForecastMode ? tomorrowWeather : weather)?.windSpeed}km/h 风速可能会影响抛投精准度，建议适当增加配重或选择顺风位作钓。`
                      : `Expert Tip: The current ${(isForecastMode ? tomorrowWeather : weather)?.windSpeed}km/h wind may affect casting accuracy. Consider adding weight or casting with the wind.`}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setIsGearModalOpen(false)}
                  className="px-8 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all shadow-md"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto p-8 text-center text-text-light text-[10px] uppercase tracking-widest">
        <p>{t.footer.copy}</p>
        <p className="mt-2 opacity-60 font-medium">{t.footer.disclaimer}</p>
      </footer>
    </div>
  );
}
