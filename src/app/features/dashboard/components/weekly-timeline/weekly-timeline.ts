import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type {
  EChartsOption,
  LineSeriesOption,
  MarkAreaComponentOption,
  MarkLineComponentOption,
} from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  Activity,
  Clock,
  LucideAngularModule,
  LucideIconData,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-angular';
import { PraxisConfig } from '../../../../core/config/opening-hours.token';
import { Appointment } from '../../../../core/domain/models/appointment.model';
import {
  TimelineFilters,
  TimelinePoint,
  TimelineStats,
} from '../../../../core/domain/models/analytics.model';
import { buildTimeline, smoothTimeline } from '../../../../core/domain/analytics/timeline';
import {
  CHART_COLORS,
  CHART_FONT_MONO,
  DAY_BAND_ACCENTS,
  DAY_BAND_FILLS,
} from '../../../../shared/chart-tokens';

type MarkLineData = NonNullable<MarkLineComponentOption['data']>;
type MarkAreaData = NonNullable<MarkAreaComponentOption['data']>;
type BucketMin = 15 | 30 | 60;

interface MiniStat {
  label: string;
  value: string;
  sub: string;
  toneClass: string;
  icon?: LucideIconData;
  iconClass?: string;
}

interface DayBand {
  dayLabel: string;
  span: number;
  hours: string;
  accent: string;
}

const BUCKETS: { v: BucketMin; label: string }[] = [
  { v: 15, label: '15 min' },
  { v: 30, label: '30 min' },
  { v: 60, label: '60 min' },
];

const SMOOTH_WINDOW = 3;

/**
 * Intraday utilization timeline for the week — the interactive centerpiece.
 * Filtering (doctor / treatment / bucket size) and view toggles are local UI
 * state (signals); the underlying series is recomputed in-component via the pure
 * `buildTimeline`, since it depends on filters that don't belong in the store.
 * Lunch buckets are intentionally absent (see analytics/timeline.ts), so unlike
 * the React reference there is no midday shading.
 */
