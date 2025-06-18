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
import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import useTableQuery from "@/lib/useTableQuery";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

export default function Info() {
  const t = useTranslations("posts");
  const tName = useTranslations("names");
  const {
    page,
    setPage,
    search,
    setSearch,
    perPage,
    selectedPosts,
    setSelectedPosts,
    allSelectedIds,
    handlePerPageChange,
  } = useTableQuery();

  const queryClient = useQueryClient();
  const { data } = useApiQuery<PostApi>(
    `post/list?page=${page}&text=${search}&perPage=${perPage}`,
    ["posts", page, search, perPage]
  );
  const { data: scheduledPosts } = useApiQuery<any>(
    `schedule/list?page=${page}&text=${search}`,
    ["scheduledPosts", page, search]
  );

  const [postId, setPostId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { mutate: deletePost } = useApiMutation<{ message: string }>(
    `post/${postId}`,
    "DELETE",
    ["deletePost"],
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        toast({
          title: t("postDeleted"),
          description: t(data?.message || "Post deleted successfully"),
        });
      },
    }
  );

  const deleteMultiple = useApiMutation<
    { message: string; deletedCount: number },
    { ids: number[] }
  >(`post/delete-multiple`, "POST", ["posts"], {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        title: t("postDeleted"),
        description: `${data.deletedCount} posts deleted`,
      });
      setSelectedPosts([]);
      setIsDialogOpen(false);
    },
  });

  const { mutate: deleteScheduledPost } = useApiMutation<{ message: string }>(
    `schedule/${postId}`,
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

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setSelectedPosts((prev) =>
      checked ? [...prev, id] : prev.filter((pid) => pid !== id)
    );
  };

  const handleSelectAllChange = (checked: boolean) => {
    const allIds = data?.posts?.map((post) => post.id) || [];
    setSelectedPosts((prev) =>
      checked
        ? Array.from(new Set([...prev, ...allIds]))
        : prev.filter((id) => !allIds.includes(id))
    );
  };

  const isAllSelected = () => {
    const currentPagePosts = data?.posts?.map((post) => post.id) || [];
    return (
      currentPagePosts.length > 0 &&
      currentPagePosts.every((id) => selectedPosts.includes(id))
    );
  };

  const isIndeterminate = () => {
    const currentPagePosts = data?.posts?.map((post) => post.id) || [];
    const selectedCount = currentPagePosts.filter((id) =>
      selectedPosts.includes(id)
    ).length;
    return selectedCount > 0 && selectedCount < currentPagePosts.length;
  };

  const postColumns: ColumnDef<Post>[] = [
    {
      accessorKey: "select",
      header: () => {
        const checkboxRef = useRef<HTMLButtonElement>(null);

        useEffect(() => {
          if (checkboxRef.current) {
            const input = checkboxRef.current.querySelector("input");
            if (input) {
              input.indeterminate = isIndeterminate();
            }
          }
        }, [data, selectedPosts, page]);

        return (
          <Checkbox
            ref={checkboxRef}
            checked={isAllSelected()}
            onCheckedChange={(checked) =>
              handleSelectAllChange(Boolean(checked))
            }
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={selectedPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChange(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: {
        notClickable: true,
      },
    },
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
        <Link href={`/messages/edit/${row.original.id}`}>
          <Edit3 />
        </Link>
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
                <DialogDescription>
                  {row.getValue("description")}
                </DialogDescription>
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

  const searchParams = useSearchParams();
  const initialTab =
    (searchParams.get("tab") as "messages" | "scheduled") || "messages";
  const [tab, setTab] = useState<"messages" | "scheduled">(initialTab);

  return (
    <div className="w-full space-y-4">
      <PageHeader title={t("posts")} variant="list">
        <div className="flex gap-2">
          <Button
            icon={<Trash2 className="h-5 w-5" />}
            variant="destructive"
            disabled={allSelectedIds.length === 0}
            onClick={() => setIsDialogOpen(true)}
          >
            {t("delete")} ({allSelectedIds.length})
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
                <DialogDescription>{t("confirmDeleteDesc")}</DialogDescription>
              </DialogHeader>
              <div className="max-h-48 overflow-auto border rounded p-2 my-4">
                {data?.posts
                  ?.filter((post) => allSelectedIds.includes(post.id))
                  .map((post) => (
                    <div
                      key={post.id}
                      className="py-1 border-b last:border-b-0 flex justify-between"
                    >
                      <span>{post.title}</span>
                      <Trash2 className="inline-block mr-2 text-red-600" />
                    </div>
                  ))}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => deleteMultiple.mutate({ ids: allSelectedIds })}
                >
                  {t("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Link href={`/messages/create`} passHref>
            <Button icon={<Plus className="h-5 w-5" />}>
              {t("createpost")}
            </Button>
          </Link>
        </div>
      </PageHeader>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "messages" | "scheduled")}
      >
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
              <PaginationApi
                data={data?.pagination ?? null}
                setPage={setPage}
              />
            </div>
          </div>
          <Card x-chunk="dashboard-05-chunk-3">
            <TableApi
              linkPrefix="/messages"
              data={data?.posts ?? null}
              columns={postColumns}
            />
          </Card>
          <div className="flex items-center gap-2 mt-2">
            <span>{t("postsPerPage") || "Posts per page:"}</span>
            <Select
              onValueChange={(value) => handlePerPageChange(Number(value))}
              value={perPage.toString()}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue
                  placeholder={t("choosePostsPerPage") || "Choose"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {[10, 30, 50, 100].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
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
              <PaginationApi
                data={scheduledPosts?.pagination ?? null}
                setPage={setPage}
              />
            </div>
          </div>
          <Card x-chunk="dashboard-05-chunk-3">
            <TableApi
              linkPrefix="/messages/scheduled-message/"
              data={scheduledPosts?.scheduledPosts ?? null}
              columns={schedulesPostColumns}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
