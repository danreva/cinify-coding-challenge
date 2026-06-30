import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CircleCheck, LucideAngularModule, LucideIconData, TriangleAlert } from 'lucide-angular';
import {
  DataQualityReport,
  QualityIssueItem,
} from '../../../../core/domain/models/data-quality.model';

interface Chip {
  label: string;
  tone: 'warn' | 'info';
}

const CHIP_CLASS: Record<Chip['tone'], string> = {
  warn: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-border bg-muted text-muted-foreground',
};

/**
 * Standalone data-quality card scoped to the selected week. The dataset ships
 * deliberately dirty rows (bad durations, out-of-hours, unknown status, messy
 * labels); rather than hide the cleaning, this surfaces how many rows were
 * excluded and why — and always lists the exact appointments behind the counts,
 * so the headline KPIs stay trustworthy and auditable.
 */
@Component({
  selector: 'app-data-quality-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  styles: [':host{display:block}'],
  template: `
    <section class="rounded border border-border bg-surface">
      <header
        class="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-2.5"
      >
        <div class="flex items-center gap-1.5">
          <lucide-icon
            [img]="icon()"
            [size]="15"
            [class]="report().excluded > 0 ? 'text-warning' : 'text-success'"
          />
          <h2 class="text-[13px] font-semibold">Datenqualität</h2>
          @if (kw()) {
            <span class="text-[11px] text-muted-foreground">· KW {{ kw() }}</span>
          }
        </div>

        <span class="text-[11.5px] text-muted-foreground tnum">
          {{ report().valid }} von {{ report().total }} Datensätzen verwertbar
          @if (report().excluded > 0) {
            · {{ report().excluded }} ausgeschlossen
          }
        </span>

        <div class="ml-auto flex flex-wrap items-center gap-1.5">
          @for (chip of chips(); track chip.label) {
            <span
              class="rounded-sm border px-1.5 py-0.5 text-[10.5px] tnum {{ CHIP_CLASS[chip.tone] }}"
            >
              {{ chip.label }}
            </span>
          } @empty {
            <span class="text-[10.5px] text-success">keine Auffälligkeiten</span>
          }
        </div>
      </header>

      <div class="px-4 py-3">
        @if (issues().length) {
          <div
            class="mb-2 text-[10.5px] uppercase tracking-wide text-muted-foreground"
          >
            {{ issues().length }} betroffene Termine
          </div>
          <ul
            class="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded border border-border"
          >
            @for (it of issues(); track it.id) {
              <li class="flex items-start gap-2.5 px-3 py-2 text-[11.5px]">
                <span
                  class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  [class]="it.excluded ? 'bg-warning' : 'bg-muted-foreground'"
                ></span>
                <div class="min-w-0">
                  <div class="font-medium tnum">
                    {{ it.timeLabel }}
                    <span class="font-normal text-muted-foreground">
                      · {{ it.doctor || '—' }}
                    </span>
                  </div>
                  <div class="truncate text-[10.5px] text-muted-foreground">
                    {{ it.id }} · {{ it.behandlung || '—' }}
                  </div>
                </div>
                <div class="ml-auto flex shrink-0 flex-wrap justify-end gap-1">
                  @for (r of it.reasons; track r) {
                    <span
                      class="rounded-sm border px-1.5 py-0.5 text-[10px] {{
                        it.excluded ? CHIP_CLASS.warn : CHIP_CLASS.info
                      }}"
                    >
                      {{ r }}
                    </span>
                  }
                </div>
              </li>
            }
          </ul>
        } @else {
          <div class="text-[11.5px] text-success">Alle Termine dieser Woche sind sauber.</div>
        }
      </div>
    </section>
  `,
})
export class DataQualityCard {
  readonly report = input.required<DataQualityReport>();
  readonly issues = input.required<QualityIssueItem[]>();
  readonly kw = input<string>('');
  readonly weekLabel = input<string>('');

  protected readonly CHIP_CLASS = CHIP_CLASS;

  protected readonly icon = computed<LucideIconData>(() =>
    this.report().excluded > 0 ? TriangleAlert : CircleCheck,
  );

  protected readonly chips = computed<Chip[]>(() => {
    const i = this.report().issues;
    const chips: Chip[] = [];
    const push = (n: number, label: string, tone: Chip['tone']): void => {
      if (n > 0) chips.push({ label: `${n} ${label}`, tone });
    };
    // Hard exclusions first.
    push(i.invalidDuration, 'ungültige Dauer', 'warn');
    push(i.outsideOpeningHours, 'außerhalb Öffnungszeit', 'warn');
    push(i.outsideOpeningDays, 'außerhalb Öffnungstage', 'warn');
    push(i.unknownStatus, 'unbek. Status', 'warn');
    // Soft / informational.
    push(i.unmappedBehandlung, 'Label bereinigt', 'info');
    push(i.cancelled, 'abgesagt (nicht in Auslastung)', 'info');
    return chips;
  });
}
