"use client";

import { useTranslations } from "next-intl";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import useDateFormatter from "@/lib/useDateFormatter";
import TableApi from "@/components/TableApi";
import NotFound from "@/components/NotFound";
import { useListQuery } from "@/lib/useListQuery";
import ReactLinkify from "react-linkify";
import Image from "next/image";
import { Dialog, DialogDescription } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { ColumnDef } from "@tanstack/react-table";

export default function ScheduledMessagePage({
  params: { messageId },
}: {
  params: { messageId: string };
}) {
  const t = useTranslations("ThisMessage");
  const tName = useTranslations("names");
  const { formatDateTime } = useDateFormatter();

  interface ScheduledPostResponse {
    post: {
      id: number;
      title: string;
      description: string;
      priority: string;
      edited_at?: string;
      scheduled_at?: string;
      image?: string | null;
    };
  }
  interface ReceiversResponse {
    groups: { id: number; name: string }[];
    students: {
      id: number;
      given_name: string;
      family_name: string;
      email: string;
      student_number: string;
      phone_number: string;
    }[];
  }
  const { data, isError } = useListQuery<ScheduledPostResponse>(
    `schedule/each/${messageId}`,
    ["scheduled-message", messageId]
  );
  const { data: recieverData } = useListQuery<ReceiversResponse>(
    `schedule/${messageId}/recievers`,
    ["scheduled-recievers", messageId]
  );

  type StudentRow = {
    given_name: string;
    family_name: string;
    email: string;
    student_number: string;
    phone_number: string;
  };
  const studentColumns: ColumnDef<StudentRow>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => tName("name", { ...row.original, parents: "" }),
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
  ];

  const groupColumns = [
    {
      accessorKey: "name",
      header: t("name"),
    },
  ];

  const edited_atDate = formatDateTime(data?.post?.edited_at ?? "");
  const scheduled_atDate = formatDateTime(data?.post?.scheduled_at ?? "");

  if (isError) return <NotFound />;

  return (
    <div className="flex flex-col gap-2">
      <PageHeader title={t("ViewScheduledMessage")}>
        <BackButton href={`/messages/`} />
        <Link href={`/messages/scheduled-message/edit/${messageId}`} passHref>
          <Button>{t("editMessage")}</Button>
        </Link>
      </PageHeader>
      <Card className="space-y-8 p-4">
        <div>
          <CardTitle className="text-xl w-2/4 font-bold">
            {data?.post?.title}
          </CardTitle>
          <CardDescription className="whitespace-pre-wrap">
            <ReactLinkify>{data?.post?.description}</ReactLinkify>
          </CardDescription>
          {data?.post?.image && (
            <div className="my-2">
              <Dialog>
                <DialogTrigger>
                  <Image
                    src={`/${data?.post?.image}`}
                    alt={data.post.title}
                    width={200}
                    height={100}
                    className="rounded object-cover"
                  />
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle className="whitespace-pre-wrap text-center">
                    {data?.post?.title}
                  </DialogTitle>
                  <DialogDescription className="flex flex-col justify-center items-center">
                    <Image
                      src={`/${data?.post?.image}`}
                      alt={data?.post?.title}
                      width={800}
                      height={400}
                      className="rounded object-cover"
                    />
                  </DialogDescription>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("EditedAt")}</TableHead>
              <TableHead>{t("ScheduledAt")}</TableHead>
              <TableHead>{t("Priority.default")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{edited_atDate}</TableCell>
              <TableCell>{scheduled_atDate}</TableCell>
              <TableCell>
                {data?.post && t(`Priority.${data?.post?.priority}`)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <div className="flex flex-wrap gap-2 justify-between">
          <TabsList>
            <TabsTrigger value="groups">{t("Groups")}</TabsTrigger>
            <TabsTrigger value="students">{t("Students")}</TabsTrigger>
          </TabsList>
          <Link
            href={`/messages/scheduled-message/${messageId}/recievers`}
            passHref
          >
            <Button>{t("editRecivers")}</Button>
          </Link>
        </div>
        <TabsContent value="groups" className="space-y-4">
          <div className="rounded-md border">
            <TableApi
              data={recieverData?.groups ?? null}
              columns={groupColumns}
            />
          </div>
        </TabsContent>
        <TabsContent value="students" className="space-y-4">
          <div className="rounded-md border">
            <TableApi
              data={recieverData?.students ?? null}
              columns={studentColumns}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
