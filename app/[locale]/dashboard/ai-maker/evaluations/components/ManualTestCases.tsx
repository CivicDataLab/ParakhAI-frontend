'use client';

import React, { useState } from 'react';
import { Button, Text, TextField, Label, Select, Tag } from 'opub-ui';
import Image from 'next/image';

interface ManualTestCasesProps {
  onPrevious: () => void;
  onRunAudit: () => void;
  isRequestingAudit: boolean;
}

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];

const issueOptions = [
  { value: 'none', label: 'No issue' },
  { value: 'hallucination', label: 'Hallucination' },
  { value: 'bias', label: 'Bias' },
  { value: 'toxicity', label: 'Toxic / unsafe content' },
  { value: 'other', label: 'Other' },
];

const riskSeverityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const ManualTestCases: React.FC<ManualTestCasesProps> = ({
  onPrevious,
  onRunAudit,
  isRequestingAudit,
}) => {
  const [currentTestCase] = useState(1);
  const [sourceLanguage, setSourceLanguage] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [issue, setIssue] = useState<string>('');
  const [riskSeverity, setRiskSeverity] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [status, setStatus] = useState<'passed' | 'failed' | null>(null);

  return (
    <div className="mb-8 space-y-8">
      {/* Page heading + steps */}
      <div>
        <Text variant="headingMd" className="mb-1">
          Evaluate Your Test Cases
        </Text>
        <Text variant="bodySm" className="block text-gray-500 mt-1">
          Enter your prompt &amp; see real-time output &rarr; Modify prompt if needed &rarr; Evaluate the result &rarr; Enter your next prompt
        </Text>
      </div>

      {/* Header: Test Case badge + avatar */}
      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-3">
          <Tag variation="outlined" textColor="#15803D" borderColor="#BBF7D0">
            <Text variant="bodySm" fontWeight="medium">
              Test Case: {currentTestCase}
            </Text>
          </Tag>
        </div>
      </div>

      {/* Languages and Input Prompt */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="audit-form-label">
              <Text variant="bodyMd" fontWeight="medium">
                Source Language <span className="text-red-500">*</span>
              </Text>
            </Label>
            <Select
              name="manualSourceLanguage"
              label="Source Language"
              labelHidden
              options={languageOptions}
              value={sourceLanguage}
              onChange={setSourceLanguage}
              placeholder="Select"
            />
          </div>
          <div>
            <Label className="audit-form-label">
              <Text variant="bodyMd" fontWeight="medium">
                Target Language <span className="text-red-500">*</span>
              </Text>
            </Label>
            <Select
              name="manualTargetLanguage"
              label="Target Language"
              labelHidden
              options={languageOptions}
              value={targetLanguage}
              onChange={setTargetLanguage}
              placeholder="Select"
            />
          </div>
        </div>

        <div>
          <Label className="audit-form-label">
            <Text variant="bodyMd" fontWeight="medium">
              Input Prompt <span className="text-red-500">*</span>{' '}
              <span className="text-xs text-gray-500 ml-1">
                (comma separated values)
              </span>
            </Text>
          </Label>
          <div className="test-cases-textarea-container manual-test-cases-textarea">
            <TextField
              name="manualInputPrompt"
              label="Input Prompt"
              labelHidden
              multiline={6}
              value={inputPrompt}
              onChange={setInputPrompt}
              placeholder={
                'Input, Expected output, etc.\nInput, Expected output, etc.\n...'
              }
            />
            <Text variant="bodySm" className="mt-2 text-gray-600">
              Your test cases should be comma separated values in the format{' '}
              <strong>Input</strong>, <strong>Expected output</strong>, etc.
            </Text>
          </div>
        </div>

        <div>
          <Button
            kind="primary"
            className="mt-2"
            disabled={!inputPrompt}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Output + Evaluation section */}
      <div className="space-y-6">
        <div>
          <Text variant="bodySm" className="block text-gray-500 mb-1">
            Output <span className="text-xs">(comma separated values)</span>
          </Text>
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50 text-sm text-gray-800 space-y-3">
            <Text variant="bodySm" className="block">
              A bunch of output text
            </Text>
            <Text variant="bodySm" className="block">
              Contrary to popular belief, Lorem Ipsum is not simply random text. It has
              roots in a piece of classical Latin literature from 45 BC...
            </Text>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>
                Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of &quot;de
                Finibus Bonorum et Malorum&quot;.
              </li>
              <li>
                This book is a treatise on the theory of ethics, very popular during the
                Renaissance.
              </li>
              <li>
                The first line of Lorem Ipsum, &quot;Lorem ipsum dolor sit amet...&quot;
                comes from a line in section 1.10.32.
              </li>
            </ul>
          </div>
        </div>

        {/* Pass / Fail toggle */}
        <div className="flex items-center gap-3">
          <Button
            kind="secondary"
            onClick={() => setStatus('passed')}
            className={
              status === 'passed'
                ? 'border border-green-600 bg-green-50 text-green-700'
                : ''
            }
          >
            ✓ Passed
          </Button>
          <Button
            kind="secondary"
            onClick={() => setStatus('failed')}
            className={
              status === 'failed'
                ? 'border border-red-600 bg-red-50 text-red-700'
                : ''
            }
          >
            ✕ Failed
          </Button>
        </div>

        {/* Issue + Risk Severity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="audit-form-label">
              <Text variant="bodyMd" fontWeight="medium">
                Issue <span className="text-red-500">*</span>
              </Text>
            </Label>
            <Select
              name="manualIssue"
              label="Issue"
              labelHidden
              options={issueOptions}
              value={issue}
              onChange={setIssue}
              placeholder="Select"
            />
          </div>
          <div>
            <Label className="audit-form-label">
              <Text variant="bodyMd" fontWeight="medium">
                Risk Severity <span className="text-red-500">*</span>
              </Text>
            </Label>
            <Select
              name="manualRiskSeverity"
              label="Risk Severity"
              labelHidden
              options={riskSeverityOptions}
              value={riskSeverity}
              onChange={setRiskSeverity}
              placeholder="Select"
            />
          </div>
        </div>

        {/* Comments */}
        <div>
          <Label className="audit-form-label">
            <Text variant="bodyMd" fontWeight="medium">
              Comments
            </Text>
          </Label>
          <div className="audit-form-textarea">
            <TextField
              name="manualComments"
              label="Comments"
              labelHidden
              multiline={4}
              value={comments}
              onChange={setComments}
              placeholder="Type here"
            />
          </div>
        </div>

        {/* Ideal Output */}
        <div className="mt-6">
          <Label className="audit-form-label">
            <Text variant="bodyMd" fontWeight="medium">
              What would an ideal output look like?
            </Text>
          </Label>
          <div className="audit-form-textarea">
            <TextField
              name="manualIdealOutput"
              label="What would an ideal output look like?"
              labelHidden
              multiline={4}
              placeholder="Type here"
            />
          </div>
          <div className="flex justify-center mt-4">
            <Button kind="primary">
              Next Test Case
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
        <Button
          kind="secondary"
          onClick={onPrevious}
          className="previous-button"
        >
          <Image
            src="/images/icons/circle-arrow-left.png"
            alt="Circle arrow left"
            width={18}
            height={18}
            className="object-contain previous-icon"
          />
          <span className="previous-text">Previous</span>
        </Button>
        <Button
          kind="primary"
          onClick={onRunAudit}
          disabled={isRequestingAudit}
          className="run-audit-button"
        >
          <span className="run-audit-text">
            {isRequestingAudit ? 'Running…' : 'Finish Audit'}
          </span>
          <Image
            src="/images/icons/circle-arrow-right.png"
            alt="Circle arrow right"
            width={18}
            height={18}
            className="object-contain run-audit-icon"
          />
        </Button>
      </div>
    </div>
  );
};

export default ManualTestCases;


