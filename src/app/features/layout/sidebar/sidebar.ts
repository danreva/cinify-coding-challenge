import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  Activity,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LucideAngularModule,
  LucideIconData,
  Settings,
  Stethoscope,
  UserX,
  Users,
} from 'lucide-angular';

interface NavItem {
  icon: LucideIconData;
  label: string;
  active?: boolean;
}

/**
 * Global navigation chrome. Purely presentational — the challenge scope is a
 * single dashboard, so the nav targets are illustrative and the active item is
 * fixed to "Übersicht". Ported 1:1 from the React reference Sidebar.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <aside class="flex h-full w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div class="flex h-12 items-center gap-2 border-b border-sidebar-border px-4">
        <div
          class="flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground"
        >
          P
        </div>
        <div class="flex flex-col leading-tight">
          <span class="text-[12px] font-semibold tracking-tight">Praxis Cockpit</span>
          <span class="text-[10px] text-sidebar-foreground/60">Dr. Schneider &amp; Kollegen</span>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto py-2">
        @for (item of nav; track item.label) {
          <button
            type="button"
            [class]="
              item.active
                ? 'group flex w-full items-center gap-2.5 border-l-2 border-primary bg-sidebar-accent py-1.5 pl-[10px] pr-3 text-[12.5px] text-white transition-colors'
                : 'group flex w-full items-center gap-2.5 px-3 py-1.5 text-[12.5px] text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-white'
            "
          >
            <lucide-icon [img]="item.icon" [size]="14" [strokeWidth]="1.75" />
            <span>{{ item.label }}</span>
          </button>
        }
      </nav>

      <div class="border-t border-sidebar-border p-2">
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-[12px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
        >
          <lucide-icon [img]="settingsIcon" [size]="14" [strokeWidth]="1.75" />
          Einstellungen
        </button>
        <div class="mt-2 flex items-center gap-2 rounded bg-sidebar-accent/60 px-2 py-1.5">
          <div
            class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/80 text-[10px] font-semibold text-primary-foreground"
          >
            DK
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-[11.5px] font-medium text-white">Dan Kowalski</span>
            <span class="text-[10px] text-sidebar-foreground/60">Praxismanager</span>
          </div>
        </div>
      </div>
    </aside>
  `,
})
export class Sidebar {
  protected readonly settingsIcon = Settings;
  protected readonly nav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Übersicht', active: true },
    { icon: CalendarRange, label: 'Termine' },
    { icon: Stethoscope, label: 'Behandlungen' },
    { icon: UserX, label: 'No-Shows' },
    { icon: Users, label: 'Ärzte' },
    { icon: ClipboardList, label: 'Berichte' },
    { icon: Activity, label: 'Auslastung' },
  ];
}
