import { useState, useEffect, useRef } from "react";

export default function useIndependentTableQuery(
  tableKey: string,
  defaultPerPage = 10
) {
  const previousValues = useRef({ perPage: defaultPerPage, search: "" });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [selectedScheduledPosts, setSelectedScheduledPosts] = useState<
    number[]
  >([]);
  const allSelectedIds = selectedPosts;

  const handlePerPageChange = (value: number) => {
    setPerPage(value);
  };

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
