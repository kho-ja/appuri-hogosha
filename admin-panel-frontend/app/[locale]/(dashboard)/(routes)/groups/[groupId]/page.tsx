"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Group from "@/types/group";
import Student from "@/types/student";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import pagination from "@/types/pagination";
import { FormatDate } from "@/lib/utils";
import TableApi from "@/components/TableApi";
import DisplayProperty from "@/components/DisplayProperty";
import { useState } from "react";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

export default function ThisGroup({
  params: { groupId },
}: {
  params: { groupId: string };
}) {
  const t = useTranslations("ThisGroup");
  const tName = useTranslations("names");
  const [studentPage, setStudentPage] = useState(1);
  const { data: groupData, isError } = useApiQuery<{
    group: Group;
    pagination: pagination;
    members: Student[];
  }>(`group/${groupId}?page=${studentPage}`, ["group", groupId, studentPage]);

  const studentColumns: ColumnDef<Student>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => tName("name", { ...row?.original, parents: "" }),
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
      accessorKey: "student_number",
      header: t("Ststudent_number"),
    },
  ];

  const groupDate = FormatDate(groupData?.group.created_at ?? "");

  if (isError) return <NotFound />;

  return (
    <div className="space-y-4">
      <PageHeader title={t("GroupView")} >
          <BackButton href={`/groups`} />
          <Link href={`/groups/edit/${groupId}`}>
            <Button>{t("editGroup")}</Button>
          </Link>
      </PageHeader>
      <Card className="space-y-4">
        <CardHeader>
          <DisplayProperty
            property={t("groupName")}
            value={groupData?.group.name}
          />
          <DisplayProperty
            property={t("groupCreationDate")}
            value={groupDate}
          />
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <h2 className="text-2xl font-bold">{t("students")}</h2>

            <div className="w-full sm:w-auto flex justify-center sm:justify-end">
              <PaginationApi
                data={groupData?.pagination ?? null}
                setPage={setStudentPage}
              />
            </div>
          </div>
          <div className="rounded-md border">
            <TableApi
              linkPrefix="/students"
              data={groupData?.members ?? null}
              columns={studentColumns}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
