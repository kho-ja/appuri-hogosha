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
import useApiMutation from "@/lib/useApiMutation";
import Group from "@/types/group";
import { Save } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const formSchema = z.object({
  name: z.string().min(1),
});

export default function CreateGroup() {
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

  const { isPending, mutate } = useApiMutation<{ group: Group }>(
    `group/create`,
    "POST",
    ["createGroup"],
    {
      onSuccess: (data) => {
        toast({
          title: t("GroupCreated"),
          description: data.group.name,
        });
        form.reset();
        router.push("/groups");
        setSelectedStudents([]);
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formDataCreateGroup");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("name", parsedFormData.name);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formDataCreateGroup", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="flex flex-col">
      <PageHeader title={t("CreateGroup")} variant="create">
          <Link href="/fromcsv/group">
            <Button variant={"secondary"}>
              <div className="bg-gray-200 p-1 rounded-sm mr-2">
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 4h8l2 2h2a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm4 9V9H7v4h2zm2 0V9h1v4h-1zm3-4h1v2.5L14 9zM5 6v8h10V6H5z" />
                </svg>
              </div>
              {t("createGroupfromCSV")}
            </Button>
          </Link>
          <BackButton href={`/groups`} />
      </PageHeader>
      <div className="w-full mt-8">
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((data) =>
              mutate({
                ...data,
                students: selectedStudents.map((student) => student.id),
              } as any)
            )}
          >
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

            <FormItem>
              <FormLabel>{t("Students")}</FormLabel>
              <FormControl>
                <StudentTable
                  selectedStudents={selectedStudents}
                  setSelectedStudents={setSelectedStudents}
                />
              </FormControl>
            </FormItem>

            <Button icon={<Save className="h-5 w-5" />}>{t("CreateGroup")}</Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
