'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataTable, Spinner, Text, type ColumnFilterConfig } from 'opub-ui';
import { useOrganization } from '@/features/ai-maker/context/OrganizationContext';
import { useGraphQL } from '@/lib/graphql-client';
import { getEvaluationStatusColor } from '@/utils/status-colors';
import {
  AUDIT_TYPE_OPTIONS,
  EVALUATION_MODE_OPTIONS,
  EVALUATION_STATUS,
  EVALUATION_STATUS_FILTER_OPTIONS,
  getAuditTypeLabel,
  getEvaluationModeLabel,
  isPlaygroundEvaluationMode,
} from '@/constants';
import { formatStatusLabel } from '@/utils';
import ModelSelectionModal from './components/ModelSelectionModal';
import { useAuditsQuery, type Audit } from './hooks/use-audits-query';
import './evaluations-page.css';

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

const formatDate = (input: string | null): string => {
  if (!input) return '--';
  return new Date(input).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StatusPill = ({ status }: { status: string }) => {
  const colors = getEvaluationStatusColor(status);
  return (
    <Text
      variant="bodySm"
      as="span"
      className="rounded inline-block px-2 py-0.5"
      style={{ backgroundColor: colors.fillColor, color: colors.textColor }}
    >
      {formatStatusLabel(status)}
    </Text>
  );
};

const TestsBar = ({ passed, failed, total }: { passed: number; failed: number; total: number }) => {
  if (!total) return <Text variant="bodySm">--</Text>;
  return (
    <div className="flex items-center gap-2">
      <div className="test-result-bar">
        <div className="test-result-pass" style={{ width: `${(passed / total) * 100}%` }} />
        <div className="test-result-fail" style={{ width: `${(failed / total) * 100}%` }} />
      </div>
      <Text variant="bodySm">
        {passed}/{total} passed
      </Text>
    </div>
  );
};

type AuditColumnConfig = {
  id: keyof Audit;
  header: string;
  cell: (audit: Audit) => ReactNode;
  sortable?: boolean;
  filter?: Omit<ColumnFilterConfig, 'columnId'>;
};

const AuditsListPage = () => {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const orgId = params.orgId as string;
  const { isAuthenticated, isLoading: isSessionLoading } = useGraphQL();
  useOrganization();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    audits,
    totalRows,
    isLoading,
    hasEverLoaded,
    error,
    filters,
    sorting,
    pagination,
    setFilters,
    setSorting,
    setPagination,
  } = useAuditsQuery({
    orgId,
    isReady: isAuthenticated && !isSessionLoading,
  });

  const getAuditLink = useMemo(() => {
    const base = `/${locale}/dashboard/ai-maker/${orgId}/evaluations`;
    return (audit: Audit) => {
      const status = audit.status?.toUpperCase();
      const isResumable =
        status === EVALUATION_STATUS.DRAFT ||
        (status === EVALUATION_STATUS.IN_PROGRESS &&
          isPlaygroundEvaluationMode(audit.evaluationMode));
      return isResumable ? `${base}/new?auditId=${audit.id}` : `${base}/${audit.id}`;
    };
  }, [locale, orgId]);

  const columnConfig = useMemo<AuditColumnConfig[]>(
    () => [
      {
        id: 'name',
        header: 'Evaluation Name',
        sortable: true,
        filter: { type: 'text' },
        cell: (audit) => (
          <Link
            href={getAuditLink(audit)}
            className="text-primary-purple font-medium hover:underline"
          >
            {audit.name || `Evaluation #${audit.id.slice(0, 8)}`}
          </Link>
        ),
      },
      {
        id: 'modelName',
        header: 'Model',
        sortable: true,
        filter: { type: 'text' },
        cell: (audit) => (
          <Text variant="bodySm">
            {audit.modelName || `Model ${audit.modelId?.slice(0, 8) || '-'}`}
          </Text>
        ),
      },
      {
        id: 'auditType',
        header: 'Evaluation Type',
        sortable: true,
        filter: { type: 'select', options: AUDIT_TYPE_OPTIONS },
        cell: (audit) => <Badge>{getAuditTypeLabel(audit.auditType)}</Badge>,
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        filter: {
          type: 'multiSelect',
          options: EVALUATION_STATUS_FILTER_OPTIONS,
        },
        cell: (audit) => <StatusPill status={audit.status} />,
      },
      {
        id: 'evaluationMode',
        header: 'Evaluation Mode',
        sortable: true,
        filter: { type: 'select', options: EVALUATION_MODE_OPTIONS },
        cell: (audit) => (
          <Text variant="bodySm">{getEvaluationModeLabel(audit.evaluationMode)}</Text>
        ),
      },
      {
        id: 'passedTests',
        header: 'Tests',
        sortable: true,
        cell: (audit) => (
          <TestsBar
            passed={audit.passedTests ?? 0}
            failed={audit.failedTests ?? 0}
            total={audit.totalTests ?? 0}
          />
        ),
      },
      {
        id: 'completedAt',
        header: 'Completed on',
        sortable: true,
        cell: (audit) => <Text variant="bodySm">{formatDate(audit.completedAt)}</Text>,
      },
    ],
    [getAuditLink]
  );

  const columns = useMemo(() => {
    const helper = createColumnHelper<Audit>();
    return columnConfig.map((c) =>
      helper.accessor(c.id, {
        header: c.header,
        cell: (info) => c.cell(info.row.original),
      })
    );
  }, [columnConfig]);

  const tableFilters = useMemo<ColumnFilterConfig[]>(
    () => columnConfig.filter((c) => c.filter).map((c) => ({ columnId: c.id, ...c.filter! })),
    [columnConfig]
  );

  const sortColumns = useMemo<string[]>(
    () => columnConfig.filter((c) => c.sortable).map((c) => c.id),
    [columnConfig]
  );

  const openNewAuditModal = () => setIsModalOpen(true);
  const isInitialLoad = (isSessionLoading || isLoading) && !hasEverLoaded;
  const isEmptyAndUnfiltered = !isLoading && !error && totalRows === 0 && filters.length === 0;

  return (
    <>
      <div className="mb-6 mt-10 flex items-center justify-between">
        <div>
          <Text variant="headingLg" as="h1" fontWeight="bold">
            Evaluations
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Create and manage evaluation runs to assess your AI models
          </Text>
        </div>
        <Button
          kind="secondary"
          onClick={openNewAuditModal}
          className="text-base rounded-[8px] bg-primaryPurple2 px-8 py-3 font-bold text-white hover:!bg-[#6849EE] hover:bg-[#6849EE] hover:!text-white hover:text-white"
        >
          New Evaluation
        </Button>
      </div>

      {isInitialLoad ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Spinner />
          <Text variant="bodySm" className="text-gray-600">
            Loading evaluations...
          </Text>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Text variant="bodySm" className="text-red-600 mb-4">
            {error}
          </Text>
          <Button kind="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : isEmptyAndUnfiltered ? (
        <div className="flex flex-col items-center justify-center py-16">
          <img
            src="/images/icons/mood-empty.png"
            alt="No evaluations"
            width={70}
            height={70}
            className="mb-4 opacity-60"
          />
          <Text variant="bodyMd" className="text-gray-600 mb-4 text-center">
            You haven&apos;t run any evaluations yet.
            <br />
            Start your first evaluation to see results here.
          </Text>
          <Button
            kind="primary"
            onClick={openNewAuditModal}
            className="text-base !text-base rounded-[8px] bg-primaryPurple2 px-8 py-3 !font-bold font-bold text-white hover:!bg-[#6849EE] hover:bg-[#6849EE] hover:!text-white hover:text-white"
          >
            Start New Evaluation
          </Button>
        </div>
      ) : (
        <div className="evaluations-table-evaluation-mode-col">
          <DataTable
            rows={audits}
            columns={columns}
            hoverable
            truncate
            hideSelection
            withServer
            filters={tableFilters}
            showFilterChips
            sortColumns={sortColumns}
            filterState={filters}
            sortingState={sorting}
            paginationState={pagination}
            totalRows={totalRows}
            onFiltersChange={setFilters}
            onSortingChange={setSorting}
            onPaginationChange={setPagination}
            emptyState={
              <div className="w-full py-8 text-center">
                <Text variant="bodySm" className="text-gray-600">
                  No evaluations match the current filters.
                </Text>
              </div>
            }
          />
        </div>
      )}

      <ModelSelectionModal open={isModalOpen} onOpenChange={setIsModalOpen} orgId={orgId} />
    </>
  );
};

export default AuditsListPage;
