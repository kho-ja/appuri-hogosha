"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentTable } from "@/components/StudentTable";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Student from "@/types/student";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { Link, useRouter } from "@/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const formSchema = z.object({
  name: z.string().min(1),
});

export default function EditGroup({
  params: { groupId },
}: {
  params: { groupId: string };
}) {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("CreateGroup");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });
  const { data, isLoading, isError } = useApiQuery<{
    group: { name: string };
    members: Student[];
  }>(`group/${groupId}`, ["group", groupId]);

  const { isPending, mutate } = useApiMutation<{ message: string }>(
    `group/${groupId}`,
    "PUT",
    ["editGroup"],
    {
      onSuccess: (data) => {
        toast({
          title: t("GroupEdited"),
          description: data.message,
        });
        form.reset();
        router.push(`/groups/${groupId}`);
        setSelectedStudents([]);
      },
    }
  );

  useEffect(() => {
    if (data) {
      form.setValue("name", data.group.name);
      setSelectedStudents(data.members);
    }
  }, [data, form]);

  if (isError) return <NotFound />;

  return (
    <div className="flex flex-col items-center">
      <PageHeader title={t("EditGroup")}>
        <BackButton href={`/groups/${groupId}`} />
      </PageHeader>
      <div className="w-full mt-8">
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((data) =>
              mutate({
                ...data,
                students: selectedStudents.map((e) => e.id),
              } as any)
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field, formState }) => (
                  <FormItem>
                    <FormLabel>{t("GroupName")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("GroupName")} />
                    </FormControl>
                    <FormMessage>{formState.errors.name?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>{t("Students")}</FormLabel>
              <FormControl>
                <StudentTable
                  selectedStudents={selectedStudents}
                  setSelectedStudents={setSelectedStudents}
                />
              </FormControl>
            </FormItem>

            <Button isLoading={isPending || isLoading}>{t("EditGroup")}</Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
