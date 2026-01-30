"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import { useEffect, useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "next-auth/react";
import PaginationApi from "./PaginationApi";
import { Trash2, CheckSquare, XSquare } from "lucide-react";
import { Badge } from "./ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { SkeletonLoader } from "./TableApi";
import pagination from "@/types/pagination";

export interface BaseEntity {
  id: number;
}

export interface ApiResponse<T extends BaseEntity> {
  [key: string]: T[] | pagination | any;
  pagination?: pagination;
}

export interface GenericSelectTableConfig<T extends BaseEntity> {
  enableFilters?: boolean;
  filters?: Array<{ value: string; label: string }>;
  filterBy?: string;
  onFilterChange?: (filterBy: string) => void;

  getBadgeLabel?: (item: T) => string;
  getBadgeTitle?: (item: T) => string;

  enableSelectAll?: boolean;
  selectAllEndpoint?: string;
  selectAllQueryKey?: (search: string, filterBy?: string) => string[];

  isTreeStructure?: boolean;
  treeNodeBuilder?: (items: T[]) => T[];
  treeFlattener?: (nodes: T[]) => T[];
  treeDescendantsFinder?: (node: T, allNodes: T[]) => T[];

  translationNamespace?: string;
  selectedItemsEndpoint?: string;
  selectedItemsResponseKey?: string;
  noResultsMessage?: string;
}

interface GenericSelectTableProps<T extends BaseEntity> {
  data: ApiResponse<T> | null;
  columns: ColumnDef<T>[];
  selectedItems: T[];
  setSelectedItems: React.Dispatch<React.SetStateAction<T[]>>;
  isLoading?: boolean;
  entityKey: string;
  entityEndpoint: string;
  page?: number;
  setPage?: (page: number) => void;
  search?: string;
  setSearch?: (search: string) => void;
  config?: GenericSelectTableConfig<T>;
}

