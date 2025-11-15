"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Edit3Icon,
  FileIcon,
  Trash2Icon,
  FolderIcon,
  GripVertical,
  Unlink2Icon,
} from "lucide-react";
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
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import PaginationApi from "@/components/PaginationApi";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";
import { Plus } from "lucide-react";
import useTableQuery from "@/lib/useTableQuery";
import PageHeader from "@/components/PageHeader";
import { GroupSelect } from "@/components/GroupSelect";
import { GroupTable } from "@/components/GroupTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface GroupTreeNode extends Group {
  children?: GroupTreeNode[];
  level?: number;
}

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
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "cursor-move touch-none hover:text-primary transition-colors",
              !showHandle && "pointer-events-none opacity-0"
            )}
            aria-hidden={!showHandle}
            tabIndex={showHandle ? 0 : -1}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
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
  const { data: session } = useSession();
  const { page, setPage, search, setSearch } = useTableQuery();

  const { data } = useApiQuery<GroupApi>(`group/list?name=${search}&all=true`, [
    "groups",
    search,
  ]);
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedGroupToMove, setSelectedGroupToMove] = useState<Group | null>(
    null
  );
  const [targetParentGroupId, setTargetParentGroupId] = useState<number | null>(
    null
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build tree structure from flat list
  const buildTreeStructure = (groups: Group[]): GroupTreeNode[] => {
    const groupMap = new Map<number, GroupTreeNode>();
    const rootGroups: GroupTreeNode[] = [];

    groups.forEach((group) => {
      groupMap.set(group.id, { ...group, children: [] });
    });

    groups.forEach((group) => {
      const node = groupMap.get(group.id)!;
      if (group.sub_group_id) {
        const parent = groupMap.get(group.sub_group_id);
        if (parent) {
          parent.children!.push(node);
        } else {
          rootGroups.push(node);
        }
      } else {
        rootGroups.push(node);
      }
    });

    return rootGroups;
  };

  const flattenTree = (
    nodes: GroupTreeNode[],
    level: number = 0
  ): GroupTreeNode[] => {
    const result: GroupTreeNode[] = [];
    nodes.forEach((node) => {
      result.push({ ...node, level });
      if (node.children && node.children.length > 0) {
        result.push(...flattenTree(node.children, level + 1));
      }
    });
    return result;
  };

  const treeData = useMemo(
    () => buildTreeStructure(data?.groups ?? []),
    [data?.groups]
  );
  const flatData = useMemo(() => flattenTree(treeData), [treeData]);

  // Get all items for SortableContext
  const allIds = useMemo(() => flatData.map((g) => g.id), [flatData]);

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
      const parent = flatData.find((g) => g.id === current.sub_group_id);
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

  const handleUnlinkGroup = async (groupToUnlink: Group) => {
    // Optimistic update: set parent to null
    queryClient.setQueryData<GroupApi>(["groups", page, search], (oldData) => {
      if (!oldData) return oldData;
      const updatedGroups = oldData.groups.map((g) =>
        g.id === groupToUnlink.id
          ? { ...g, sub_group_id: null, sub_group_name: undefined }
          : g
      );
      return { ...oldData, groups: updatedGroups };
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/group/${groupToUnlink.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify({
            name: groupToUnlink.name,
            sub_group_id: null, // Unlink by setting parent to null
          }),
        }
      );

      if (response.ok) {
        toast({
          title: t("groupUnlinked"),
          description: t("groupUnlinkedDescription"),
        });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      } else {
        toast({
          title: t("error"),
          description: t("failedToUnlinkGroup"),
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["groups"] }); // Revert on error
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUnlinkGroup"),
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["groups"] }); // Revert on error
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const renderActionCell = (group: Group) => (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/groups/edit/${group.id}`}>
        <Edit3Icon className="h-5 w-5" />
      </Link>
      <FolderIcon
        className="text-blue-500 cursor-pointer h-5 w-5"
        onClick={() => openMoveDialog(group)}
      />
      {group.sub_group_id && (
        <Unlink2Icon
          className="text-yellow-500 cursor-pointer h-5 w-5"
          onClick={() => handleUnlinkGroup(group)}
        />
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

  const { mutate: moveGroupToParent, isPending: isMovingGroup } =
    useApiMutation<
      { message: string },
      { name: string; sub_group_id: number | null; students?: number[] }
    >(`group/${selectedGroupToMove?.id}`, "PUT", ["move-group-to-parent"], {
      onSuccess: () => {
        toast({
          title: t("groupMoved"),
          description: t("groupMoved"),
        });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        setIsMoveDialogOpen(false);
        setSelectedGroupToMove(null);
        setTargetParentGroupId(null);
      },
    });

  const handleMoveGroup = () => {
    if (!selectedGroupToMove) return;
    moveGroupToParent({
      name: selectedGroupToMove.name,
      sub_group_id: targetParentGroupId,
    });
  };

  const openMoveDialog = (group: Group) => {
    setSelectedGroupToMove(group);
    setTargetParentGroupId(group.sub_group_id || null);
    setIsMoveDialogOpen(true);
  };

  const { mutate: exportGroups } = useFileMutation<{ message: string }>(
    `group/export`,
    ["exportGroups"]
  );

  return (
    <div className="w-full">
      <div className="space-y-4">
        <PageHeader title={t("groups")} variant="list">
          <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("moveGroupToParent")}</DialogTitle>
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
                  <Label>{t("selectParentGroup")}</Label>
                  <GroupSelect
                    value={targetParentGroupId}
                    onChange={setTargetParentGroupId}
                    placeholder={t("selectParentGroup")}
                    allowEmpty
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("cancel")}</Button>
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
            {/* <PaginationApi data={data?.pagination || null} setPage={setPage} /> */}
          </div>
        </div>

        <div className="space-y-2 align-left">
          <div className="flex justify-end items-center gap-2">
            <Button
              size="sm"
              variant={isEditMode ? "secondary" : "outline"}
              className="h-7 text-sm"
              onClick={() => setIsEditMode((prev) => !prev)}
            >
              {isEditMode
                ? t("done", { defaultMessage: "Done" })
                : t("editGroups", { defaultMessage: "Edit groups" })}
            </Button>
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
                  {/* We still use SortableContext to get useSortable hooks, but without a sorting strategy */}
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
              {/* DragOverlay is completely removed */}
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
