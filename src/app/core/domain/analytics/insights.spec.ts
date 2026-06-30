import { buildInsights, InsightInputs } from './insights';
import { DEFAULT_PRAXIS_CONFIG } from '../../config/opening-hours.token';
import { HeatCell, KpiSummary } from '../models/analytics.model';
import { HeatmapResult } from './heatmap';

const zeroKpis = (over: Partial<KpiSummary> = {}): KpiSummary => ({
  auslastungEffektiv: 0,
  auslastungGebucht: 0,
  luecke: 0,
  noShowRate: 0,
  termineTotal: 0,
  attended: 0,
  noShow: 0,
  cancelled: 0,
  avgDauer: 0,
  deltaAuslastung: 0,
  deltaNoShow: 0,
  deltaTermine: 0,
  deltaAvgDauer: 0,
  hasPrev: false,
  ...over,
});

const cell = (hour: number, noShow: number): HeatCell => ({
  hour,
  capacity: 180,
  seen: 0,
  noShow,
  util: 0,
  closed: false,
  appts: [],
});

const emptyHeatmap: HeatmapResult = { hours: [], matrix: [] };

const baseInputs = (over: Partial<InsightInputs> = {}): InsightInputs => ({
  kpis: zeroKpis(),
  daily: [],
  heatmap: emptyHeatmap,
  doctors: [],
  behandlungen: [],
  config: DEFAULT_PRAXIS_CONFIG,
  ...over,
});

describe('buildInsights', () => {
  it('returns nothing when there is no signal in the data', () => {
    expect(buildInsights(baseInputs())).toEqual([]);
  });

  it('flags the weekday with the most no-shows as a danger', () => {
    // 5 weekday rows; Thursday (index 3) carries the no-shows.
    const matrix: HeatCell[][] = [0, 1, 2, 3, 4].map((d) =>
      d === 3 ? [cell(10, 2), cell(11, 1)] : [cell(10, 0)],
    );
    const result = buildInsights(baseInputs({ heatmap: { hours: [10, 11], matrix } }));

    expect(result.length).toBe(1);
    expect(result[0].tone).toBe('danger');
    expect(result[0].title).toContain('Donnerstag');
    expect(result[0].body).toContain('3 No-Shows');
    expect(result[0].body).toContain('10–12 Uhr');
  });

  it('highlights a popular treatment with zero no-shows', () => {
    const result = buildInsights(
      baseInputs({
        behandlungen: [
          { name: 'Impfung', count: 5, noShow: 0 },
          { name: 'Blutabnahme', count: 3, noShow: 1 },
        ],
      }),
    );
    expect(result.length).toBe(1);
    expect(result[0].tone).toBe('info');
    expect(result[0].title).toContain('Impfung');
  });

  it('ranks danger findings ahead of informational ones', () => {
    const matrix: HeatCell[][] = [[cell(9, 3)]];
    const result = buildInsights(
      baseInputs({
        heatmap: { hours: [9], matrix },
        kpis: zeroKpis({ noShow: 4, termineTotal: 20, noShowRate: 0.2 }),
      }),
    );
    expect(result[0].tone).toBe('danger');
    expect(result.some((i) => i.tone === 'info')).toBeTrue();
  });
});
