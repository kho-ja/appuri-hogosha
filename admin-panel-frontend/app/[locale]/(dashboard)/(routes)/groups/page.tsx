"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Edit3Icon,
  FileIcon,
  Trash2Icon,
  FolderPlus,
  FolderIcon,
} from "lucide-react";
// utilities
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

export default function Groups() {
  const t = useTranslations("groups");
  const { data: session } = useSession();
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
  const [selectedGroupsForParent, setSelectedGroupsForParent] = useState<
    Group[]
  >([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedGroupToMove, setSelectedGroupToMove] = useState<Group | null>(
    null
  );
  const [targetParentGroupId, setTargetParentGroupId] = useState<number | null>(
    null
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

  const { mutate: createParentGroup, isPending: isCreatingCategory } =
    useApiMutation<{ id: number; name: string }, { name: string }>(
      "group/create",
      "POST",
      ["create-group"],
      {
        onSuccess: (mutationData) => {
          if (selectedGroupsForParent.length > 0) {
            moveSelectedGroupsToParent(mutationData.id);
          }

          toast({
            title: t("groupCreated"),
            description: mutationData.name,
          });
          queryClient.invalidateQueries({ queryKey: ["groups"] });
          setNewCategoryName("");
          setSelectedGroupsForParent([]);
          setIsCreateCategoryDialogOpen(false);
        },
      }
    );

  const moveSelectedGroupsToParent = async (parentGroupId: number) => {
    let successCount = 0;
    let errorCount = 0;

    for (const group of selectedGroupsForParent) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/group/${group.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.sessionToken}`,
            },
            body: JSON.stringify({
              name: group.name,
              sub_group_id: parentGroupId,
            }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: t("groupsMoved"),
        description: t("groupsMovedDescription", {
          count: successCount,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    }

    if (errorCount > 0) {
      toast({
        title: t("error"),
        description: t("failedToMoveGroups"),
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    createParentGroup({ name: newCategoryName.trim() });
  };

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
          <Dialog
            open={isCreateCategoryDialogOpen}
            onOpenChange={setIsCreateCategoryDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                icon={<FolderPlus className="h-5 w-5" />}
              >
                {t("createParentGroup")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createParentGroup")}</DialogTitle>
                <DialogDescription>
                  {t("createParentGroupDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">{t("groupName")}</Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={t("enterGroupName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("selectGroupsToMove")}</Label>
                  <div className="max-h-64 overflow-y-auto border rounded-md p-2">
                    <GroupTable
                      selectedGroups={selectedGroupsForParent}
                      setSelectedGroups={setSelectedGroupsForParent}
                      useIndependentState={true}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("cancel")}</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                >
                  {isCreatingCategory ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
            <PaginationApi data={data?.pagination || null} setPage={setPage} />
          </div>
        </div>

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
                {(data?.groups ?? []).map((group) => (
                  <TableRow key={group.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">
                      <Link href={`/groups/${group.id}`}>{group.name}</Link>
                    </TableCell>
                    <TableCell>{group.sub_group_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {group.member_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderActionCell(group)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
