'use client';

import { redirect } from 'next/navigation';

type PageProps = {
  params: {
    locale: string;
  };
};

export default function RedirectPromptLibraries({ params }: PageProps) {
  const { locale } = params;
  redirect(`/${locale}/dashboard/ai-maker/prompt-libraries`);
}

