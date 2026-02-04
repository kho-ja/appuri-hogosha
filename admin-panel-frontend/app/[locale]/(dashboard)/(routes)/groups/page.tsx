"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Edit3Icon,
  FileIcon,
  Trash2Icon,
  GripVertical,
  Plus,
  Unlink2Icon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Input } from "@/components/ui/input";
import Group from "@/types/group";
import GroupApi from "@/types/groupApi";
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
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";
import usePagination from "@/lib/usePagination";
import PageHeader from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useListQuery } from "@/lib/useListQuery";
import { SkeletonLoader } from "@/components/TableApi";

interface GroupTreeNode extends Group {
  children?: GroupTreeNode[];
  level?: number;
}

const buildTreeStructure = (groups: Group[] = []): GroupTreeNode[] => {
  const map = new Map<number, GroupTreeNode>();
  const roots: GroupTreeNode[] = [];

  groups.forEach((group) => map.set(group.id, { ...group, children: [] }));

  groups.forEach((group) => {
    const node = map.get(group.id)!;
    if (group.sub_group_id) {
      const parent = map.get(group.sub_group_id);
      parent ? parent.children!.push(node) : roots.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const flattenTree = (nodes: GroupTreeNode[], level = 0): GroupTreeNode[] =>
  nodes.flatMap((node) => [
    { ...node, level },
    ...(node.children ? flattenTree(node.children, level + 1) : []),
  ]);

function GroupRow({
  group,
  renderActionCell,
  isOver,
  isDragging,
  showHandle,
}: {
  group: GroupTreeNode;
  renderActionCell: (group: Group) => React.ReactNode;
  isOver?: boolean;
  isDragging?: boolean;
  showHandle: boolean;
}) {
  const level = group.level ?? 0;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: group.id,
      disabled: !showHandle,
    });

  // Apply transform only to the item being actively dragged
  const style = {
    transform: isDragging ? CSS.Transform.toString(transform) : undefined,
    transition: isDragging ? transition : undefined,
    zIndex: isDragging ? 1 : "auto", // Ensure dragged item is on top
  };

  const isDropTarget = !!isOver;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:bg-muted/10 transition-colors relative border-b border-border/50",
        // When dragging, the original row itself moves, so no opacity change needed
        isDropTarget && "border-b-2 border-b-white"
      )}
    >
      <TableCell className="font-medium">
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${level * 24}px` }}
        >
          {showHandle && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-move touch-none hover:text-primary transition-colors"
              aria-hidden={!showHandle}
              tabIndex={showHandle ? 0 : -1}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <Link href={`/groups/${group.id}`}>{group.name}</Link>
        </div>
      </TableCell>
      <TableCell>{group.sub_group_name ?? "—"}</TableCell>
      <TableCell className="text-right">{group.member_count ?? 0}</TableCell>
      <TableCell className="text-right">{renderActionCell(group)}</TableCell>
    </TableRow>
  );
}

export default function Groups() {
  const t = useTranslations("groups");
  const tTable = useTranslations("table");

  const { data: session } = useSession();
const { page, setPage, search, setSearch } = usePagination({
  persistToUrl: true,
});
const { data } = useListQuery<GroupApi>(
  `group/list?name=${search}&all=true`,
  ["groups", search]
);

const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
const isLoading = !hasLoadedOnce && typeof data === "undefined";

useEffect(() => {
  if (!hasLoadedOnce && typeof data !== "undefined") {
    setHasLoadedOnce(true);
  }
}, [data, hasLoadedOnce]);
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const treeData = useMemo(
    () => buildTreeStructure(data?.groups),
    [data?.groups]
  );
  const flatData = useMemo(() => flattenTree(treeData), [treeData]);
  const allIds = useMemo(
    () => flatData.map((g: GroupTreeNode) => g.id),
    [flatData]
  );

  const hasRows = flatData.length > 0;

  const showLoading =
    isLoading || (!hasLoadedOnce && typeof data === "undefined");
  const showEmpty = hasLoadedOnce && !isLoading && !hasRows;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeGroup = flatData.find((g) => g.id === active.id);
    const overGroup = flatData.find((g) => g.id === over.id);

    if (!activeGroup || !overGroup) {
      return;
    }

    // A group can only be dropped on a parent group (a group that is not a child itself).
    // if (overGroup.sub_group_id) {
    //   toast({
    //     title: t("error"),
    //     description: t("cannotDropOnChild"),
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // Don't drop on self
    if (activeGroup.id === overGroup.id) {
      return;
    }

    // Don't drop on same parent
    if (activeGroup.sub_group_id === overGroup.id) {
      return;
    }

    // Prevent dropping a parent into its own child
    let current = overGroup;
    while (current.sub_group_id) {
      if (current.sub_group_id === activeGroup.id) {
        toast({
          title: t("error"),
          description: t("cannotCreateCircularDependency"),
          variant: "destructive",
        });
        return;
      }
      const parent = flatData.find(
        (g: GroupTreeNode) => g.id === current.sub_group_id
      );
      if (!parent) break;
      current = parent;
    }

    // Optimistic update - update cache immediately
    queryClient.setQueryData<GroupApi>(["groups", page, search], (oldData) => {
      if (!oldData) return oldData;

      const updatedGroups = oldData.groups.map((group) =>
        group.id === activeGroup.id
          ? {
              ...group,
              sub_group_id: overGroup.id,
              sub_group_name: overGroup.name,
            }
          : group
      );

      return {
        ...oldData,
        groups: updatedGroups,
      };
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/group/${activeGroup.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify({
            name: activeGroup.name,
            sub_group_id: overGroup.id,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: t("groupMoved"),
          description: t("groupMovedDescription"),
        });
        // Refresh to get latest data from server
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      } else {
        toast({
          title: t("error"),
          description: t("failedToMoveGroup"),
          variant: "destructive",
        });
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToMoveGroup"),
        variant: "destructive",
      });
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleUnlinkGroup = async (group: GroupTreeNode) => {
    if (!group.sub_group_id) return;

    const accessToken =
      session?.sessionToken ||
      (session?.user as { accessToken?: string })?.accessToken ||
      (session?.user as { token?: string })?.token ||
      "";

    try {
      setUnlinkingId(group.id);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/group/${group.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            name: group.name,
            sub_group_id: null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to unlink group");
      }

      toast({
        title: t("groupUnlinked"),
        description: t("groupUnlinkedDescription"),
      });

      queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch (error) {
      console.error(error);
      toast({
        title: t("error"),
        description: t("failedToUnlinkGroup"),
        className: "bg-amber-500 text-black",
      });
    } finally {
      setUnlinkingId(null);
    }
  };

  const renderActionCell = (group: Group) => (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/groups/edit/${group.id}`}>
        <Edit3Icon className="h-5 w-5" />
      </Link>
      {group.sub_group_id && (
        <button
          type="button"
          onClick={() => handleUnlinkGroup(group as GroupTreeNode)}
          className="text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
          disabled={unlinkingId === group.id}
          aria-label={t("groupUnlinked")}
        >
          <Unlink2Icon className="h-5 w-5" />
        </button>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <Trash2Icon className="text-red-500 cursor-pointer h-5 w-5" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{group.name}</DialogTitle>
            <DialogDescription>{group.member_count}</DialogDescription>
          </DialogHeader>
          <div>{t("doYouWantToDeleteGroup")}</div>
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

  const { mutate: exportGroups } = useFileMutation<{ message: string }>(
    `group/export`,
    ["exportGroups"]
  );

  return (
    <div className="w-full">
      <div className="space-y-4">
        <PageHeader title={t("groups")} variant="list">
          <div className="flex items-center gap-2">
            <Button
              variant={isEditMode ? "secondary" : "outline"}
              className={cn(
                "h-10 px-4 text-sm justify-center",
                isEditMode && "bg-secondary"
              )}
              onClick={() => setIsEditMode((prev) => !prev)}
            >
              {isEditMode
                ? t("done", { defaultMessage: "Done" })
                : t("editGroups", { defaultMessage: "Edit groups" })}
            </Button>
            <Link href={`/groups/create`}>
              <Button
                className="h-10 px-4 justify-center"
                icon={<Plus className="h-5 w-5" />}
              >
                {t("creategroup")}
              </Button>
            </Link>
          </div>
        </PageHeader>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2 mb-2">
          <div className="w-full sm:max-w-sm">
            <Input
              placeholder={t("filter")}
              value={search}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full"
            />
          </div>
          <div>{/* Pagination removed */}</div>
        </div>

        <div className="space-y-2 align-left">
          <div className="flex justify-end items-center gap-2">
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

          {showLoading ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("groupName")}</TableHead>
                    <TableHead className="w-40">{t("parent")}</TableHead>
                    <TableHead className="w-24 text-right">
                      {t("studentCount")}
                    </TableHead>
                    <TableHead className="w-32 text-right">
                      {t("action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SkeletonLoader columnCount={4} rowCount={5} />
                </TableBody>
              </Table>
            </div>
          ) : showEmpty ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("groupName")}</TableHead>
                    <TableHead className="w-40">{t("parent")}</TableHead>
                    <TableHead className="w-24 text-right">
                      {t("studentCount")}
                    </TableHead>
                    <TableHead className="w-32 text-right">
                      {t("action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {tTable("noData")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                modifiers={[restrictToVerticalAxis]}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("groupName")}</TableHead>
                      <TableHead className="w-40">{t("parent")}</TableHead>
                      <TableHead className="w-24 text-right">
                        {t("studentCount")}
                      </TableHead>
                      <TableHead className="w-32 text-right">
                        {t("action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={allIds}>
                      {flatData.map((group) => (
                        <GroupRow
                          key={group.id}
                          group={group}
                          renderActionCell={renderActionCell}
                          isOver={overId === group.id}
                          isDragging={activeId === group.id}
                          showHandle={isEditMode}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
