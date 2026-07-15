import { describe, expect, it, vi } from 'vitest';
import { SeverityBarChart } from '@/features/dashboard/components/SeverityBarChart';
import { render, screen } from '@/testing/utils';

const echartsSpy = vi.fn();

vi.mock('echarts-for-react', () => ({
  default: (props: { option: unknown; style?: React.CSSProperties }) => {
    echartsSpy(props);
    return (
      <div
        data-testid="severity-chart"
        data-height={props.style?.height}
        data-series-count={(props.option as { series?: unknown[] })?.series?.length}
      />
    );
  },
}));

describe('SeverityBarChart', () => {
  it('returns null when there is no chart data', () => {
    const { container } = render(<SeverityBarChart issues={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('builds chart data from issues when metric summary is absent', () => {
    render(
      <SeverityBarChart
        issues={[
          {
            id: '1',
            module: 'bias',
            severity: 'LOW',
            status: 'FAILED',
            issueType: 'gender_bias',
            input: 'in',
            output: 'out',
          },
          {
            id: '2',
            module: 'bias',
            severity: 'HIGH',
            status: 'FAILED',
            issueType: 'gender_bias',
            input: 'in',
            output: 'out',
          },
        ]}
      />
    );

    expect(screen.getByText('Issues by Submodule & Severity')).toBeInTheDocument();
    expect(screen.getByTestId('severity-chart')).toHaveAttribute('data-series-count', '3');
    expect(echartsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        option: expect.objectContaining({
          xAxis: expect.objectContaining({
            data: ['gender_bias'],
          }),
        }),
      })
    );
  });

  it('prefers metric summary data when provided', () => {
    render(
      <SeverityBarChart
        issues={[]}
        metricSummary={{
          gender_bias: {
            risk_distribution: {
              LOW_RISK: 1,
              MEDIUM_RISK: 2,
              HIGH_RISK: 3,
            },
          },
        }}
      />
    );

    expect(screen.getByTestId('severity-chart')).toBeInTheDocument();
    expect(echartsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        option: expect.objectContaining({
          xAxis: expect.objectContaining({
            data: ['Gender Bias'],
          }),
          series: expect.arrayContaining([
            expect.objectContaining({ name: 'Low', data: [1] }),
            expect.objectContaining({ name: 'Medium', data: [2] }),
            expect.objectContaining({ name: 'High', data: [3] }),
          ]),
        }),
      })
    );
  });
});
