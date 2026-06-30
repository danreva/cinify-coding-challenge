import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DoctorLoadRow } from '../../../../core/domain/models/analytics.model';

interface RowView extends DoctorLoadRow {
  pct: number;
  barColor: string;
}

function toneFor(pct: number): string {
  if (pct > 90) return 'var(--destructive)';
  if (pct > 75) return 'var(--warning)';
  return 'var(--primary)';
}

/** Per-doctor utilization list (attended minutes / per-doctor capacity). */
@Component({
  selector: 'app-doctor-load',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host{display:block;height:100%}'],
  template: `
    <section class="flex h-full flex-col rounded border border-border bg-surface">
      <header class="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 class="text-[13px] font-semibold">Ärzte &amp; Auslastung</h2>
        <span class="text-[11px] text-muted-foreground">diese Woche</span>
      </header>
      <div class="flex-1 divide-y divide-border">
        @for (d of rows(); track d.name) {
          <div class="flex items-center gap-3 px-4 py-2.5">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10.5px] font-semibold text-foreground/80"
            >
              {{ d.initials }}
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <div class="flex items-baseline justify-between">
                <span class="truncate text-[12.5px] font-medium">{{ d.name }}</span>
                <span class="text-[12px] font-semibold tnum">{{ d.pct }} %</span>
              </div>
              <div class="mt-1 h-1.5 rounded-sm bg-muted">
                <div
                  class="h-full rounded-sm"
                  [style.width.%]="d.pct"
                  [style.background]="d.barColor"
                ></div>
              </div>
              <div
                class="mt-1 flex items-center justify-between text-[10.5px] text-muted-foreground"
              >
                <span class="truncate">{{ d.schwerpunkt }}</span>
                <span class="tnum shrink-0">{{ d.seen }} wahrg. · {{ d.noShow }} No-Show</span>
              </div>
            </div>
          </div>
        } @empty {
          <div class="px-4 py-6 text-center text-[12px] text-muted-foreground">
            Keine Termine in dieser Woche.
          </div>
        }
      </div>
    </section>
  `,
})
export class DoctorLoad {
  readonly data = input.required<DoctorLoadRow[]>();

  protected readonly rows = computed<RowView[]>(() =>
    this.data().map((d) => {
      const pct = Math.round(d.load * 100);
      return { ...d, pct: Math.min(100, pct), barColor: toneFor(pct) };
    }),
  );
}
