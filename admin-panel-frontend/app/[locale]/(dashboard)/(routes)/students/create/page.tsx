"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
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
import { ParentTable } from "@/components/ParentTable";
import { useEffect, useState } from "react";
import Parent from "@/types/parent";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import Student from "@/types/student";
import { PhoneInput } from "@/components/PhoneInput";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Save } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const GetFormSchema = (t: (key: string) => string) => {
  return z.object({
    email: z
      .string()
      .email()
      // RFC 5321 specifies a maximum email address length of 254 characters.
      .max(254, { message: t("Email is too long") }),
    phone_number: z
      .string()
      .min(10)
      .max(20)
      .refine(isValidPhoneNumber, { message: t("Invalid phone number") }),
    given_name: z.string().min(1).max(50),
    family_name: z.string().min(1).max(50),
    student_number: z
      .string()
      .min(1)
      .max(10)
      .refine((v) => !/\s/.test(v), { message: t("NoSpacesAllowed") }),
    cohort: z.coerce.number().int().positive().optional(),
  });
};

export default function CreateStudent() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("CreateStudent");
  const tName = useTranslations("names");
  const formSchema = GetFormSchema(t);
  const form = useForm({
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
  const [selectedParents, setSelectedParents] = useState<Parent[]>([]);
  const router = useRouter();
  interface CreateStudentPayload {
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
    cohort?: number;
    parents: number[];
  }
  const { mutate } = useApiMutation<{ student: Student }, CreateStudentPayload>(
    `student/create`,
    "POST",
    ["createStudent"],
    {
      onSuccess: (data) => {
        toast({
          title: t("StudentCreated"),
          description: tName("name", { ...data.student, parents: "" }),
        });
        router.push("/students");
        form.reset();
        setSelectedParents([]);
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formStudentCreateData");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("email", parsedFormData.email);
      form.setValue("family_name", parsedFormData.family_name);
      form.setValue("given_name", parsedFormData.given_name);
      form.setValue("phone_number", parsedFormData.phone_number);
      form.setValue("student_number", parsedFormData.student_number);
      if (parsedFormData.cohort) form.setValue("cohort", parsedFormData.cohort);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formStudentCreateData", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="space-y-4">
      <PageHeader title={t("CreateStudent")} variant="create">
        <Link href="/fromKintone/student">
          <Button variant={"secondary"}>{t("createFromKintone")}</Button>
        </Link>
        <Link href="/fromcsv/student">
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
            {t("createFromCSV")}
          </Button>
        </Link>
        <BackButton href={`/students`} />
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
              parents: selectedParents.map((parent) => parent.id),
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
              name="email"
              render={({ field, formState }) => (
                <FormItem>
                  <FormLabel>{t("Email")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("Email")} {...field} />
                  </FormControl>
                  <FormMessage>{formState.errors.email?.message}</FormMessage>
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
          </div>

          <FormItem>
            <FormLabel>{t("Parents")}</FormLabel>
            <FormControl>
              <ParentTable
                selectedParents={selectedParents}
                setSelectedParents={setSelectedParents}
              />
            </FormControl>
          </FormItem>

          <Button icon={<Save className="h-5 w-5" />}>
            {t("CreateStudent")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
