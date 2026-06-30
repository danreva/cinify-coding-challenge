import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Download,
  LucideAngularModule,
  Search,
} from 'lucide-angular';

/**
 * Dashboard top bar: title, KW subtitle and the week navigator. The navigator
 * is wired to the container (prev/next/today), while search/export/notification
 * controls are presentational placeholders kept for visual parity with the
 * reference.
 */
@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <header
      class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4"
    >
      <div class="flex items-center gap-3">
        <div class="flex flex-col leading-tight">
          <h1 class="text-[14px] font-semibold tracking-tight">{{ title() }}</h1>
          <span class="text-[11px] text-muted-foreground">
            Terminauslastung · KW {{ kw() }}
          </span>
        </div>

        <div class="ml-4 flex items-center rounded border border-border bg-surface">
          <button
            type="button"
            [disabled]="!canPrev()"
            (click)="prev.emit()"
            aria-label="Vorherige Woche"
            class="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <lucide-icon [img]="chevronLeft" [size]="14" />
          </button>
          <div class="border-x border-border px-3 py-1 text-[12px] tnum">{{ weekLabel() }}</div>
          <button
            type="button"
            [disabled]="!canNext()"
            (click)="next.emit()"
            aria-label="Nächste Woche"
            class="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <lucide-icon [img]="chevronRight" [size]="14" />
          </button>
        </div>

        <button
          type="button"
          (click)="today.emit()"
          class="rounded border border-border bg-surface px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted"
        >
          Aktuellste
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative">
          <lucide-icon
            [img]="searchIcon"
            [size]="14"
            class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Patient, Arzt, Termin…"
            class="h-7 w-64 rounded border border-border bg-surface pl-7 pr-2 text-[12px] outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          class="flex h-7 items-center gap-1.5 rounded border border-border bg-surface px-2 text-[12px] text-foreground hover:bg-muted"
        >
          <lucide-icon [img]="downloadIcon" [size]="14" /> Export
        </button>
        <button
          type="button"
          aria-label="Benachrichtigungen"
          class="relative flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted-foreground hover:bg-muted"
        >
          <lucide-icon [img]="bellIcon" [size]="14" />
          <span class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive"></span>
        </button>
      </div>
    </header>
  `,
})
export class Topbar {
  readonly title = input<string>('Übersicht');
  readonly kw = input<string>('—');
  readonly weekLabel = input<string>('');
  readonly canPrev = input<boolean>(false);
  readonly canNext = input<boolean>(false);

  readonly prev = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();

  protected readonly chevronLeft = ChevronLeft;
  protected readonly chevronRight = ChevronRight;
  protected readonly searchIcon = Search;
  protected readonly downloadIcon = Download;
  protected readonly bellIcon = Bell;
}
