"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import Admin from "@/types/admin";
import { PhoneInput } from "@/components/PhoneInput";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Save } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const GetFormSchema = (t: (key: string) => string) => {
  return z.object({
    given_name: z.string().min(1).max(50),
    family_name: z.string().min(1).max(50),
    phone_number: z
      .string()
      .min(10)
      .max(500)
      .refine(isValidPhoneNumber, { message: t("Invalid phone number") }),
    email: z.string().email(),
  });
};

export default function CreateAdmin() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("CreateAdmin");
  const formSchema = GetFormSchema(t);
  const tName = useTranslations("names");
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      given_name: "",
      family_name: "",
      phone_number: "",
      email: "",
    },
  });

  const { mutate, isPending } = useApiMutation<{ admin: Admin }>(
    `admin/create`,
    "POST",
    ["createAdmin"],
    {
      onSuccess: (data) => {
        toast({
          title: t("AdminCreated"),
          description: tName("name", { ...data.admin }),
        });
        form.reset();
        router.push("/admins");
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formDataCreateAdmin");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("given_name", parsedFormData.given_name);
      form.setValue("family_name", parsedFormData.family_name);
      form.setValue("email", parsedFormData.email);
      form.setValue("phone_number", parsedFormData.phone_number);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formDataCreateAdmin", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="w-full space-y-8">
      <PageHeader title={t("CreateAdmin")} variant="create">
          <Link href="/fromcsv/admin">
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
              {t("createfromCSV")}
            </Button>
          </Link>
          <BackButton href={"/admins"} />
      </PageHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutate({
              ...values,
              phone_number: values.phone_number.slice(1),
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
                      <FormLabel>{t("AdminName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("AdminName")}
                          type="text"
                        />
                      </FormControl>
                      <FormMessage>
                        {formState.errors.given_name &&
                          "Admin name is required. Admin name should be more than 5 characters"}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="family_name"
                  render={({ field, formState }) => (
                    <FormItem>
                      <FormLabel>{t("AdminFamilyName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("AdminFamilyName")}
                          type="text"
                        />
                      </FormControl>
                      <FormMessage>
                        {formState.errors.family_name &&
                          "Admin family name is required. Admin family name should be more than 5 characters"}
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
                    <FormLabel>{t("AdminEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("AdminEmail")}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage>
                      {formState.errors.email &&
                        "Admin email is required. Admin email should be valid"}
                    </FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field, formState }) => (
                  <FormItem>
                    <FormLabel>{t("AdminPhone")}</FormLabel>
                    <FormControl>
                      <PhoneInput placeholder={t("AdminPhone")} {...field} />
                    </FormControl>
                    <FormMessage>
                      {formState.errors.phone_number &&
                        "Admin phone number is required. Admin phone number should be more than 10 characters"}
                    </FormMessage>
                  </FormItem>
                )}
              />
              <Button
                className="self-start"
                type="submit"
                isLoading={isPending}
                icon={<Save className="h-5 w-5" />}
              >
                {t("CreateAdmin")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
