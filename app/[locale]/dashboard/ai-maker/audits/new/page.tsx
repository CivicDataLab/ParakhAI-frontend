'use client';

import React, { useState } from 'react';
import { Button, Tag, Text, Icon, TextField, Label } from 'opub-ui';
import Image from 'next/image';
import {
  IconCheck,
  IconX,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import BreadCrumbs from '@/components/Breadcrumbs';
import WelcomeSection from '../../../components/WelcomeSection';

type AuditType = 'technical' | 'domain' | 'cultural';

const NewAuditPage = () => {
  const [auditType, setAuditType] = useState<AuditType>('technical');
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'results'>('config');
  const [auditName, setAuditName] = useState('Untitled Audit - 20 March 2023 - 10:30AM');
  const modelName = 'Region-al';
  const modelVersion = 'Ver. 1.2.1';
  const isAutoSaved = true;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <BreadCrumbs
        data={[
          { href: '/', label: 'Home' },
          { href: '/dashboard', label: 'User Dashboard' },
          { href: '/dashboard/ai-maker', label: 'AI Maker Dashboard' },
          { href: '#', label: 'New Audit' },
        ]}
      />

      <div className="flex flex-1 gap-8 px-8 main-content-wrapper">
        <WelcomeSection />

        <div className="flex-1 audit-content p-10">
          {/* Model Name and Owner Section */}
          <div className="mb-6">
            {/* Single line layout with gap */}
            <div className="flex items-center gap-4 mb-4 model-name-container">
              <Text as="h1" className="model-name-text">
                {modelName}
              </Text>
              <Text as="h2" className="model-name-text">
                {modelVersion}
              </Text>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Text variant="bodyMd">Owner:</Text>
              <Image
                src="/images/icons/CDL.png"
                alt="CDL"
                width={36}
                height={36}
                className="object-contain cdl-logo"
              />
            </div>
          </div>

          {/* Audit Name, Tag, and Status Section */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-nowrap">
              <Label htmlFor="auditName" className="audit-name-label">
                Audit Name
              </Label>
              {/* Wrap TextField in a div for className control */}
              <div className="audit-name-input-wrapper">
                <TextField
                  id="auditName"
                  name="auditName"
                  label="Audit Name"
                  labelHidden
                  value={auditName}
                  onChange={(value) => setAuditName(value)}
                />
              </div>
              <div className="tag-wrapper audit-tag">
                <Tag variation="filled" fillColor="#E2F5C4" textColor="#0A0704">
                  {auditType === 'technical'
                    ? 'Technical Audit'
                    : auditType === 'domain'
                      ? 'Domain Audit'
                      : 'Cultural Audit'}
                </Tag>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAutoSaved && (
                <div className="flex items-center audit-auto-saved-wrapper">
                  <Text className="audit-auto-saved">
                    Audit auto-saved
                  </Text>
                  <Image
                    src="/images/icons/circle-check.png"
                    alt="Circle check"
                    width={18}
                    height={18}
                    className="object-contain"
                  />
                </div>
              )}
              <Button
                kind="tertiary"
                variant="critical"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this audit?')) {
                    window.history.back();
                  }
                }}
                className="cancel-audit-button"
              >
                Cancel Audit
                <Icon source={IconX} size={18} />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex gap-6 tabs-container">
              <button
                onClick={() => setActiveTab('config')}
                className={`audit-config-tab ${
                  activeTab === 'config'
                    ? 'audit-config-tab-active text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent'
                }`}
              >
                <Text
                  variant="bodyMd"
                  className={activeTab === 'config' ? 'text-gray-900 font-semibold' : 'text-gray-600'}
                >
                  Audit Configuration
                </Text>
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`audit-config-tab ${
                  activeTab === 'test'
                    ? 'audit-config-tab-active text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent'
                }`}
              >
                <Text
                  variant="bodyMd"
                  className={activeTab === 'test' ? 'text-gray-900 font-semibold' : 'text-gray-600'}
                >
                  Test Cases
                </Text>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`audit-config-tab ${
                  activeTab === 'results'
                    ? 'audit-config-tab-active text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent'
                }`}
              >
                <Text
                  variant="bodyMd"
                  className={activeTab === 'results' ? 'text-gray-900 font-semibold' : 'text-gray-600'}
                >
                  Audit Results
                </Text>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'config' && (
            <div className="mb-8">
              <Label htmlFor="auditType" className="block audit-type-label">
                <Text variant="bodyMd" fontWeight="semibold" className="text-gray-900">
                  Audit Type <span className="text-red-500">*</span>
                </Text>
              </Label>

              <div className="flex gap-4 audit-options-container">
                {/* Technical Audit Option */}
                <label
                  className={`flex items-start gap-3 cursor-pointer transition-all technical-audit-card ${
                    auditType === 'technical'
                      ? ''
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="auditType"
                    value="technical"
                    checked={auditType === 'technical'}
                    onChange={(e) => setAuditType(e.target.value as AuditType)}
                    className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                  />
                  <div className="flex-1">
                    <Text
                      variant="bodyMd"
                      fontWeight="semibold"
                      className="text-gray-900 mb-2 whitespace-nowrap"
                    >
                      Technical Audit
                    </Text>
                    <Text variant="bodySm" className="text-gray-600 block whitespace-nowrap">
                      Check performance, safety, drift
                    </Text>
                  </div>
                </label>

                {/* Domain Audit Option */}
                <label
                  className={`flex items-start gap-3 cursor-pointer transition-all domain-audit-card ${
                    auditType === 'domain'
                      ? ''
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="auditType"
                    value="domain"
                    checked={auditType === 'domain'}
                    onChange={(e) => setAuditType(e.target.value as AuditType)}
                    className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                  />
                  <div className="flex-1">
                    <Text
                      variant="bodyMd"
                      fontWeight="semibold"
                      className="text-gray-900 mb-2 whitespace-nowrap"
                    >
                      Domain Audit
                    </Text>
                    <Text variant="bodySm" className="text-gray-600 block whitespace-nowrap">
                      Check accuracy within domain context
                    </Text>
                  </div>
                </label>

                {/* Cultural Audit Option */}
                <label
                  className={`flex items-start gap-3 cursor-pointer transition-all cultural-audit-card ${
                    auditType === 'cultural'
                      ? ''
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="auditType"
                    value="cultural"
                    checked={auditType === 'cultural'}
                    onChange={(e) => setAuditType(e.target.value as AuditType)}
                    className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                  />
                  <div className="flex-1">
                    <Text
                      variant="bodyMd"
                      fontWeight="semibold"
                      className="text-gray-900 mb-2 whitespace-nowrap"
                    >
                      Cultural Audit
                    </Text>
                    <Text variant="bodySm" className="text-gray-600 block whitespace-nowrap">
                      Expert checks for real-world fit
                    </Text>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="mb-8">
              <Text variant="bodyMd" className="text-gray-600">
                Test Cases content will go here
              </Text>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="mb-8">
              <Text variant="bodyMd" className="text-gray-600">
                Audit Results content will go here
              </Text>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
            <Button
              kind="secondary"
              disabled
              onClick={() => {}}
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
              kind="secondary"
              disabled
              onClick={() => {}}
              className="add-test-cases-button"
            >
              <span className="add-test-cases-text">Add Test Cases</span>
              <Image
                src="/images/icons/circle-arrow-right.png"
                alt="Circle arrow right"
                width={18}
                height={18}
                className="object-contain add-test-cases-icon"
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAuditPage;

