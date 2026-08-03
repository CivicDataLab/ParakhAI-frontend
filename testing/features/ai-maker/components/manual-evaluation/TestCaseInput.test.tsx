import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TestCaseInput from '@/features/ai-maker/components/manual-evaluation/TestCaseInput';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('TestCaseInput', () => {
  const onSourceLanguageChange = vi.fn();
  const onTargetLanguageChange = vi.fn();
  const onInputPromptChange = vi.fn();
  const onSubmitPrompt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderInput = (
    overrides: Partial<{
      supportedLanguages: string[];
      sourceLanguage: string;
      targetLanguage: string;
      inputPrompt: string;
      isCallingModel: boolean;
    }> = {}
  ) =>
    render(
      <TestCaseInput
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        supportedLanguages={overrides.supportedLanguages}
        sourceLanguage={overrides.sourceLanguage ?? 'en'}
        targetLanguage={overrides.targetLanguage ?? 'hi'}
        inputPrompt={overrides.inputPrompt ?? ''}
        isCallingModel={overrides.isCallingModel ?? false}
        onSourceLanguageChange={onSourceLanguageChange}
        onTargetLanguageChange={onTargetLanguageChange}
        onInputPromptChange={onInputPromptChange}
        onSubmitPrompt={onSubmitPrompt}
      />
    );

  it('renders module heading and input prompt field', () => {
    renderInput();

    expect(screen.getByText('Testing: Bias and Fairness')).toBeInTheDocument();
    expect(screen.getByLabelText('Input Prompt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Prompt' })).toBeInTheDocument();
  });

  it('shows language selectors when multiple supported languages are provided', () => {
    renderInput({ supportedLanguages: ['en', 'hi'] });

    expect(screen.getByLabelText('Source Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Language')).toBeInTheDocument();
  });

  it('hides language selectors when only one supported language is provided', () => {
    renderInput({ supportedLanguages: ['en'] });

    expect(screen.queryByLabelText('Source Language')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Target Language')).not.toBeInTheDocument();
  });

  it('disables submit when prompt is empty or model is being called', () => {
    const { rerender } = renderInput({ inputPrompt: '   ' });

    expect(screen.getByRole('button', { name: 'Submit Prompt' })).toBeDisabled();

    rerender(
      <TestCaseInput
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        sourceLanguage="en"
        targetLanguage="hi"
        inputPrompt="Valid prompt"
        isCallingModel={true}
        onSourceLanguageChange={onSourceLanguageChange}
        onTargetLanguageChange={onTargetLanguageChange}
        onInputPromptChange={onInputPromptChange}
        onSubmitPrompt={onSubmitPrompt}
      />
    );

    expect(screen.getByRole('button', { name: /Calling Model/ })).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls handlers when fields change and submit is clicked', async () => {
    const user = userEvent.setup();
    renderInput({ supportedLanguages: ['en', 'hi'], inputPrompt: 'Test prompt' });

    await user.selectOptions(screen.getByLabelText('Source Language'), 'en');
    await user.selectOptions(screen.getByLabelText('Target Language'), 'hi');
    await user.type(screen.getByLabelText('Input Prompt'), '!');
    await user.click(screen.getByRole('button', { name: 'Submit Prompt' }));

    expect(onSourceLanguageChange).toHaveBeenCalledWith('en');
    expect(onTargetLanguageChange).toHaveBeenCalledWith('hi');
    expect(onInputPromptChange).toHaveBeenCalled();
    expect(onSubmitPrompt).toHaveBeenCalled();
  });
});
