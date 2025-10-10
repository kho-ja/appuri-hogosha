"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { MouseEvent } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    notClickable?: boolean;
    __genericMarker__?: (TData & TValue) | undefined;
  }
}

interface TableApiProps<T> {
  data: T[] | null;
  columns: ColumnDef<T>[];
  linkPrefix?: string;
  linkSuffixRowName?: string;
}

const TableApi = <T,>({
  data,
  columns,
  linkPrefix = "",
  linkSuffixRowName = "id",
}: TableApiProps<T>) => {
  const t = useTranslations("table");
  const router = useRouter();

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleCellClick = (
    event: MouseEvent<HTMLTableCellElement>,
    rowLink?: string,
    isNotClickable?: boolean
  ) => {
    if (!rowLink || isNotClickable) return;
    event.preventDefault();
    router.push(rowLink);
  };

  const renderTableHeader = () => (
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
  );

  const renderTableBody = () => {
    if (data === null) {
      return <SkeletonLoader rowCount={5} columnCount={columns.length} />;
    }

    const rows = table.getRowModel().rows;
    if (!rows.length) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length}
            className="py-6 text-center text-sm text-muted-foreground"
          >
            {t("noData")}
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => {
      const rowId = row.original[linkSuffixRowName as keyof T];
      const rowLink =
        linkPrefix && typeof rowId !== "undefined"
          ? `${linkPrefix}/${rowId}`
          : undefined;

      return (
        <TableRow key={row.id}>
          {row.getVisibleCells().map((cell) => {
            const isNotClickable = cell.column.columnDef.meta?.notClickable;
            const isClickable = !!rowLink && !isNotClickable;
            return (
              <TableCell
                key={cell.id}
                onClick={(event) =>
                  handleCellClick(event, rowLink, isNotClickable)
                }
                className={isClickable ? "cursor-pointer" : ""}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            );
          })}
        </TableRow>
      );
    });
  };

  return (
    <Table>
      {renderTableHeader()}
      <TableBody>{renderTableBody()}</TableBody>
    </Table>
  );
};

export const SkeletonLoader: React.FC<{
  rowCount: number;
  columnCount: number;
}> = ({ rowCount, columnCount }) => (
  <>
    {Array.from({ length: rowCount }).map((_, rowIndex) => (
      <TableRow key={rowIndex}>
        {Array.from({ length: columnCount }).map((_, columnIndex) => (
          <TableCell key={columnIndex}>
            <Skeleton className="h-4 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

export default TableApi;
