"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  Edit3Icon,
  FileIcon,
  Trash2Icon,
  FolderPlus,
  FolderIcon,
  GripVertical,
  ChevronRight,
  Loader2,
  ArrowRight,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import Group from "@/types/group";
import GroupApi from "@/types/groupApi";
import GroupCategory from "@/types/group-category";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { SkeletonLoader } from "@/components/TableApi";
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
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableGroups, setEditableGroups] = useState<Group[]>([]);
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isEditMode && data?.groups) {
      setEditableGroups(data.groups);
    }
  }, [data?.groups, isEditMode]);

  const toggleEditMode = () => {
    setIsEditMode((prev) => {
      const next = !prev;
      if (!prev && data?.groups) {
        setEditableGroups(data.groups);
      }
      return next;
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setEditableGroups((items) => {
      const activeId = active.id.toString();
      const overId = over.id.toString();
      const oldIndex = items.findIndex(
        (group) => group.id.toString() === activeId
      );
      const newIndex = items.findIndex(
        (group) => group.id.toString() === overId
      );

      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

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

  const toggleCategoryOpen = (categoryId: string) => {
    setOpenCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="w-full">
      <div className="space-y-4">
        <PageHeader title={t("groups")} variant="list">
          <Button
            variant={isEditMode ? "default" : "outline"}
            icon={<Edit3Icon className="h-5 w-5" />}
            onClick={toggleEditMode}
          >
            {isEditMode ? t("done") : t("edit")}
          </Button>

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
            <CategoryMenu
              categories={categoryNodes}
              openCategoryIds={openCategoryIds}
              onToggleCategory={toggleCategoryOpen}
              emptyLabel={tCategory("noGroups")}
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
          {isEditMode && (
            <Card x-chunk="dashboard-05-chunk-3">
              {data?.groups ? (
                <SortableGroupsTable
                  groups={editableGroups}
                  onDragEnd={handleDragEnd}
                  renderActionCell={renderActionCell}
                  headers={{
                    drag: "",
                    name: t("groupName"),
                    members: t("studentCount"),
                    action: t("action"),
                  }}
                />
              ) : (
                <Table>
                  <TableBody>
                    <SkeletonLoader rowCount={5} columnCount={4} />
                  </TableBody>
                </Table>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

type SortableGroupsTableProps = {
  groups: Group[];
  onDragEnd: (event: DragEndEvent) => void;
  renderActionCell: (group: Group) => JSX.Element;
  headers: {
    drag: string;
    name: string;
    members: string;
    action: string;
  };
};

function SortableGroupsTable({
  groups,
  onDragEnd,
  renderActionCell,
  headers,
}: SortableGroupsTableProps) {
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={groups.map((group) => group.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">{headers.drag}</TableHead>
              <TableHead>{headers.name}</TableHead>
              <TableHead>{headers.members}</TableHead>
              <TableHead>{headers.action}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {headers.members}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <SortableGroupRow
                  key={group.id}
                  group={group}
                  renderActionCell={renderActionCell}
                />
              ))
            )}
          </TableBody>
        </Table>
      </SortableContext>
    </DndContext>
  );
}

type SortableGroupRowProps = {
  group: Group;
  renderActionCell: (group: Group) => JSX.Element;
};

function SortableGroupRow({ group, renderActionCell }: SortableGroupRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id.toString() });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="bg-background">
      <TableCell className="w-10">
        <Button
          size="icon"
          variant="ghost"
          className="cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell>{group.name}</TableCell>
      <TableCell>{group.member_count ?? 0}</TableCell>
      <TableCell>{renderActionCell(group)}</TableCell>
    </TableRow>
  );
}

type CategoryTreeNode = {
  id: string;
  title: string;
  badgeCount: number;
  groups: Group[];
  children: CategoryTreeNode[];
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

type CategoryMenuProps = {
  categories: CategoryTreeNode[];
  openCategoryIds: string[];
  onToggleCategory: (id: string) => void;
  emptyLabel: string;
  level?: number;
};

function CategoryMenu({
  categories,
  openCategoryIds,
  onToggleCategory,
  emptyLabel,
  level = 0,
}: CategoryMenuProps) {
  if (!categories.length) return null;

  return (
    <ul className={cn("space-y-2", level > 0 && "pl-5")}>
      {categories.map((node, index) => (
        <CategoryNode
          key={node.id}
          node={node}
          openCategoryIds={openCategoryIds}
          onToggleCategory={onToggleCategory}
          emptyLabel={emptyLabel}
          level={level}
          isLast={index === categories.length - 1}
        />
      ))}
    </ul>
  );
}

type CategoryNodeProps = {
  node: CategoryTreeNode;
  openCategoryIds: string[];
  onToggleCategory: (id: string) => void;
  emptyLabel: string;
  level: number;
  isLast: boolean;
};

function CategoryNode({
  node,
  openCategoryIds,
  onToggleCategory,
  emptyLabel,
  level,
  isLast,
}: CategoryNodeProps) {
  const isOpen = openCategoryIds.includes(node.id);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const element = contentWrapperRef.current;
    if (!element) return;

    const updateHeight = () => setContentHeight(element.scrollHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [node.groups, node.children]);

  return (
    <li
      className={cn(
        "relative rounded-xl border border-border bg-muted/20 shadow-sm transition hover:border-primary/40",
        level > 0 &&
          "before:absolute before:left-[-20px] before:top-0 before:h-full before:border-l before:border-dashed before:border-border/70",
        level > 0 && !isLast && "before:h-[calc(100%+12px)]"
      )}
    >
      <button
        type="button"
        onClick={() => onToggleCategory(node.id)}
        className="group flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-left text-sm font-medium transition hover:bg-muted/60"
      >
        <span className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background transition",
              isOpen && "border-primary/60 bg-primary/10 text-primary"
            )}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200 ease-out",
                isOpen && "rotate-90"
              )}
            />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">{node.title}</span>
            {node.groups.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users2 className="h-3 w-3" />
                {node.groups.length}
              </span>
            )}
          </span>
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {node.badgeCount}
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden border-t border-dashed border-border/60 bg-background px-4 transition-all duration-300 ease-out",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        style={{
          maxHeight: isOpen ? contentHeight + 24 : 0,
          paddingTop: isOpen ? 12 : 0,
          paddingBottom: isOpen ? 12 : 0,
        }}
      >
        <div ref={contentWrapperRef} className="space-y-3">
          {node.groups.length ? (
            <ul className="space-y-2 pl-3">
              {node.groups.map((group) => (
                <li
                  key={`${node.id}-group-${group.id}`}
                  className="flex items-center justify-between rounded-lg border border-transparent bg-muted/40 px-3 py-2 text-sm transition hover:border-primary/30 hover:bg-muted/60"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Link
                      href={`/groups/${group.id}`}
                      className="font-medium hover:underline"
                    >
                      {group.name}
                    </Link>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.member_count ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {emptyLabel}
            </p>
          )}

          {node.children.length > 0 && (
            <div className="pt-3">
              <CategoryMenu
                categories={node.children}
                openCategoryIds={openCategoryIds}
                onToggleCategory={onToggleCategory}
                emptyLabel={emptyLabel}
                level={level + 1}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
