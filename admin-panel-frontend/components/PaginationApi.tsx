import React from "react";
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
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`${pathname}?page=${newPage}`, { scroll: false });
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            className="cursor-pointer"
            onClick={() => {
              if (data?.prev_page) {
                handlePageChange(Number(data.prev_page));
              } else {
                handlePageChange(1);
              }
            }}
          />
        </PaginationItem>
        {data &&
          data?.links.map((page, index) =>
            page === "..." ? (
              <PaginationItem key={page + index}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => handlePageChange(Number(page))}
                  isActive={page === data?.current_page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}
        <PaginationItem>
          <PaginationNext
            className="cursor-pointer"
            onClick={() => {
              if (data?.next_page) {
                handlePageChange(Number(data.next_page));
              }
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationApi;
