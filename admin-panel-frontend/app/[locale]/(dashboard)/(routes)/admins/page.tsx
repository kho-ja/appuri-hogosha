"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3Icon, EllipsisVertical, File, Trash2Icon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/navigation";
import { Button } from "@/components/ui/button";
import Admin from "@/types/admin";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TableApi from "@/components/TableApi";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import AdminApi from "@/types/adminApi";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";

export default function Admins() {
  const t = useTranslations("admins");
  const tName = useTranslations("names");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data } = useApiQuery<AdminApi>(
    `admin/list?page=${page}&name=${search}`,
    ["admins", page, search]
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const [adminId, setAdminId] = useState<number | null>(null);
  const { mutate } = useApiMutation<{ message: string }>(
    `admin/${adminId}`,
    "DELETE",
    ["deleteAdmin"],
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: ["admins"],
        });
        toast({
          title: t("adminDeleted"),
          description: data?.message,
        });
      },
    }
  );
  const { mutate: exportAdmins } = useFileMutation(`admin/export`, [
    "exportAdmins",
  ]);

  const adminColumns: ColumnDef<Admin>[] = [
    {
      accessorKey: "name",
      header: t("adminName"),
      cell: ({ row }) => tName("name", { ...row?.original }),
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
          <Link href={`/admins/${row.original.id}`}>
            <Edit3Icon />
          </Link>
          <Dialog>
            <DialogTrigger className="w-full">
              <Trash2Icon className="text-red-500" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tName("name", { ...row?.original })}</DialogTitle>
                <DialogDescription>{row.original.email}</DialogDescription>
              </DialogHeader>
              <div className="flex">{t("doYouDeleteAdmin")}</div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("close")}</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    setAdminId(row.original.id);
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
        <div className="w-full flex justify-between">
          <h1 className="text-3xl w-2/4 font-bold">{t("admins")}</h1>
          <Link href={`./admins/create`}>
            <Button>{t("createadmin")}</Button>
          </Link>
        </div>
        <div className="flex justify-between">
          <Input
            placeholder={t("filter")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
          <div className="">
            <PaginationApi data={data?.pagination ?? null} setPage={setPage} />
          </div>
        </div>
        <div className="flex justify-end items-center">
          <Button
            onClick={() => exportAdmins()}
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
            linkPrefix="/admins"
            data={data?.admins ?? null}
            columns={adminColumns}
          />
        </Card>
      </div>
    </div>
  );
}
