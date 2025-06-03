"use client";

import { GroupTable } from "@/components/GroupTable";
import { StudentTable } from "@/components/StudentTable";
import Group from "@/types/group";
import Student from "@/types/student";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import useApiMutation from "@/lib/useApiMutation";
import useApiQuery from "@/lib/useApiQuery";
import StudentApi from "@/types/studentApi";
import GroupApi from "@/types/groupApi";
import { toast } from "@/components/ui/use-toast";
import { Link, useRouter } from "@/navigation";
import { Tabs } from "@radix-ui/react-tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

export default function Recievers({
  params: { messageId },
}: {
  params: { messageId: string };
}) {
  const t = useTranslations("recievers");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const router = useRouter();
  const { data: studentData } = useApiQuery<StudentApi>(
    `post/${messageId}/students`,
    ["student", messageId]
  );
  const { data: groupData } = useApiQuery<GroupApi>(
    `post/${messageId}/groups`,
    ["group", messageId]
  );
  const { mutate } = useApiMutation(
    `post/${messageId}/sender`,
    "PUT",
    ["editMessageSender", messageId],
    {
      onSuccess: (data: any) => {
        toast({
          title: t("recieversChanged"),
          description: data?.message,
        });
        router.push(`/messages/${messageId}`);
      },
    }
  );

  const handleClick = useCallback(() => {
    mutate({
      students: selectedStudents.map((student) => student.id),
      groups: selectedGroups.map((group) => group.id),
    } as any);
  }, [selectedStudents, selectedGroups, mutate]);

  useEffect(() => {
    if (studentData) {
      setSelectedStudents(studentData.students);
    }
  }, [studentData]);

  useEffect(() => {
    if (groupData) {
      setSelectedGroups(groupData.groups);
    }
  }, [groupData]);

  return (
    <div className="flex flex-col gap-2 justify-start items-start">
      <PageHeader title={t("ChangeRecievers")}>
        <BackButton href={`/messages/${messageId}`} />
      </PageHeader>
      <Tabs className="w-full" defaultValue="groups">
        <TabsList className="flex justify-start items-center mb-4 w-fit">
          <TabsTrigger value="groups">{t("Groups")}</TabsTrigger>
          <TabsTrigger value="students">{t("Students")}</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <GroupTable
            selectedGroups={selectedGroups}
            setSelectedGroups={setSelectedGroups}
          />
        </TabsContent>

        <TabsContent value="students">
          <StudentTable
            selectedStudents={selectedStudents}
            setSelectedStudents={setSelectedStudents}
          />
        </TabsContent>
      </Tabs>

      <Button onClick={handleClick}>{t("confirm")}</Button>
    </div>
  );
}
