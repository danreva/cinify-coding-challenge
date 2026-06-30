import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HeatmapResult } from '../../../../core/domain/analytics/heatmap';
import { AppointmentStatus } from '../../../../core/domain/models/appointment.model';
import { DAY_LABELS, doctorInitials, formatHHmm } from '../../../../core/domain/util/time';

interface ApptView {
  time: string;
  initials: string;
  doctor: string;
  behandlung: string;
  statusLabel: string;
  statusClass: string;
}

interface CellView {
  day: string;
  closed: boolean;
  util: number;
  noShow: number;
  bg: string;
  color: string;
  title: string;
  /** Tailwind classes positioning the hover popover so it stays on screen. */
  popClass: string;
  appts: ApptView[];
}

interface RowView {
  hour: number;
  hourLabel: string;
  cells: CellView[];
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Display label + badge classes per appointment status (popover rows). */
const STATUS_VIEW: Record<AppointmentStatus, { label: string; cls: string }> = {
  [AppointmentStatus.Attended]: { label: 'wahrgenommen', cls: 'bg-success/10 text-success' },
  [AppointmentStatus.NoShow]: { label: 'No-Show', cls: 'bg-destructive/10 text-destructive' },
  [AppointmentStatus.Cancelled]: { label: 'abgesagt', cls: 'bg-muted text-muted-foreground' },
  [AppointmentStatus.Unknown]: { label: 'unbekannt', cls: 'bg-muted text-muted-foreground' },
};

/** Light→primary teal scale via color-mix; matches the React reference. */
function fillFor(util: number): string {
  const a = Math.min(1, Math.max(0.04, util));
  return `color-mix(in oklab, var(--primary) ${Math.round(a * 100)}%, var(--surface))`;
}

const CLOSED_FILL =
  'repeating-linear-gradient(45deg, var(--surface-2) 0 4px, transparent 4px 8px)';

/** Hour × weekday utilization heatmap (effective: attended / capacity). */
@Component({
  selector: 'app-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host{display:block;height:100%}'],
  template: `
    <section class="flex flex-col rounded border border-border bg-surface">
      <header class="flex items-center justify-between border-b border-border px-4 py-2">
        <div>
          <h2 class="text-[13px] font-semibold">Wochen-Heatmap · Auslastung pro Stunde</h2>
          <p class="text-[11px] text-muted-foreground">
            Farbintensität = effektive Auslastung (wahrgenommen / Kapazität) · Zelle überfahren für
            Termine
          </p>
        </div>
        <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>0 %</span>
          <div class="h-2 w-32 rounded-sm" [style.background]="legendGradient"></div>
          <span>100 %</span>
        </div>
      </header>

      <div class="p-3">
        <div class="grid gap-1" [style.grid-template-columns]="gridCols">
          <div></div>
          @for (d of dayLabels; track d) {
            <div class="px-1 pb-1 text-center text-[11px] font-medium text-muted-foreground">
              {{ d }}
            </div>
          }

          @for (row of rows(); track row.hour) {
            <div
              class="flex items-center justify-end pr-2 text-[10.5px] text-muted-foreground tnum"
            >
              {{ row.hourLabel }}
            </div>
            @for (cell of row.cells; track cell.day) {
              <div
                class="group relative flex h-9 items-center justify-center rounded-sm border border-border/60 text-[10.5px] tnum"
                [style.background]="cell.bg"
                [style.color]="cell.color"
                [title]="cell.title"
              >
                @if (cell.closed) {
                  <span class="text-[10px] text-muted-foreground">—</span>
                } @else {
                  <span class="font-medium">{{ cell.util }}</span>
                  @if (cell.noShow > 0) {
                    <span
                      class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                      [style.background]="'var(--destructive)'"
                    ></span>
                  }

                  @if (cell.appts.length) {
                    <!-- Hover popover: lists the appointments that fall in this hour.
                         pt-1/pb-1 sit inside the absolute box so there is no dead gap
                         between cell and card (keeps :hover alive while moving across). -->
                    <div class="absolute z-30 hidden group-hover:block {{ cell.popClass }}">
                      <div
                        class="w-64 rounded border border-border bg-surface text-left text-foreground shadow-lg"
                      >
                        <div
                          class="flex items-center justify-between border-b border-border px-2.5 py-1.5"
                        >
                          <span class="text-[11px] font-semibold">
                            {{ cell.day }} {{ row.hourLabel }}
                          </span>
                          <span class="text-[10.5px] text-muted-foreground tnum">
                            {{ cell.util }} % · {{ cell.appts.length }} Termine
                          </span>
                        </div>
                        <ul class="max-h-48 divide-y divide-border overflow-y-auto">
                          @for (a of cell.appts; track $index) {
                            <li class="flex items-center gap-2 px-2.5 py-1.5">
                              <span class="w-9 shrink-0 text-[11px] text-muted-foreground tnum">
                                {{ a.time }}
                              </span>
                              <span
                                class="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-medium"
                                [title]="a.doctor"
                              >
                                {{ a.initials }}
                              </span>
                              <span class="min-w-0 flex-1 truncate text-[11px]">
                                {{ a.behandlung }}
                              </span>
                              <span
                                class="shrink-0 rounded-sm px-1 py-0.5 text-[10px] {{ a.statusClass }}"
                              >
                                {{ a.statusLabel }}
                              </span>
                            </li>
                          }
                        </ul>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          }
        </div>
      </div>
    </section>
  `,
})
export class Heatmap {
  readonly data = input.required<HeatmapResult>();

  protected readonly dayLabels = DAY_LABELS;
  protected readonly gridCols = '48px repeat(5, minmax(0, 1fr))';
  protected readonly legendGradient =
    'linear-gradient(to right, color-mix(in oklab, var(--primary) 4%, var(--surface)), var(--primary))';

  protected readonly rows = computed<RowView[]>(() => {
    const { hours, matrix } = this.data();
    return hours.map((hour, hi) => ({
      hour,
      hourLabel: `${pad2(hour)}:00`,
      cells: this.dayLabels.map((day, di) => {
        const cell = matrix[di]?.[hi];
        const closed = !cell || cell.closed || cell.capacity === 0;
        const util = cell ? Math.round(cell.util * 100) : 0;
        const noShow = cell?.noShow ?? 0;
        // Anchor the popover towards the centre: right-most days open leftwards,
        // bottom-most rows open upwards — so it never leaves the viewport.
        const popH = di <= 2 ? 'left-0' : 'right-0';
        const popV = hi >= hours.length - 3 ? 'bottom-full pb-1' : 'top-full pt-1';
        return {
          day,
          closed,
          util,
          noShow,
          bg: closed ? CLOSED_FILL : fillFor(cell ? cell.util : 0),
          color: !closed && cell && cell.util > 0.55 ? 'white' : 'var(--muted-foreground)',
          title: closed ? `${day} ${pad2(hour)}:00 · geschlossen` : '',
          popClass: `${popV} ${popH}`,
          appts: (cell?.appts ?? []).map((a) => {
            const sv = STATUS_VIEW[a.status];
            return {
              time: formatHHmm(a.minuteOfDay),
              initials: doctorInitials(a.doctor),
              doctor: a.doctor,
              behandlung: a.behandlung,
              statusLabel: sv.label,
              statusClass: sv.cls,
            } satisfies ApptView;
          }),
        } satisfies CellView;
      }),
    }));
  });
}
