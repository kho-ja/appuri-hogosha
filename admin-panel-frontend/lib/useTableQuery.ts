import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function useTableQuery(defaultPerPage = 10) {
  const pathName = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousValues = useRef({ perPage: defaultPerPage, search: "" });

  const pageFromUrl = Number(searchParams.get("page")) || 1;
  const searchFromUrl = searchParams.get("search") || "";
  const perPageFromUrl = Number(searchParams.get("perPage")) || defaultPerPage;
  const [page, setPage] = useState(pageFromUrl);
  const [search, setSearch] = useState(searchFromUrl);
  const [perPage, setPerPage] = useState(perPageFromUrl);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [selectedScheduledPosts, setSelectedScheduledPosts] = useState<
    number[]
  >([]);
  const allSelectedIds = selectedPosts;
  const handlePerPageChange = (value: number) => {
    setPerPage(value);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === defaultPerPage) {
      params.delete("perPage");
    } else {
      params.set("perPage", value.toString());
    }
    router.replace(`?${params.toString()}`);
  };

  useEffect(() => {
    const params = new URLSearchParams();

    if (page > 1) {
      params.set("page", page.toString());
    }
    if (search.trim() !== "") {
      params.set("search", search);
    }
    if (perPage !== defaultPerPage) {
      params.set("perPage", perPage.toString());
    }

    const query = params.toString();
    const url = query ? `${pathName}?${query}` : pathName;

    router.replace(url, { scroll: false });
  }, [page, search, perPage, pathName, router, defaultPerPage]);

  useEffect(() => {
    const prevPerPage = previousValues.current.perPage;
    const prevSearch = previousValues.current.search;

    if ((perPage !== prevPerPage || search !== prevSearch) && page > 1) {
      setPage(1);
    }

    previousValues.current = { perPage, search };
  }, [perPage, search, page, setPage]);

  return {
    page,
    setPage,
    search,
    setSearch,
    perPage,
    setPerPage,
    selectedPosts,
    setSelectedPosts,
    allSelectedIds,
    handlePerPageChange,
    selectedScheduledPosts,
    setSelectedScheduledPosts,
  };
}
