"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Student from "@/types/student";
import Parent from "@/types/parent";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import Group from "@/types/group";
import { FormatDateTime } from "@/lib/utils";
import TableApi from "@/components/TableApi";
import DisplayProperty from "@/components/DisplayProperty";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
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
import useApiMutation from "@/lib/useApiMutation";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

export default function ThisStudent({
  params: { messageId, studentId, groupId },
}: {
  params: { messageId: string; studentId: string; groupId: string };
}) {
  const t = useTranslations("ThisStudent");
  const tName = useTranslations("names");
  const { data: studentData, isError } = useApiQuery<{
    student: Student;
    group: Group;
    parents: Parent[];
  }>(`post/${messageId}/group/${groupId}/student/${studentId}`, [
    "student",
    messageId,
    groupId,
    studentId,
  ]);

  const { mutate } = useApiMutation<{ message: string }>(
    `post/${messageId}/students/${studentId}`,
    "POST",
    ["student", messageId, studentId],
    {
      onSuccess: (data) => {
        toast({
          title: t("notificationReSent"),
          description: t(data.message),
        });
      },
    }
  );

  const [parentId, setParentId] = useState<number | null>(null);
  const { mutate: mutateParent } = useApiMutation<{ message: string }>(
    `post/${messageId}/parents/${parentId}`,
    "POST",
    ["student", messageId, studentId],
    {
      onSuccess: (data) => {
        toast({
          title: t("notificationReSent"),
          description: t(data.message),
        });
      },
    }
  );

  const parentColumns: ColumnDef<Parent>[] = [
    {
      accessorKey: "given_name",
      header: t("parentGivenName"),
      cell: ({ row }) => <div>{row.getValue("given_name")}</div>,
    },
    {
      accessorKey: "family_name",
      header: t("Family_name"),
      cell: ({ row }) => <div>{row.getValue("family_name")}</div>,
    },
    {
      accessorKey: "email",
      header: t("Email"),
      cell: ({ row }) => <div>{row.getValue("email")}</div>,
    },
    {
      accessorKey: "phone_number",
      header: t("Phone_number"),
      cell: ({ row }) => <div>{row.getValue("phone_number")}</div>,
    },
    {
      accessorKey: "viewed_at",
      header: t("Viewed_at"),
      cell: ({ row }) => (
        <div>
          {row.getValue("viewed_at")
            ? FormatDateTime(row.getValue("viewed_at"))
            : t("noView")}
        </div>
      ),
    },
    {
      header: t("Actions"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => (
        <Dialog key={`resendParent${row.original.id}`}>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <EllipsisVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DialogTrigger>
                <DropdownMenuItem>{t("resend")}</DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {tName("name", { ...row.original } as any)}
              </DialogTitle>
              <DialogDescription>{row.original.email}</DialogDescription>
            </DialogHeader>
            <div>{t("doYouReSendNotification")}</div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant={"secondary"}>{t("cancel")}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  onClick={() => {
                    setParentId(row.original.id);
                    mutateParent();
                  }}
                >
                  {t("resend")}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  if (isError) return <NotFound />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between w-full gap-2">
        <h1 className="text-3xl font-bold">{t("posts")}</h1>
        <div className="flex flex-wrap gap-2">
          <BackButton href={`/messages/${messageId}/group/${groupId}`} />
          <Dialog key={"resendStudent"}>
            <DialogTrigger asChild>
              <Button>{t("resend")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {studentData &&
                    tName("name", { ...studentData?.student, parents: "" })}
                </DialogTitle>
                <DialogDescription>
                  {studentData?.student.email}
                </DialogDescription>
              </DialogHeader>
              <div>{t("doYouReSendNotification")}</div>
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
            value={studentData?.group.name}
          />
          <Separator />
          <DisplayProperty
            property={t("givenName")}
            value={studentData?.student.given_name}
          />
          <DisplayProperty
            property={t("familyName")}
            value={studentData?.student.family_name}
          />
          <DisplayProperty
            property={t("studentNumber")}
            value={studentData?.student.student_number}
          />
          <DisplayProperty
            property={t("email")}
            value={studentData?.student.email}
          />
          <DisplayProperty
            property={t("phone")}
            value={studentData?.student.phone_number}
          />
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4">
          <h2 className="text-2xl w-2/4 font-bold">{t("parents")}</h2>
          <div className="rounded-md border">
            <TableApi
              linkPrefix={`/parents`}
              data={studentData?.parents ?? null}
              columns={parentColumns}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
