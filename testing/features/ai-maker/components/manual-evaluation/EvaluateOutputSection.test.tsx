import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EvaluateOutputSection, {
  createEvaluationIssueRow,
  type EvaluationIssueRow,
} from '@/features/ai-maker/components/manual-evaluation/EvaluateOutputSection';
import { render, screen, waitFor } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  const base = getOpubUiMockModule();

  function ComboboxWithArraySupport({
    name,
    label,
    list = [],
    selectedValue = '',
    onChange,
  }: {
    name: string;
    label?: string;
    list?: Array<{ value: string; label: string }>;
    selectedValue?: string;
    onChange?: (value: string | Array<{ value: string; label: string }>) => void;
  }) {
    const currentValue =
      list.find((item) => item.label === selectedValue || item.value === selectedValue)?.value ??
      selectedValue;

    return (
      <div>
        {label && <label htmlFor={name}>{label}</label>}
        <select
          id={name}
          name={name}
          aria-label={label || name}
          value={currentValue}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value="">Select</option>
          {list.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid={`${name}-array-select`}
          onClick={() => onChange?.([{ value: 'GENDER_BIAS', label: 'Gender Bias' }])}
        >
          Array select
        </button>
      </div>
    );
  }

  return {
    ...base,
    Combobox: ComboboxWithArraySupport,
  };
});

vi.mock('@tabler/icons-react', () => ({
  IconTrash: () => <span data-testid="icon-trash" />,
}));

describe('createEvaluationIssueRow', () => {
  it('creates an empty issue row with a generated id', () => {
    const row = createEvaluationIssueRow();

    expect(row.id).toMatch(/^issue-\d+-[a-z0-9]+$/);
    expect(row.issueType).toBe('');
    expect(row.severity).toBe('');
    expect(row.observations).toBe('');
    expect(row.idealOutput).toBe('');
  });
});

