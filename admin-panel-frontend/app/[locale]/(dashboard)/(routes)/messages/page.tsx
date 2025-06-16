"use client";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3, Trash2, Plus } from "lucide-react";
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
import useTableQuery from "@/lib/useTableQuery";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";

export default function Info() {
  const t = useTranslations("posts");
  const tName = useTranslations("names");
  const { page, setPage, search, setSearch } = useTableQuery();
  const { data } = useApiQuery<PostApi>(`post/list?page=${page}&text=${search}`, ["posts", page, search]);
  const { data: scheduledPosts } = useApiQuery<any>(`post/schedule/list?page=${page}&text=${search}`, ["scheduledPosts", page, search]);

  const queryClient = useQueryClient();
  const [postId, setPostId] = useState<number | null>(null);
  const { mutate: deletePost } = useApiMutation<{ message: string }>(`post/${postId}`, "DELETE", ["deletePost"], {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        toast({
          title: t("postDeleted"),
          description: t(data?.message),
        });
      },
  });

  const { mutate: deleteScheduledPost } = useApiMutation<{ message: string }>(
    `post/schedule/${postId}`,
    "DELETE",
    ["deleteScheduledPost"],
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
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
      meta: { notClickable: true },
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
                <DialogDescription>{row.getValue("description")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  onClick={() => {
                    setPostId(row.original.id);
                    deletePost();
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

  const schedulesPostColumns: ColumnDef<Post>[] = [
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
      accessorKey: "scheduled_at",
      header: t("scheduledat"),
      cell: ({ row }) => {
        const value = row.getValue("scheduled_at");
        if (!value) return "-";
        return handleDate(value as string);
      },
    },
    {
      header: t("action"),
      meta: { notClickable: true },
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/messages/scheduled-message/edit/${row.original.id}`}>
            <Edit3 />
          </Link>
          <Dialog>
            <DialogTrigger className="w-full">
              <Trash2 className="text-red-500" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{row.getValue("title")}</DialogTitle>
                <DialogDescription>{row.getValue("description")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  onClick={() => {
                    setPostId(row.original.id);
                    deleteScheduledPost();
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

  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "messages" | "scheduled") || "messages";
  const [tab, setTab] = useState<"messages" | "scheduled">(initialTab);

  const handleDate = (date: string) => {
    const localDate = new Date(date);
    const offset = localDate.getTimezoneOffset() * 60000;
    const localTime = new Date(localDate.getTime() - offset);

    const y = localTime.getFullYear();
    const m = String(localTime.getMonth() + 1).padStart(2, "0");
    const d = String(localTime.getDate()).padStart(2, "0");
    const h = String(localTime.getHours()).padStart(2, "0");
    const min = String(localTime.getMinutes()).padStart(2, "0");

    return `${y}-${m}-${d} ${h}:${min}`;
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader title={t("posts")} variant="list">
        <div className="min-w-[180px] max-w-xs ml-auto flex justify-end">
          <Link href={`/messages/create`}>
            <Button icon={<Plus className="h-5 w-5" />}>{t("createpost")}</Button>
          </Link>
        </div>
      </PageHeader>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "messages" | "scheduled")}>
        <TabsList className="mx-auto mb-4 w-fit flex justify-center">
          <TabsTrigger value="messages">{t("messages")}</TabsTrigger>
          <TabsTrigger value="scheduled">{t("scheduledMessages")}</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
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
            <div>
              <PaginationApi data={data?.pagination ?? null} setPage={setPage} />
            </div>
          </div>
          <Card x-chunk="dashboard-05-chunk-3">
            <TableApi linkPrefix="/messages" data={data?.posts ?? null} columns={postColumns} />
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
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
            <div>
              <PaginationApi data={scheduledPosts?.pagination ?? null} setPage={setPage} />
            </div>
          </div>
          <Card x-chunk="dashboard-05-chunk-3">
            <TableApi linkPrefix="/messages/scheduled-message/" data={scheduledPosts?.scheduledPosts ?? null} columns={schedulesPostColumns} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
