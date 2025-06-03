"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useSession } from "next-auth/react";
import { Link, useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import Parent from "@/types/parent";
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

export default function EditParent({
  params: { parentId },
}: {
  params: { parentId: string };
}) {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("EditParent");
  const tName = useTranslations("names");
  const formSchema = GetFormSchema(t);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      given_name: "",
      family_name: "",
      phone_number: "",
    },
  });
  const { data, isLoading, isError } = useApiQuery<{
    parent: Parent;
  }>(`parent/${parentId}`, ["parent", parentId]);
  const { isPending, mutate } = useApiMutation<{ parent: Parent }>(
    `parent/${parentId}`,
    "PUT",
    ["editParent", parentId],
    {
      onSuccess: (data) => {
        toast({
          title: t("ParentUpdated"),
          description: tName("name", { ...data?.parent } as any),
        });
        form.reset();
        router.push(`/parents/${parentId}`);
      },
    }
  );

  useEffect(() => {
    if (data) {
      form.setValue("given_name", data.parent.given_name);
      form.setValue("family_name", data.parent.family_name);
      form.setValue("phone_number", `+${data.parent.phone_number}`);
    }
  }, [data, form]);

  if (isError) return <NotFound />;

  return (
    <div className="w-full space-y-8">
      <PageHeader title={t("EditParent")}>
        <BackButton href={`/parents/${parentId}`} />
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
                name="phone_number"
                render={({ field, formState }) => (
                  <FormItem className="sm:w-1/2">
                    <FormLabel>{t("ParentPhone")}</FormLabel>
                    <FormControl>
                      <PhoneInput placeholder={t("ParentPhone")} {...field} />
                    </FormControl>
                    <FormMessage>
                      {formState.errors.phone_number &&
                        "Parent phone number is required. Parent phone number should be more than 10 characters"}
                    </FormMessage>
                  </FormItem>
                )}
              />

              <div className="flex justify-between">
                <Button isLoading={isPending || isLoading}>
                  {t("EditParent")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
