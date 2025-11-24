"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo, useCallback } from "react";
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
import Group from "@/types/group";
import GroupApi from "@/types/groupApi";
import { Badge } from "./ui/badge";
import { Trash2 } from "lucide-react";
import { SkeletonLoader } from "./TableApi";
import useApiQuery from "@/lib/useApiQuery";
import useIndependentTableQuery from "@/lib/useIndependentTableQuery";

// Define the tree node structure
interface GroupTreeNode extends Group {
  level: number;
  children: GroupTreeNode[];
}

// Helper to build the tree
const buildTree = (groups: Group[]): GroupTreeNode[] => {
  const groupMap = new Map<number, GroupTreeNode>();
  const rootGroups: GroupTreeNode[] = [];

  groups.forEach((group) => {
    groupMap.set(group.id, { ...group, children: [], level: 0 });
  });

  groups.forEach((group) => {
    const node = groupMap.get(group.id);
    if (node) {
      if (group.sub_group_id) {
        const parent = groupMap.get(group.sub_group_id);
        if (parent) {
          parent.children.push(node);
        } else {
          rootGroups.push(node); // It's a root if its parent is not in the list
        }
      } else {
        rootGroups.push(node);
      }
    }
  });

  const setLevels = (nodes: GroupTreeNode[], level: number) => {
    nodes.forEach((node) => {
      node.level = level;
      setLevels(node.children, level + 1);
    });
  };

  setLevels(rootGroups, 0);
  return rootGroups;
};

// Helper to flatten the tree for rendering
const flattenTree = (nodes: GroupTreeNode[]): GroupTreeNode[] => {
  const flattened: GroupTreeNode[] = [];
  const traverse = (nodesToTraverse: GroupTreeNode[]) => {
    nodesToTraverse.forEach((node) => {
      flattened.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return flattened;
};

// Helper to get all descendants of a node
const getDescendants = (
  node: GroupTreeNode,
  descendants: GroupTreeNode[] = []
): GroupTreeNode[] => {
  for (const child of node.children) {
    descendants.push(child);
    getDescendants(child, descendants);
  }
  return descendants;
};

export function GroupTable({
  selectedGroups,
  setSelectedGroups,
  useIndependentState = false,
}: {
  selectedGroups: Group[];
  setSelectedGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  useIndependentState?: boolean;
}) {
  const t = useTranslations("GroupTable");
  const independentTableQuery = useIndependentTableQuery("group");

  const {
    search: searchName,
    setSearch: setSearchName,
    setPage,
  } = independentTableQuery;

  // Fetch all groups, disable pagination
  const { data, isLoading } = useApiQuery<GroupApi>(
    `group/list?all=true&name=${searchName}`,
    ["groups", searchName]
  );

  const allGroups = useMemo(() => data?.groups ?? [], [data]);
  const tree = useMemo(() => buildTree(allGroups), [allGroups]);
  const flatData = useMemo(() => flattenTree(tree), [tree]);

  const selectedGroupIds = useMemo(
    () => new Set(selectedGroups.map((group) => group.id)),
    [selectedGroups]
  );

  const handleRowSelection = (row: Row<GroupTreeNode>, isSelected: boolean) => {
    const group = row.original;
    const descendants = getDescendants(group);
    const affectedGroups = [group, ...descendants];
    const affectedGroupIds = new Set(affectedGroups.map((g) => g.id));

    setSelectedGroups((prev) => {
      if (isSelected) {
        const newGroups = [...prev];
        affectedGroups.forEach((g) => {
          if (!newGroups.some((sg) => sg.id === g.id)) {
            newGroups.push(g);
          }
        });
        return newGroups;
      } else {
        return prev.filter((g) => !affectedGroupIds.has(g.id));
      }
    });
  };

  const columns: ColumnDef<GroupTreeNode>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => {
              table.toggleAllRowsSelected(!!value);
              setSelectedGroups(!!value ? flatData : []);
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
              handleRowSelection(row, !!value);
            }}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: t("groupName"),
        cell: ({ row }) => (
          <div
            className="capitalize"
            style={{ paddingLeft: `${row.original.level * 1.5}rem` }}
          >
            {row.getValue("name")}
          </div>
        ),
      },
      {
        accessorKey: "sub_group_name",
        header: t("parent"),
        cell: ({ row }) => (
          <div className="capitalize">{row.original.sub_group_name ?? "—"}</div>
        ),
      },
      {
        accessorKey: "member_count",
        header: () => <div className="text-right">{t("studentCount")}</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("member_count")}</div>
        ),
      },
    ],
    [t, flatData, setSelectedGroups]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id.toString(),
    state: {
      rowSelection: useMemo(() => {
        const selection: Record<string, boolean> = {};
        selectedGroupIds.forEach((id) => {
          selection[id.toString()] = true;
        });
        return selection;
      }, [selectedGroupIds]),
    },
  });

  const handleDeleteGroup = useCallback(
    (group: Group) => {
      const groupInTree = flatData.find((g) => g.id === group.id);
      if (groupInTree) {
        handleRowSelection(
          { original: groupInTree } as Row<GroupTreeNode>,
          false
        );
      } else {
        setSelectedGroups((prev) => prev.filter((g) => g.id !== group.id));
      }
    },
    [setSelectedGroups, flatData]
  );

  return (
    <div className="w-full space-y-4 mt-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-start content-start">
          {selectedGroups.map((group) => (
            <Badge
              key={group.id}
              className="cursor-pointer"
              onClick={() => handleDeleteGroup(group)}
            >
              {group?.name}
              <Trash2 className="h-4" />
            </Badge>
          ))}
        </div>
        <div className="flex items-center">
          <Input
            placeholder={t("filter")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchName(e.target.value);
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
              <SkeletonLoader columnCount={columns.length} rowCount={5} />
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
        <div className="flex-1 text-sm text-muted-foreground w-full sm:w-auto">
          {t("rowsSelected", {
            count: selectedGroups.length,
            total: flatData.length,
          })}
        </div>
        {/* Pagination is removed as we show all groups */}
      </div>
    </div>
  );
}
