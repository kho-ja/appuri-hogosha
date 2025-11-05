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
import useApiPostQuery from "@/lib/useApiPostQuery";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";
import useTableQuery from "@/lib/useTableQuery";
import { Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import YesBadge from "@/components/yesbadge";
import NoBadge from "@/components/nobadge";

export default function Info() {
  const t = useTranslations("parents");
  const tName = useTranslations("names");
  const { page, setPage, search, setSearch } = useTableQuery();
  const { data } = useApiPostQuery<ParentApi>(
    "parent/list",
    ["parents", page, search],
    { page, name: search }
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
      accessorKey: "phone_number",
      header: t("Phone_number"),
    },
    {
      accessorKey: "students",
      header: t("Students"),
      meta: { notClickable: true },
      cell: ({ row }) => {
        const students = row.original.students ?? [];
        if (!students.length) {
          return (
            <span className="text-xs text-muted-foreground">
              {t("noStudents")}
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {students.map((s) => (
              <Link key={s.id} href={`/students/${s.id}`}>
                <Badge variant="secondary">
                  {tName("name", {
                    given_name: s.given_name,
                    family_name: s.family_name,
                  })}
                  {s.student_number ? ` · ${s.student_number}` : ""}
                </Badge>
              </Link>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: t("parentName"),
      cell: ({ row }) =>
        tName("name", {
          given_name: row.original.given_name,
          family_name: row.original.family_name,
        }),
    },
    {
      accessorKey: "email",
      header: t("Email"),
    },
    {
      accessorKey: "last_login_at",
      header: t("loginStatus"),
      meta: { notClickable: true },
      cell: ({ row }) => {
        const lastLoginAt = row.original.last_login_at;
        const arn = row.original.arn;
        // Parent is considered logged in if they have either last_login_at OR arn token
        const isLoggedIn = lastLoginAt || arn;
        return isLoggedIn ? <YesBadge /> : <NoBadge />;
      },
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
                  {tName("name", {
                    given_name: row.original.given_name,
                    family_name: row.original.family_name,
                  })}
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
