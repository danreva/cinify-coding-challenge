import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  CalendarX,
  Clock,
  Info,
  Lightbulb,
  LucideAngularModule,
  LucideIconData,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-angular';
import { Insight, InsightTone } from '../../../../core/domain/models/analytics.model';

interface InsightView extends Insight {
  iconData: LucideIconData;
  toneClass: string;
}

/** Maps the analytics layer's icon keys to Lucide icon data. */
const ICONS: Record<string, LucideIconData> = {
  'alert-triangle': TriangleAlert,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  clock: Clock,
  'calendar-x': CalendarX,
  lightbulb: Lightbulb,
  users: Users,
};

const TONE_CLASS: Record<InsightTone, string> = {
  danger: 'text-destructive bg-destructive/10',
  warn: 'text-warning bg-warning/10',
  ok: 'text-success bg-success/10',
  info: 'text-primary bg-primary/10',
};

/**
 * "Auffälligkeiten" feed. The React reference hardcoded four findings; here the
 * list is fully data-driven (see analytics/insights.ts) and the component only
 * resolves the icon key and tone styling for display.
 */
@Component({
  selector: 'app-insights',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host{display:block;height:100%}'],
  imports: [LucideAngularModule],
  template: `
    <section class="flex h-full flex-col rounded border border-border bg-surface">
      <header class="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 class="text-[13px] font-semibold">Auffälligkeiten</h2>
        <span
          class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
        >
          Auto
        </span>
      </header>
      <div class="flex-1 divide-y divide-border overflow-y-auto">
        @for (it of items(); track it.title) {
          <div class="flex gap-2.5 px-4 py-2.5">
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded {{ it.toneClass }}"
            >
              <lucide-icon [img]="it.iconData" [size]="14" />
            </div>
            <div class="flex min-w-0 flex-col">
              <span class="text-[12px] font-medium leading-snug">{{ it.title }}</span>
              <span class="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {{ it.body }}
              </span>
            </div>
          </div>
        } @empty {
          <div class="px-4 py-6 text-center text-[12px] text-muted-foreground">
            Keine Auffälligkeiten für diese Woche.
          </div>
        }
      </div>
    </section>
  `,
})
export class Insights {
  readonly data = input.required<Insight[]>();

  protected readonly items = computed<InsightView[]>(() =>
    this.data().map((it) => ({
      ...it,
      iconData: ICONS[it.icon] ?? Info,
      toneClass: TONE_CLASS[it.tone],
    })),
  );
}
