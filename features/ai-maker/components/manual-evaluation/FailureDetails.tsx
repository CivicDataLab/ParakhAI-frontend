'use client';

import { Label, Select, Text, TextField } from 'opub-ui';
import React from 'react';
import { SEVERITY_OPTIONS, SubModuleInfo } from './types';

interface FailureDetailsProps {
  subModules: SubModuleInfo[];
  issueType: string;
  severity: string;
  comments: string;
  idealOutput: string;
  onIssueTypeChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onCommentsChange: (value: string) => void;
  onIdealOutputChange: (value: string) => void;
}

const FailureDetails: React.FC<FailureDetailsProps> = ({
  subModules,
  issueType,
  severity,
  comments,
  idealOutput,
  onIssueTypeChange,
  onSeverityChange,
  onCommentsChange,
  onIdealOutputChange,
}) => {
  const issueOptions = subModules.map((sm) => ({
    value: sm.name,
    label: sm.displayName,
  }));

  return (
    <div className="space-y-6 p-6 bg-red-50 rounded-lg border border-red-200">
      <Text variant="headingMd" className="text-red-800">
        Failure Details
      </Text>
      <Text variant="bodySm" className="text-red-600">
        Please provide details about the issue found in the model output.
      </Text>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="audit-form-label">
            <Text variant="bodyMd" fontWeight="medium">
              Issue Type <span className="text-red-500">*</span>
            </Text>
          </Label>
          <Select
            name="issueType"
            label="Issue Type"
            labelHidden
            options={issueOptions}
            value={issueType}
            onChange={onIssueTypeChange}
            placeholder="Select issue type"
          />
        </div>
        <div>
          <Label className="audit-form-label">
            <Text variant="bodyMd" fontWeight="medium">
              Severity <span className="text-red-500">*</span>
            </Text>
          </Label>
          <Select
            name="severity"
            label="Severity"
            labelHidden
            options={SEVERITY_OPTIONS}
            value={severity}
            onChange={onSeverityChange}
            placeholder="Select severity"
          />
        </div>
      </div>

      <div>
        <Label className="audit-form-label">
          <Text variant="bodyMd" fontWeight="medium">
            Comments
          </Text>
        </Label>
        <TextField
          name="comments"
          label="Comments"
          labelHidden
          multiline={3}
          value={comments}
          onChange={onCommentsChange}
          placeholder="Describe the issue in detail..."
        />
      </div>

      <div>
        <Label className="audit-form-label">
          <Text variant="bodyMd" fontWeight="medium">
            Ideal Output
          </Text>
        </Label>
        <TextField
          name="idealOutput"
          label="Ideal Output"
          labelHidden
          multiline={3}
          value={idealOutput}
          onChange={onIdealOutputChange}
          placeholder="What would the ideal output look like?"
        />
      </div>
    </div>
  );
};

export default FailureDetails;
