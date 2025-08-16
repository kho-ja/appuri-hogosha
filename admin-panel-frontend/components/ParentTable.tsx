"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Parent from "@/types/parent";
import ParentApi from "@/types/parentApi";
import { useSession } from "next-auth/react";
import PaginationApi from "./PaginationApi";
import { Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useQuery } from "@tanstack/react-query";
import { SkeletonLoader } from "./TableApi";
import useApiQuery from "@/lib/useApiQuery";

export function ParentTable({
  selectedParents,
  setSelectedParents,
}: {
  selectedParents: Parent[];
  setSelectedParents: React.Dispatch<React.SetStateAction<Parent[]>>;
}) {
  const t = useTranslations("ParentTable");
  const tName = useTranslations("names");
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<string>("");
  const { data, isLoading } = useApiQuery<ParentApi>(
    `parent/list?page=${page}&name=${search}`,
    ["parents", page, search]
  );

  const selectedParentIds = useMemo(
    () => new Set(selectedParents.map((parent) => parent.id)),
    [selectedParents]
  );

  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    selectedParentIds.forEach((id) => {
      selection[id] = true;
    });
    return selection;
  }, [selectedParentIds]);

  const { data: selectedParentsData } = useQuery<{ parents: Parent[] }>({
    queryKey: ["selectedParents", Array.from(selectedParentIds)],
    queryFn: async () => {
      if (selectedParentIds.size === 0) {
        return { parents: [] };
      }
      const data = { parentIds: Array.from(selectedParentIds) };
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/parent/ids`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      return response.json();
    },
    enabled: !!session?.sessionToken && selectedParentIds.size > 0,
  });

  const columns: ColumnDef<Parent>[] = useMemo(
    () => [
      {
        id: "selectParent",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => (
          <div className="capitalize">
            {tName("name", { ...row?.original } as any)}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: t("email"),
        cell: ({ row }) => (
          <div className="lowercase">{row.getValue("email")}</div>
        ),
      },
      {
        accessorKey: "phone_number",
        header: t("phoneNumber"),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("phone_number")}</div>
        ),
      },
    ],
    [t, tName]
  );

  const table = useReactTable({
    data: useMemo(() => data?.parents ?? [], [data]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: (updater) => {
      if (typeof updater === "function") {
        const newSelection = updater(rowSelection);
        const newSelectedParents =
          data?.parents.filter((parent) => newSelection[parent.id]) || [];
        setSelectedParents((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          return [
            ...prev.filter((p) => newSelection[p.id]),
            ...newSelectedParents.filter((p) => !prevIds.has(p.id)),
          ];
        });
      }
    },
    getRowId: (row) => row.id.toString(),
    state: {
      rowSelection,
    },
  });

  const handleDeleteParent = useCallback(
    (parent: Parent) => {
      setSelectedParents((prev) => prev.filter((p) => p.id !== parent.id));
    },
    [setSelectedParents]
  );

  useEffect(() => {
    if (selectedParentsData) {
      setSelectedParents((prevSelected) => {
        const newSelectedMap = new Map(
          selectedParentsData.parents.map((p) => [p.id, p])
        );
        return prevSelected.map((p) => newSelectedMap.get(p.id) || p);
      });
    }
  }, [selectedParentsData, setSelectedParents]);

  return (
    <div className="w-full space-y-4 mt-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-start content-start">
          {selectedParents.map((parent) => (
            <Badge
              key={parent.id}
              className="cursor-pointer"
              onClick={() => handleDeleteParent(parent)}
            >
              {tName("name", { ...parent } as any)}
              <Trash2 className="h-4" />
            </Badge>
          ))}
        </div>
        <div className="flex items-center">
          <Input
            placeholder={t("filter")}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>
      </div>
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
              <SkeletonLoader rowCount={5} columnCount={columns.length} />
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end flex-wrap gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex-1 text-sm text-muted-foreground sm:w-auto w-full">
          {t("rowsSelected", {
            count: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
          })}
        </div>
        <div className="w-full sm:w-auto">
          <PaginationApi data={data?.pagination ?? null} setPage={setPage} />
        </div>
      </div>
    </div>
  );
}
