import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DailyTrendPoint } from '../../../../core/domain/models/analytics.model';
import { CHART_COLORS } from '../../../../shared/chart-tokens';

/**
 * Daily capacity breakdown. Where the React reference drew three grouped bars,
 * this stacks attended + no-show + free minutes to the full daily capacity and
 * overlays the effective-utilization % on a secondary axis — the stack makes the
 * "lost capacity" visually obvious and reuses the precomputed `freiMin`.
 */
@Component({
  selector: 'app-daily-trend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host{display:block;height:100%}'],
  imports: [NgxEchartsDirective],
  template: `
    <section class="flex h-full flex-col rounded border border-border bg-surface">
      <header class="flex items-center justify-between border-b border-border px-4 py-2">
        <div>
          <h2 class="text-[13px] font-semibold">Tagestrend</h2>
          <p class="text-[11px] text-muted-foreground">
            Kapazität vs. wahrgenommen, No-Shows als Säule
          </p>
        </div>
        <div class="flex gap-3 text-[11px] text-muted-foreground">
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-sm" [style.background]="'var(--primary)'"></span>
            Wahrgenommen
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-sm" [style.background]="'var(--border-strong)'"></span>
            Frei
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-sm" [style.background]="'var(--destructive)'"></span>
            No-Show
          </span>
        </div>
      </header>
      <div class="min-h-[320px] flex-1 p-2">
        <div echarts [options]="options()" class="h-full w-full"></div>
      </div>
    </section>
  `,
})
export class DailyTrend {
  readonly data = input.required<DailyTrendPoint[]>();

  protected readonly options = computed<EChartsOption>(() => {
    const points = this.data();
    return {
      grid: { top: 16, right: 40, bottom: 22, left: 40 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: CHART_COLORS.surface,
        borderColor: CHART_COLORS.borderStrong,
        borderWidth: 1,
        textStyle: { fontSize: 11, color: CHART_COLORS.foreground },
        formatter: (params) => {
          const arr = Array.isArray(params) ? params : [params];
          const idx = typeof arr[0]?.dataIndex === 'number' ? arr[0].dataIndex : 0;
          const p = points[idx];
          const head = `<div style="font-weight:600;margin-bottom:4px">${p?.label ?? ''}</div>`;
          const rows = arr
            .map((it) => {
              const unit = it.seriesName === 'Auslastung' ? ' %' : ' min';
              return `<div style="display:flex;justify-content:space-between;gap:16px"><span>${it.marker ?? ''} ${it.seriesName}</span><span style="font-variant-numeric:tabular-nums">${it.value}${unit}</span></div>`;
            })
            .join('');
          return head + rows;
        },
      },
      xAxis: {
        type: 'category',
        data: points.map((p) => p.label),
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisTick: { show: false },
        axisLabel: { fontSize: 10, color: CHART_COLORS.mutedForeground },
      },
      yAxis: [
        {
          type: 'value',
          splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } },
          axisLabel: { fontSize: 10, color: CHART_COLORS.mutedForeground },
        },
        {
          type: 'value',
          min: 0,
          max: 100,
          position: 'right',
          splitLine: { show: false },
          axisLabel: { fontSize: 10, color: CHART_COLORS.mutedForeground, formatter: '{value}%' },
        },
      ],
      series: [
        {
          name: 'Wahrgenommen',
          type: 'bar',
          stack: 'total',
          barWidth: '52%',
          itemStyle: { color: CHART_COLORS.primary },
          data: points.map((p) => p.wahrgenommenMin),
        },
        {
          name: 'No-Show',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: CHART_COLORS.destructive },
          data: points.map((p) => p.noShowMin),
        },
        {
          name: 'Frei',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: CHART_COLORS.borderStrong },
          data: points.map((p) => p.freiMin),
        },
        {
          name: 'Auslastung',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 5,
          lineStyle: { color: CHART_COLORS.warning, width: 1.5 },
          itemStyle: { color: CHART_COLORS.warning },
          data: points.map((p) => Math.round(p.auslastung * 100)),
        },
      ],
    };
  });
}
