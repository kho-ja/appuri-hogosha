import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

export interface UsePaginationOptions {
  /**
   * If true, pagination state will be synced to URL query params.
   * If false, state will be managed in local React state only.
   * @default false
   */
  persistToUrl?: boolean;
  /**
   * Default items per page
   * @default 10
   */
  defaultPerPage?: number;
  /**
   * Default page number
   * @default 1
   */
  defaultPage?: number;
  /**
   * Default search string
   * @default ""
   */
  defaultSearch?: string;
  /**
   * Default filter value (if filters are used)
   * @default undefined
   */
  defaultFilter?: string;
}

export interface UsePaginationReturn {
  // State
  page: number;
  perPage: number;
  search: string;
  filter: string | undefined;

  // Setters
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  setSearch: (search: string) => void;
  setFilter: (filter: string | undefined) => void;

  // Helper
  handlePerPageChange: (value: number) => void;

  // Reset function
  reset: () => void;
}

/**
 * Unified pagination hook that supports both URL-based and local-state-based persistence.
 *
 * @example
 * // URL-based persistence
 * const { page, setPage, search, setSearch } = usePagination({ persistToUrl: true });
 *
 * @example
 * // Local state only
 * const { page, setPage, search, setSearch } = usePagination({ persistToUrl: false });
 */
export default function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    persistToUrl = false,
    defaultPerPage = 10,
    defaultPage = 1,
    defaultSearch = "",
    defaultFilter = undefined,
  } = options;

  const pathName = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track previous values to detect changes that should reset page
  const previousValues = useRef({
    perPage: defaultPerPage,
    search: defaultSearch,
    filter: defaultFilter,
  });

  // Track if we're syncing from URL to avoid loops
  const isSyncingFromUrl = useRef(false);

  // Initialize state from URL or defaults
  const getInitialPage = () => {
    if (persistToUrl && searchParams) {
      const pageParam = searchParams.get("page");
      return pageParam ? Number(pageParam) || defaultPage : defaultPage;
    }
    return defaultPage;
  };

  const getInitialSearch = (): string => {
    if (persistToUrl && searchParams) {
      const searchParam = searchParams.get("search");
      return searchParam ? searchParam : defaultSearch;
    }
    return defaultSearch;
  };

  const getInitialPerPage = () => {
    if (persistToUrl && searchParams) {
      const perPageParam = searchParams.get("perPage");
      return perPageParam
        ? Number(perPageParam) || defaultPerPage
        : defaultPerPage;
    }
    return defaultPerPage;
  };

  const getInitialFilter = () => {
    if (persistToUrl && searchParams) {
      const filterParam = searchParams.get("filter");
      return filterParam || defaultFilter;
    }
    return defaultFilter;
  };

  const [page, setPage] = useState(getInitialPage);
  const [search, setSearch] = useState(getInitialSearch);
  const [perPage, setPerPage] = useState(getInitialPerPage);
  const [filter, setFilter] = useState<string | undefined>(getInitialFilter);

  // Sync state from URL when URL changes (e.g., browser back/forward)
  useEffect(() => {
    if (!persistToUrl || !searchParams) return;

    const pageParam = searchParams.get("page");
    const urlPage = pageParam ? Number(pageParam) || defaultPage : defaultPage;
    const urlSearch = searchParams.get("search") || defaultSearch;
    const perPageParam = searchParams.get("perPage");
    const urlPerPage = perPageParam
      ? Number(perPageParam) || defaultPerPage
      : defaultPerPage;
    const filterParam = searchParams.get("filter");
    const urlFilter = filterParam || defaultFilter;

    // Only update if values differ to avoid unnecessary updates
    if (
      urlPage !== page ||
      urlSearch !== search ||
      urlPerPage !== perPage ||
      urlFilter !== filter
    ) {
      isSyncingFromUrl.current = true;
      if (urlPage !== page) setPage(urlPage);
      if (urlSearch !== search) setSearch(urlSearch);
      if (urlPerPage !== perPage) setPerPage(urlPerPage);
      if (urlFilter !== filter) setFilter(urlFilter);
      // Reset flag after state updates
      setTimeout(() => {
        isSyncingFromUrl.current = false;
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams,
    persistToUrl,
    defaultPage,
    defaultSearch,
    defaultPerPage,
    defaultFilter,
  ]);

  // Sync URL when persistToUrl is true
  useEffect(() => {
    if (!persistToUrl || isSyncingFromUrl.current || !pathName) return;

    const params = new URLSearchParams();

    if (page > 1) {
      params.set("page", page.toString());
    }
    if (search && search.trim() !== "") {
      params.set("search", search);
    }
    if (perPage !== defaultPerPage) {
      params.set("perPage", perPage.toString());
    }
    if (filter && filter !== defaultFilter && typeof filter === "string") {
      params.set("filter", filter);
    }

    const query = params.toString();
    const url: string = query ? `${pathName}?${query}` : pathName;

    router.replace(url, { scroll: false });
  }, [
    page,
    search,
    perPage,
    filter,
    pathName,
    router,
    defaultPerPage,
    defaultFilter,
    persistToUrl,
  ]);

  // Reset page to 1 when search, perPage, or filter changes
  useEffect(() => {
    const prevPerPage = previousValues.current.perPage;
    const prevSearch = previousValues.current.search;
    const prevFilter = previousValues.current.filter;

    const shouldResetPage =
      (perPage !== prevPerPage ||
        search !== prevSearch ||
        filter !== prevFilter) &&
      page > 1;

    if (shouldResetPage) {
      setPage(1);
    }

    previousValues.current = { perPage, search, filter: filter || undefined };
  }, [perPage, search, filter, page]);

  // Handle perPage change with URL sync if needed
  const handlePerPageChange = useCallback(
    (value: number) => {
      setPerPage(value);

      if (persistToUrl && searchParams) {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        if (value === defaultPerPage) {
          params.delete("perPage");
        } else {
          params.set("perPage", value.toString());
        }
        router.replace(`?${params.toString()}`);
      }
    },
    [persistToUrl, searchParams, router, defaultPerPage]
  );

  // Reset function
  const reset = useCallback(() => {
    setPage(defaultPage);
    setSearch(defaultSearch);
    setPerPage(defaultPerPage);
    setFilter(defaultFilter);
  }, [defaultPage, defaultSearch, defaultPerPage, defaultFilter]);

  return {
    page,
    perPage,
    search,
    filter,
    setPage,
    setPerPage,
    setSearch,
    setFilter,
    handlePerPageChange,
    reset,
  };
}
