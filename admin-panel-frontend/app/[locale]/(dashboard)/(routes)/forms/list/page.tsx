"use client";

import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { EllipsisVertical } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Link, useRouter } from "@/navigation";
import FormApi from "@/types/formApi";
import Form from "@/types/form";
import {
  SelectContent,
  SelectTrigger,
  Select,
  SelectItem,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import TableApi from "@/components/TableApi";
import { useState } from "react";
import useApiQuery from "@/lib/useApiQuery";

export default function Forms() {
  const t = useTranslations("forms");
  const tName = useTranslations("names");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { data: formData } = useApiQuery<FormApi>(
    `form/list?page=${page}&status=${status}&reason=${reason}`,
    ["forms", page, status, reason]
  );

  const columns: ColumnDef<Form>[] = [
    {
      accessorKey: "parent_name",
      header: t("parent_name"),
      cell: ({ row }) => tName("name", { ...row?.original?.parent } as any),
    },
    {
      accessorKey: "student_name",
      header: t("student_name"),
      cell: ({ row }) =>
        tName("name", { ...row?.original?.student, parents: "" }),
    },
    {
      accessorKey: "reason",
      header: t("reason"),
    },
    {
      accessorKey: "status",
      header: t("status"),
    },
    {
      accessorKey: "date",
      header: t("date"),
    },
    {
      accessorKey: "sent_at",
      header: t("sent_at"),
    },
    {
      header: t("action"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger>
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => router.replace(`${row.original.id}`)}
            >
              {t("view")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="w-full flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("forms")}</h1>
        <Link href={`/forms`}>
          <Button variant={"secondary"}>{t("back")}</Button>
        </Link>
      </div>
      <div className="flex flex-wrap justify-between w-full gap-2">
        <Select defaultValue={status} onValueChange={setStatus}>
          <SelectTrigger className="max-w-48">
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("status")}</SelectLabel>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="wait">{t("wait")}</SelectItem>
              <SelectItem value="accept">{t("accept")}</SelectItem>
              <SelectItem value="reject">{t("reject")}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select defaultValue={reason} onValueChange={setReason}>
          <SelectTrigger className="max-w-48">
            <SelectValue placeholder={t("reason")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("reason")}</SelectLabel>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="absence">{t("absence")}</SelectItem>
              <SelectItem value="lateness">{t("lateness")}</SelectItem>
              <SelectItem value="leaving early">
                {t("leaving early")}
              </SelectItem>
              <SelectItem value="other">{t("other")}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div>
          <PaginationApi
            data={formData?.pagination ?? null}
            setPage={setPage}
          />
        </div>
      </div>
      <Card x-chunk="dashboard-05-chunk-3">
        <TableApi
          linkPrefix="/form"
          data={formData?.forms ?? null}
          columns={columns}
        />
      </Card>
    </div>
  );
}
