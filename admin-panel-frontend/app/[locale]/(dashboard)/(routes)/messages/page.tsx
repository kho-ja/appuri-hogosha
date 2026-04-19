"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import PaginationApi from "@/components/PaginationApi";
import TableApi from "@/components/TableApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ShowScheduledToggle from "@/components/messages/ShowScheduledToggle";

import useApiMutation from "@/lib/useApiMutation";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { normalizeSearch } from "@/lib/normalizeSearch";
import usePagination from "@/lib/usePagination";
import { useListQuery } from "@/lib/useListQuery";

import PostApi from "@/types/postApi";
import ScheduledPost from "@/types/scheduledPost";
import pagination from "@/types/pagination";

type TabKey = "parents" | "students";
type ImportanceFilter = "all" | "high" | "medium" | "low";
type SortOrder = "newest" | "oldest";

type MessageRow = {
  id: number;
  title: string;
  description: string;
  adminName: string;
  importance: string;
  readPercent: number;
  editHref: string;
  date: string | null;
};

function parsePercent(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.max(0, Math.min(100, input));
  }

  if (typeof input !== "string") return 0;
  const numeric = Number(input.replace("%", "").trim());
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function MinimalProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-muted-foreground/40"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {clamped}%
      </span>
    </div>
  );
}

interface ScheduledPostsResponse {
  scheduledPosts: ScheduledPost[];
  pagination: pagination;
}

