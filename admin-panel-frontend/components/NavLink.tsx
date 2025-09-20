'use client';

import { Badge } from '@/components/ui/badge';
import { Link } from '@/navigation';
import { usePathname } from '@/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface NavLinkProps {
  href: string;
  Icon: React.ElementType;
  name: string;
  badge?: number;
  isMenuOpen?: boolean;
  onLinkClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({
  href,
  Icon,
  name,
  isMenuOpen,
  badge,
  onLinkClick,
}) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const { data: notificationCount } = useQuery<number>({
    queryKey: ['FormsCount', name],
    queryFn: async () => {
      if (href !== '/forms') return 0;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/form/count`,
        {
          headers: {
            Authorization: `Bearer ${session?.sessionToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      const count = await res.json();
      return count.form_count;
    },
    enabled: !!session?.sessionToken,
  });

  return (
    <Link
      href={href}
      className={`
        flex items-center rounded-lg px-3 py-2 text-muted-foreground 
        transition-all duration-200 hover:text-primary hover:bg-muted/50
        ${pathname.startsWith(href) ? 'bg-muted text-primary shadow-sm' : ''}
        justify-start gap-3 group relative overflow-hidden
      `}
      onClick={onLinkClick}
    >
      <Icon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />

      <span
        className={`
        whitespace-nowrap transition-all duration-300 ease-in-out
        ${
          isMenuOpen
            ? 'opacity-100 translate-x-0 max-w-[200px]'
            : 'opacity-0 translate-x-2 max-w-0'
        }
      `}
      >
        {name}
      </span>

      <div
        className={`
        ml-auto transition-all duration-300 ease-in-out
        ${
          isMenuOpen && !!notificationCount
            ? 'opacity-100 scale-100 translate-x-0'
            : 'opacity-0 scale-75 translate-x-4'
        }
      `}
      >
        {!!notificationCount && (
          <Badge className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs animate-pulse">
            {notificationCount > 99 ? '99+' : notificationCount}
          </Badge>
        )}
      </div>
    </Link>
  );
};

export default NavLink;
