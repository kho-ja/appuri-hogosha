import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BackButton({ href }: { href: string }) {
  const t = useTranslations('BackButton');

  return (
    <Link href={href} passHref>
      <Button icon={<ChevronLeft className="-ml-2" />} variant={'secondary'}>
        {t('back')}
      </Button>
    </Link>
  );
}