@Component({
  selector: 'app-weekly-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective, LucideAngularModule],
  template: `
    <section class="flex flex-col rounded border border-border bg-surface">
      <header class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2">
        <div class="mr-auto">
          <h2 class="text-[13px] font-semibold">
            Wochen-Timeline · Auslastung pro Zeitfenster
          </h2>
          <p class="text-[11px] text-muted-foreground">{{ subtitle() }}</p>
        </div>

        <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <lucide-icon [img]="usersIcon" [size]="12" />
          <span>Arzt</span>
          <select
            [value]="arzt()"
            (change)="onArzt($event)"
            class="h-6 rounded border border-border bg-surface px-1.5 text-[11px] text-foreground tnum focus:border-primary focus:outline-none"
          >
            @for (o of arztOptions(); track o) {
              <option [value]="o">{{ o === 'ALL' ? 'Alle' : o }}</option>
            }
          </select>
        </label>

        <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <lucide-icon [img]="activityIcon" [size]="12" />
          <span>Behandlung</span>
          <select
            [value]="behandlung()"
            (change)="onBehandlung($event)"
            class="h-6 rounded border border-border bg-surface px-1.5 text-[11px] text-foreground tnum focus:border-primary focus:outline-none"
          >
            @for (o of behandlungOptions(); track o) {
              <option [value]="o">{{ o === 'ALL' ? 'Alle' : o }}</option>
            }
          </select>
        </label>

        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <lucide-icon [img]="clockIcon" [size]="12" />
          <div class="flex overflow-hidden rounded border border-border">
            @for (b of buckets; track b.v) {
              <button
                type="button"
                (click)="bucket.set(b.v)"
                [class]="
                  bucket() === b.v
                    ? 'px-2 py-0.5 text-[11px] tnum bg-primary text-primary-foreground'
                    : 'px-2 py-0.5 text-[11px] tnum bg-surface text-foreground hover:bg-surface-2'
                "
              >
                {{ b.label }}
              </button>
            }
          </div>
        </div>

        <div class="flex items-center gap-2 border-l border-border pl-3 text-[11px]">
          <button type="button" (click)="zielLinie.set(!zielLinie())" [class]="toggleClass(zielLinie())">
            <lucide-icon [img]="targetIcon" [size]="12" /> Ziel 80 %
          </button>
          <button type="button" (click)="showNoShow.set(!showNoShow())" [class]="toggleClass(showNoShow())">
            No-Show
          </button>
          <button type="button" (click)="glaetten.set(!glaetten())" [class]="toggleClass(glaetten())">
            Glätten
          </button>
          <button type="button" (click)="markPeaks.set(!markPeaks())" [class]="toggleClass(markPeaks())">
            <lucide-icon [img]="sparklesIcon" [size]="12" /> Peaks
          </button>
        </div>
      </header>

      <div class="grid grid-cols-4 divide-x divide-border border-b border-border bg-surface-2/40">
        @for (m of miniStats(); track m.label) {
          <div class="flex flex-col px-4 py-2">
            <span
              class="flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-muted-foreground"
            >
              @if (m.icon) {
                <lucide-icon [img]="m.icon" [size]="12" [class]="m.iconClass ?? ''" />
              }
              {{ m.label }}
            </span>
            <span class="text-[15px] font-semibold tnum {{ m.toneClass }}">{{ m.value }}</span>
            @if (m.sub) {
              <span class="text-[10.5px] text-muted-foreground tnum">{{ m.sub }}</span>
            }
          </div>
        }
      </div>

      <div class="h-[360px] px-2 pb-2 pt-3" [style.background]="chartBg">
        <div echarts [options]="options()" class="h-full w-full"></div>
      </div>

      <div class="flex items-stretch border-t border-border bg-surface-2/40 pl-[36px] pr-[18px]">
        @for (d of dayBands(); track d.dayLabel) {
          <div
            class="flex items-center justify-between gap-2 border-l border-border/70 px-2.5 py-1.5 first:border-l-0"
            [style.flex]="d.span + ' 1 0'"
            [style.font-family]="fontMono"
          >
            <span class="flex min-w-0 items-center gap-1.5">
              <span
                class="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground/80"
              >
                {{ d.dayLabel }}
              </span>
            </span>
            <span class="text-[9.5px] uppercase tracking-wider text-muted-foreground tnum">
              {{ d.hours }}
            </span>
          </div>
        }
      </div>

      <footer
        class="flex items-center gap-4 border-t border-border bg-surface-2/40 px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"
        [style.font-family]="fontMono"
      >
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-0 w-3.5 border-t-2" [style.border-top-color]="primary"></span>
          Auslastung
        </span>
        <span class="flex items-center gap-1.5">
          <span
            class="inline-block h-0 w-3.5 border-t-2"
            [style.border-top-color]="destructive"
          ></span>
          No-Show
        </span>
        <span class="flex items-center gap-1.5">
          <span
            class="inline-block h-0 w-3.5 border-t border-dashed"
            [style.border-top-color]="mutedForeground"
          ></span>
          Target 80
        </span>
        <span class="ml-auto flex items-center gap-3 tnum">
          @if (kw()) {
            <span>PRAXIS · KW {{ kw() }}</span>
            <span class="text-muted-foreground/60">|</span>
          }
          <span>{{ display().length }} PT · {{ bucket() }}-MIN</span>
        </span>
      </footer>
    </section>
  `,
})
export class WeeklyTimeline {
  readonly week = input.required<Appointment[]>();
  readonly config = input.required<PraxisConfig>();
  readonly doctors = input.required<string[]>();
  readonly behandlungen = input.required<string[]>();
  readonly kw = input<string>('');

  // Local UI state.
  protected readonly arzt = signal<string>('ALL');
  protected readonly behandlung = signal<string>('ALL');
  protected readonly bucket = signal<BucketMin>(15);
  protected readonly zielLinie = signal(true);
  protected readonly showNoShow = signal(true);
  protected readonly glaetten = signal(true);
  protected readonly markPeaks = signal(true);

  protected readonly buckets = BUCKETS;
  protected readonly usersIcon = Users;
  protected readonly activityIcon = Activity;
  protected readonly clockIcon = Clock;
  protected readonly targetIcon = Target;
  protected readonly sparklesIcon = Sparkles;
  protected readonly fontMono = CHART_FONT_MONO;
  protected readonly primary = CHART_COLORS.primary;
  protected readonly destructive = CHART_COLORS.destructive;
  protected readonly mutedForeground = CHART_COLORS.mutedForeground;
  protected readonly chartBg = 'color-mix(in oklab, var(--surface) 96%, var(--primary) 4%)';

  protected readonly arztOptions = computed<string[]>(() => ['ALL', ...this.doctors()]);
  protected readonly behandlungOptions = computed<string[]>(() => ['ALL', ...this.behandlungen()]);

