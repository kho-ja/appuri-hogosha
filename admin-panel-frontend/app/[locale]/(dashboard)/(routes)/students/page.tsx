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
import { Link, usePathname, useRouter } from "@/navigation";
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
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import useFileMutation from "@/lib/useFileMutation";

export default function Students() {
  const t = useTranslations("students");
  const tName = useTranslations("names");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { data: studentData } = useApiQuery<StudentApi>(
    `student/list?page=${page}&name=${search}`,
    ["students", page, search]
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
          description: data.message,
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
          <Link href={`${pathname}/${row.original.id}`}>
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
      <div className="w-full flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("students")}</h1>
        <Link href={`${pathname}/create`}>
          <Button>{t("createstudent")}</Button>
        </Link>
      </div>
      <div className="flex justify-between w-full">
        <Input
          placeholder={t("filter")}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
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
            <span className="sr-only sm:not-sr-only">Export</span>
          </Button>
        </div>
        <Card x-chunk="dashboard-05-chunk-3">
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
