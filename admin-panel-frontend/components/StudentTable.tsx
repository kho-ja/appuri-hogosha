"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import Student from "@/types/student";
import StudentApi from "@/types/studentApi";
import {
  GenericSelectTable,
  GenericSelectTableConfig,
} from "./GenericSelectTable";
import usePagination from "@/lib/usePagination";
import { useListQuery } from "@/lib/useListQuery";

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

  const { page, setPage, search, setSearch, filter, setFilter } = usePagination(
    {
      persistToUrl: !useIndependentState,
      defaultFilter: "all",
    }
  );

  const filterBy = filter || "all";

  const { data: rawData, isLoading } = useListQuery<StudentApi>(
    "student/list",
    ["students", page, search],
    { page, search },
    "POST"
  );

  // Convert undefined to null for type safety
  const data = rawData || null;

  // Define columns
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
        accessorKey: "cohort",
        header: () => <div className="text-left">{t("cohort")}</div>,
        cell: ({ row }) => {
          const cohort = row.getValue("cohort") as number | undefined;
          return (
            <div className="text-left">
              {cohort !== null && cohort !== undefined ? cohort : "-"}
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

  // Generic table configuration
  const config: GenericSelectTableConfig<Student> = useMemo(
    () => ({
      enableFilters: true,
      filters: [
        { value: "all", label: t("filterAll") },
        { value: "student_number", label: t("studentId") },
        { value: "cohort", label: t("cohort") },
        { value: "email", label: t("email") },
        { value: "phone_number", label: t("phoneNumber") },
        { value: "given_name", label: t("givenName") },
        { value: "family_name", label: t("familyName") },
      ],
      filterBy,
      onFilterChange: (value: string) => setFilter(value),

      getBadgeLabel: (student) => tName("name", { ...student, parents: "" }),

      enableSelectAll: true,
      selectAllQueryKey: (searchStr, filterByStr) => [
        "students",
        "select-all",
        searchStr || "all",
        filterByStr || "all",
      ],

      selectedItemsEndpoint: "student/ids",
      selectedItemsResponseKey: "studentList",

      noResultsMessage: t("noResults"),
    }),
    [t, tName, filterBy, setFilter]
  );

  return (
    <GenericSelectTable<Student>
      data={data}
      columns={columns}
      selectedItems={selectedStudents}
      setSelectedItems={setSelectedStudents}
      isLoading={isLoading}
      entityKey="students"
      entityEndpoint="student/list"
      page={page}
      setPage={setPage}
      search={search}
      setSearch={setSearch}
      config={config}
    />
  );
}
