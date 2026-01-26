"use client";

import * as React from "react";
import {
  ColumnDef,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import Group from "@/types/group";
import GroupApi from "@/types/groupApi";
import { GenericSelectTable, GenericSelectTableConfig } from "./GenericSelectTable";
import useIndependentTableQuery from "@/lib/useIndependentTableQuery";
import useApiQuery from "@/lib/useApiQuery";

// Tree node structure
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
          rootGroups.push(node);
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
  const { data: rawData, isLoading } = useApiQuery<GroupApi>(
    `group/list?all=true&name=${searchName}`,
    ["groups", searchName]
  );

  // Convert undefined to null for type safety
  const data = rawData || null;

  // Define columns
  const columns: ColumnDef<GroupTreeNode>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => {
              table.toggleAllRowsSelected(!!value);
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
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
    [t]
  );

  // Helper to find descendants in the flat array
  const findDescendantsInFlat = useCallback(
    (group: Group, allFlatGroups: GroupTreeNode[]): GroupTreeNode[] => {
      const groupInTree = allFlatGroups.find((g) => g.id === group.id);
      if (!groupInTree) return [];
      return getDescendants(groupInTree);
    },
    []
  );

  // Generic table configuration
  const config: GenericSelectTableConfig<GroupTreeNode> = useMemo(
    () => ({
      enableFilters: false,
      getBadgeLabel: (group) => group.name,
      enableSelectAll: true,
      isTreeStructure: true,
      treeNodeBuilder: (groups) => buildTree(groups as Group[]),
      treeFlattener: flattenTree,
      treeDescendantsFinder: (node, allNodes) => {
        return getDescendants(node);
      },
      selectedItemsEndpoint: "group/ids",
      selectedItemsResponseKey: "groups",
      noResultsMessage: t("noResults"),
    }),
    [t]
  );

  // Transform the data for the generic table
  const transformedData = useMemo(() => {
    if (!data) return null;
    return {
      groups: data.groups || [],
    };
  }, [data]);

  return (
    <GenericSelectTable<GroupTreeNode>
      data={transformedData as any}
      columns={columns}
      selectedItems={selectedGroups as GroupTreeNode[]}
      setSelectedItems={(setter) => {
        if (typeof setter === "function") {
          setSelectedGroups((prev) => setter(prev as GroupTreeNode[]) as Group[]);
        } else {
          setSelectedGroups(setter as Group[]);
        }
      }}
      isLoading={isLoading}
      entityKey="groups"
      entityEndpoint="group/list"
      page={1}
      setPage={setPage}
      search={searchName}
      setSearch={setSearchName}
      config={config}
    />
  );
}
