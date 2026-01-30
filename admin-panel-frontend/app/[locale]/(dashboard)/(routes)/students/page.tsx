"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit3, File, Trash2Icon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Student from "@/types/student";
import StudentApi from "@/types/studentApi";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import { Link } from "@/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";
import { Plus } from "lucide-react";
import usePagination from "@/lib/usePagination";
import PageHeader from "@/components/PageHeader";
import { useListQuery } from "@/lib/useListQuery";

export default function Students() {
  const t = useTranslations("students");
  const tName = useTranslations("names");
  const { page, setPage, search, setSearch, filter, setFilter } = usePagination(
    {
      persistToUrl: true,
      defaultFilter: "all",
    }
  );
  const filterBy = filter || "all";
  const { data: studentData } = useListQuery<StudentApi>(
    "student/list",
    ["students", page, search, filterBy],
    { page, filterBy, filterValue: search },
    "POST"
  );
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<number | null>(null);
  const { mutate } = useApiMutation<{ message: string }>(
    `student/${studentId}`,
    "DELETE",
    ["deleteStudent"],
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["students"] });
        toast({
          title: t("studentDeleted"),
          description: t(data.message),
        });
      },
    }
  );
  const { mutate: exportStudents } = useFileMutation<{ message: string }>(
    `student/export`,
    ["exportStudents"]
  );

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => tName("name", { ...row?.original, parents: "" }),
    },
    {
      accessorKey: "email",
      header: t("email"),
    },
    {
      accessorKey: "student_number",
      header: t("studentId"),
    },
    {
      accessorKey: "cohort",
      header: t("cohort"),
      cell: ({ row }) => {
        const cohort = row.getValue("cohort") as number | undefined;
        return cohort !== null && cohort !== undefined ? cohort : "-";
      },
    },
    {
      accessorKey: "phone_number",
      header: t("phoneNumber"),
    },
    {
      header: t("action"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/students/edit/${row.original.id}`}>
            <Edit3 />
          </Link>
          <Dialog>
            <DialogTrigger>
              <Trash2Icon className="text-red-500" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {tName("name", { ...row?.original, parents: "" })}
                </DialogTitle>
                <DialogDescription>{row.original.email}</DialogDescription>
              </DialogHeader>
              <div>{t("DouYouDeleteStudent")}</div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    setStudentId(row.original.id);
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
    <div className="space-y-4">
      <PageHeader title={t("students")} variant="list">
        <Link href={`/students/create`}>
          <Button icon={<Plus className="h-5 w-5" />}>
            {t("createstudent")}
          </Button>
        </Link>
      </PageHeader>
      <div className="flex flex-col sm:flex-row justify-between w-full gap-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:max-w-xl w-full">
          <Select value={filterBy} onValueChange={(value) => setFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("filterBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              <SelectItem value="student_number">{t("studentId")}</SelectItem>
              <SelectItem value="cohort">{t("cohort")}</SelectItem>
              <SelectItem value="email">{t("email")}</SelectItem>
              <SelectItem value="phone_number">{t("phoneNumber")}</SelectItem>
              <SelectItem value="given_name">{t("givenName")}</SelectItem>
              <SelectItem value="family_name">{t("familyName")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={t("filterPlaceholder")}
            value={search}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1"
          />
        </div>
        <div>
          <PaginationApi
            data={studentData?.pagination ?? null}
            setPage={setPage}
          />
        </div>
      </div>
      <div className="space-y-2 align-left">
        <div className="flex justify-end items-center">
          <Button
            onClick={() => exportStudents()}
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-sm"
          >
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">{t("export")}</span>
          </Button>
        </div>
        <Card>
          <TableApi
            linkPrefix={`/students`}
            data={studentData?.students ?? null}
            columns={columns}
          />
        </Card>
      </div>
    </div>
  );
}
