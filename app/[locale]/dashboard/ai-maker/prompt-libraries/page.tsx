'use client';

import React from 'react';
import { Button, Card, Dialog, DataTable, Icon, Popover, Select, Tag, Text } from 'opub-ui';
import {
  IconAdjustmentsHorizontal,
  IconMinus,
  IconChevronDown,
  IconChevronUp,
  IconX,
} from '@tabler/icons-react';
import BreadCrumbs from '@/components/Breadcrumbs';
import WelcomeSection from '../../components/WelcomeSection';
import { Icons } from '@/components/icons';
import { Pagination } from '@/components/Pagination/Pagination';

type PromptLibrary = {
  name: string;
  updatedAt: string;
  promptsCount: number;
  auditsCount: number;
  sectors: string[];
  tags: string[];
  owner: string;
};

const promptLibraries: PromptLibrary[] = [
  {
    name: 'Regional Prompts Database 1',
    updatedAt: '19 July 2024',
    promptsCount: 200,
    auditsCount: 272,
    sectors: ['Healthcare', 'Mizo'],
    tags: ['General Translation'],
    owner: 'ParakhAI',
  },
  {
    name: 'Reasoning & Logic Bench',
    updatedAt: '19 July 2024',
    promptsCount: 1032,
    auditsCount: 142,
    sectors: ['Healthcare', 'Odiya'],
    tags: ['Reasoning'],
    owner: 'ParakhAI',
  },
  {
    name: 'MedText Evaluation Pack',
    updatedAt: '01 Aug 2024',
    promptsCount: 1023,
    auditsCount: 12,
    sectors: ['Healthcare'],
    tags: ['Clinical'],
    owner: 'ParakhAI',
  },
  {
    name: 'LegalCom Benchmark',
    updatedAt: '19 July 2024',
    promptsCount: 1032,
    auditsCount: 47,
    sectors: ['Law & Justice'],
    tags: ['Justice', 'English'],
    owner: 'ParakhAI',
  },
  {
    name: 'Finance Stress Tests',
    updatedAt: '19 July 2024',
    promptsCount: 1032,
    auditsCount: 103,
    sectors: ['Healthcare', 'English'],
    tags: ['Finance'],
    owner: 'ParakhAI',
  },
  {
    name: 'Global Voices Corpus',
    updatedAt: '19 July 2024',
    promptsCount: 1032,
    auditsCount: 272,
    sectors: ['General Translation', 'English'],
    tags: ['Translation'],
    owner: 'ParakhAI',
  },
  {
    name: 'Media & Representation Suite',
    updatedAt: '19 July 2024',
    promptsCount: 1032,
    auditsCount: 12,
    sectors: ['Finance', 'English'],
    tags: ['Media'],
    owner: 'ParakhAI',
  },
  {
    name: 'Climate Resilience Toolkit',
    updatedAt: '05 Aug 2024',
    promptsCount: 648,
    auditsCount: 58,
    sectors: ['Environment', 'Policy'],
    tags: ['Climate', 'Sustainability'],
    owner: 'ParakhAI',
  },
  {
    name: 'Inclusive Design Bench',
    updatedAt: '28 Jul 2024',
    promptsCount: 487,
    auditsCount: 96,
    sectors: ['Accessibility', 'Design'],
    tags: ['Inclusion', 'UX'],
    owner: 'ParakhAI',
  },
];

