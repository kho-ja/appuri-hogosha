"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  Edit3Icon,
  FileIcon,
  Trash2Icon,
  FolderPlus,
  FolderIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import Group from "@/types/group";
import GroupApi from "@/types/groupApi";
import GroupCategory from "@/types/group-category";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";
import { Plus } from "lucide-react";
import useTableQuery from "@/lib/useTableQuery";
import PageHeader from "@/components/PageHeader";
import { GroupCategorySelect } from "@/components/GroupCategorySelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Groups() {
  const t = useTranslations("groups");
  const tCategory = useTranslations("GroupCategory");
  const { page, setPage, search, setSearch } = useTableQuery();

  const { data } = useApiQuery<GroupApi>(
    `group/list?page=${page}&name=${search}`,
    ["groups", page, search]
  );
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] =
    useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedGroupToMove, setSelectedGroupToMove] = useState<Group | null>(
    null
  );
  const [targetCategoryId, setTargetCategoryId] = useState<number | null>(null);

  const categoryTableLabels = useMemo(
    () => ({
      headerName: tCategory("categoryName"),
      headerType: tCategory("typeColumn"),
      headerMembers: t("studentCount"),
      parent: tCategory("parentLabel"),
      child: tCategory("childLabel"),
      group: tCategory("groupLabel"),
      action: t("action"),
    }),
    [t, tCategory]
  );

  const renderActionCell = (group: Group) => (
    <div className="flex gap-2">
      <Link href={`/groups/edit/${group.id}`}>
        <Edit3Icon />
      </Link>
      <FolderIcon
        className="text-blue-500 cursor-pointer"
        onClick={() => openMoveDialog(group)}
      />
      <Dialog>
        <DialogTrigger asChild>
          <Trash2Icon className="text-red-500 cursor-pointer" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{group.name}</DialogTitle>
            <DialogDescription>{group.member_count}</DialogDescription>
          </DialogHeader>
          <div>{t("DouYouDeleteGroup")}</div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t("cancel")}</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setGroupId(group.id);
                mutate();
              }}
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const { mutate } = useApiMutation<{ message: string }>(
    `group/${groupId}`,
    "DELETE",
    ["deleteGroup"],
    {
      onSuccess: (mutationData) => {
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        toast({
          title: t("groupDeleted"),
          description: t(mutationData?.message),
        });
      },
    }
  );

  const { mutate: createCategory, isPending: isCreatingCategory } =
    useApiMutation<
      { id: number; name: string },
      { name: string; parent_category_id?: number | null }
    >("group-category/create", "POST", ["create-category"], {
      onSuccess: (mutationData) => {
        toast({
          title: tCategory("categoryCreated"),
          description: mutationData.name,
        });
        queryClient.invalidateQueries({ queryKey: ["group-categories"] });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        setNewCategoryName("");
        setSelectedParentId(null);
        setIsCreateCategoryDialogOpen(false);
      },
    });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    createCategory({
      name: newCategoryName.trim(),
      parent_category_id: selectedParentId,
    });
  };

  const { mutate: moveGroupToCategory, isPending: isMovingGroup } =
    useApiMutation<{ message: string }, { group_category_id: number | null }>(
      `group/${selectedGroupToMove?.id}/move-category`,
      "PUT",
      ["move-group-to-category"],
      {
        onSuccess: (mutationData) => {
          toast({
            title: t("groupMoved"),
            description: mutationData.message,
          });
          queryClient.invalidateQueries({ queryKey: ["groups"] });
          setIsMoveDialogOpen(false);
          setSelectedGroupToMove(null);
          setTargetCategoryId(null);
        },
      }
    );

  const handleMoveGroup = () => {
    if (!selectedGroupToMove) return;
    moveGroupToCategory({
      group_category_id: targetCategoryId,
    });
  };

  const openMoveDialog = (group: Group) => {
    setSelectedGroupToMove(group);
    setTargetCategoryId(group.group_category_id || null);
    setIsMoveDialogOpen(true);
  };

  const { mutate: exportGroups } = useFileMutation<{ message: string }>(
    `group/export`,
    ["exportGroups"]
  );

  const { data: categoryTreeResponse, isLoading: isCategoryTreeLoading } =
    useApiQuery<{ tree: GroupCategory[] }>("group-category/tree", [
      "group-category-tree",
    ]);

  const categoryTree = useMemo(
    () => categoryTreeResponse?.tree ?? [],
    [categoryTreeResponse?.tree]
  );

  const uncategorizedGroups = useMemo(
    () => (data?.groups ?? []).filter((group) => !group.group_category_id),
    [data?.groups]
  );

  const rawCategoryNodes = useMemo(
    () => mapCategoryTree(categoryTree),
    [categoryTree]
  );

  const categoryNodes = useMemo(() => {
    const nodes = [...rawCategoryNodes];
    if (uncategorizedGroups.length) {
      nodes.push({
        id: "category-uncategorized",
        title: tCategory("noCategory"),
        badgeCount: uncategorizedGroups.length,
        groups: uncategorizedGroups,
        children: [],
      });
    }
    return nodes;
  }, [rawCategoryNodes, uncategorizedGroups, tCategory]);

  return (
    <div className="w-full">
      <div className="space-y-4">
        <PageHeader title={t("groups")} variant="list">
          <Dialog
            open={isCreateCategoryDialogOpen}
            onOpenChange={setIsCreateCategoryDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                icon={<FolderPlus className="h-5 w-5" />}
              >
                {tCategory("createParentGroup")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tCategory("createParentGroup")}</DialogTitle>
                <DialogDescription>
                  {tCategory("createParentGroupDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">
                    {tCategory("categoryName")}
                  </Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={tCategory("enterCategoryName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent-category">
                    {tCategory("parentCategory")}
                  </Label>
                  <GroupCategorySelect
                    value={selectedParentId}
                    onChange={setSelectedParentId}
                    placeholder={tCategory("selectParentCategory")}
                    allowEmpty
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{tCategory("cancel")}</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                >
                  {isCreatingCategory
                    ? tCategory("creating")
                    : tCategory("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("moveGroupToCategory")}</DialogTitle>
                <DialogDescription>
                  {selectedGroupToMove && (
                    <>
                      {t("moveGroupDescription")}: &quot;
                      {selectedGroupToMove.name}&quot;
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{tCategory("selectParentCategory")}</Label>
                  <GroupCategorySelect
                    value={targetCategoryId}
                    onChange={setTargetCategoryId}
                    placeholder={tCategory("selectParentCategory")}
                    allowEmpty
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{tCategory("cancel")}</Button>
                </DialogClose>
                <Button onClick={handleMoveGroup} disabled={isMovingGroup}>
                  {isMovingGroup ? t("moving") : t("move")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Link href={`/groups/create`}>
            <Button icon={<Plus className="h-5 w-5" />}>
              {t("creategroup")}
            </Button>
          </Link>
        </PageHeader>

        <div className="flex flex-col sm:flex-row justify-between">
          <Input
            placeholder={t("filter")}
            value={search}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="sm:max-w-sm mb-4"
          />
          <div>
            <PaginationApi data={data?.pagination || null} setPage={setPage} />
          </div>
        </div>

        {(categoryNodes.length > 0 || isCategoryTreeLoading) && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {tCategory("categories")}
              </h2>
              {isCategoryTreeLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <CategoryTable
              categories={categoryNodes}
              emptyLabel={tCategory("noGroups")}
              labels={categoryTableLabels}
              renderActionCell={renderActionCell}
            />
          </Card>
        )}

        <div className="space-y-2 align-left">
          <div className="flex justify-end items-center">
            <Button
              onClick={() => exportGroups()}
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-sm"
            >
              <FileIcon className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">{t("export")}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CategoryTreeNode = {
  id: string;
  title: string;
  badgeCount: number;
  groups: Group[];
  children: CategoryTreeNode[];
};

type CategoryTableLabels = {
  headerName: string;
  headerType: string;
  headerMembers: string;
  parent: string;
  child: string;
  group: string;
  action: string;
};

type CategoryDisplayRow = {
  id: string;
  name: string;
  level: number;
  type: "parent" | "child" | "group";
  members: number | null;
  groupId?: number;
  group?: Group;
};

const mapCategoryTree = (categories: GroupCategory[]): CategoryTreeNode[] =>
  categories.map((category) => ({
    id: `category-${category.id}`,
    title: category.name,
    badgeCount:
      typeof category.group_count === "number"
        ? category.group_count
        : (category.groups?.length ?? 0),
    groups: category.groups ?? [],
    children: mapCategoryTree(category.children ?? []),
  }));

type CategoryTableProps = {
  categories: CategoryTreeNode[];
  emptyLabel: string;
  labels: CategoryTableLabels;
  renderActionCell: (group: Group) => JSX.Element;
};

function CategoryTable({
  categories,
  emptyLabel,
  labels,
  renderActionCell,
}: CategoryTableProps) {
  const rows = flattenCategoryTree(categories);

  if (!rows.length) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.headerName}</TableHead>
            <TableHead className="w-40">{labels.headerType}</TableHead>
            <TableHead className="w-24 text-right">
              {labels.headerMembers}
            </TableHead>
            <TableHead className="w-32 text-right">{labels.action}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/10">
              <TableCell
                style={{ paddingLeft: `${row.level * 1.5}rem` }}
                className={cn(
                  row.type !== "group" && row.members === 0
                    ? "text-sm text-muted-foreground"
                    : undefined
                )}
              >
                {row.type === "group" && row.groupId ? (
                  <Link
                    href={`/groups/${row.groupId}`}
                    className="font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                ) : (
                  row.name
                )}
              </TableCell>
              <TableCell>
                <TypeBadge type={row.type} labels={labels} />
              </TableCell>
              <TableCell className="text-right">
                {typeof row.members === "number" ? row.members : "—"}
              </TableCell>
              <TableCell className="text-right">
                {row.type === "group" && row.group
                  ? renderActionCell(row.group)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function flattenCategoryTree(
  nodes: CategoryTreeNode[],
  level = 0
): CategoryDisplayRow[] {
  return nodes.flatMap((node) => {
    const rows: CategoryDisplayRow[] = [
      {
        id: node.id,
        name: node.title,
        level,
        type: level === 0 ? "parent" : "child",
        members: node.badgeCount,
      },
    ];

    node.groups.forEach((group) =>
      rows.push({
        id: `${node.id}-group-${group.id}`,
        name: group.name,
        level: level + 1,
        type: "group",
        members: group.member_count ?? 0,
        groupId: group.id,
        group,
      })
    );
    if (node.children.length) {
      rows.push(...flattenCategoryTree(node.children, level + 1));
    }

    return rows;
  });
}

function TypeBadge({
  type,
  labels,
}: {
  type: "parent" | "child" | "group";
  labels: CategoryTableLabels;
}) {
  const textMap = {
    parent: labels.parent,
    child: labels.child,
    group: labels.group,
  };

  const colorMap = {
    parent: "bg-blue-500/10 text-blue-200 border-blue-500/40",
    child: "bg-amber-500/10 text-amber-200 border-amber-500/40",
    group: "bg-emerald-500/10 text-emerald-200 border-emerald-500/40",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        colorMap[type]
      )}
    >
      {textMap[type]}
    </span>
  );
}
