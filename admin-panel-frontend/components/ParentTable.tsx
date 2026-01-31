"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import Parent from "@/types/parent";
import ParentApi from "@/types/parentApi";
import {
  GenericSelectTable,
  GenericSelectTableConfig,
} from "./GenericSelectTable";
import usePagination from "@/lib/usePagination";
import { Badge } from "./ui/badge";
import { Link } from "@/navigation";
import YesBadge from "./yesbadge";
import NoBadge from "./nobadge";
import { useListQuery } from "@/lib/useListQuery";

export function ParentTable({
  selectedParents,
  setSelectedParents,
  showOnlyNonLoggedIn = false,
}: {
  selectedParents: Parent[];
  setSelectedParents: React.Dispatch<React.SetStateAction<Parent[]>>;
  showOnlyNonLoggedIn?: boolean;
}) {
  const t = useTranslations("ParentTable");
  const tParents = useTranslations("parents");
  const tName = useTranslations("names");

  const { page, setPage, search, setSearch } = usePagination({
    persistToUrl: true,
  });

  const { data: rawData, isLoading } = useListQuery<ParentApi>(
    "parent/list",
    ["parents", page, search],
    { page, search, showOnlyNonLoggedIn },
    "POST"
  );

  // Convert undefined to null for type safety
  const data = rawData || null;

  // Define columns
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
        accessorKey: "phone_number",
        header: t("phoneNumber"),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("phone_number")}</div>
        ),
      },
      {
        accessorKey: "students",
        header: tParents("Students"),
        cell: ({ row }) => {
          const students = row.original.students ?? [];
          if (!students.length) {
            return (
              <span className="text-xs text-muted-foreground">
                {tParents("noStudents")}
              </span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              {students.map((s) => (
                <Link key={s.id} href={`/students/${s.id}`}>
                  <Badge variant="secondary">
                    {tName("name", {
                      given_name: s.given_name,
                      family_name: s.family_name,
                    })}
                    {s.student_number ? ` · ${s.student_number}` : ""}
                  </Badge>
                </Link>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => {
          const given = (row.original.given_name || "").trim();
          const family = (row.original.family_name || "").trim();
          const hasName = given || family;
          if (!hasName) {
            return <div className="text-muted-foreground text-sm">—</div>;
          }
          return (
            <div className="capitalize">
              {tName("name", {
                given_name: row.original.given_name,
                family_name: row.original.family_name,
              })}
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: t("email"),
        cell: ({ row }) => (
          <div className="lowercase">{row.getValue("email")}</div>
        ),
      },
      {
        accessorKey: "last_login_at || arn",
        header: t("loginStatus"),
        cell: ({ row }) => {
          const isLoggedIn = row.original.last_login_at || row.original.arn;
          return isLoggedIn ? <YesBadge /> : <NoBadge />;
        },
      },
    ],
    [t, tParents, tName]
  );

  // Generic table configuration
  const config: GenericSelectTableConfig<Parent> = useMemo(() => {
    // Helper to get parent badge label
    const getParentBadgeLabel = (parent: Parent): string => {
      const given = (parent.given_name || "").trim();
      const family = (parent.family_name || "").trim();
      const hasName = given || family;
      if (!hasName) {
        return parent.phone_number || parent.email || String(parent.id);
      }
      return tName("name", {
        given_name: parent.given_name,
        family_name: parent.family_name,
      });
    };

    // Helper to get parent badge title (full label)
    const getParentBadgeTitle = (parent: Parent): string => {
      const given = (parent.given_name || "").trim();
      const family = (parent.family_name || "").trim();
      const hasName = given || family;
      return hasName
        ? tName("name", {
            given_name: parent.given_name,
            family_name: parent.family_name,
          })
        : parent.phone_number || parent.email || String(parent.id);
    };

    return {
      enableFilters: false,
      getBadgeLabel: getParentBadgeLabel,
      getBadgeTitle: getParentBadgeTitle,
      enableSelectAll: false,
      selectedItemsEndpoint: "parent/ids",
      selectedItemsResponseKey: "parents",
      noResultsMessage: t("noResults"),
    };
  }, [t, tName]);

  return (
    <GenericSelectTable<Parent>
      data={data}
      columns={columns}
      selectedItems={selectedParents}
      setSelectedItems={setSelectedParents}
      isLoading={isLoading}
      entityKey="parents"
      entityEndpoint="parent/list"
      page={page}
      setPage={setPage}
      search={search}
      setSearch={setSearch}
      config={config}
    />
  );
}