  private readonly filters = computed<TimelineFilters>(() => ({
    arzt: this.arzt(),
    behandlung: this.behandlung(),
    bucketMin: this.bucket(),
  }));

  private readonly timeline = computed(() =>
    buildTimeline(this.week(), this.filters(), this.config()),
  );

  protected readonly display = computed<TimelinePoint[]>(() =>
    this.glaetten() ? smoothTimeline(this.timeline().points, SMOOTH_WINDOW) : this.timeline().points,
  );

  private readonly stats = computed<TimelineStats>(() => this.timeline().stats);

  protected readonly subtitle = computed(() => {
    const arzt = this.arzt() === 'ALL' ? 'alle Ärzte' : this.arzt();
    const beh = this.behandlung() === 'ALL' ? 'alle Behandlungsarten' : this.behandlung();
    return `Mo–Fr · Praxiszeiten · ${arzt} · ${beh} · ${this.bucket()}-min-Slots`;
  });

  protected readonly miniStats = computed<MiniStat[]>(() => {
    const s = this.stats();
    const avgTone =
      s.avg >= 80 ? 'text-success' : s.avg >= 60 ? 'text-warning' : 'text-destructive';
    return [
      { label: 'Ø Auslastung', value: `${s.avg} %`, sub: '', toneClass: avgTone },
      {
        label: 'Peak',
        value: s.peak ? `${s.peak.auslastungPct} %` : '–',
        sub: s.peak ? `${s.peak.dayLabel} · ${s.peak.timeLabel}` : '',
        toneClass: 'text-foreground',
        icon: TrendingUp,
        iconClass: 'text-success',
      },
      {
        label: 'Tiefpunkt',
        value: s.low ? `${s.low.auslastungPct} %` : '–',
        sub: s.low ? `${s.low.dayLabel} · ${s.low.timeLabel}` : '',
        toneClass: 'text-foreground',
        icon: TrendingDown,
        iconClass: 'text-warning',
      },
      {
        label: 'No-Show-Slots',
        value: `${s.noShowSlots}`,
        sub: `Ø ${s.noShowAvg} % der Kapazität`,
        toneClass: s.noShowAvg > 10 ? 'text-destructive' : 'text-foreground',
      },
    ];
  });

  protected readonly dayBands = computed<DayBand[]>(() => {
    const pts = this.display();
    const starts = pts.filter((p) => p.isDayStart);
    return starts.map((d, i) => {
      const next = starts[i + 1];
      const span = (next ? next.idx : pts.length) - d.idx;
      const dayPts = pts.filter((p) => p.dayIdx === d.dayIdx);
      const first = dayPts[0]?.timeLabel ?? '';
      const last = dayPts[dayPts.length - 1]?.timeLabel ?? '';
      return {
        dayLabel: d.dayLabel,
        span,
        hours: `${first} – ${last}`,
        accent: DAY_BAND_ACCENTS[d.dayIdx % DAY_BAND_ACCENTS.length],
      };
    });
  });

