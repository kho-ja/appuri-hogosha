"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentTable } from "@/components/StudentTable";
import Student from "@/types/student";
import { useTranslations } from "next-intl";
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
import { Link, useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import Parent from "@/types/parent";
import { useEffect, useState } from "react";

const formSchema = z.object({
  given_name: z.string().min(1).max(50),
  family_name: z.string().min(1).max(50),
  phone_number: z.string().min(10).max(500),
  email: z.string().email(),
});

export default function CreateParent() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("CreateParent");
  const tName = useTranslations("names");
  const router = useRouter();
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      given_name: "",
      family_name: "",
      phone_number: "",
      email: "",
    },
  });
  const { mutate, isPending } = useApiMutation<{ parent: Parent }>(
    `parent/create`,
    "POST",
    ["createParent"],
    {
      onSuccess: (data) => {
        toast({
          title: t("ParentCreated"),
          description: tName("name", { ...data.parent } as any),
        });
        setSelectedStudents([]);
        form.reset();
        router.push("/parents");
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formDataCreateParent");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("given_name", parsedFormData.given_name);
      form.setValue("family_name", parsedFormData.family_name);
      form.setValue("email", parsedFormData.email);
      form.setValue("phone_number", parsedFormData.phone_number);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formDataCreateParent", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("CreateParent")}</h1>
        <div className="flex gap-2">
          <Link href="/fromKintone/parent">
            <Button variant={"secondary"}>{t("createFromKintone")}</Button>
          </Link>

          <Link href="/fromcsv/parent">
            <Button variant={"secondary"}>{t("createFromCSV")}</Button>
          </Link>

          <Link href={`/parents`}>
            <Button>{t("back")}</Button>
          </Link>
        </div>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutate({
              ...values,
              students: selectedStudents.map((student) => student.id),
            } as any)
          )}
          className="space-y-4"
        >
          <div className="flex w-full">
            <div className="w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="given_name"
                  render={({ field, formState }) => (
                    <FormItem>
                      <FormLabel>{t("ParentName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("ParentName")}
                          type="text"
                        />
                      </FormControl>
                      <FormMessage>
                        {formState.errors.given_name &&
                          "Parent name is required. Parent name should be more than 5 characters"}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="family_name"
                  render={({ field, formState }) => (
                    <FormItem>
                      <FormLabel>{t("ParentFamilyName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("ParentFamilyName")}
                          type="text"
                        />
                      </FormControl>
                      <FormMessage>
                        {formState.errors.family_name &&
                          "Parent family name is required. Parent family name should be more than 5 characters"}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field, formState }) => (
                  <FormItem>
                    <FormLabel>{t("ParentEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("ParentEmail")}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage>
                      {formState.errors.email &&
                        "Parent email is required. Parent email should be valid"}
                    </FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field, formState }) => (
                  <FormItem>
                    <FormLabel>{t("ParentPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("ParentPhone")}
                        type="tel"
                      />
                    </FormControl>
                    <FormMessage>
                      {formState.errors.phone_number &&
                        "Parent phone number is required. Parent phone number should be more than 10 characters"}
                    </FormMessage>
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

              <div className="flex justify-between">
                <Button disabled={isPending}>
                  {t("CreateParent") + `${isPending ? "..." : ""}`}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
