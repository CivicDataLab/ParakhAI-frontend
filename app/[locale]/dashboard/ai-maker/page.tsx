'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertDialog, Button, Text } from 'opub-ui';
import { useMyOrganizations } from '@/features/ai-maker/api/use-organizations';
import type { Organization } from '@/features/ai-maker/api/use-organizations';
import BreadCrumbs from '@/components/common/Breadcrumbs';
import { Loading } from '@/components/common/loading';
import MediaImage from '@/components/common/MediaImage';
import { useDashboardStore } from '@/stores';
import { mediaUrl } from '@/utils';

const EntityCard = ({ org, locale }: { org: Organization; locale: string }) => {
  const [isImageValid, setIsImageValid] = useState(!!org.logoUrl);
  const imageSrc = mediaUrl(org.logoUrl);

  return (
    <Link
      key={org.name}
      href={`/${locale}/dashboard/ai-maker/${org.id}`}
      className="hover:border-highlight group flex h-72 w-56 flex-col items-center gap-3 rounded-2 border-2 border-solid border-baseGraySlateSolid4 bg-white px-4 py-5 text-center transition-all"
    >
      <div className="flex h-full w-full items-center justify-center rounded-2">
        <div className="rounded-2">
          {isImageValid ? (
            <MediaImage
              height={160}
              width={160}
              src={imageSrc}
              alt={`${org.name} logo`}
              onError={() => setIsImageValid(false)}
              className="object-contain"
            />
          ) : (
            <Image
              height={160}
              width={160}
              src={'/images/logos/parakhai-logo.png'}
              alt={`fallback logo`}
              className="fill-current object-contain text-baseGraySlateSolid6 opacity-20"
            />
          )}
        </div>
      </div>
      <div>
        <Text
          variant="headingMd"
          className="group-hover:text-highlight line-clamp-3 text-center transition-colors"
          title={org.name}
        >
          {org.name}
        </Text>
      </div>
    </Link>
  );
};

const OrganizationSelection = () => {
  const params = useParams();
  const locale = params?.locale || 'en';
  const router = useRouter();
  const { setAllEntityDetails } = useDashboardStore();

  const [showRedirectPrompt, setShowRedirectPrompt] = useState(false);

  const inAppPath = `/${locale}/dashboard/ai-maker`;
  const externalHost =
    process.env.NEXT_PUBLIC_DATASPACE_HOST || process.env.NEXT_PUBLIC_AI_MAKER_URL || '';
  const externalPath = '/dashboard/organization';

  const { data: organizations = [], isLoading } = useMyOrganizations();

  const { addOrganizationUrl, externalUrl } = useMemo(() => {
    let builtExternalUrl = '';
    if (externalHost.trim() !== '') {
      const host = externalHost.replace(/\/$/, '');
      if (/\/dashboard$/.test(host)) {
        builtExternalUrl = `${host}${externalPath.replace(/^\/dashboard/, '')}`;
      } else {
        builtExternalUrl = `${host}${externalPath}`;
      }
    }
    return {
      externalUrl: builtExternalUrl,
      addOrganizationUrl: builtExternalUrl || inAppPath,
    };
  }, [externalHost, inAppPath]);

  useEffect(() => {
    if (organizations.length > 0) {
      setAllEntityDetails({ organizations });
    }
  }, [organizations, setAllEntityDetails]);

  useEffect(() => {
    if (!isLoading && organizations.length === 0) {
      setShowRedirectPrompt(true);
    }
  }, [isLoading, organizations.length]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <BreadCrumbs
        data={[
          { href: '/', label: 'Home' },
          { href: '/dashboard', label: 'Evaluation Workspace' },
          { href: '#', label: 'AI Maker' },
        ]}
      />

      <div className="container mx-10 mb-40 mt-10 flex-1">
        <div className="flex flex-col gap-3 py-10">
          <Text variant="headingXl">Select Organization</Text>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Text variant="bodyMd" className="text-gray-600">
              Choose an organization to access its AI Maker dashboard.
            </Text>
            <Button
              kind="primary"
              onClick={() => setShowRedirectPrompt(true)}
              className="text-base shrink-0 rounded-[8px] border-none bg-primaryPurple2 px-8 py-3 font-medium text-white hover:!bg-[#6849EE] hover:bg-[#6849EE] hover:!text-white hover:text-white"
            >
              Add Organisation
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <div className="flex flex-wrap gap-6">
            {organizations.map((org) => (
              <EntityCard key={org.id} org={org} locale={locale as string} />
            ))}

            {organizations.length === 0 && (
              <div className="bg-gray-50 col-span-full w-full rounded-4 py-20 text-center">
                <Text variant="bodyLg" className="text-gray-500">
                  You are not a member of any organization yet.
                </Text>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showRedirectPrompt} onOpenChange={setShowRedirectPrompt}>
        <AlertDialog.Content
          title="Redirect to CivicDataSpace"
          primaryAction={
            {
              content: 'Yes, continue',
              onAction: () => {
                setShowRedirectPrompt(false);
                if (externalUrl) {
                  window.open(addOrganizationUrl, '_blank', 'noopener,noreferrer');
                } else {
                  router.push(addOrganizationUrl);
                }
              },
              className: 'bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white',
            } as any
          }
          secondaryActions={[
            {
              content: 'No',
              onAction: () => setShowRedirectPrompt(false),
              className: 'bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white',
            } as any,
          ]}
        >
          You are being redirected to CivicDataSpace to add an organisation. Do you want to
          continue?
        </AlertDialog.Content>
      </AlertDialog>
    </div>
  );
};

export default OrganizationSelection;
