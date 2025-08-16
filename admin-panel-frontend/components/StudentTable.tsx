"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useMemo } from "react";
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
import Student from "@/types/student";
import StudentApi from "@/types/studentApi";
import { useSession } from "next-auth/react";
import PaginationApi from "./PaginationApi";
import { Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useQuery } from "@tanstack/react-query";
import { SkeletonLoader } from "./TableApi";
import useApiQuery from "@/lib/useApiQuery";

export function StudentTable({
  selectedStudents,
  setSelectedStudents,
}: {
  selectedStudents: Student[];
  setSelectedStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}) {
  const t = useTranslations("StudentTable");
  const tName = useTranslations("names");
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<string>("");
  const { data } = useApiQuery<StudentApi>(
    `student/list?page=${page}&name=${search}`,
    ["students", page, search]
  );

  const selectedStudentIds = useMemo(
    () => new Set(selectedStudents.map((student) => student.id)),
    [selectedStudents]
  );

  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    selectedStudentIds.forEach((id) => {
      selection[id] = true;
    });
    return selection;
  }, [selectedStudentIds]);

  const { data: selectedStudentsData } = useQuery<{ studentList: Student[] }>({
    queryKey: ["selectedStudents", Array.from(selectedStudentIds)],
    queryFn: async () => {
      if (selectedStudentIds.size === 0) return { studentList: [] };
      const data = { studentIds: Array.from(selectedStudentIds) };
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/student/ids`,
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
    enabled: !!session?.sessionToken && selectedStudentIds.size > 0,
  });

  const columns: ColumnDef<Student>[] = useMemo(
    () => [
      {
        id: "selectStudent",
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
            {tName("name", { ...row?.original, parents: "" })}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => <div className="text-left">{t("email")}</div>,
        cell: ({ row }) => (
          <div className="lowercase">{row.getValue("email")}</div>
        ),
      },
      {
        accessorKey: "student_number",
        header: () => <div className="text-left">{t("studentId")}</div>,
        cell: ({ row }) => {
          return (
            <div className="text-left font-medium">
              {row.getValue("student_number")}
            </div>
          );
        },
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
    data: useMemo(() => data?.students ?? [], [data]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: (updater) => {
      if (typeof updater === "function") {
        const newSelection = updater(rowSelection);
        const newSelectedStudents =
          data?.students.filter((student) => newSelection[student.id]) || [];
        setSelectedStudents((prev) => {
          const prevIds = new Set(prev.map((s) => s.id));
          return [
            ...prev.filter((s) => newSelection[s.id]),
            ...newSelectedStudents.filter((s) => !prevIds.has(s.id)),
          ];
        });
      }
    },
    getRowId: (row) => row.id.toString(),
    state: {
      rowSelection,
    },
  });

  const handleDeleteStudent = useCallback(
    (student: Student) => {
      setSelectedStudents((prev) => prev.filter((s) => s.id !== student.id));
    },
    [setSelectedStudents]
  );

  useEffect(() => {
    if (selectedStudentsData) {
      setSelectedStudents((prevSelected) => {
        const newSelectedMap = new Map(
          selectedStudentsData.studentList.map((s) => [s.id, s])
        );
        return prevSelected.map((s) => newSelectedMap.get(s.id) || s);
      });
    }
  }, [selectedStudentsData, setSelectedStudents]);

  return (
    <div className="w-full space-y-4 mt-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-start content-start">
          {selectedStudents.map((student) => (
            <Badge
              key={student.id}
              className="cursor-pointer"
              onClick={() => handleDeleteStudent(student)}
            >
              {tName("name", { ...student, parents: "" })}
              <Trash2 className="h-4" />
            </Badge>
          ))}
        </div>
        <div className="flex items-center">
          <Input
            placeholder={t("filter")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
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
            {!data ? (
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

      <div className="flex flex-wrap gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div className="text-sm text-muted-foreground sm:w-auto w-full">
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
