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
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "@/navigation";
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

  const { mutate } = useApiMutation(
    `schedule/${messageId}/recievers`,
    "PUT",
    ["editScheduledReceivers", messageId],
    {
      onSuccess: () => {
        router.push(`/messages/scheduled-message/${messageId}`);
      },
      onError: () => {
        toast({
          title: t("error"),
          description: t("updateFailed"),
          variant: "destructive",
        });
      },
    }
  ) as unknown as {
    mutate: (data: { students: number[]; groups: number[] }) => void;
  };

  const handleClick = useCallback(() => {
    mutate({
      students: selectedStudents.map((s) => s.id),
      groups: selectedGroups.map((g) => g.id),
    });
  }, [selectedStudents, selectedGroups, mutate]);

  const { data } = useApiQuery<{ students: Student[]; groups: Group[] }>(
    `post/schedule/${messageId}/recievers`,
    ["scheduled-receivers", messageId]
  );

  useEffect(() => {
    if (data) {
      setSelectedStudents(data.students || []);
      setSelectedGroups(data.groups || []);
    }
  }, [data]);

  return (
    <div className="flex flex-col gap-2 justify-start items-start">
      <PageHeader title={t("ChangeRecievers")}>
        <BackButton href={`/messages/scheduled-message/${messageId}`} />
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