describe('EvaluateOutputSection', () => {
  const subModules = [
    { name: 'GENDER_BIAS', displayName: 'Gender Bias' },
    { name: 'STEREOTYPE', displayName: 'Stereotype', mandatoryInputs: ['expected_output'] },
  ];

  const baseRow: EvaluationIssueRow = {
    id: 'row-1',
    issueType: '',
    severity: '',
    observations: '',
    idealOutput: '',
  };

  const onIssueRowsChange = vi.fn();
  const onAddIssue = vi.fn();
  const onSave = vi.fn();
  const onGenerateReason = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onGenerateReason.mockResolvedValue(undefined);
  });

  const renderSection = (
    overrides: Partial<{
      issueRows: EvaluationIssueRow[];
      isSaving: boolean;
      saveDisabled: boolean;
    }> = {}
  ) =>
    render(
      <EvaluateOutputSection
        issueRows={overrides.issueRows ?? [baseRow]}
        subModules={subModules}
        onIssueRowsChange={onIssueRowsChange}
        onAddIssue={onAddIssue}
        onSave={onSave}
        onGenerateReason={onGenerateReason}
        isSaving={overrides.isSaving}
        saveDisabled={overrides.saveDisabled}
      />
    );

  it('renders evaluate heading and issue row fields', () => {
    renderSection();

    expect(screen.getByText('Evaluate this output')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk Severity')).toBeInTheDocument();
    expect(screen.getByLabelText('Reasons or Observations')).toBeInTheDocument();
    expect(screen.getByLabelText('Ideal Output')).toBeInTheDocument();
  });

  it('updates issue row fields through onIssueRowsChange', async () => {
    const user = userEvent.setup();

    function StatefulSection() {
      const [issueRows, setIssueRows] = useState([
        { ...baseRow, issueType: 'GENDER_BIAS', severity: 'HIGH' },
      ]);

      return (
        <EvaluateOutputSection
          issueRows={issueRows}
          subModules={subModules}
          onIssueRowsChange={(rows) => {
            setIssueRows(rows);
            onIssueRowsChange(rows);
          }}
          onAddIssue={onAddIssue}
          onSave={onSave}
          onGenerateReason={onGenerateReason}
        />
      );
    }

    render(<StatefulSection />);

    await user.selectOptions(screen.getByLabelText('Issue'), 'STEREOTYPE');
    await user.selectOptions(screen.getByLabelText('Risk Severity'), 'MEDIUM');
    await user.type(screen.getByLabelText('Reasons or Observations'), 'Observation');
    await user.type(screen.getByLabelText('Ideal Output'), 'Ideal');

    expect(onIssueRowsChange).toHaveBeenCalled();
    expect(screen.getByLabelText('Issue')).toHaveValue('STEREOTYPE');
    expect(screen.getByLabelText('Risk Severity')).toHaveValue('MEDIUM');
    expect(screen.getByLabelText('Reasons or Observations')).toHaveValue('Observation');
    expect(screen.getByLabelText('Ideal Output')).toHaveValue('Ideal');
  });

  it('excludes issue types already selected in other rows', () => {
    renderSection({
      issueRows: [
        { ...baseRow, id: 'row-1', issueType: 'GENDER_BIAS' },
        { ...baseRow, id: 'row-2', issueType: '' },
      ],
    });

    const secondIssueSelect = screen.getAllByLabelText('Issue')[1];
    expect(secondIssueSelect).not.toContainHTML('Gender Bias');
    expect(secondIssueSelect).toContainHTML('Stereotype');
  });

  it('shows delete button only when multiple rows exist and removes a row', async () => {
    const user = userEvent.setup();
    renderSection({
      issueRows: [
        { ...baseRow, id: 'row-1' },
        { ...baseRow, id: 'row-2' },
      ],
    });

    expect(screen.getByRole('button', { name: 'Remove issue 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove issue 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove issue 2' }));

    expect(onIssueRowsChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'row-1' })]);
  });

  it('does not remove the last remaining row', async () => {
    const user = userEvent.setup();
    renderSection();

    expect(screen.queryByRole('button', { name: /Remove issue/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add Issue' }));
    expect(onAddIssue).toHaveBeenCalled();
  });

  it('calls onSave and disables actions while saving or saveDisabled', async () => {
    const user = userEvent.setup();
    const { rerender } = renderSection({ saveDisabled: true });

    expect(screen.getByRole('button', { name: 'Add Issue' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save and Test New Input' })).toBeDisabled();

    rerender(
      <EvaluateOutputSection
        issueRows={[baseRow]}
        subModules={subModules}
        onIssueRowsChange={onIssueRowsChange}
        onAddIssue={onAddIssue}
        onSave={onSave}
        onGenerateReason={onGenerateReason}
        isSaving={true}
      />
    );

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();

    rerender(
      <EvaluateOutputSection
        issueRows={[baseRow]}
        subModules={subModules}
        onIssueRowsChange={onIssueRowsChange}
        onAddIssue={onAddIssue}
        onSave={onSave}
        onGenerateReason={onGenerateReason}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save and Test New Input' }));
    expect(onSave).toHaveBeenCalled();
  });

  it('disables AI assist when issue type or severity is missing', () => {
    renderSection();

    expect(screen.getByRole('button', { name: 'Generate with AI Assistance' })).toBeDisabled();
  });

  it('disables AI assist when selected metric requires expected output', () => {
    renderSection({
      issueRows: [{ ...baseRow, issueType: 'STEREOTYPE', severity: 'HIGH' }],
    });

    expect(screen.getByRole('button', { name: 'Generate with AI Assistance' })).toBeDisabled();
  });

  it('handles combobox array onChange values', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByTestId('issue-row-1-array-select'));

    expect(onIssueRowsChange).toHaveBeenCalledWith([
      expect.objectContaining({ issueType: 'GENDER_BIAS' }),
    ]);
  });

  it('calls onGenerateReason and shows generating state', async () => {
    const user = userEvent.setup();
    let resolveGenerate: () => void = () => {};
    onGenerateReason.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveGenerate = resolve;
        })
    );

    renderSection({
      issueRows: [{ ...baseRow, issueType: 'GENDER_BIAS', severity: 'HIGH' }],
    });

    const generateButton = screen.getByRole('button', { name: 'Generate with AI Assistance' });
    await user.click(generateButton);

    expect(onGenerateReason).toHaveBeenCalledWith('row-1', 'GENDER_BIAS', 'HIGH');
    expect(generateButton).toHaveTextContent('Generating...');
    expect(generateButton).toBeDisabled();

    resolveGenerate();
    await waitFor(() => {
      expect(generateButton).toHaveTextContent('Generate with AI Assistance');
    });
  });
});
