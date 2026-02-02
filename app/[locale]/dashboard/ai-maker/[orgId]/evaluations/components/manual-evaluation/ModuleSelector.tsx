'use client';

import { Tag, Text } from 'opub-ui';
import React from 'react';
import type { ModuleProgress } from './types';

interface ModuleSelectorProps {
  modules: string[];
  moduleProgress: ModuleProgress[];
  selectedModule: string | null;
  onSelectModule: (module: string) => void;
  getModuleDisplayName: (name: string) => string;
}

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

  return (
    <div className="mb-6">
      <Text variant="headingMd" className="mb-4">
        Select Module to Test
      </Text>
      <Text variant="bodySm" className="text-gray-500 mb-4">
        Choose a module to begin testing. Each module requires at least 3 test cases.
      </Text>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const progress = getProgressForModule(module);
          const testCount = progress?.testCaseCount || 0;
          const isComplete = progress?.isComplete || false;
          const isSelected = selectedModule === module;

          return (
            <button
              key={module}
              onClick={() => onSelectModule(module)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : isComplete
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <Text variant="bodyMd" fontWeight="semibold">
                  {getModuleDisplayName(module)}
                </Text>
                {isComplete && (
                  <Tag variation="filled" fillColor="#BBF7D0" textColor="#15803D">
                    Complete
                  </Tag>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      testCount >= 3 ? 'bg-green-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min((testCount / 3) * 100, 100)}%` }}
                  />
                </div>
                <Text variant="bodySm" className="text-gray-600 whitespace-nowrap">
                  {testCount}/3 tests
                </Text>
              </div>

              {progress && (
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-green-600">✓ {progress.passedCount} passed</span>
                  <span className="text-red-600">✕ {progress.failedCount} failed</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleSelector;
