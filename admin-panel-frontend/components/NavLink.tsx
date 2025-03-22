"use client";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/navigation";
import { usePathname } from "@/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

interface NavLinkProps {
  href: string;
  Icon: React.ElementType;
  name: string;
  badge?: number;
}

const NavLink: React.FC<NavLinkProps> = ({ href, Icon, name, badge }) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: notificationCount } = useQuery<number>({
    queryKey: ["FormsCount", name],
    queryFn: async () => {
      if (href !== "/forms") return 0;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/form/count`,
        {
          headers: {
            Authorization: `Bearer ${session?.sessionToken}`,
            "Content-Type": "application/json",
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
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
        pathname.startsWith(href) ? "bg-muted text-primary" : ""
      }`}
    >
      <Icon className="h-4 w-4" />
      {name}
      {!!notificationCount && (
        <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          {notificationCount}
        </Badge>
      )}
    </Link>
  );
};

export default NavLink;
