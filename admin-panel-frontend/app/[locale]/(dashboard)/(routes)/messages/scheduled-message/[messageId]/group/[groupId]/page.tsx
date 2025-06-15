"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Student from "@/types/student";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Bell, Check, CheckCheck } from "lucide-react";
import { usePathname, useRouter } from "@/navigation";
import TableApi from "@/components/TableApi";
import { useState } from "react";
import DisplayProperty from "@/components/DisplayProperty";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import Group from "@/types/group";
import pagination from "@/types/pagination";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import { BackButton } from "@/components/ui/BackButton";

export default function ThisGroup({
  params: { messageId, groupId },
}: {
  params: { messageId: string; groupId: string };
}) {
  const t = useTranslations("ThisGroup");
  const tName = useTranslations("names");
  const [studentPage, setStudentPage] = useState(1);
  const { data: groupData, isError } = useApiQuery<{
    group: Group;
    pagination: pagination;
    students: Student[];
  }>(`post/${messageId}/group/${groupId}?page=${studentPage}`, [
    "group",
    messageId,
    groupId,
    studentPage,
  ]);
  const pathname = usePathname();
  const { mutate } = useApiMutation<{ message: string }>(
    `post/${messageId}/groups/${groupId}`,
    "POST",
    ["group", messageId, groupId],
    {
      onSuccess: (data) => {
        toast({
          title: t("notificationReSent"),
          description: t(data.message),
        });
      },
    }
  );

  const studentColumns: ColumnDef<Student>[] = [
    {
      accessorKey: "given_name",
      header: t("studentGivenName"),
      cell: ({ row }) => (
        <Link href={`${pathname}/student/${row.original.id}`}>
          {row.getValue("given_name")}
        </Link>
      ),
    },
    {
      accessorKey: "family_name",
      header: t("Family_name"),
      cell: ({ row }) => (
        <Link href={`${pathname}/student/${row.original.id}`}>
          {row.getValue("family_name")}
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: t("Email"),
      cell: ({ row }) => (
        <Link href={`${pathname}/student/${row.original.id}`}>
          {row.getValue("email")}
        </Link>
      ),
    },
    {
      accessorKey: "phone_number",
      header: t("Phone_number"),
      cell: ({ row }) => (
        <Link href={`${pathname}/student/${row.original.id}`}>
          {row.getValue("phone_number")}
        </Link>
      ),
    },
    {
      accessorKey: "student_number",
      header: t("Ststudent_number"),
      cell: ({ row }) => (
        <Link href={`${pathname}/student/${row.original.id}`}>
          {row.getValue("student_number")}
        </Link>
      ),
    },
    {
      accessorKey: "parents",
      header: t("Parents"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => {
        const parents = row.original?.parents || [];
        const anyViewed = parents.some((parent) => parent.viewed_at);

        return (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Link href={`${pathname}/student/${row.original.id}`}>
                <Bell
                  className={anyViewed ? "text-green-500" : "text-red-500"}
                />
              </Link>
            </HoverCardTrigger>
            <HoverCardContent>
              {row.original?.parents?.length
                ? row.original?.parents.map((parent) => (
                    <div key={parent.id}>
                      <div className="flex justify-between py-2">
                        <div className="font-bold">
                          {tName("name", { ...parent } as any)}
                        </div>
                        {parent.viewed_at ? <CheckCheck /> : <Check />}
                      </div>
                      {row.original?.parents?.at(-1) !== parent && (
                        <Separator />
                      )}
                    </div>
                  ))
                : t("noParents")}
            </HoverCardContent>
          </HoverCard>
        );
      },
    },
  ];

  if (isError) return <NotFound />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between w-full gap-2">
        <h1 className="text-3xl font-bold">{t("GroupView")}</h1>
        <div className="flex flex-wrap gap-2">
          <BackButton href={`/messages/${messageId}`} />
          <Dialog key={"resendStudent"}>
            <DialogTrigger asChild>
              <Button>{t("resend")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{groupData?.group.name}</DialogTitle>
                <DialogDescription>
                  <div>{t("doYouReSendNotification")}</div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={() => mutate()}>{t("resend")}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="space-y-4">
        <CardHeader>
          <DisplayProperty
            property={t("groupName")}
            value={groupData?.group.name}
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
              linkPrefix={`/messages/${messageId}/group/${groupId}/student`}
              data={groupData?.students ?? null}
              columns={studentColumns}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
