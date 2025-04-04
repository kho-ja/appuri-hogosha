"use client";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3Icon, File, Trash2Icon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import { Link, usePathname, useRouter } from "@/navigation";
import { Button } from "@/components/ui/button";
import ParentApi from "@/types/parentApi";
import Parent from "@/types/parent";
import { useSearchParams } from "next/navigation";
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
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";

export default function Info() {
  const t = useTranslations("parents");
  const tName = useTranslations("names");
  const searchParams = useSearchParams();
  const pageFromUrl = Number(searchParams.get("page")) || 1;
  const searchFromUrl = searchParams.get("search") || "";
  const [page, setPage] = useState(pageFromUrl);
  const [search, setSearch] = useState(searchFromUrl);
  const { data } = useApiQuery<ParentApi>(
    `parent/list?page=${page}&name=${search}`,
    ["parents", page, search]
  );
  const pathName = usePathname();
  const router = useRouter();
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
          description: data?.message,
        });
      },
    }
  );

  useEffect(() => {
    const params = new URLSearchParams();

    params.set("page", page.toString());
    params.set("search", search);

    router.replace(`${pathName}?${params.toString()}`, { scroll: false });
  }, [page, search, pathName, router]);

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
          <Link href={`${pathName}/${row.original.id}`}>
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
        <div className="w-full flex justify-between">
          <h1 className="text-3xl w-2/4 font-bold">{t("parents")}</h1>
          <Link href={`${pathName}/create`}>
            <Button>{t("createparent")}</Button>
          </Link>
        </div>
        <div className="flex justify-between">
          <Input
            placeholder={t("filter")}
            value={search}
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