export function GenericSelectTable<T extends BaseEntity>({
  data,
  columns,
  selectedItems,
  setSelectedItems,
  isLoading = false,
  entityKey,
  entityEndpoint,
  page = 1,
  setPage = () => {},
  search = "",
  setSearch = () => {},
  config = {},
}: GenericSelectTableProps<T>) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [filterBy, setFilterBy] = useState(config.filterBy || "all");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (config.filterBy) {
      setFilterBy(config.filterBy);
    }
  }, [config.filterBy]);

  const handleFilterChange = (newFilterBy: string) => {
    setFilterBy(newFilterBy);
    setPage(1);
    if (config.onFilterChange) {
      config.onFilterChange(newFilterBy);
    }
  };

  const tableData = useMemo(() => {
    if (!data) return [];

    const dataArray = data[entityKey];
    if (!Array.isArray(dataArray)) return [];

    if (config.isTreeStructure) {
      if (config.treeFlattener) {
        const built = config.treeNodeBuilder
          ? config.treeNodeBuilder(dataArray)
          : dataArray;
        return config.treeFlattener(built);
      }
      return dataArray;
    }

    return dataArray;
  }, [data, entityKey, config]);

  const selectedItemIds = useMemo(
    () => new Set(selectedItems.map((item) => item.id)),
    [selectedItems]
  );

  useEffect(() => {
    const newSelection: Record<string, boolean> = {};
    selectedItemIds.forEach((id) => {
      newSelection[id] = true;
    });
    setRowSelection(newSelection);
  }, [selectedItemIds]);

  const { data: selectedItemsData } = useQuery({
    queryKey: ["selected" + entityKey, Array.from(selectedItemIds).sort()],
    queryFn: async () => {
      if (selectedItemIds.size === 0) {
        return { [config.selectedItemsResponseKey || entityKey]: [] };
      }

      const payload = {
        [entityKey.replace(/s$/, "") + "Ids"]: Array.from(selectedItemIds),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/${config.selectedItemsEndpoint || entityEndpoint.replace(/\/list/, "/ids")}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch selected items");
      }

      return response.json();
    },
    enabled: !!session?.sessionToken && selectedItemIds.size > 0,
    staleTime: 30000,
  });

  useEffect(() => {
    if (selectedItemsData) {
      const responseKey = config.selectedItemsResponseKey || entityKey;
      const updatedItems = selectedItemsData[responseKey];

      if (Array.isArray(updatedItems)) {
        setSelectedItems((prevSelected) => {
          const newSelectedMap = new Map(
            updatedItems.map((item: T) => [item.id, item])
          );
          return prevSelected.map(
            (item) => newSelectedMap.get(item.id) || item
          );
        });
      }
    }
  }, [
    selectedItemsData,
    entityKey,
    setSelectedItems,
    config.selectedItemsResponseKey,
  ]);

  const selectAllMutation = useMutation({
    mutationFn: async () => {
      if (!session?.sessionToken) {
        throw new Error("Invalid session");
      }

      if (config.selectAllQueryKey) {
        const allItems: T[] = [];
        const paginationData = data?.pagination as pagination;

        if (!paginationData) {
          throw new Error("Pagination data not available");
        }

        const totalPages = paginationData.total_pages;
        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
          const key = config.selectAllQueryKey(search, filterBy);
          let pageData = queryClient.getQueryData<ApiResponse<T>>(key);

          if (!pageData) {
            pageData = await queryClient.fetchQuery({
              queryKey: key,
              queryFn: async () => {
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_BACKEND_URL}/${entityEndpoint}`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session?.sessionToken}`,
                    },
                    body: JSON.stringify({
                      page: currentPage,
                      filterBy,
                      filterValue: search,
                    }),
                  }
                );
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  throw new Error(d.error || `Failed to fetch ${entityKey}`);
                }
                return (await res.json()) as ApiResponse<T>;
              },
            });
          }

          const itemsArray = pageData?.[entityKey];
          if (Array.isArray(itemsArray)) {
            allItems.push(...itemsArray);
          }
        }
        return allItems;
      } else {
        return tableData;
      }
    },
    onSuccess: (allItems) => {
      setSelectedItems((prev) => {
        const prevIds = new Set(prev.map((item) => item.id));
        const newItems = allItems.filter((item) => !prevIds.has(item.id));
        return [...prev, ...newItems];
      });
    },
  });

  const handleToggleAll = useCallback(() => {
    if (selectedItems.length > 0) {
      setSelectedItems([]);
    } else if (config.enableSelectAll !== false) {
      selectAllMutation.mutate();
    }
  }, [
    selectedItems.length,
    setSelectedItems,
    config.enableSelectAll,
    selectAllMutation,
  ]);

  const onRowSelectionChange = (updater: any) => {
    if (typeof updater === "function") {
      const newSelection = updater(rowSelection);
      const newSelectedItems =
        tableData.filter((item) => newSelection[item.id]) || [];

      setSelectedItems((prev) => {
        const prevIds = new Set(prev.map((item) => item.id));
        return [
          ...prev.filter((item) => newSelection[item.id]),
          ...newSelectedItems.filter((item) => !prevIds.has(item.id)),
        ];
      });
    }
  };

  const handleRowSelection = useCallback(
    (row: Row<T>, isSelected: boolean) => {
      if (config.isTreeStructure && config.treeDescendantsFinder) {
        const item = row.original;
        const descendants = config.treeDescendantsFinder(item, tableData);
        const affectedItems = [item, ...descendants];
        const affectedIds = new Set(affectedItems.map((i) => i.id));

        setSelectedItems((prev) => {
          if (isSelected) {
            const newItems = [...prev];
            affectedItems.forEach((i) => {
              if (!newItems.some((si) => si.id === i.id)) {
                newItems.push(i);
              }
            });
            return newItems;
          } else {
            return prev.filter((i) => !affectedIds.has(i.id));
          }
        });
      }
    },
    [
      config.isTreeStructure,
      config.treeDescendantsFinder,
      tableData,
      setSelectedItems,
    ]
  );

  const tableColumns: ColumnDef<T>[] = useMemo(() => {
    return columns;
  }, [columns]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: config.isTreeStructure
      ? undefined
      : onRowSelectionChange,
    getRowId: (row) => row.id.toString(),
    state: {
      rowSelection,
    },
  });

  const handleDeleteItem = useCallback(
    (item: T) => {
      if (config.isTreeStructure) {
        const node = tableData.find((n) => n.id === item.id);
        if (node && config.treeDescendantsFinder) {
          handleRowSelection({ original: node } as Row<T>, false);
        } else {
          setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
        }
      } else {
        setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    },
    [
      config.isTreeStructure,
      tableData,
      setSelectedItems,
      config.treeDescendantsFinder,
      handleRowSelection,
    ]
  );

  const getBadgeLabel = useCallback(
    (item: T) => {
      if (config.getBadgeLabel) {
        return config.getBadgeLabel(item);
      }
      return String(item.id);
    },
    [config.getBadgeLabel]
  );

  const getBadgeTitle = useCallback(
    (item: T) => {
      if (config.getBadgeTitle) {
        return config.getBadgeTitle(item);
      }
      return getBadgeLabel(item);
    },
    [config.getBadgeTitle, getBadgeLabel]
  );

  const showSelectAllButton = config.enableSelectAll !== false;

  return (
    <div className="w-full space-y-4 mt-4">
      {/* Selected Items Badges */}
      <div className="space-y-2">
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2 items-start content-start">
            {selectedItems.map((item) => (
              <Badge
                key={item.id}
                className="cursor-pointer"
                onClick={() => handleDeleteItem(item)}
                title={getBadgeTitle(item)}
              >
                {getBadgeLabel(item)}
                <Trash2 className="h-4 ml-1" />
              </Badge>
            ))}
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          {config.enableFilters && config.filters && (
            <Select value={filterBy} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {config.filters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(config.enableFilters !== false || !config.filters) && (
            <Input
              placeholder="Search..."
              value={search}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="flex-1 max-w-sm"
            />
          )}

          {showSelectAllButton && (
            <Button
              type="button"
              onClick={handleToggleAll}
              isLoading={selectAllMutation.isPending}
              icon={
                selectedItems.length > 0 ? (
                  <XSquare size={16} />
                ) : (
                  <CheckSquare size={16} />
                )
              }
              variant={selectedItems.length > 0 ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
            >
              {selectAllMutation.isPending
                ? "Selecting..."
                : selectedItems.length > 0
                  ? "Deselect All"
                  : search
                    ? "Select Filtered"
                    : "Select All"}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonLoader rowCount={5} columnCount={tableColumns.length} />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="h-24 text-center"
                >
                  {config.noResultsMessage || "No results found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer with count and pagination */}
      <div className="flex flex-wrap gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div className="text-sm text-muted-foreground sm:w-auto w-full">
          {selectedItems.length} of {table.getFilteredRowModel().rows.length}{" "}
          selected
        </div>
        {data?.pagination && (
          <div className="w-full sm:w-auto">
            <PaginationApi
              data={data.pagination as pagination}
              setPage={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