const sectorOptions = ['Healthcare', 'Technology', 'Finance', 'Law & Justice', 'General Translation'];
const tagOptions = [
  'English',
  'Clinical',
  'Justice',
  'Mizo',
  'Odiya',
  'Translation',
  'Finance',
  'Education',
  'Healthcare',
  'Technology',
  'Agriculture',
  'Manufacturing',
  'Retail',
  'Tourism',
  'Transport',
  'Energy',
  'Environment',
  'Public Policy',
  'Data Science',
  'Cybersecurity',
  'Analytics',
  'Compliance',
  'Marketing',
  'Legal',
  'Research',
  'Operations',
  'Human Resources',
  'Logistics',
  'Content',
  'Localization',
  'Quality Assurance',
  'Testing',
  'Sales',
  'Strategy',
  'Innovation',
  'Engineering',
  'Automation',
  'Simulation',
  'Predictive Modeling',
  'Benchmarking',
  'Risk Assessment',
  'Auditing',
  'Accessibility',
  'Performance',
  'Ethics',
  'Diversity',
  'Inclusion',
  'Governance',
  'Regulation',
  'Open Data',
  'Knowledge Base',
  'Documentation',
  'Citizen Services',
  'Smart Cities',
  'Climate',
  'Finance Analytics',
  'Behavioral Insights',
  'Scenario Planning',
  'Rapid Prototyping',
  'Localization QA',
];

