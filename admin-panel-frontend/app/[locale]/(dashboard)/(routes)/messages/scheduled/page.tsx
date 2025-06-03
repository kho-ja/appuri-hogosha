"use client";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
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
import Post from "@/types/post";

export default function ScheduledMessagesPage() {
  const t = useTranslations("posts");
  const tName = useTranslations("names");
  const { page, setPage, search, setSearch } = useTableQuery();
  const { data } = useApiQuery<any>(
    `post/schedule/list?page=${page}&text=${search}`,
    ["scheduledPosts", page, search]
  );

  const queryClient = useQueryClient();
  const [postId, setPostId] = useState<number | null>(null);
  const { mutate } = useApiMutation<{ message: string }>(
    `post/schedule/${postId}`,
    "DELETE",
    ["scheduledPosts"],
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
    },
    {
      accessorKey: "description",
      header: t("Description"),
    },
    {
      accessorKey: "priority",
      header: t("Priority"),
    },
    {
        accessorKey: "scheduled_at",
        header: t("Scheduled At"),
        cell: ({ row }) => {
            const value = row.getValue("scheduled_at");
            return value ? new Date(value as string).toLocaleString() : "-";
        }
    },

    {
      header: t("action"),
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
      <PageHeader title={t("scheduledMessages")} variant="list">
        <Link href={`/messages/create`}>
          <Button>{t("createpost")}</Button>
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

      <Card>
        <TableApi
        linkPrefix="/messages"
        data={data?.scheduledPosts ?? []}
        columns={postColumns}
        />

      </Card>
    </div>
  );
}
