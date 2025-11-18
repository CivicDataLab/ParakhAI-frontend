'use client';

import React from 'react';

import { IconButton, Select, Text } from 'opub-ui';

import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';

import styles from './Pagination.module.scss';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  label?: string; // Default: "Rows:" but you can use "Results per page"
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions = [9, 18, 27],
  onPageChange,
  onPageSizeChange,
  label = 'Results per page',
}) => {
  const handleFirstPage = () => {
    onPageChange(1);
  };

  const handlePreviousPage = () => {
    onPageChange(Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  };

  const handleLastPage = () => {
    onPageChange(totalPages);
  };

  // Memoize options to prevent unnecessary re-renders
  const selectOptions = React.useMemo(
    () =>
      pageSizeOptions.map((value) => ({
        value: String(value),
        label: String(value),
      })),
    [pageSizeOptions]
  );

  const selectValue = React.useMemo(() => String(pageSize), [pageSize]);

  const paginationMarkup = (
    <div className={styles.Pagination}>
      <IconButton
        className={styles.ArrowButton}
        onClick={handleFirstPage}
        disabled={currentPage === 1}
        icon={IconChevronsLeft}
        size="slim"
        color="subdued"
      >
        First Page
      </IconButton>
      <IconButton
        className={styles.ArrowButton}
        onClick={handlePreviousPage}
        disabled={currentPage === 1}
        icon={IconChevronLeft}
        size="slim"
        color="subdued"
      >
        Previous Page
      </IconButton>
      <IconButton
        className={styles.ArrowButton}
        onClick={handleNextPage}
        disabled={currentPage === totalPages}
        icon={IconChevronRight}
        size="slim"
        color="subdued"
      >
        Next Page
      </IconButton>
      <IconButton
        className={styles.ArrowButton}
        onClick={handleLastPage}
        disabled={currentPage === totalPages}
        icon={IconChevronsRight}
        size="slim"
        color="subdued"
      >
        Last Page
      </IconButton>
    </div>
  );

  const pageIndexMarkup = (
    <div>
      <div className={styles.desktopText}>
        <Text noBreak variant="bodySm">
          Page <span className={styles.currentPage}>{String(currentPage).padStart(2, '0')}</span> of{' '}
          {String(totalPages).padStart(2, '0')}
        </Text>
      </div>
      <div className={styles.mobileText}>
        <Text noBreak variant="bodySm">
          <span className={styles.currentPage}>{String(currentPage).padStart(2, '0')}</span> /{' '}
          {String(totalPages).padStart(2, '0')}
        </Text>
      </div>
    </div>
  );

  const pageSizeMarkup = (
    <div className={styles.PageSizeControl}>
      <Text variant="bodySm">{label}</Text>
      <div className={styles.SelectWrapper}>
        <Select
          key={`select-${selectValue}`}
          labelHidden
          className={styles.PageSizeSelect}
          options={selectOptions}
          value={selectValue}
          onChange={(value) => {
            if (value) {
              onPageSizeChange(Number(value));
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.Footer}>
      {pageSizeMarkup}
      <div className={styles.FooterRight}>
        {pageIndexMarkup}
        {paginationMarkup}
      </div>
    </div>
  );
};

