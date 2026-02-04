'use client';

import { Tag, Text } from 'opub-ui';
import React from 'react';
import type { ModuleProgress } from './types';
import styles from '../styles.module.scss';

interface ModuleSelectorProps {
  modules: string[];
  moduleProgress: ModuleProgress[];
  selectedModule: string | null;
  onSelectModule: (module: string) => void;
  getModuleDisplayName: (name: string) => string;
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  BIAS_FAIRNESS: 'Checks whether model perpetuates stereotypes',
  HALLUCINATION_MISINFORMATION: 'Detects false or unsafe outputs',
  PRIVACY_SAFETY: 'Ensures personal data is not exposed',
};

const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  modules,
  moduleProgress,
  selectedModule,
  onSelectModule,
  getModuleDisplayName,
}) => {
  const getProgressForModule = (moduleName: string): ModuleProgress | undefined => {
    return moduleProgress.find((p) => p.module === moduleName);
  };

  const getModuleDescription = (moduleName: string): string => {
    return MODULE_DESCRIPTIONS[moduleName] || '';
  };

  return (
    <div className="mb-6">
      <Text variant="headingMd" className="mb-1 block">
        Select Module to Test
      </Text>
      <Text variant="bodySm" className="text-gray-500 mb-4 block">
        Choose a module to begin testing. Each module requires at least 3 test cases.
      </Text>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const progress = getProgressForModule(module);
          const testCount = progress?.testCaseCount || 0;
          const passedCount = progress?.passedCount || 0;
          const failedCount = progress?.failedCount || 0;
          const isComplete = progress?.isComplete || false;
          const isSelected = selectedModule === module;

          return (
            <button
              key={module}
              onClick={() => onSelectModule(module)}
              className={`${styles.moduleselectioncard} text-left transition-all ${
                isSelected
                  ? 'border-2 border-purple-600 bg-purple-50'
                  : isComplete
                    ? 'border border-green-300 bg-green-50'
                    : ''
              }`}
            >
              <Text variant="bodyMd" fontWeight="semibold" className="mb-2 text-[#0A0704] block">
                {getModuleDisplayName(module)}
              </Text>
              
              <Text variant="bodySm" className="text-gray-600 mb-4 block">
                {getModuleDescription(module)}
              </Text>

              <div className="flex gap-2 flex-wrap">
                <Tag variation="filled" fillColor="#E5E7EB" textColor="#374151">
                  {testCount} Test Cases
                </Tag>
                <Tag variation="filled" fillColor="#EC4899" textColor="#FFFFFF">
                  {failedCount} Failed
                </Tag>
                <Tag variation="filled" fillColor="#D9F99D" textColor="#15803D">
                  {passedCount} Passed
                </Tag>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleSelector;
