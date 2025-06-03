"use client";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3Icon, File, Trash2Icon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import ParentApi from "@/types/parentApi";
import Parent from "@/types/parent";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";
import useTableQuery from "@/lib/useTableQuery";
import { Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function Info() {
  const t = useTranslations("parents");
  const tName = useTranslations("names");
  const { page, setPage, search, setSearch } = useTableQuery();
  const { data } = useApiQuery<ParentApi>(
    `parent/list?page=${page}&name=${search}`,
    ["parents", page, search]
  );
  const queryClient = useQueryClient();
  const [parentId, setParentId] = useState<number | null>(null);
  const { mutate } = useApiMutation<{ message: string }>(
    `parent/${parentId}`,
    "DELETE",
    ["deleteParent"],
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["parents"] });
        toast({
          title: t("parentDeleted"),
          description: t(data?.message),
        });
      },
    }
  );

  const { mutate: exportParents } = useFileMutation<{ message: string }>(
    `parent/export`,
    ["exportParents"]
  );

  const parentColumns: ColumnDef<Parent>[] = [
    {
      accessorKey: "name",
      header: t("parentName"),
      cell: ({ row }) => tName("name", { ...row?.original } as any),
    },
    {
      accessorKey: "email",
      header: t("Email"),
    },
    {
      accessorKey: "phone_number",
      header: t("Phone_number"),
    },
    {
      header: t("action"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/parents/edit/${row.original.id}`}>
            <Edit3Icon />
          </Link>
          <Dialog key={row.original.id}>
            <DialogTrigger className="w-full">
              <Trash2Icon className="text-red-500" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {tName("name", { ...row?.original } as any)}
                </DialogTitle>
                <DialogDescription>{row.original.email}</DialogDescription>
              </DialogHeader>
              <div className="flex">{t("doYouDeleteParent")}</div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("close")}</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    setParentId(row.original.id);
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
        <PageHeader title={t("parents")} variant="list">
          <Link href={`/parents/create`}>
            <Button icon={<Plus className="h-5 w-5" />}>
              {t("createparent")}
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
            <PaginationApi data={data?.pagination ?? null} setPage={setPage} />
          </div>
        </div>
        <div className="flex justify-end items-center">
          <Button
            onClick={() => exportParents()}
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-sm"
          >
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">{t("export")}</span>
          </Button>
        </div>
        <Card x-chunk="dashboard-05-chunk-3">
          <TableApi
            linkPrefix="/parents"
            data={data?.parents ?? null}
            columns={parentColumns}
          />
        </Card>
      </div>
    </div>
  );
}
