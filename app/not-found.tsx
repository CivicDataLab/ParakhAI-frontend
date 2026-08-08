import Image from 'next/image';
import Link from 'next/link';
import { Button, Text } from 'opub-ui';
import MainFooter from '@/components/layout/MainFooter';
import MainNav from '@/components/layout/MainNav';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <Image
          src="/images/logos/parakhai-logo.png"
          alt="ParakhAI"
          width={120}
          height={37}
          className="object-contain opacity-80"
        />
        <div>
          <Text variant="headingXl" as="h1" fontWeight="bold">
            404 — Page not found
          </Text>
          <Text variant="bodyMd" className="text-gray-600 mt-2">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </Text>
        </div>
        <Link href="/">
          <Button
            kind="primary"
            className="text-base !rounded-[8px] !border-none bg-primaryPurple2 px-8 py-3 font-medium text-white hover:bg-[#6849EE] hover:text-white"
          >
            Back to home
          </Button>
        </Link>
      </div>
      <MainFooter />
    </div>
  );
}
