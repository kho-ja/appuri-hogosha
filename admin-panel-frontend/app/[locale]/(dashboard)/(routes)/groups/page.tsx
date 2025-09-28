"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  Edit3Icon,
  FileIcon,
  Trash2Icon,
  FolderPlus,
  FolderIcon,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import Group from "@/types/group";
import GroupApi from "@/types/groupApi";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

  const { mutate } = useApiMutation<{ message: string }>(
    `group/${groupId}`,
    "DELETE",
    ["deleteGroup"],
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        toast({
          title: t("groupDeleted"),
          description: t(data?.message),
        });
      },
    }
  );

  const { mutate: createCategory, isPending: isCreatingCategory } =
    useApiMutation<
      { id: number; name: string },
      { name: string; parent_category_id?: number | null }
    >("group-category/create", "POST", ["create-category"], {
      onSuccess: (data) => {
        toast({
          title: tCategory("categoryCreated"),
          description: data.name,
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
        onSuccess: (data) => {
          toast({
            title: t("groupMoved"),
            description: data.message,
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

  const columns: ColumnDef<Group>[] = [
    {
      accessorKey: "name",
      header: t("groupName"),
    },
    {
      accessorKey: "member_count",
      header: t("studentCount"),
      cell: ({ row }) => row.getValue("member_count"),
    },
    {
      header: t("action"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/groups/edit/${row.original.id}`}>
            <Edit3Icon />
          </Link>
          <FolderIcon
            className="text-blue-500 cursor-pointer"
            onClick={() => openMoveDialog(row.original)}
          />
          <Dialog>
            <DialogTrigger asChild>
              <Trash2Icon className="text-red-500 cursor-pointer" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{row?.original.name}</DialogTitle>
                <DialogDescription>
                  {row.original.member_count}
                </DialogDescription>
              </DialogHeader>
              <div>{t("DouYouDeleteGroup")}</div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    setGroupId(row.original.id);
                    mutate();
                  }}
                >
                  {t("confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ),
    },
  ];

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
                    allowEmpty={true}
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

          {/* Move Group Dialog */}
          <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("moveGroupToCategory")}</DialogTitle>
                <DialogDescription>
                  {selectedGroupToMove && (
                    <>
                      {t("moveGroupDescription")}: "{selectedGroupToMove.name}"
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
                    allowEmpty={true}
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
          <div className="">
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
          <Card x-chunk="dashboard-05-chunk-3">
            <TableApi
              linkPrefix="/groups"
              data={data?.groups ?? null}
              columns={columns}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
