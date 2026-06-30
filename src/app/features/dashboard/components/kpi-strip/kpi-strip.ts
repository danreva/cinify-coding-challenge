import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  LucideAngularModule,
  LucideIconData,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-angular';
import { KpiSummary } from '../../../../core/domain/models/analytics.model';

/** Whether the delta is a percentage-point difference or a relative change. */
type DeltaUnit = 'pp' | 'rel';

interface TileSpec {
  label: string;
  value: string;
  sub: string;
  delta: number;
  unit: DeltaUnit;
  /** For no-show a falling value is the good direction. */
  positiveIsGood: boolean;
}

interface TileView {
  label: string;
  value: string;
  sub: string;
  icon: LucideIconData;
  deltaText: string;
  colorClass: string;
}

const fmtPct = (n: number, digits = 1): string => `${(n * 100).toFixed(digits)} %`;

/** Below this the change is treated as flat (muted, no good/bad colour). */
const FLAT_EPS = 0.002;

/**
 * Headline KPI row. Unlike the React reference — which hardcodes the deltas —
 * this binds the real signed deltas from {@link KpiSummary}. Auslastung and
 * no-show deltas are percentage points (`Pp`); termine and Ø-Dauer are relative
 * changes (`%`). When there is no previous week, deltas collapse to "—".
 */
@Component({
  selector: 'app-kpi-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="grid grid-cols-4 gap-px overflow-hidden rounded border border-border bg-border">
      @for (t of tiles(); track t.label) {
        <div class="flex flex-col gap-1 bg-surface px-4 py-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] uppercase tracking-wide text-muted-foreground">
              {{ t.label }}
            </span>
            <span class="flex items-center gap-0.5 text-[11px] tnum {{ t.colorClass }}">
              <lucide-icon [img]="t.icon" [size]="12" />
              {{ t.deltaText }}
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-[24px] font-semibold tracking-tight tnum">{{ t.value }}</span>
            <span class="text-[10px] text-muted-foreground">vs. Vorwoche</span>
          </div>
          <span class="text-[11px] text-muted-foreground">{{ t.sub }}</span>
        </div>
      }
    </div>
  `,
})
export class KpiStrip {
  readonly kpis = input.required<KpiSummary>();

  protected readonly tiles = computed<TileView[]>(() => {
    const k = this.kpis();
    const specs: TileSpec[] = [
      {
        label: 'Auslastung (effektiv)',
        value: fmtPct(k.auslastungEffektiv),
        sub: `gebucht ${fmtPct(k.auslastungGebucht, 0)} · Lücke ${fmtPct(k.luecke)}`,
        delta: k.deltaAuslastung,
        unit: 'pp',
        positiveIsGood: true,
      },
      {
        label: 'No-Show-Rate',
        value: fmtPct(k.noShowRate),
        sub: `${k.noShow} von ${k.termineTotal} Terminen`,
        delta: k.deltaNoShow,
        unit: 'pp',
        positiveIsGood: false,
      },
      {
        label: 'Termine (Woche)',
        value: `${k.termineTotal}`,
        sub: 'gebucht inkl. No-Shows',
        delta: k.deltaTermine,
        unit: 'rel',
        positiveIsGood: true,
      },
      {
        label: 'Ø Behandlungsdauer',
        value: `${k.avgDauer.toFixed(1)} min`,
        sub: 'wahrgenommene Termine',
        delta: k.deltaAvgDauer,
        unit: 'rel',
        positiveIsGood: true,
      },
    ];
    return specs.map((s) => this.toView(s, k.hasPrev));
  });

  private toView(s: TileSpec, hasPrev: boolean): TileView {
    const flat = !hasPrev || Math.abs(s.delta) < FLAT_EPS;
    const good = s.positiveIsGood ? s.delta > 0 : s.delta < 0;
    const icon = flat ? Minus : s.delta > 0 ? TrendingUp : TrendingDown;
    const colorClass = flat
      ? 'text-muted-foreground'
      : good
        ? 'text-success'
        : 'text-destructive';
    const unitLabel = s.unit === 'pp' ? 'Pp' : '%';
    const deltaText = hasPrev ? `${(Math.abs(s.delta) * 100).toFixed(1)} ${unitLabel}` : '—';
    return { label: s.label, value: s.value, sub: s.sub, icon, deltaText, colorClass };
  }
}
