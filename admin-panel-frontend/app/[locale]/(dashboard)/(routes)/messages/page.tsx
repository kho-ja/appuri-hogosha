"use client";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import PostApi from "@/types/postApi";
import Post from "@/types/post";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import { Plus } from "lucide-react";
import useTableQuery from "@/lib/useTableQuery";
import PageHeader from "@/components/PageHeader";

export default function Info() {
  const t = useTranslations("posts");
  const tName = useTranslations("names");
  const { page, setPage, search, setSearch } = useTableQuery();
  const { data } = useApiQuery<PostApi>(
    `post/list?page=${page}&text=${search}`,
    ["posts", page, search]
  );
  const queryClient = useQueryClient();
  const [postId, setPostId] = useState<number | null>(null);
  const { mutate } = useApiMutation<{ message: string }>(
    `post/${postId}`,
    "DELETE",
    ["deletePost"],
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        toast({
          title: t("postDeleted"),
          description: t(data?.message),
        });
      },
    }
  );

  const postColumns: ColumnDef<Post>[] = [
    {
      accessorKey: "title",
      header: t("postTitle"),
      cell: ({ row }) => (
        <div
          title={row.original.title}
          className="truncate max-w-20 sm:max-w-30 md:max-w-40 lg:max-w-60 xl:max-w-60 2xl:max-w-80 block"
        >
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => (
        <div
          title={row.original.description}
          className="truncate max-w-32 sm:max-w-40 md:max-w-50 lg:max-w-60 xl:max-w-70 2xl:max-w-2xl block"
        >
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "admin_name",
      header: t("Admin_name"),
      cell: ({ row }) => tName("name", { ...row?.original?.admin }),
    },
    {
      accessorKey: "priority",
      header: t("Priority"),
    },
    {
      accessorKey: "read_percent",
      header: t("Read_percent"),
    },
    {
      header: t("action"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/messages/edit/${row.original.id}`}>
            <Edit3 />
          </Link>
          <Dialog>
            <DialogTrigger className="w-full">
              <Trash2 className="text-red-500" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{row.getValue("title")}</DialogTitle>
                <DialogDescription>
                  {row.getValue("description")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>{t("doYouDeleteMessage")}</p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  onClick={() => {
                    setPostId(row.original.id);
                    mutate();
                  }}
                >
                  {t("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-4">
      <PageHeader title={t("posts")} variant="list">
        <Link href={`/messages/create`} passHref>
          <Button icon={<Plus className="h-5 w-5" />}>{t("createpost")}</Button>
        </Link>
      </PageHeader>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
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
        <div className="">
          <PaginationApi data={data?.pagination ?? null} setPage={setPage} />
        </div>
      </div>
      <Card x-chunk="dashboard-05-chunk-3">
        <TableApi
          linkPrefix="/messages"
          data={data?.posts ?? null}
          columns={postColumns}
        />
      </Card>
    </div>
  );
}
