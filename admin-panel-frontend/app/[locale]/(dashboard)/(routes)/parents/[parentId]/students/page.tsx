"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StudentTable } from "@/components/StudentTable";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import Student from "@/types/student";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

export default function EditStudents({
  params: { parentId },
}: {
  params: { parentId: string };
}) {
  const t = useTranslations("CreateStudent");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const router = useRouter();
  const { data, isLoading, isError } = useApiQuery<{
    students: Student[];
  }>(`parent/${parentId}/students`, ["editParentStudents", parentId]);
  const { mutate, isPending } = useApiMutation<{ message: string }>(
    `parent/${parentId}/students`,
    "POST",
    ["editParentStudents", parentId],
    {
      onSuccess: (data) => {
        toast({
          title: t("StudentsUpdated"),
          description: data?.message,
        });
        router.push(`/parents/${parentId}`);
      },
    }
  );

  useEffect(() => {
    if (!data) return;
    setSelectedStudents(data.students);
  }, [data]);

  if (isError) return <NotFound />;

  return (
    <div>
      <PageHeader title={t("editParentStudents")}>
        <BackButton href={`/parents/${parentId}`} />
      </PageHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate({ students: selectedStudents.map((e) => e.id) } as any);
        }}
        className="space-y-4"
      >
        <StudentTable
          selectedStudents={selectedStudents}
          setSelectedStudents={setSelectedStudents}
        />
        <Button isLoading={isPending || isLoading}>
          {t("editParentStudents")}
        </Button>
      </form>
    </div>
  );
}