  protected readonly options = computed<EChartsOption>(() => {
    const display = this.display();
    const stats = this.stats();
    const dayStarts = display.filter((p) => p.isDayStart);

    const markLines: MarkLineData = [];
    if (this.zielLinie()) {
      markLines.push({
        yAxis: 80,
        lineStyle: { color: CHART_COLORS.mutedForeground, type: 'dashed', opacity: 0.6 },
        label: {
          formatter: 'TARGET 80%',
          position: 'end',
          color: CHART_COLORS.mutedForeground,
          fontSize: 9,
          fontFamily: CHART_FONT_MONO,
        },
      });
    }
    // Shade each weekday with its own tint so day boundaries read at a glance
    // (replaces the old vertical separator lines).
    const lastIdx = display.length ? display[display.length - 1].idx : 0;
    const dayAreas: MarkAreaData = dayStarts.map((d, i) => {
      const next = dayStarts[i + 1];
      return [
        { xAxis: String(d.idx), itemStyle: { color: DAY_BAND_FILLS[d.dayIdx % DAY_BAND_FILLS.length] } },
        { xAxis: String(next ? next.idx : lastIdx) },
      ];
    });
    if (this.markPeaks() && stats.peak) {
      markLines.push({
        xAxis: String(stats.peak.idx),
        lineStyle: { color: CHART_COLORS.success, type: 'dashed', opacity: 0.6 },
        label: {
          formatter: `▲ ${stats.peak.auslastungPct}%`,
          position: 'end',
          color: CHART_COLORS.success,
          fontSize: 10,
          fontWeight: 'bold',
          fontFamily: CHART_FONT_MONO,
        },
      });
    }
    if (this.markPeaks() && stats.low) {
      markLines.push({
        xAxis: String(stats.low.idx),
        lineStyle: { color: CHART_COLORS.warning, type: 'dashed', opacity: 0.6 },
        label: {
          formatter: `▼ ${stats.low.auslastungPct}%`,
          position: 'end',
          color: CHART_COLORS.warning,
          fontSize: 10,
          fontWeight: 'bold',
          fontFamily: CHART_FONT_MONO,
        },
      });
    }

    const series: LineSeriesOption[] = [
      {
        name: 'Auslastung',
        type: 'line',
        step: 'end',
        symbol: 'none',
        showSymbol: false,
        lineStyle: { color: CHART_COLORS.primary, width: 1.75 },
        itemStyle: { color: CHART_COLORS.primary },
        emphasis: { focus: 'series' },
        data: display.map((p) => p.auslastungPct),
        markLine: { symbol: 'none', silent: true, data: markLines },
        markArea: { silent: true, data: dayAreas },
      },
    ];
    if (this.showNoShow()) {
      series.push({
        name: 'No-Show',
        type: 'line',
        step: 'end',
        symbol: 'none',
        showSymbol: false,
        lineStyle: { color: CHART_COLORS.destructive, width: 1.25, opacity: 0.9 },
        itemStyle: { color: CHART_COLORS.destructive },
        data: display.map((p) => p.noShowPct),
      });
    }

    return {
      grid: { top: 16, right: 18, bottom: 20, left: 36 },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: { color: CHART_COLORS.primary, type: 'dashed', opacity: 0.6 },
        },
        backgroundColor: CHART_COLORS.surface,
        borderColor: CHART_COLORS.borderStrong,
        borderWidth: 1,
        textStyle: { fontSize: 11, color: CHART_COLORS.foreground },
        formatter: (params) => {
          const arr = Array.isArray(params) ? params : [params];
          const idx = typeof arr[0]?.dataIndex === 'number' ? arr[0].dataIndex : 0;
          const p = display[idx];
          if (!p) return '';
          const head = `<div style="display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid ${CHART_COLORS.border};padding-bottom:4px;margin-bottom:4px"><span style="font-weight:600">${p.dayLabel}</span><span style="color:${CHART_COLORS.mutedForeground};font-variant-numeric:tabular-nums">${p.timeLabel}</span></div>`;
          const rows = arr
            .map(
              (it) =>
                `<div style="display:flex;justify-content:space-between;gap:16px"><span>${it.marker ?? ''} ${it.seriesName}</span><span style="font-weight:600;font-variant-numeric:tabular-nums">${it.value} %</span></div>`,
            )
            .join('');
          const foot = `<div style="margin-top:4px;border-top:1px solid ${CHART_COLORS.border};padding-top:4px;color:${CHART_COLORS.mutedForeground};font-variant-numeric:tabular-nums">${p.busy} / ${p.capacity} Slot-Minuten belegt</div>`;
          return head + rows + foot;
        },
      },
      xAxis: {
        type: 'category',
        data: display.map((p) => String(p.idx)),
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          interval: 0,
          hideOverlap: true,
          fontSize: 9.5,
          color: CHART_COLORS.mutedForeground,
          fontFamily: CHART_FONT_MONO,
          formatter: (_value: string, index: number) => {
            const p = display[index];
            return p && p.minuteOfDay % 120 === 0 ? p.timeLabel : '';
          },
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: CHART_COLORS.border, opacity: 0.7 } },
        axisLabel: {
          fontSize: 9.5,
          color: CHART_COLORS.mutedForeground,
          fontFamily: CHART_FONT_MONO,
        },
      },
      series,
    };
  });

  protected onArzt(event: Event): void {
    this.arzt.set((event.target as HTMLSelectElement).value);
  }

  protected onBehandlung(event: Event): void {
    this.behandlung.set((event.target as HTMLSelectElement).value);
  }

  protected toggleClass(on: boolean): string {
    const base = 'flex items-center gap-1 rounded border px-1.5 py-0.5 transition-colors';
    return on
      ? `${base} border-primary/40 bg-primary/10 text-primary`
      : `${base} border-border bg-surface text-muted-foreground hover:bg-surface-2`;
  }
}
