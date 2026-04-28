import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Binoculars,
  CalendarRange,
  CheckCircle2,
  Fish,
  LoaderCircle,
  LogIn,
  Map,
  MapPin,
  Navigation,
  NotebookTabs,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { ModeSwitch } from './components/ModeSwitch';
import { RecommendationTile } from './components/RecommendationCard';
import { createEmptyTrip } from './components/TripLogger';
import { speciesCatalog as fallbackSpeciesCatalog } from './data/catalog';
import {
  createFeedback,
  createTrip,
  fetchFeedback,
  fetchSpeciesCatalog,
  fetchSpeciesRecommendations,
  fetchSpotRecommendations,
  fetchTrips,
  searchLocations,
} from './services/apiClient';
import { EnvironmentBundle, ExperienceMode, LocationData, RecommendationCard, RecommendationFeedback, RecommendationFlow, SearchLocationResult, SpeciesProfile, TripRecord } from './types';

type ViewTab = 'home' | 'spots' | 'species' | 'journal';

function scoreLabel(score: number) {
  if (score >= 85) return '很值得去';
  if (score >= 70) return '可以去，条件较稳';
  if (score >= 55) return '能钓，但更看临场';
  if (score >= 40) return '不建议专程去';
  return '不推荐';
}

function formatLocationName(location: LocationData | null) {
  if (!location) return '未选择位置';
  return location.city ?? `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
}

export default function App() {
  const [mode, setMode] = useState<ExperienceMode>('beginner');
  const [viewTab, setViewTab] = useState<ViewTab>('home');
  const [flow, setFlow] = useState<RecommendationFlow>('spot-first');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchLocationResult[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentBundle | null>(null);
  const [loadingEnvironment, setLoadingEnvironment] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(fallbackSpeciesCatalog[0].id);
  const [speciesCatalog, setSpeciesCatalog] = useState<SpeciesProfile[]>(fallbackSpeciesCatalog);
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string>('');
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [feedback, setFeedback] = useState<RecommendationFeedback[]>([]);
  const [tripDraft, setTripDraft] = useState(createEmptyTrip());
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [serverTrips, serverFeedback, serverSpecies] = await Promise.all([
          fetchTrips(),
          fetchFeedback(),
          fetchSpeciesCatalog(),
        ]);
        setTrips(serverTrips);
        setFeedback(serverFeedback);
        setSpeciesCatalog(serverSpecies);
        if (serverSpecies[0]) setSelectedSpeciesId(serverSpecies[0].id);
      } catch (caughtError) {
        console.error(caughtError);
      }
    })();
  }, []);

  const selectedRecommendation =
    recommendations.find((item) => item.id === selectedRecommendationId) ?? recommendations[0] ?? null;

  useEffect(() => {
    if (recommendations[0] && recommendations[0].id !== selectedRecommendationId) {
      setSelectedRecommendationId(recommendations[0].id);
    }
  }, [selectedRecommendationId, recommendations]);

  async function loadRecommendations(lat: number, lon: number, activeFlow: RecommendationFlow, activeMode: ExperienceMode, name?: string, speciesId?: string) {
    setLoadingEnvironment(true);
    setError('');
    setSuccessMessage('');
    try {
      const response =
        activeFlow === 'species-first'
          ? await fetchSpeciesRecommendations({
              lat,
              lon,
              mode: activeMode,
              name,
              speciesId: speciesId ?? selectedSpeciesId,
            })
          : await fetchSpotRecommendations({
              lat,
              lon,
              mode: activeMode,
              name,
            });
      setLocation(response.location);
      setLocationName(response.locationName);
      setEnvironment(response.environment);
      setRecommendations(response.recommendations);
      setTripDraft((current) => ({
        ...current,
        mode: activeMode,
        spotId: response.recommendations[0]?.spot.id || current.spotId,
        intentSpeciesId: speciesId ?? selectedSpeciesId,
      }));
      setViewTab(activeFlow === 'species-first' ? 'species' : 'spots');
    } catch (caughtError) {
      console.error(caughtError);
      setError('API 获取失败，请先启动本地后端 `npm run api`。');
    } finally {
      setLoadingEnvironment(false);
    }
  }

  async function hydrateLocation(lat: number, lon: number, name?: string) {
    await loadRecommendations(lat, lon, flow, mode, name, selectedSpeciesId);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await searchLocations(query.trim());
      setSearchResults(results);
    } catch (caughtError) {
      console.error(caughtError);
      setError('位置搜索失败，请确认本地 API 已启动。');
    } finally {
      setSearching(false);
    }
  }

  async function detectLocation() {
    setLoadingEnvironment(true);
    setError('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
      });
      await hydrateLocation(position.coords.latitude, position.coords.longitude, 'Current location');
    } catch {
      await hydrateLocation(-33.9922, 151.1396, 'Sans Souci, NSW');
    }
  }

  useEffect(() => {
    if (!location) return;
    void loadRecommendations(location.latitude, location.longitude, flow, mode, locationName, selectedSpeciesId);
  }, [mode, flow, selectedSpeciesId]);

  async function saveTrip() {
    if (!selectedRecommendation) return;
    try {
      const nextTrip = await createTrip({
        ...tripDraft,
        spotId: selectedRecommendation.spot.id,
        intentSpeciesId: flow === 'species-first' ? selectedSpeciesId : selectedRecommendation.primarySpecies[0]?.id,
        mode,
      });
      setTrips((current) => [nextTrip, ...current].slice(0, 12));
      setTripDraft(createEmptyTrip());
      setSuccessMessage('trip 已写入后端记录');
    } catch (caughtError) {
      console.error(caughtError);
      setError('保存 trip 失败，请检查 API 服务。');
    }
  }

  async function saveFeedback(label: RecommendationFeedback['label'], reasonTags: string[]) {
    if (!selectedRecommendation) return;
    try {
      const nextFeedback = await createFeedback({
        recommendationId: selectedRecommendation.id,
        label,
        reasonTags,
      });
      setFeedback((current) => [nextFeedback, ...current].slice(0, 20));
      setSuccessMessage('反馈已提交到后端');
    } catch (caughtError) {
      console.error(caughtError);
      setError('提交反馈失败，请检查 API 服务。');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(119,209,208,0.24),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(206,126,69,0.18),_transparent_28%),linear-gradient(180deg,_rgba(244,241,233,0.82),_rgba(244,241,233,1))]" />

      <header className="relative z-10 border-b border-[var(--color-line)] bg-[rgba(6,29,43,0.92)] text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/8">
              <Fish size={28} className="text-[var(--color-sand)]" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/55">HookLogic Rebuild</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-[0.02em]">从算分原型，重构成钓鱼决策系统</h1>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <ModeSwitch mode={mode} onChange={setMode} />
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
              <span className="inline-flex items-center gap-2">
                <MapPin size={14} />
                {formatLocationName(location)}
              </span>
              {environment ? (
                <span className="inline-flex items-center gap-2">
                  <Waves size={14} />
                  {environment.tide.state} tide / {environment.weather.windSpeed.toFixed(0)} km/h
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[36px] border border-[var(--color-line)] bg-[rgba(6,29,43,0.94)] p-7 text-white shadow-[0_24px_80px_rgba(6,29,43,0.28)]">
            <div className="text-xs uppercase tracking-[0.24em] text-white/55">Framework-Aligned MVP</div>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">
              首页只保留三件事: 今天去哪钓、我想钓什么、记录与复盘。
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
              这版重构把产品主线改成“推荐 - 解释 - 执行 - 记录 - 反馈”闭环，先用规则引擎和安全/法规门控建立可信度，再为后续 ML 留数据接口。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { key: 'spots', title: '今天去哪钓', desc: 'Spot-first 推荐附近 3 个更稳妥的点。', icon: Map },
                { key: 'species', title: '我想钓什么', desc: 'Species-first 按目标鱼种找点和时间窗。', icon: Binoculars },
                { key: 'journal', title: '记录与复盘', desc: '把出钓结果、现场观察和反馈变成训练数据。', icon: NotebookTabs },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setViewTab(item.key as ViewTab);
                    setFlow(item.key === 'species' ? 'species-first' : 'spot-first');
                  }}
                  className={`rounded-[28px] border p-5 text-left transition ${
                    viewTab === item.key ? 'border-[var(--color-sand)] bg-white/12' : 'border-white/10 bg-white/6 hover:bg-white/10'
                  }`}
                >
                  <item.icon size={22} className="text-[var(--color-sand)]" />
                  <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/72">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-[var(--color-line)] bg-white/86 p-7 shadow-[0_18px_60px_rgba(6,29,43,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Launch Point</div>
                <h3 className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">先拿到实时环境，再启动推荐</h3>
              </div>
              {loadingEnvironment ? <LoaderCircle className="animate-spin text-[var(--color-ocean)]" /> : null}
            </div>

            <form onSubmit={handleSearch} className="mt-6">
              <label className="text-sm font-medium text-[var(--color-muted)]">搜索 NSW / Australia 附近钓点</label>
              <div className="mt-3 flex gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="例如 Sans Souci, Kiama, Port Hacking"
                    className="w-full rounded-[22px] border border-[var(--color-line)] bg-[var(--color-bg-soft)] py-4 pl-12 pr-4 text-sm outline-none transition focus:border-[var(--color-ocean)]"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-[22px] bg-[var(--color-ocean)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[var(--color-ocean-deep)]"
                >
                  {searching ? '搜索中' : '搜索'}
                </button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {searchResults.map((result) => (
                <button
                  key={`${result.lat}-${result.lon}`}
                  type="button"
                  onClick={() => hydrateLocation(result.lat, result.lon, `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}`)}
                  className="rounded-full border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-ocean)]"
                >
                  {result.name}
                  {result.postcode ? ` ${result.postcode}` : ''}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={detectLocation}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-white"
              >
                <Navigation size={16} />
                读取当前位置
              </button>
              <button
                type="button"
                onClick={() => hydrateLocation(-33.9922, 151.1396, 'Sans Souci, NSW')}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                <LogIn size={16} />
                直接进入 NSW 默认样例
              </button>
            </div>

            {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {successMessage ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 size={16} />
                {successMessage}
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-[30px] border border-[var(--color-line)] bg-white/88 p-6 shadow-[0_12px_36px_rgba(6,29,43,0.06)]">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Decision Guardrails</div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                    <ShieldCheck size={16} className="text-[var(--color-ocean)]" />
                    规则与安全优先
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    这次重构遵循报告中的乘法门控逻辑: 先看 legality 和 safety，再看 weighted score 与 confidence。
                  </p>
                </div>

                {environment?.notices.length ? (
                  <div className="rounded-[24px] bg-[var(--color-warning-soft)] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                      <AlertTriangle size={16} className="text-[var(--color-coral)]" />
                      当前预警
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-[var(--color-muted)]">
                      {environment.notices.map((notice) => (
                        <p key={notice.id}>{notice.title}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] bg-[var(--color-mist)] p-4 text-sm text-[var(--color-muted)]">
                    当前没有触发 hard-stop 预警，但仍需在执行前复核官方规则与天气。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--color-line)] bg-white/88 p-6 shadow-[0_12px_36px_rgba(6,29,43,0.06)]">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Environment Snapshot</div>
              {environment ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[var(--color-bg-soft)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Air Temp</div>
                      <div className="mt-2 text-2xl font-semibold">{environment.weather.temperature.toFixed(1)}°</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--color-bg-soft)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Wind</div>
                      <div className="mt-2 text-2xl font-semibold">{environment.weather.windSpeed.toFixed(0)} km/h</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--color-bg-soft)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Tide</div>
                      <div className="mt-2 text-lg font-semibold capitalize">{environment.tide.state}</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--color-bg-soft)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Moon</div>
                      <div className="mt-2 text-lg font-semibold">{environment.moon.phaseName}</div>
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-[var(--color-ocean)] p-4 text-white">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">Today stance</div>
                    <div className="mt-2 text-xl font-semibold">{recommendations[0] ? scoreLabel(recommendations[0].score) : '等待环境数据'}</div>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      新手模式优先给出更稳的地点与鱼种组合，Advanced 才把更多权重解释和复杂因子打开。
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                  还没选择位置。先搜索地点或读取 GPS，系统才会生成 spot-first / species-first 推荐。
                </p>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[var(--color-line)] bg-white/88 p-6 shadow-[0_12px_36px_rgba(6,29,43,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Recommendation Flows</div>
                  <h3 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
                    {flow === 'spot-first' ? 'Spot-first: 我就想去钓鱼' : 'Species-first: 我想钓某个鱼'}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFlow('spot-first');
                      setViewTab('spots');
                    }}
                    className={`rounded-full px-4 py-3 text-sm font-semibold ${
                      flow === 'spot-first' ? 'bg-[var(--color-ocean)] text-white' : 'border border-[var(--color-line)] text-[var(--color-ink)]'
                    }`}
                  >
                    今天去哪钓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlow('species-first');
                      setViewTab('species');
                    }}
                    className={`rounded-full px-4 py-3 text-sm font-semibold ${
                      flow === 'species-first' ? 'bg-[var(--color-ocean)] text-white' : 'border border-[var(--color-line)] text-[var(--color-ink)]'
                    }`}
                  >
                    我想钓什么
                  </button>
                </div>
              </div>

              {flow === 'species-first' ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {speciesCatalog.map((species) => (
                    <button
                      key={species.id}
                      type="button"
                      onClick={() => setSelectedSpeciesId(species.id)}
                      className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                        selectedSpeciesId === species.id
                          ? 'bg-[var(--color-sand)] text-[var(--color-ink)]'
                          : 'border border-[var(--color-line)] bg-white text-[var(--color-ink)]'
                      }`}
                    >
                      {species.commonName}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {location && environment ? (
                  recommendations.slice(0, 4).map((recommendation) => (
                    <RecommendationTile
                      key={recommendation.id}
                      recommendation={recommendation}
                      active={recommendation.id === selectedRecommendation?.id}
                      onSelect={() => setSelectedRecommendationId(recommendation.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[30px] border border-dashed border-[var(--color-line)] bg-white/72 p-8 text-sm leading-7 text-[var(--color-muted)]">
                    这里会出现重构后的推荐卡片。先选择位置，系统会根据实时天气、潮汐、月相和点位画像生成可解释推荐。
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-[30px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-6 shadow-[0_12px_36px_rgba(6,29,43,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Explainability</div>
                      <h4 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                        {selectedRecommendation ? selectedRecommendation.spot.name : '等待选择推荐'}
                      </h4>
                    </div>
                    {selectedRecommendation ? (
                      <div className="rounded-full bg-[var(--color-ocean)] px-4 py-2 text-sm font-semibold text-white">
                        {selectedRecommendation.score} / 100
                      </div>
                    ) : null}
                  </div>

                  {selectedRecommendation ? (
                    <div className="mt-5 space-y-5">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">为什么推荐</div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-muted)]">
                          {selectedRecommendation.reasons.map((reason) => (
                            <p key={reason}>{reason}</p>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">法规与安全</div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-muted)]">
                          {selectedRecommendation.regulationNotes.map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                          {selectedRecommendation.warnings.map((warning) => (
                            <p key={warning}>风险: {warning}</p>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">执行建议</div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-muted)]">
                          {selectedRecommendation.gearPlan.map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">权重拆解</div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {Object.entries(selectedRecommendation.breakdown).map(([key, value]) => (
                            <div key={key} className="rounded-2xl bg-white p-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{key}</div>
                              <div className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">选择一张推荐卡后，这里会展开解释权。</p>
                  )}
                </div>

                <div className="rounded-[30px] border border-[var(--color-line)] bg-white/88 p-6 shadow-[0_12px_36px_rgba(6,29,43,0.06)]">
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Feedback Loop</div>
                  <h4 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">这次推荐靠谱吗？</h4>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => saveFeedback('accurate', ['window-right', 'species-fit'])}
                      className="rounded-full bg-[var(--color-ocean)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      很准
                    </button>
                    <button
                      type="button"
                      onClick={() => saveFeedback('okay', ['safe-but-average'])}
                      className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      还行
                    </button>
                    <button
                      type="button"
                      onClick={() => saveFeedback('missed', ['spot-wrong', 'weather-missed'])}
                      className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      不准
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                    已累计反馈 {feedback.length} 条。下一阶段这些事件会直接进入推荐回放和权重调参。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--color-line)] bg-white/88 p-6 shadow-[0_12px_36px_rgba(6,29,43,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Trip Logging</div>
              <h3 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">记录与复盘</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
                报告里强调最有价值的不只是“钓到什么”，还有“现场发生了什么”。这块已经改成以 trip、observation 和 feedback 为核心。
              </p>
            </div>
            <div className="rounded-full bg-[var(--color-mist)] px-4 py-2 text-sm font-medium text-[var(--color-ocean)]">
              当前记录 {trips.length} 次出行
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[var(--color-muted)]">结果</label>
                <select
                  value={tripDraft.outcome}
                  onChange={(event) => setTripDraft({ ...tripDraft, outcome: event.target.value as TripRecord['outcome'] })}
                  className="mt-2 w-full rounded-[18px] border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm outline-none"
                >
                  <option value="caught">钓到了</option>
                  <option value="blank">空军</option>
                  <option value="left-early">提前撤退</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-muted)]">钓法</label>
                <input
                  value={tripDraft.method}
                  onChange={(event) => setTripDraft({ ...tripDraft, method: event.target.value })}
                  className="mt-2 w-full rounded-[18px] border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-muted)]">数量</label>
                <input
                  type="number"
                  value={tripDraft.catchCount}
                  onChange={(event) => setTripDraft({ ...tripDraft, catchCount: Number(event.target.value) })}
                  className="mt-2 w-full rounded-[18px] border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-muted)]">隐私级别</label>
                <select
                  value={tripDraft.privacyLevel}
                  onChange={(event) => setTripDraft({ ...tripDraft, privacyLevel: event.target.value as TripRecord['privacyLevel'] })}
                  className="mt-2 w-full rounded-[18px] border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm outline-none"
                >
                  <option value="private">完全私密</option>
                  <option value="water-only">仅公开水域名</option>
                  <option value="exact">公开精确点位</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[var(--color-muted)]">现场备注</label>
                <textarea
                  value={tripDraft.note}
                  onChange={(event) => setTripDraft({ ...tripDraft, note: event.target.value })}
                  rows={4}
                  placeholder="例如: 鸟群活跃，但风比预期大；码头边有小鱼群，退潮后明显转弱。"
                  className="mt-2 w-full rounded-[18px] border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-[var(--color-mist)] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ocean)]">
                <Sparkles size={16} />
                Observation Layer
              </div>
              <div className="mt-4 space-y-3 text-sm text-[var(--color-ink)]">
                {[
                  ['baitfishSeen', '有小鱼群'],
                  ['birdActivity', '有鸟群'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(tripDraft.observation[key as 'baitfishSeen' | 'birdActivity'])}
                      onChange={(event) =>
                        setTripDraft({
                          ...tripDraft,
                          observation: {
                            ...tripDraft.observation,
                            [key]: event.target.checked,
                          },
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={saveTrip}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-ocean)] px-4 py-3 text-sm font-semibold text-white"
              >
                <CalendarRange size={16} />
                保存这次 trip
              </button>

              <div className="mt-6 border-t border-[var(--color-line)] pt-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Recent entries</div>
                <div className="mt-3 space-y-3">
                  {trips.slice(0, 3).map((trip) => (
                    <div key={trip.id} className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-sm font-semibold text-[var(--color-ink)]">{trip.outcome === 'caught' ? '有收获' : trip.outcome === 'blank' ? '空军' : '提前撤退'}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                        {new Date(trip.createdAt).toLocaleString()} / {trip.method} / {trip.privacyLevel}
                      </div>
                    </div>
                  ))}
                  {!trips.length ? <p className="text-sm text-[var(--color-muted)]">还没有出钓记录。</p> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
