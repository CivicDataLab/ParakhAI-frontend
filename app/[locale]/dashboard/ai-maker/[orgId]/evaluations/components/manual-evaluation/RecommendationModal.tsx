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

  const handleSubmit = () => {
    onSubmit(recommendation);
  };

  const handleClose = () => {
    setRecommendation('');
    onOpenChange(false);
  };

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
      <Dialog.Content title={title} footer={<></>}>
        <div className="flex flex-col gap-4 py-4">
          {description && (
            <Text variant="bodySm" className="text-gray-600">
              {description}
            </Text>
          )}
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[120px] resize-y"
            placeholder={placeholder}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-3">
            <Button kind="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button kind="primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : submitButtonText}
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
};

export default RecommendationModal;
