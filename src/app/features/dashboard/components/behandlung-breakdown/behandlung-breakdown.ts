import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BehandlungRow } from '../../../../core/domain/models/analytics.model';

interface RowView extends BehandlungRow {
  color: string;
  widthPct: number;
}

/**
 * Palette cycled by index. The React reference keyed colours by fixed treatment
 * names ("Vorsorge", "Akut", …) that don't exist in this dataset, so we assign
 * the chart tokens positionally instead — stable because rows are sorted by count.
 */
const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--muted-foreground)',
];

/** Treatment-type distribution with per-type no-show counts. */
@Component({
  selector: 'app-behandlung-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host{display:block;height:100%}'],
  template: `
    <section class="flex h-full flex-col rounded border border-border bg-surface">
      <header class="flex items-center justify-between border-b border-border px-4 py-2">
        <div>
          <h2 class="text-[13px] font-semibold">Behandlungsarten</h2>
          <p class="text-[11px] text-muted-foreground">Anteil &amp; No-Show pro Behandlung</p>
        </div>
        <span class="text-[11px] text-muted-foreground tnum">{{ total() }} Termine gesamt</span>
      </header>
      <div class="flex-1 p-3">
        <div
          class="grid items-center gap-x-3 gap-y-2 text-[11.5px]"
          [style.grid-template-columns]="gridCols"
        >
          <div class="text-[10.5px] uppercase tracking-wide text-muted-foreground">Art</div>
          <div class="text-[10.5px] uppercase tracking-wide text-muted-foreground">Verteilung</div>
          <div class="text-right text-[10.5px] uppercase tracking-wide text-muted-foreground">
            Anzahl
          </div>
          <div class="text-right text-[10.5px] uppercase tracking-wide text-muted-foreground">
            No-Show
          </div>

          @for (r of rows(); track r.name) {
            <div class="flex min-w-0 items-center gap-1.5">
              <span class="h-2 w-2 shrink-0 rounded-sm" [style.background]="r.color"></span>
              <span class="truncate" [title]="r.name">{{ r.name }}</span>
            </div>
            <div class="h-2 rounded-sm bg-muted">
              <div
                class="h-full rounded-sm"
                [style.width.%]="r.widthPct"
                [style.background]="r.color"
              ></div>
            </div>
            <div class="text-right tnum">{{ r.count }}</div>
            <div class="text-right tnum text-destructive/90">
              {{ r.noShow > 0 ? r.noShow : '—' }}
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class BehandlungBreakdown {
  readonly data = input.required<BehandlungRow[]>();

  protected readonly gridCols = '130px 1fr 44px 56px';

  protected readonly total = computed(() => this.data().reduce((s, r) => s + r.count, 0));

  protected readonly rows = computed<RowView[]>(() => {
    const data = this.data();
    const max = data.reduce((m, r) => Math.max(m, r.count), 0);
    return data.map((r, i) => ({
      ...r,
      color: PALETTE[i % PALETTE.length] as string,
      widthPct: max > 0 ? (r.count / max) * 100 : 0,
    }));
  });
}
