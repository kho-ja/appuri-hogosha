"use client";
import { Button } from "@/components/ui/button";

import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import React, { useEffect } from "react";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import Student from "@/types/student";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import { useListQuery } from "@/lib/useListQuery";
import useApiMutation from "@/lib/useApiMutation";
import { PhoneInput } from "@/components/PhoneInput";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { getStudentEditSchema } from "@/lib/validationSchemas";

export default function CreateStudent({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = React.use(params);
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("CreateStudent");
  const tName = useTranslations("names");
  const formSchema = getStudentEditSchema(t);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      phone_number: "",
      given_name: "",
      family_name: "",
      student_number: "",
      cohort: undefined,
    },
  });
  const router = useRouter();
  const { data, isLoading, isError } = useListQuery<{
    student: Student;
  }>(`student/${studentId}`, ["student", studentId]);
  interface EditStudentPayload {
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
    cohort?: number;
  }
  const { mutate, isPending } = useApiMutation<
    { student: Student },
    EditStudentPayload
  >(`student/${studentId}`, "PUT", ["editStudent", studentId], {
    onSuccess: (data) => {
      toast({
        title: t("StudentEdited"),
        description: tName("name", { ...data?.student, parents: "" }),
      });
      router.push(`/students/${studentId}`);
      form.reset();
    },
  });

  useEffect(() => {
    if (data) {
      form.setValue("email", data.student.email);
      form.setValue("given_name", data.student.given_name);
      form.setValue("family_name", data.student.family_name);
      form.setValue("phone_number", `+${data.student.phone_number}`);
      form.setValue("student_number", data.student.student_number);
      if (data.student.cohort) form.setValue("cohort", data.student.cohort);
    }
  }, [data, form]);

  if (isError) return <NotFound />;

  return (
    <div className="space-y-4">
      <PageHeader title={t("EditStudent")}>
        <BackButton href={`/students/${studentId}`} />
      </PageHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutate({
              email: values.email,
              phone_number: values.phone_number.slice(1),
              given_name: values.given_name,
              family_name: values.family_name,
              student_number: values.student_number,
              cohort: values.cohort,
            })
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="given_name"
              render={({ field, formState }) => (
                <FormItem>
                  <FormLabel>{t("GivenName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("GivenName")} {...field} />
                  </FormControl>
                  <FormMessage>
                    {formState.errors.given_name?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="family_name"
              render={({ field, formState }) => (
                <FormItem>
                  <FormLabel>{t("FamilyName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("FamilyName")} {...field} />
                  </FormControl>
                  <FormMessage>
                    {formState.errors.family_name?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field, formState }) => (
                <FormItem>
                  <FormLabel>{t("PhoneNumber")}</FormLabel>
                  <FormControl>
                    <PhoneInput placeholder={t("PhoneNumber")} {...field} />
                  </FormControl>
                  <FormMessage>
                    {formState.errors.phone_number?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="student_number"
              render={({ field, formState }) => (
                <FormItem>
                  <FormLabel>{t("StudentNumber")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("StudentNumber")} />
                  </FormControl>
                  <FormMessage>
                    {formState.errors.student_number?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cohort"
              render={({ field, formState }) => (
                <FormItem>
                  <FormLabel>{t("Cohort")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder={t("Cohort")}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage>{formState.errors.cohort?.message}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          <Button isLoading={isPending || isLoading}>{t("EditStudent")}</Button>
        </form>
      </Form>
    </div>
  );
}
