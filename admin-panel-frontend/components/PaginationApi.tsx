import React, { useRef, useState, useEffect } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import pagination from "@/types/pagination";
import { useRouter, usePathname } from "@/navigation";

const PaginationApi = ({
  data,
  setPage,
}: {
  data: pagination | null;
  setPage: (newPage: number) => void;
  className?: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [useMobileLayout, setUseMobileLayout] = useState(false);
  const resizeTimeout = useRef<NodeJS.Timeout>();

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`${pathname}?page=${newPage}`, { scroll: false });
  };

  useEffect(() => {
    const checkLayout = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const paginationContent = container.querySelector('ul');
        
        if (!paginationContent) return;

        const BUFFER = 20;
        const isMobileByWidth = window.innerWidth < 640; // sm breakpoint
        const isOverflowing = paginationContent.scrollWidth > container.clientWidth + BUFFER;
        
        setUseMobileLayout(isMobileByWidth || isOverflowing);
      }
    };

    const handleResize = () => {
      clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(checkLayout, 100);
    };

    checkLayout();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout.current);
    };
  }, [data]);

  if (!data) return null;

  return (
    <div ref={containerRef} className="w-full overflow-x-hidden px-2">
      <Pagination>
        <PaginationContent className="sm:flex-nowrap">
          <PaginationItem className="hidden sm:block">
            <PaginationPrevious
              className="cursor-pointer min-w-[6rem]"
              onClick={() => handlePageChange(data.prev_page || 1)}
            />
          </PaginationItem>

          {useMobileLayout ? (
            <>
              <PaginationItem className="sm:hidden">
                <PaginationPrevious
                  className="cursor-pointer"
                  onClick={() => handlePageChange(data.prev_page || 1)}
                />
              </PaginationItem>
              
              <PaginationItem className="flex items-center px-1">
                <span className="text-sm font-medium">
                  {data.current_page} / {data.links[data.links.length - 1]}
                </span>
              </PaginationItem>
              
              <PaginationItem className="sm:hidden">
                <PaginationNext
                  className="cursor-pointer"
                  onClick={() => data.next_page && handlePageChange(data.next_page)}
                />
              </PaginationItem>
            </>
          ) : (
            data.links.map((page, index) => (
              <PaginationItem key={`page-${index}-${page}`}>
                {page === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => handlePageChange(Number(page))}
                    isActive={page === data.current_page}
                    className="min-w-[2.5rem] justify-center"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))
          )}

          <PaginationItem className="hidden sm:block">
            <PaginationNext
              className="cursor-pointer min-w-[6rem]"
              onClick={() => data.next_page && handlePageChange(data.next_page)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default PaginationApi;