export default function MessagesPage() {
  const tPosts = useTranslations("posts");
  const tNav = useTranslations("nav");
  const tSend = useTranslations("sendmessage");

  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const initialTab: TabKey = tabParam === "students" ? "students" : "parents";
  const initialShowScheduled = tabParam === "scheduled";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [showScheduled, setShowScheduled] = useState(initialShowScheduled);
  const [importance, setImportance] = useState<ImportanceFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { page, setPage, search, setSearch, perPage } = usePagination({
    persistToUrl: true,
  });

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

  const isScheduledView = showScheduled;

  useEffect(() => {
    // Avoid cross-view selection (e.g. selecting parents then toggling scheduled).
    setSelectedIds([]);
  }, [isScheduledView, tab]);

  const postsQuery = useListQuery<PostApi>(
    "post/list",
    ["posts", page, search, perPage],
    { page, text: search, perPage }
  );

  const scheduledQuery = useListQuery<ScheduledPostsResponse>(
    "schedule/list",
    ["scheduled-posts", page, search, perPage],
    { page, text: search, perPage },
    "GET",
    { enabled: isScheduledView }
  );

  const postRows = useMemo<MessageRow[]>(() => {
    const posts = postsQuery.data?.posts ?? [];

    const filteredByAudience = posts.filter((post) => {
      if (tab === "parents") {
        // Treat group-targeted messages as "Parents".
        return (
          isNonEmptyString(post.group_names) ||
          !isNonEmptyString(post.student_numbers)
        );
      }
      if (tab === "students") {
        // Treat student-targeted messages as "Students".
        return isNonEmptyString(post.student_numbers);
      }
      return true;
    });

    return filteredByAudience.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.description,
      adminName: post.admin
        ? `${post.admin.given_name ?? ""} ${post.admin.family_name ?? ""}`.trim() ||
          "—"
        : "—",
      importance: post.priority,
      readPercent: parsePercent(post.read_percent),
      editHref: `/messages/edit/${post.id}`,
      date: post.sent_at ?? null,
    }));
  }, [postsQuery.data, tab]);

  const scheduledRows = useMemo<MessageRow[]>(() => {
    const scheduledPosts = scheduledQuery.data?.scheduledPosts ?? [];
    return scheduledPosts.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.description,
      adminName: "—",
      importance: post.priority,
      readPercent: 0,
      editHref: `/messages/scheduled-message/edit/${post.id}`,
      date: post.scheduled_at ?? null,
    }));
  }, [scheduledQuery.data]);

  const visibleRows = useMemo<MessageRow[]>(() => {
    const baseRows = isScheduledView ? scheduledRows : postRows;
    let rows = baseRows;

    const query = normalizeSearch(searchInput).toLowerCase();
    if (query) {
      rows = rows.filter((r) => {
        const title = r.title?.toLowerCase() ?? "";
        const description = r.description?.toLowerCase() ?? "";
        return title.includes(query) || description.includes(query);
      });
    }

    if (importance !== "all") {
      rows = rows.filter(
        (r) => String(r.importance).toLowerCase() === importance
      );
    }

    const direction = sortOrder === "newest" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return aTime === bTime ? 0 : aTime > bTime ? direction : -direction;
    });

    return rows;
  }, [
    importance,
    isScheduledView,
    postRows,
    scheduledRows,
    searchInput,
    sortOrder,
  ]);

  const columns = useMemo<ColumnDef<MessageRow>[]>(
    () => [
      {
        id: "select",
        header: () => <span className="sr-only">Select</span>,
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={(checked) => {
              const isChecked = Boolean(checked);
              const id = row.original.id;
              setSelectedIds((prev) => {
                if (isChecked) {
                  return prev.includes(id) ? prev : [...prev, id];
                }
                return prev.filter((x) => x !== id);
              });
            }}
          />
        ),
        meta: { notClickable: true },
      },
      {
        accessorKey: "title",
        header: tPosts("postTitle"),
        cell: ({ row }) => (
          <div
            title={row.original.title}
            className="font-medium truncate max-w-[9rem] sm:max-w-[12rem]"
          >
            {row.original.title}
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: tPosts("Description"),
        cell: ({ row }) => (
          <div
            title={row.original.description}
            className="truncate max-w-[12rem] sm:max-w-[16rem] md:max-w-[20rem] text-muted-foreground"
          >
            {row.original.description}
          </div>
        ),
      },
      {
        accessorKey: "adminName",
        header: tPosts("Admin_name"),
        cell: ({ row }) => (
          <div
            title={row.original.adminName}
            className="truncate max-w-[9rem] text-sm text-foreground"
          >
            {row.original.adminName}
          </div>
        ),
      },
      {
        accessorKey: "importance",
        header: tPosts("Priority"),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="bg-muted/40 text-muted-foreground border-border"
          >
            {(() => {
              const normalized = String(row.original.importance).toLowerCase();
              if (normalized === "high") return tSend("high");
              if (normalized === "medium") return tSend("medium");
              if (normalized === "low") return tSend("low");
              return row.original.importance
                ? String(row.original.importance)
                : "—";
            })()}
          </Badge>
        ),
      },
      {
        accessorKey: "readPercent",
        header: tPosts("Read_percent"),
        cell: ({ row }) => <MinimalProgress value={row.original.readPercent} />,
      },
      {
        id: "actions",
        header: "",
        meta: { notClickable: true },
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" asChild>
            <Link href={row.original.editHref} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
        ),
      },
    ],
    [selectedIds, tPosts, tSend]
  );

  const queryClient = useQueryClient();
  const deletePostsMutation = useApiMutation<
    { message: string; deletedCount: number },
    { postIds: number[] }
  >("post/delete-multiple", "POST", ["delete-posts"], {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setSelectedIds([]);
    },
  });

  const deleteScheduledMutation = useApiMutation<
    { message: string; deletedCount: number },
    { ids: number[] }
  >("schedule/delete-multiple", "POST", ["delete-scheduled"], {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      setSelectedIds([]);
    },
  });

  const isDeleting =
    (isScheduledView && deleteScheduledMutation.isPending) ||
    (!isScheduledView && deletePostsMutation.isPending);

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (isScheduledView) {
      deleteScheduledMutation.mutate({ ids: selectedIds });
    } else {
      deletePostsMutation.mutate({ postIds: selectedIds });
    }
  };

  const isLoading = isScheduledView
    ? scheduledQuery.isLoading
    : postsQuery.isLoading;
  const tableData: MessageRow[] | null = isLoading ? null : visibleRows;
  const paginationData = isScheduledView
    ? (scheduledQuery.data?.pagination ?? null)
    : (postsQuery.data?.pagination ?? null);

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tNav("messages")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/messages/create">+ {tPosts("createpost")}</Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabKey);
          setPage(1);
        }}
      >
        <TabsList className="w-full justify-start gap-4 bg-transparent p-0 h-auto rounded-none border-b border-border">
          <TabsTrigger
            value="parents"
            className="rounded-none bg-transparent px-1 py-2 border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {tNav("parents")}
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="rounded-none bg-transparent px-1 py-2 border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {tNav("students")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center pb-3">
            <div className="w-full md:flex-1 md:min-w-[260px]">
              <Input
                placeholder={tPosts("filter")}
                value={searchInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchInput(next);
                  commitSearch(next);
                }}
              />
            </div>

            <Select
              value={importance}
              onValueChange={(value) => {
                setImportance(value as ImportanceFilter);
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={tPosts("Priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tPosts("all")}</SelectItem>
                <SelectItem value="high">{tSend("high")}</SelectItem>
                <SelectItem value="medium">{tSend("medium")}</SelectItem>
                <SelectItem value="low">{tSend("low")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as SortOrder)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={tPosts("sortByDate")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{tPosts("newest")}</SelectItem>
                <SelectItem value="oldest">{tPosts("oldest")}</SelectItem>
              </SelectContent>
            </Select>

            <ShowScheduledToggle
              checked={showScheduled}
              onCheckedChange={(checked: boolean) => {
                setShowScheduled(checked);
                setPage(1);
              }}
              label={tPosts("showScheduled")}
              className="w-full md:w-[200px]"
            />

            <Button
              variant={hasSelection ? "destructive" : "secondary"}
              disabled={!hasSelection || isDeleting}
              onClick={handleDeleteSelected}
              isLoading={isDeleting}
              className="w-full md:w-[180px]"
            >
              {tPosts("deleteSelected")}
            </Button>
          </div>

          <Card className="shadow-none rounded-md">
            <TableApi
              data={tableData}
              columns={columns}
              tableClassName="table-fixed [&_th]:px-3 [&_td]:px-3 [&_th:nth-child(1)]:w-12 [&_td:nth-child(1)]:w-12 [&_th:nth-child(5)]:w-28 [&_td:nth-child(5)]:w-28 [&_th:nth-child(6)]:w-40 [&_td:nth-child(6)]:w-40 [&_th:nth-child(7)]:w-14 [&_td:nth-child(7)]:w-14"
            />
          </Card>

          <div className="pt-2">
            <PaginationApi data={paginationData} setPage={setPage} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
