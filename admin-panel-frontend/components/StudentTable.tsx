"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useEffect, useCallback, useMemo, useState } from "react";
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
import useApiPostQuery from "@/lib/useApiPostQuery";
import useTableQuery from "@/lib/useTableQuery";
import useIndependentTableQuery from "@/lib/useIndependentTableQuery";

export function StudentTable({
  selectedStudents,
  setSelectedStudents,
  useIndependentState = false,
}: {
  selectedStudents: Student[];
  setSelectedStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  useIndependentState?: boolean;
}) {
  const t = useTranslations("StudentTable");
  const tName = useTranslations("names");
  const { data: session } = useSession();

  const urlTableQuery = useTableQuery();
  const independentTableQuery = useIndependentTableQuery("student");

  const tableQuery: any = useIndependentState
    ? independentTableQuery
    : urlTableQuery;
  const { page, setPage, search, setSearch } = tableQuery;
  const queryYearValue =
    tableQuery.year_prefix ??
    tableQuery.year ??
    tableQuery.yearFilter ??
    tableQuery.year_prefix_value ??
    "";
  const querySetYear =
    tableQuery.setYear ??
    tableQuery.setYearPrefix ??
    tableQuery.setYearFilter ??
    null;
  const derivePrefix = (display: string) => {
    const digits = String(display || "").replace(/\D/g, "");
    if (digits.length === 4) return digits.slice(-2);
    return "";
  };
  const initialDisplay =
    String(queryYearValue ?? "").length === 2
      ? `20${queryYearValue}`
      : String(queryYearValue ?? "");
  const [localYearDisplay, setLocalYearDisplay] =
    useState<string>(initialDisplay);
  const [localYear, setLocalYear] = useState<string>(
    derivePrefix(initialDisplay)
  );

  const [allMatchingCount, setAllMatchingCount] = useState<number | null>(null);
  const [allSelectedAllPages, setAllSelectedAllPages] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  useEffect(() => {
    const display =
      String(queryYearValue ?? "").length === 2
        ? `20${queryYearValue}`
        : String(queryYearValue ?? "");
    setLocalYearDisplay(display);
    setLocalYear(derivePrefix(display));
  }, [queryYearValue]);

  useEffect(() => {
    setAllMatchingCount(null);
    setAllSelectedAllPages(false);
  }, [search, localYearDisplay, page]);

  const { data } = useApiPostQuery<StudentApi>(
    "student/list",
    ["students", page, search, localYear],
    { page, name: search, year_prefix: localYear }
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

  const fetchAllMatchingStudents = async () => {
    try {
      const firstBody = { page: 1, name: search, year_prefix: localYear };
      const resp1 = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/student/list`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify(firstBody),
        }
      );
      if (!resp1.ok) return null;
      const json1 = await resp1.json();
      const studentsAccum: Student[] = [...(json1.students ?? [])];
      const totalPages = json1.pagination?.total_pages ?? 1;
      for (let p = 2; p <= totalPages; p++) {
        const body = { page: p, name: search, year_prefix: localYear };
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/student/list`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.sessionToken}`,
            },
            body: JSON.stringify(body),
          }
        );
        if (!resp.ok) continue;
        const js = await resp.json();
        studentsAccum.push(...(js.students ?? []));
      }
      return studentsAccum;
    } catch (err) {
      console.error("fetchAllMatchingStudents error", err);
      return null;
    }
  };

  const handleHeaderToggleAll = async (value: any) => {
    if (!value) {
      setSelectedStudents([]);
      setAllMatchingCount(null);
      setAllSelectedAllPages(false);
      return;
    }
    setIsSelectingAll(true);
    try {
      const all = await fetchAllMatchingStudents();
      if (all) {
        setSelectedStudents(all);
        setAllMatchingCount(all.length);
        setAllSelectedAllPages(true);
      }
    } finally {
      setIsSelectingAll(false);
    }
  };

  const columns: ColumnDef<Student>[] = useMemo(
    () => [
      {
        id: "selectStudent",
        header: ({ table }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={
                allSelectedAllPages ||
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              disabled={isSelectingAll}
              onCheckedChange={(value) => handleHeaderToggleAll(value)}
              aria-label="Select all"
            />
          </div>
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
        header: ({ column: _column }) => (
          <div className="text-left">{t("email")}</div>
        ),
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
    [t, tName, allSelectedAllPages, handleHeaderToggleAll, isSelectingAll]
  );

  const table = useReactTable({
    data: useMemo(() => data?.students ?? [], [data]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: (updater) => {
      setAllSelectedAllPages(false);
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
          <Input
            placeholder={t("admissionYearPlaceholder")}
            value={localYearDisplay}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              const digits = e.currentTarget.value
                .replace(/\D/g, "")
                .slice(0, 4);
              const display = digits;
              const prefix = derivePrefix(display);

              setLocalYearDisplay(display);
              setLocalYear(prefix);

              if (querySetYear) {
                querySetYear(display.length === 4 ? display : "");
              }

              setPage(1);
            }}
            className="w-64 ml-1"
            maxLength={4}
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
