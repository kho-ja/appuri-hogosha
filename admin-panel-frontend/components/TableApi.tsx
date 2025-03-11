import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    notClickable?: boolean;
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

    if (!table.getRowModel().rows.length) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            {t("noResults")}
          </TableCell>
        </TableRow>
      );
    }

    return table.getRowModel().rows.map((row) => {
      const rowId = row.original[linkSuffixRowName as keyof T];
      const rowLink = linkPrefix && rowId ? `${linkPrefix}/${rowId}` : "";

      return (
        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
          {row.getVisibleCells().map((cell) =>
            linkPrefix && !cell.column.columnDef.meta?.notClickable ? (
              <TableCell
                key={cell.id}
                onClick={() => router.push(rowLink)}
                className="cursor-pointer"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ) : (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            )
          )}
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
