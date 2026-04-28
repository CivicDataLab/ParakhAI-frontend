'use client';

import { Button, Label, Select, Spinner, Text, TextField } from 'opub-ui';
import React from 'react';
import { LANGUAGE_OPTIONS } from './types';

interface TestCaseInputProps {
  moduleDisplayName: string;
  supportedLanguages?: string[];
  sourceLanguage: string;
  targetLanguage: string;
  inputPrompt: string;
  isCallingModel: boolean;
  onSourceLanguageChange: (value: string) => void;
  onTargetLanguageChange: (value: string) => void;
  onInputPromptChange: (value: string) => void;
  onSubmitPrompt: () => void;
}

const TestCaseInput: React.FC<TestCaseInputProps> = ({
  moduleDisplayName,
  supportedLanguages,
  sourceLanguage,
  targetLanguage,
  inputPrompt,
  isCallingModel,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onInputPromptChange,
  onSubmitPrompt,
}) => {
  const showLanguageSelectors = supportedLanguages && supportedLanguages.length > 1;
  
  const languageOptions = showLanguageSelectors
    ? LANGUAGE_OPTIONS.filter((opt) => supportedLanguages.includes(opt.value))
    : LANGUAGE_OPTIONS;

  return (
    <div className="space-y-6 py-6 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <Text variant="headingMd">
          Testing: {moduleDisplayName}
        </Text>
      </div>

      {showLanguageSelectors && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="audit-form-label">
              <Text variant="bodyMd" fontWeight="medium">
                Source Language <span className="text-red-500">*</span>
              </Text>
            </Label>
            <Select
              name="sourceLanguage"
              label="Source Language"
              labelHidden
              options={languageOptions}
              value={sourceLanguage}
              onChange={onSourceLanguageChange}
              placeholder="Select language"
            />
          </div>
          <div>
            <Label className="audit-form-label">
              <Text variant="bodyMd" fontWeight="medium">
                Target Language
              </Text>
            </Label>
            <Select
              name="targetLanguage"
              label="Target Language"
              labelHidden
              options={languageOptions}
              value={targetLanguage}
              onChange={onTargetLanguageChange}
              placeholder="Select language"
            />
          </div>
        </div>
      )}

      <div>
        <Label className="audit-form-label mb-1 block">
          <Text variant="bodyMd" fontWeight="medium">
            Input Prompt <span className="text-red-500">*</span>
          </Text>
        </Label>
        <div className="mt-2">
          <TextField
            name="inputPrompt"
            label="Input Prompt"
            labelHidden
            multiline={4}
            value={inputPrompt}
            onChange={onInputPromptChange}
            placeholder="Enter your test prompt here..."
          />
        </div>
      </div>

      <Button
        kind="primary"
        onClick={onSubmitPrompt}
        disabled={!inputPrompt.trim() || isCallingModel}
      >
        {isCallingModel ? (
          <>
            <Spinner/>
            <span className="ml-2">Calling Model...</span>
          </>
        ) : (
          'Submit Prompt'
        )}
      </Button>
    </div>
  );
};

export default TestCaseInput;
