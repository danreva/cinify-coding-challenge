import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  AppointmentsActions,
  selectBehandlungBreakdown,
  selectBehandlungen,
  selectCurrentWeekAppointments,
  selectCurrentWeekQuality,
  selectCurrentWeekQualityIssues,
  selectCurrentWeekStart,
  selectDailyTrend,
  selectDoctorLoad,
  selectDoctors,
  selectEffectiveConfig,
  selectError,
  selectHeatmap,
  selectInsights,
  selectIsLoading,
  selectKpis,
  selectWeeks,
} from '../../../../state/appointments';
import { isoWeek, weekRangeLabel } from '../../../../core/domain/util/time';
import { Topbar } from '../../../layout/topbar/topbar';
import { KpiStrip } from '../../components/kpi-strip/kpi-strip';
import { DataQualityCard } from '../../components/data-quality-card/data-quality-card';
import { WeeklyTimeline } from '../../components/weekly-timeline/weekly-timeline';
import { Heatmap } from '../../components/heatmap/heatmap';
import { DailyTrend } from '../../components/daily-trend/daily-trend';
import { DoctorLoad } from '../../components/doctor-load/doctor-load';
import { BehandlungBreakdown } from '../../components/behandlung-breakdown/behandlung-breakdown';
import { Insights } from '../../components/insights/insights';

/**
 * Dashboard route container. Owns the store wiring (one `selectSignal` per view
 * model) and the week navigation, then feeds the presentational components.
 * Keeping all store access here lets every child stay a pure, input-driven
 * component that is trivial to test and reuse.
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The router renders this host as a flex item of the shell's column layout.
  // Without flex/min-height it collapses to content height, which breaks the
  // inner `overflow-y-auto` scroll region and clips panels below the fold.
  styles: [':host { display: flex; flex-direction: column; flex: 1; min-height: 0; }'],
  imports: [
    Topbar,
    KpiStrip,
    DataQualityCard,
    WeeklyTimeline,
    Heatmap,
    DailyTrend,
    DoctorLoad,
    BehandlungBreakdown,
    Insights,
  ],
  template: `
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <app-topbar
        [kw]="kw()"
        [weekLabel]="weekLabel()"
        [canPrev]="canPrev()"
        [canNext]="canNext()"
        (prev)="onPrev()"
        (next)="onNext()"
        (today)="onToday()"
      />

      <main class="flex-1 overflow-y-auto bg-background p-3">
        @if (isLoading()) {
          <div class="flex h-full items-center justify-center text-[13px] text-muted-foreground">
            Termindaten werden geladen…
          </div>
        } @else if (error()) {
          <div
            class="flex h-full items-center justify-center rounded border border-destructive/30 bg-destructive/10 px-4 text-[13px] text-destructive"
          >
            Daten konnten nicht geladen werden: {{ error() }}
          </div>
        } @else {
          <div class="flex flex-col gap-3">
            <app-kpi-strip [kpis]="kpis()" />

            <app-weekly-timeline
              [week]="weekAppointments()"
              [config]="config()"
              [doctors]="doctors()"
              [behandlungen]="behandlungen()"
              [kw]="kw()"
            />

            <div class="grid grid-cols-12 gap-3">
              <div class="col-span-12 xl:col-span-8">
                <app-heatmap [data]="heatmap()" />
              </div>
              <div class="col-span-12 xl:col-span-4">
                <app-daily-trend [data]="dailyTrend()" />
              </div>
            </div>

            <div class="grid grid-cols-12 gap-3">
              <div class="col-span-12 md:col-span-6 xl:col-span-4">
                <app-doctor-load [data]="doctorLoad()" />
              </div>
              <div class="col-span-12 md:col-span-6 xl:col-span-4">
                <app-behandlung-breakdown [data]="behandlungBreakdown()" />
              </div>
              <div class="col-span-12 xl:col-span-4">
                <app-insights [data]="insights()" />
              </div>
            </div>

            <app-data-quality-card
              [report]="quality()"
              [issues]="qualityIssues()"
              [kw]="kw()"
              [weekLabel]="weekLabel()"
            />
          </div>
        }
      </main>
    </div>
  `,
})
export class DashboardPage implements OnInit {
  private readonly store = inject(Store);

  // View models (one signal per selector).
  protected readonly isLoading = this.store.selectSignal(selectIsLoading);
  protected readonly error = this.store.selectSignal(selectError);
  protected readonly kpis = this.store.selectSignal(selectKpis);
  protected readonly quality = this.store.selectSignal(selectCurrentWeekQuality);
  protected readonly qualityIssues = this.store.selectSignal(selectCurrentWeekQualityIssues);
  protected readonly heatmap = this.store.selectSignal(selectHeatmap);
  protected readonly dailyTrend = this.store.selectSignal(selectDailyTrend);
  protected readonly doctorLoad = this.store.selectSignal(selectDoctorLoad);
  protected readonly behandlungBreakdown = this.store.selectSignal(selectBehandlungBreakdown);
  protected readonly insights = this.store.selectSignal(selectInsights);
  protected readonly weekAppointments = this.store.selectSignal(selectCurrentWeekAppointments);
  protected readonly config = this.store.selectSignal(selectEffectiveConfig);
  protected readonly doctors = this.store.selectSignal(selectDoctors);
  protected readonly behandlungen = this.store.selectSignal(selectBehandlungen);

  private readonly weekStart = this.store.selectSignal(selectCurrentWeekStart);
  private readonly weeks = this.store.selectSignal(selectWeeks);

  /** Index of the current week within the available weeks (−1 when unknown). */
  private readonly weekIndex = computed(() => {
    const ws = this.weekStart();
    return ws ? this.weeks().indexOf(ws) : -1;
  });

  protected readonly kw = computed(() => {
    const ws = this.weekStart();
    return ws ? String(isoWeek(ws)) : '—';
  });

  protected readonly weekLabel = computed(() => {
    const ws = this.weekStart();
    return ws ? weekRangeLabel(ws) : '';
  });

  protected readonly canPrev = computed(() => this.weekIndex() > 0);
  protected readonly canNext = computed(() => {
    const i = this.weekIndex();
    return i >= 0 && i < this.weeks().length - 1;
  });

  ngOnInit(): void {
    this.store.dispatch(AppointmentsActions.load());
  }

  protected onPrev(): void {
    const i = this.weekIndex();
    if (i > 0) this.selectWeek(this.weeks()[i - 1]);
  }

  protected onNext(): void {
    const i = this.weekIndex();
    const weeks = this.weeks();
    if (i >= 0 && i < weeks.length - 1) this.selectWeek(weeks[i + 1]);
  }

  protected onToday(): void {
    const weeks = this.weeks();
    if (weeks.length) this.selectWeek(weeks[weeks.length - 1]);
  }

  private selectWeek(weekStart: string): void {
    this.store.dispatch(AppointmentsActions.selectWeek({ weekStart }));
  }
}
