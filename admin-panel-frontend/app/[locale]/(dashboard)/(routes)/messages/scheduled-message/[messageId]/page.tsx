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
import { usePathname, Link } from "@/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PaginationApi from "@/components/PaginationApi";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { FormatDateTime } from "@/lib/utils";
import TableApi from "@/components/TableApi";
import { useState } from "react";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
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
import { Edit3Icon } from "lucide-react";

export default function ScheduledMessagePage({
  params: { messageId },
}: {
  params: { messageId: string };
}) {
  const t = useTranslations("ThisMessage");
  const tName = useTranslations("names");
  const pathname = usePathname();

  // Main scheduled post info
  const { data, isError } = useApiQuery<any>(
    `post/schedule/each/${messageId}`,
    ["scheduled-message", messageId]
  );

  // Students
  const [studentPage, setStudentPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState("");
  const { data: studentData, isError: isStudentError } = useApiQuery<any>(
    `post/schedule/each/${messageId}/students?page=${studentPage}&email=${studentSearch}`,
    ["scheduled-student", messageId, studentPage, studentSearch]
  );

  // Groups
  const [groupPage, setGroupPage] = useState(1);
  const [groupSearch, setGroupSearch] = useState("");
  const { data: groupData, isError: isGroupError } = useApiQuery<any>(
    `post/schedule/each/${messageId}/groups?page=${groupPage}&name=${groupSearch}`,
    ["scheduled-group", messageId, groupPage, groupSearch]
  );

  // Columns for students
  const studentColumns = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }: any) => tName("name", { ...row?.original, parents: "" }),
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
      accessorKey: "parents",
      header: t("Parents"),
      meta: { notClickable: true },
      cell: ({ row }: any) => {
        const parents = row.original?.parents || [];
        return (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="icon">
                👨‍👩‍👧‍👦
              </Button>
            </HoverCardTrigger>
            <HoverCardContent>
              {parents.length
                ? parents.map((parent: any) => (
                    <div key={parent.id}>
                      <div className="flex justify-between py-2">
                        <div className="font-bold">
                          {tName("name", { ...parent })}
                        </div>
                      </div>
                      {parents.at(-1) !== parent && <Separator />}
                    </div>
                  ))
                : t("noParents")}
            </HoverCardContent>
          </HoverCard>
        );
      },
    },
  ];

  // Columns for groups
  const groupColumns = [
    {
      accessorKey: "name",
      header: t("name"),
    },
    {
      header: t("Actions"),
      meta: { notClickable: true },
      cell: ({ row }: any) => (
        <Link href={`${pathname}/group/${row.original.id}`}>
          <Edit3Icon />
        </Link>
      ),
    },
  ];

  const edited_atDate = FormatDateTime(data?.post?.edited_at ?? "");
  const scheduled_atDate = FormatDateTime(data?.post?.scheduled_at ?? "");

  if (isError && isStudentError && isGroupError) return <NotFound />;

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
        </div>
        <TabsContent value="groups" className="space-y-4">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between w-full gap-2">
            <Input
              placeholder={t("filterGroup")}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                setGroupSearch(e.target.value);
                setGroupPage(1);
              }}
              className="sm:max-w-xs"
            />
            <div className="w-full sm:w-auto flex  justify-center sm:justify-end ">
              <PaginationApi
                data={groupData?.pagination ?? null}
                setPage={setGroupPage}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <TableApi
              linkPrefix={`/messages/scheduled-message/${messageId}/group`}
              data={groupData?.groups ?? null}
              columns={groupColumns}
            />
          </div>
        </TabsContent>
        <TabsContent value="students" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <Input
              placeholder={t("filterEmail")}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                setStudentSearch(e.target.value);
                setStudentPage(1);
              }}
              className="sm:max-w-xs"
            />
            <div className="w-full sm:w-auto flex justify-center sm:justify-end">
              <PaginationApi
                data={studentData?.pagination ?? null}
                setPage={setStudentPage}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <TableApi
              linkPrefix={`/messages/scheduled-message/${messageId}/student`}
              data={studentData?.students ?? null}
              columns={studentColumns}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
