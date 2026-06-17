'use client';

import { Button, Dialog, Text } from 'opub-ui';
import React, { useState } from 'react';

interface RecommendationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  onSubmit: (recommendation: string) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const RecommendationModal: React.FC<RecommendationModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  placeholder = 'Enter your recommendation...',
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Submit',
}) => {
  const [recommendation, setRecommendation] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = recommendation.trim();
    if (!trimmed) {
      setError('Recommendation is required.');
      return;
    }

    setError('');
    onSubmit(trimmed);
    setRecommendation('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setRecommendation('');
    setError('');
    onOpenChange(false);
  };

  const isSubmitDisabled = isSubmitting || !recommendation.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}
    >
      <Dialog.Content
        title={title}
        footer={
          <div className="recommendation-modal-footer flex w-full items-center justify-end gap-3">
            <Button kind="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              kind="primary"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
            >
              {isSubmitting ? 'Submitting...' : submitButtonText}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-4">
          {description && (
            <Text variant="bodySm" className="text-gray-600">
              {description}
              <span className="text-red-500"> *</span>
            </Text>
          )}
          <textarea
            className={`w-full p-3 border rounded-lg text-sm min-h-[120px] resize-none ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={placeholder}
            value={recommendation}
            onChange={(e) => {
              setRecommendation(e.target.value);
              if (error && e.target.value.trim()) {
                setError('');
              }
            }}
            rows={4}
            required
            aria-required="true"
            aria-invalid={Boolean(error)}
          />
          {error && (
            <Text variant="bodySm" className="text-red-600">
              {error}
            </Text>
          )}
        </div>
      </Dialog.Content>
    </Dialog>
  );
};

export default RecommendationModal;
