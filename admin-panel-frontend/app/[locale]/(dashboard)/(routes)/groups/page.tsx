"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3Icon, FileIcon, Trash2Icon } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";
import { Plus } from "lucide-react";
import useTableQuery from "@/lib/useTableQuery";
import PageHeader from "@/components/PageHeader";

export default function Groups() {
  const t = useTranslations("groups");
  const { page, setPage, search, setSearch } = useTableQuery();

  const { data } = useApiQuery<GroupApi>(
    `group/list?page=${page}&name=${search}`,
    ["groups", page, search]
  );
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState<number | null>(null);
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
