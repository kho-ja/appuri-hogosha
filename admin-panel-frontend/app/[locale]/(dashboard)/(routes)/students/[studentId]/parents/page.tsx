"use client";

import Parent from "@/types/parent";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ParentTable } from "@/components/ParentTable";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";

export default function EditParents({
  params: { studentId },
}: {
  params: { studentId: string };
}) {
  const t = useTranslations("CreateStudent");
  const [selectedParents, setSelectedParents] = useState<Parent[]>([]);
  const router = useRouter();
  const { data, isLoading, isError } = useApiQuery<{
    parents: Parent[];
  }>(`student/${studentId}/parents`, ["student", studentId]);
  const { mutate, isPending } = useApiMutation<{ message: string }>(
    `student/${studentId}/parents`,
    "POST",
    ["editStudentParents", studentId],
    {
      onSuccess: (data) => {
        toast({
          title: t("ParentsUpdated"),
          description: data.message,
        });
        router.push(`/students/${studentId}`);
      },
    }
  );

  useEffect(() => {
    if (!data) return;
    setSelectedParents(data.parents);
  }, [data]);

  if (isError) return <NotFound />;

  return (
    <div>
      <div className="w-full flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("editStudentParents")}</h1>
        <div className="space-x-2">
          <Link href={`/students/${studentId}`}>
            <Button variant={"secondary"}>{t("back")}</Button>
          </Link>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutate({
            parents: selectedParents.map((parent) => parent.id),
          } as any);
        }}
        className="space-y-4"
      >
        <ParentTable
          selectedParents={selectedParents}
          setSelectedParents={setSelectedParents}
        />
        <Button disabled={isPending || isLoading}>
          {isPending ? `${t("Submit")}...` : t("Submit")}
        </Button>
      </form>
    </div>
  );
}
