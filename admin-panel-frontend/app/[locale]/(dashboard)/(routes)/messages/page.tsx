"use client";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Edit3, Trash2, Plus, CalendarClock } from "lucide-react";
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
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import usePagination from "@/lib/usePagination";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { normalizeSearch } from "@/lib/normalizeSearch";
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
import ScheduledPost from "@/types/scheduledPost";
import pagination from "@/types/pagination";
import useDateFormatter from "@/lib/useDateFormatter";
import { useListQuery } from "@/lib/useListQuery";
import { Label } from "@/components/ui/label";

// Audience tab type: "parents" | "students"
type AudienceTab = "parents" | "students";

export default function Info() {
  const t = useTranslations("posts");
  const tName = useTranslations("names");
  const tPriority = useTranslations("ThisMessage.Priority");
  const { formatDateTime } = useDateFormatter();
  const { page, setPage, search, setSearch, perPage, handlePerPageChange } =
    usePagination({ persistToUrl: true });

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const { debounced: commitSearch } = useDebouncedCallback(
    (nextValue: string) => {
      setSearch(normalizeSearch(nextValue));
      setPage(1);
    },
    300
  );

  const searchParams = useSearchParams();
  const audienceParam = searchParams?.get("audience");
  const initialAudience: AudienceTab =
    audienceParam === "students" ? "students" : "parents";

  // Audience tab: parents | students
  const [audienceTab, setAudienceTab] = useState<AudienceTab>(initialAudience);

  // Scheduled checkbox toggle
  const [showScheduled, setShowScheduled] = useState(false);

  // Selected items
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [selectedScheduledPosts, setSelectedScheduledPosts] = useState<
    number[]
  >([]);

  const queryClient = useQueryClient();

  // Main posts list — pass audienceTab as a filter param
  const { data } = useListQuery<PostApi>(
    "post/list",
    ["posts", page, search, perPage, audienceTab],
    { page, text: search, perPage, audience: audienceTab }
  );

  interface ScheduledPostsResponse {
    scheduledPosts: ScheduledPost[];
    pagination: pagination;
  }

  // Scheduled posts — only fetch when checkbox is checked
  const { data: scheduledPosts } = useListQuery<ScheduledPostsResponse>(
    "schedule/list",
    ["schedule", page, search, perPage, audienceTab],
    { page, text: search, perPage, audience: audienceTab },
    "GET",
    { enabled: showScheduled }
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const deleteMultiple = useApiMutation<
    { message: string; deletedCount: number },
    { postIds: number[] }
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

  const deleteMultipleScheduled = useApiMutation<
    { message: string; deletedCount: number },
    { ids: number[] }
  >(`schedule/delete-multiple`, "POST", ["scheduledPosts"], {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
      toast({
        title: t("postDeleted"),
        description: `${data.deletedCount} scheduled posts deleted`,
      });
      setSelectedScheduledPosts([]);
      setIsDialogOpen(false);
    },
  });

  // ── Checkbox helpers ────────────────────────────────────────────────────────

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setSelectedPosts((prev) =>
      checked ? [...prev, id] : prev.filter((pid) => pid !== id)
    );
  };

  const handleCheckboxChangeScheduled = (id: number, checked: boolean) => {
    setSelectedScheduledPosts((prev) =>
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

  const handleSelectAllChangeScheduled = (checked: boolean) => {
    const allIds =
      scheduledPosts?.scheduledPosts?.map((post: ScheduledPost) => post.id) ||
      [];
    setSelectedScheduledPosts((prev) =>
      checked
        ? Array.from(new Set([...prev, ...allIds]))
        : prev.filter((id) => !allIds.includes(id))
    );
  };

  const isAllSelected = () => {
    const ids = data?.posts?.map((p) => p.id) || [];
    return ids.length > 0 && ids.every((id) => selectedPosts.includes(id));
  };

  const isAllSelectedScheduled = () => {
    const ids =
      scheduledPosts?.scheduledPosts?.map((p: ScheduledPost) => p.id) || [];
    return (
      ids.length > 0 &&
      ids.every((id: number) => selectedScheduledPosts.includes(id))
    );
  };

  // ── Active selection count for the delete button ────────────────────────────
  const activeSelectedCount = showScheduled
    ? selectedScheduledPosts.length
    : selectedPosts.length;

  // ── Column definitions ───────────────────────────────────────────────────────

  const parentPostColumns: ColumnDef<Post>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelected()}
          onCheckedChange={(checked) => handleSelectAllChange(Boolean(checked))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChange(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
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
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
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

  const studentPostColumns: ColumnDef<Post>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelected()}
          onCheckedChange={(checked) => handleSelectAllChange(Boolean(checked))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChange(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
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
      accessorKey: "priority",
      header: t("Priority"),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
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

  const parentSchedulesPostColumns: ColumnDef<ScheduledPost>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelectedScheduled()}
          onCheckedChange={(checked) =>
            handleSelectAllChangeScheduled(Boolean(checked))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedScheduledPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChangeScheduled(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
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
      accessorKey: "priority",
      header: t("Priority"),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
    },
    {
      accessorKey: "scheduled_at",
      header: t("scheduledat"),
      cell: ({ row }) => {
        const value = row.getValue("scheduled_at");
        if (!value) return "-";
        return formatDateTime(value as string);
      },
    },
    {
      header: t("action"),
      meta: { notClickable: true },
      cell: ({ row }) => (
        <Link href={`/messages/scheduled-message/edit/${row.original.id}`}>
          <Edit3 />
        </Link>
      ),
    },
  ];

  const studentSchedulesPostColumns: ColumnDef<ScheduledPost>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelectedScheduled()}
          onCheckedChange={(checked) =>
            handleSelectAllChangeScheduled(Boolean(checked))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedScheduledPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChangeScheduled(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
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
      accessorKey: "priority",
      header: t("Priority"),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
    },
    {
      accessorKey: "scheduled_at",
      header: t("scheduledat"),
      cell: ({ row }) => {
        const value = row.getValue("scheduled_at");
        if (!value) return "-";
        return formatDateTime(value as string);
      },
    },
    {
      header: t("action"),
      meta: { notClickable: true },
      cell: ({ row }) => (
        <Link href={`/messages/scheduled-message/edit/${row.original.id}`}>
          <Edit3 />
        </Link>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-4">
      {/* ── Header ── */}
      <PageHeader title={t("posts")} variant="list">
        <div className="flex gap-2">
          <Button
            icon={<Trash2 className="h-5 w-5" />}
            variant="destructive"
            disabled={activeSelectedCount === 0}
            onClick={() => setIsDialogOpen(true)}
          >
            {t("delete")} ({activeSelectedCount})
          </Button>

          {/* Delete confirmation dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
                <DialogDescription>{t("confirmDeleteDesc")}</DialogDescription>
              </DialogHeader>
              <div className="max-h-48 overflow-auto border rounded p-2 my-4">
                {(() => {
                  const list = showScheduled
                    ? (scheduledPosts?.scheduledPosts ?? [])
                    : (data?.posts ?? []);
                  const selectedIds = showScheduled
                    ? selectedScheduledPosts
                    : selectedPosts;
                  return list
                    .filter((post) => selectedIds.includes(post.id))
                    .map((post) => (
                      <div
                        key={post.id}
                        className="py-1 border-b last:border-b-0 flex justify-between"
                      >
                        <span>{post.title}</span>
                        <Trash2 className="inline-block mr-2 text-red-600" />
                      </div>
                    ));
                })()}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{t("cancel")}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (showScheduled) {
                      deleteMultipleScheduled.mutate({
                        ids: selectedScheduledPosts,
                      });
                    } else {
                      deleteMultiple.mutate({ postIds: selectedPosts });
                    }
                  }}
                >
                  {t("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Link href={`/messages/create?audience=${audienceTab}`} passHref>
            <Button icon={<Plus className="h-5 w-5" />}>
              {t("createpost")}
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* ── Audience Tabs: Parents | Students ── */}
      <Tabs
        value={audienceTab}
        onValueChange={(v) => {
          setAudienceTab(v as AudienceTab);
          setSelectedPosts([]);
          setSelectedScheduledPosts([]);
          setPage(1);
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <TabsList className="w-fit">
            <TabsTrigger value="parents">{t("parents")}</TabsTrigger>
            <TabsTrigger value="students">{t("students")}</TabsTrigger>
          </TabsList>

          {/* Scheduled checkbox — sits next to the tabs, minimal */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Checkbox
              id="show-scheduled"
              checked={showScheduled}
              onCheckedChange={(checked) => {
                setShowScheduled(Boolean(checked));
                setSelectedPosts([]);
                setSelectedScheduledPosts([]);
                setPage(1);
              }}
            />
            <CalendarClock className="h-4 w-4" />
            <Label
              htmlFor="show-scheduled"
              className="cursor-pointer font-normal"
            >
              {t("scheduledMessages")}
            </Label>
          </label>
        </div>

        {/* ── Parents tab content ── */}
        <TabsContent value="parents">
          <MessagesContent
            t={t}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            commitSearch={commitSearch}
            data={showScheduled ? null : data}
            scheduledPosts={showScheduled ? scheduledPosts : null}
            showScheduled={showScheduled}
            postColumns={parentPostColumns}
            schedulesPostColumns={parentSchedulesPostColumns}
            page={page}
            setPage={setPage}
            perPage={perPage}
            handlePerPageChange={handlePerPageChange}
            linkPrefix="/messages"
            scheduledLinkPrefix="/messages/scheduled-message/"
          />
        </TabsContent>

        {/* ── Students tab content ── */}
        <TabsContent value="students">
          <MessagesContent
            t={t}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            commitSearch={commitSearch}
            data={showScheduled ? null : data}
            scheduledPosts={showScheduled ? scheduledPosts : null}
            showScheduled={showScheduled}
            postColumns={studentPostColumns}
            schedulesPostColumns={studentSchedulesPostColumns}
            page={page}
            setPage={setPage}
            perPage={perPage}
            handlePerPageChange={handlePerPageChange}
            linkPrefix="/messages"
            scheduledLinkPrefix="/messages/scheduled-message/"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Shared table + pagination layout ─────────────────────────────────────────

interface MessagesContentProps {
  t: ReturnType<typeof useTranslations>;
  searchInput: string;
  setSearchInput: (v: string) => void;
  commitSearch: (v: string) => void;
  data: PostApi | null | undefined;
  scheduledPosts:
    | { scheduledPosts: ScheduledPost[]; pagination: any }
    | null
    | undefined;
  showScheduled: boolean;
  postColumns: ColumnDef<Post>[];
  schedulesPostColumns: ColumnDef<ScheduledPost>[];
  page: number;
  setPage: (p: number) => void;
  perPage: number;
  handlePerPageChange: (n: number) => void;
  linkPrefix: string;
  scheduledLinkPrefix: string;
}

function MessagesContent({
  t,
  searchInput,
  setSearchInput,
  commitSearch,
  data,
  scheduledPosts,
  showScheduled,
  postColumns,
  schedulesPostColumns,
  page,
  setPage,
  perPage,
  handlePerPageChange,
  linkPrefix,
  scheduledLinkPrefix,
}: MessagesContentProps) {
  const paginationData = showScheduled
    ? (scheduledPosts?.pagination ?? null)
    : (data?.pagination ?? null);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2 mb-2">
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder={t("filter")}
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const next = e.target.value;
              setSearchInput(next);
              commitSearch(next);
            }}
            className="w-full"
          />
        </div>
        <div>
          <PaginationApi data={paginationData} setPage={setPage} />
        </div>
      </div>

      <Card x-chunk="dashboard-05-chunk-3">
        {showScheduled ? (
          <TableApi
            linkPrefix={scheduledLinkPrefix}
            data={scheduledPosts?.scheduledPosts ?? null}
            columns={schedulesPostColumns}
          />
        ) : (
          <TableApi
            linkPrefix={linkPrefix}
            data={data?.posts ?? null}
            columns={postColumns}
          />
        )}
      </Card>

      {/* Per-page selector — only show for regular messages */}
      {!showScheduled && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">
            {t("postsPerPage") || "Posts per page:"}
          </span>
          <Select
            onValueChange={(value) => handlePerPageChange(Number(value))}
            value={perPage.toString()}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder={t("choosePostsPerPage") || "Choose"} />
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
      )}
    </>
  );
}