const PromptLibrariesPage = () => {
  const SearchIcon = Icons.search;
  const ClearIcon = Icons.cross;

  const [searchValue, setSearchValue] = React.useState('');
  const [selectedSectors, setSelectedSectors] = React.useState<string[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [resultsPerPage, setResultsPerPage] = React.useState('9');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sectorsExpanded, setSectorsExpanded] = React.useState(true);
  const [tagsExpanded, setTagsExpanded] = React.useState(true);
  const [selectedLibrary, setSelectedLibrary] = React.useState<PromptLibrary | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [showNotice, setShowNotice] = React.useState(true);
  const handleToggleSelection = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };


  const filteredLibraries = promptLibraries.filter((library) => {
    const matchesSearch = library.name.toLowerCase().includes(searchValue.toLowerCase());
    const matchesSector =
      selectedSectors.length === 0 || library.sectors.some((sector) => selectedSectors.includes(sector));
    const matchesTags = selectedTags.length === 0 || library.tags.some((tag) => selectedTags.includes(tag));
    return matchesSearch && matchesSector && matchesTags;
  });

  const formatNumber = React.useCallback((value: number) => value.toLocaleString(), []);

  // Pagination logic
  const itemsPerPage = parseInt(resultsPerPage, 10);
  const totalPages = Math.max(1, Math.ceil(filteredLibraries.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLibraries = filteredLibraries.slice(startIndex, endIndex);

  // Reset to page 1 when filters or results per page change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, selectedSectors, selectedTags, resultsPerPage]);

  // Ensure current page is valid when filtered results change
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Handle card click to open dialog
  const handleCardClick = (library: PromptLibrary) => {
    setSelectedLibrary(library);
    setDialogOpen(true);
  };

  // Sample table data - replace with actual API call based on selectedLibrary
  const tableData = React.useMemo(() => {
    if (!selectedLibrary) return [];

    // Generate sample data based on selected library
    return Array.from({ length: 13 }, (_, index) => ({
      input: 'Content',
      idealOutput: 'Content',
      columnName1: 'Content',
      columnName2: 'Content',
    }));
  }, [selectedLibrary]);

  // Define table columns
  const columns = React.useMemo(
    () => [
      {
        accessorKey: 'input',
        header: (
          <span className="dt-header-with-icon">
            <img src="/images/icons/arrows-sort.png" alt="" width={12} height={12} />
            <span>Input</span>
          </span>
        ),
      },
      {
        accessorKey: 'idealOutput',
        header: 'Ideal Output',
      },
      {
        accessorKey: 'columnName1',
        header: 'Column name',
      },
      {
        accessorKey: 'columnName2',
        header: 'Column name',
      },
    ],
    []
  );

  return (
    <div className="flex flex-col min-h-screen bg-white prompt-libraries-page">
      <BreadCrumbs
        data={[
          { href: '/', label: 'Home' },
          { href: '/dashboard', label: 'User Dashboard' },
          { href: '/dashboard/ai-maker', label: 'AI Maker Dashboard' },
          { href: '#', label: 'Prompt Libraries' },
        ]}
      />

      <div className="flex flex-1 gap-8 px-8 main-content-wrapper">
        <WelcomeSection />

        <div className="flex-1 prompt-libraries-content p-10">
          <div className="prompt-page-header">
            <Text as="h1" className="prompt-page-title" fontWeight="bold">
              Prompt Libraries
            </Text>
          </div>

          <div className="prompt-search-row">
            <div className="prompt-search-input">
              <label htmlFor="promptSearch" className="sr-only">
                Search prompt libraries
              </label>
              <div className="prompt-search-box">
                <SearchIcon size={18} className="prompt-search-icon" aria-hidden />
                <input
                  id="promptSearch"
                  type="text"
                  value={searchValue}
                  placeholder="Search by name"
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="prompt-search-field"
                />
                {searchValue && (
                  <button
                    type="button"
                    className="prompt-search-clear"
                    onClick={() => setSearchValue('')}
                    aria-label="Clear search"
                  >
                    <ClearIcon size={16} aria-hidden />
                  </button>
                )}
              </div>
            </div>
            <div className="prompt-search-actions">
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <Popover.Trigger asChild>
                  <button type="button" className="prompt-add-filters-link">
                    Add Filters
                  </button>
                </Popover.Trigger>
                <Popover.Content
                  side="bottom"
                  align="end"
                  alignOffset={10}
                  className="prompt-filter-popover"
                >
                  <div className="prompt-filter-popover-header">
                    <Text as="span" className="prompt-filter-popover-title">
                      FILTERS
                    </Text>
                    <Button kind="tertiary" size="slim" onClick={() => {
                      setSelectedSectors([]);
                      setSelectedTags([]);
                    }}>
                      Reset
                    </Button>
                  </div>
                  <div className="prompt-filter-popover-scroll">
                    <div className="prompt-filter-section">
                      <button
                        type="button"
                        className="prompt-filter-section-header"
                        onClick={() => setSectorsExpanded((prev) => !prev)}
                        aria-expanded={sectorsExpanded}
                      >
                        <span className="prompt-filter-section-title">
                          Sectors ({sectorOptions.length})
                        </span>
                        {sectorsExpanded ? <IconMinus size={16} /> : <IconChevronDown size={16} />}
                      </button>
                      {sectorsExpanded && (
                        <div className="prompt-filter-section-options prompt-filter-section-options--scrollable">
                          {sectorOptions.map((sector) => (
                            <label key={sector} className="prompt-filter-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedSectors.includes(sector)}
                                onChange={() => handleToggleSelection(sector, setSelectedSectors)}
                              />
                              <span>{sector}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="prompt-filter-section">
                      <button
                        type="button"
                        className="prompt-filter-section-header"
                        onClick={() => setTagsExpanded((prev) => !prev)}
                        aria-expanded={tagsExpanded}
                      >
                        <span className="prompt-filter-section-title">
                          Tags ({tagOptions.length})
                        </span>
                        {tagsExpanded ? <IconMinus size={16} /> : <IconChevronDown size={16} />}
                      </button>
                      {tagsExpanded && (
                        <div className="prompt-filter-section-options prompt-filter-section-options--scrollable">
                          {tagOptions.map((tag) => (
                            <label key={tag} className="prompt-filter-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(tag)}
                                onChange={() => handleToggleSelection(tag, setSelectedTags)}
                              />
                              <span>{tag}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Popover.Content>
              </Popover>
            </div>
          </div>
          <div className="prompt-active-filters">
            {selectedSectors.concat(selectedTags).map((filter) => (
              <div key={filter} className="prompt-filter-tag">
                <Tag
                  value={filter}
                  variation="filled"
                  fillColor="#E2F5C4"
                  textColor="#0A0704"
                  onRemove={() => {
                    if (selectedSectors.includes(filter)) {
                      setSelectedSectors((prev) => prev.filter((sector) => sector !== filter));
                    } else {
                      setSelectedTags((prev) => prev.filter((tag) => tag !== filter));
                    }
                  }}
                >
                  {filter}
                </Tag>
              </div>
            ))}
          </div>

          <div className="prompt-card-grid">
            {paginatedLibraries.map((library, index) => {
              const updatedValue = library.updatedAt;
              const testCasesValue = `${formatNumber(library.promptsCount)} test cases`;
              const auditsValue = `${formatNumber(library.auditsCount)} audits`;

              const metadataContent = [
                {
                  icon: Icons.calendar,
                  label: 'Updated',
                  value: updatedValue,
                  // Provide tooltip for truncation (opub-ui may ignore unknown fields; cast for safety)
                  tooltip: updatedValue,
                },
                {
                  icon: Icons.testPipe,
                  label: 'Test cases',
                  value: testCasesValue,
                  tooltip: testCasesValue,
                },
                {
                  icon: Icons.discountCheck,
                  label: 'Audits',
                  value: auditsValue,
                  tooltip: auditsValue,
                },
              ] as any;

              // Alternate between Parakh and CDL for different cards
              const rightIcon = index % 2 === 0 ? '/images/icons/Parakh.png' : '/images/icons/CDL.png';
              const rightLabel = index % 2 === 0 ? 'Parakh' : 'CDL';

              const footerContent = [
                {
                  icon: '/images/icons/Disaster.png',
                  label: 'Disaster',
                },
                {
                  icon: rightIcon,
                  label: rightLabel,
                },
              ];

              const type = library.sectors.map((sector) => ({
                label: sector,
                fillColor: '#D7CFF9',
                borderColor: '#D7CFF9',
              }));

              return (
                 <div key={library.name} className="prompt-card-wrapper">
                  <div onClick={() => handleCardClick(library)} style={{ cursor: 'pointer' }}>
                  <Card
                    title={library.name}
                    description=""
                    variation="collapsed"
                    iconColor="highlight"
                    metadataContent={metadataContent}
                    footerContent={footerContent}
                    type={type}
                    tag={library.tags}
                  />
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={itemsPerPage}
            pageSizeOptions={[9, 18, 27]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newPageSize) => {
              setResultsPerPage(String(newPageSize));
              setCurrentPage(1);
            }}
                label="Results per page"
              />
        </div>
      </div>

      {/* Dialog for showing library details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content
          title=""
          headerHidden
          large
          className="PromptDlg"
          style={{ maxHeight: '85vh' }}
          primaryAction={{
            content: '',
            onAction: () => {},
          }}
          secondaryActions={[
            {
              content: '',
              onAction: () => setDialogOpen(false),
            },
          ]}
        >
          <div className="PromptDlg__hdr">
            <div className="PromptDlg__actions">
              <button
                className="PromptDlg__flag"
                aria-label="Flag this library"
                onClick={() => {}}
              >
                <img src="/images/icons/flag-2-filled.png" alt="Flag" width={18} height={18} />
              </button>

              <button
                className="PromptDlg__close"
                aria-label="Close"
                onClick={() => setDialogOpen(false)}
              >
                <IconX size={18} />
              </button>
            </div>
          </div>

          {selectedLibrary && (
            <Text as="h2" className="prompt-dialog-title" fontWeight="bold">
              {selectedLibrary.name}
            </Text>
          )}

          {showNotice && (
            <div className="PromptDlg__note">
              <span>
                Notice something wrong with this prompt library? Flag the issue by clicking the red flag above.
              </span>
              <button
                type="button"
                className="PromptDlg__noteClose"
                aria-label="Dismiss notice"
                onClick={() => setShowNotice(false)}
              >
                <IconX size={12} stroke={2} color="#000000" />
              </button>
            </div>
          )}

          <div className="PromptDlg__body">
            {selectedLibrary && (
              <DataTable
                rows={tableData}
                columns={columns}
                 hideSelection={true}
                hideFooter={true}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog>
    </div>
  );
};

export default PromptLibrariesPage;


