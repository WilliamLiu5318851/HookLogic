import { AlertTriangle, ArrowRight, MapPin, Shield, Waves } from 'lucide-react';
import { RecommendationCard as RecommendationCardType } from '../types';

export function RecommendationTile({
  key: _key,
  recommendation,
  active,
  onSelect,
}: {
  key?: string;
  recommendation: RecommendationCardType;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[28px] border p-5 text-left transition ${
        active
          ? 'border-[var(--color-foam)] bg-[var(--color-panel-strong)] shadow-[0_18px_50px_rgba(6,29,43,0.18)]'
          : 'border-[var(--color-line)] bg-white/80 hover:border-[var(--color-foam)] hover:bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
            <MapPin size={14} />
            <span>{recommendation.spot.region}</span>
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-ink)]">{recommendation.spot.name}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{recommendation.summary}</p>
        </div>

        <div className="min-w-[92px] rounded-[24px] bg-[var(--color-ocean)] px-4 py-3 text-center text-white">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">推荐分</div>
          <div className="mt-1 text-3xl font-semibold">{recommendation.score}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {recommendation.primarySpecies.map((species) => (
          <span
            key={species.id}
            className="rounded-full bg-[var(--color-mist)] px-3 py-1 text-xs font-medium text-[var(--color-ocean)]"
          >
            {species.commonName}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-[var(--color-mist)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">最佳窗口</div>
          <div className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{recommendation.bestWindow}</div>
        </div>
        <div className="rounded-2xl bg-[var(--color-mist)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">数据置信度</div>
          <div className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{recommendation.confidenceLabel}</div>
        </div>
        <div className="rounded-2xl bg-[var(--color-mist)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">执行难度</div>
          <div className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
            {recommendation.spot.walkMinutes <= 6 ? '低' : recommendation.spot.walkMinutes <= 10 ? '中' : '偏高'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1">
          <Waves size={14} />
          {recommendation.spot.depthProfile}
        </span>
        <span className="inline-flex items-center gap-1">
          <Shield size={14} />
          安全门控 {recommendation.safetyGate.toFixed(2)}
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertTriangle size={14} />
          {recommendation.warnings[0] ?? '注意查看法规与安全提示'}
        </span>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ocean)]">
        查看详情
        <ArrowRight size={16} />
      </div>
    </button>
  );
}
