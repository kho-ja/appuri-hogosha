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
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import Admin from "@/types/admin";
import useApiMutation from "@/lib/useApiMutation";
import { PhoneInput } from "@/components/PhoneInput";
import { isValidPhoneNumber } from "react-phone-number-input";
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
  });
};

export default function EditAdmin({
  params: { adminId },
}: {
  params: { adminId: string };
}) {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("EditAdmin");
  const tName = useTranslations("names");
  const formSchema = GetFormSchema(t);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      given_name: "",
      family_name: "",
      phone_number: "",
    },
  });
  const {
    data: adminData,
    isLoading,
    isError,
  } = useApiQuery<{
    admin: Admin;
  }>(`admin/${adminId}`, ["admin", adminId]);

  const { isPending, mutate } = useApiMutation<{ admin: Admin }>(
    `admin/${adminId}`,
    "PUT",
    ["editAdmin", adminId],
    {
      onSuccess: (data) => {
        form.reset();
        router.push(`/admins/${adminId}`);
        toast({
          title: t("AdminUpdated"),
          description: tName("name", { ...data?.admin }),
        });
      },
    }
  );

  useEffect(() => {
    if (adminData) {
      form.setValue("given_name", adminData.admin.given_name);
      form.setValue("family_name", adminData.admin.family_name);
      form.setValue("phone_number", `+${adminData.admin.phone_number}`);
    }
  }, [adminData, form]);

  if (isError) return <NotFound />;

  return (
    <div className="w-full space-y-8">
      <PageHeader title={t("EditAdmin")}>
        <BackButton href={`/admins/${adminId}`} />
      </PageHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            mutate({
              ...values,
              phone_number: values.phone_number.slice(1),
            } as any);
          })}
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
                name="phone_number"
                render={({ field, formState }) => (
                  <FormItem className="sm:w-1/2">
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

              <div className="flex justify-between">
                <Button
                  className="self-start"
                  type="submit"
                  isLoading={isPending || isLoading}
                >
                  {t("EditAdmin")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
