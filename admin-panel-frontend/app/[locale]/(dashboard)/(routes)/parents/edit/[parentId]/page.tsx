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
import { useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import React, { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import { useListQuery } from "@/lib/useListQuery";
import Parent from "@/types/parent";
import useApiMutation from "@/lib/useApiMutation";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { getParentEditSchema } from "@/lib/validationSchemas";

export default function EditParent({
  params,
}: {
  params: Promise<{ parentId: string }>;
}) {
  const { parentId } = React.use(params);
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("EditParent");
  const tName = useTranslations("names");
  const formSchema = getParentEditSchema(t);
  const router = useRouter();
  type FormType = z.infer<typeof formSchema>;
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      given_name: "",
      family_name: "",
      email: "",
    },
  });
  const { data, isLoading, isError } = useListQuery<{
    parent: Parent;
  }>(`parent/${parentId}`, ["parent", parentId]);
  const { isPending, mutate } = useApiMutation<{ parent: Parent }, FormType>(
    `parent/${parentId}`,
    "PUT",
    ["editParent", parentId],
    {
      onSuccess: (data) => {
        toast({
          title: t("ParentUpdated"),
          description: tName("name", {
            given_name: data.parent.given_name,
            family_name: data.parent.family_name,
          }),
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
      form.setValue("email", data.parent.email ? data.parent.email : "");
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
              email: values.email ? values.email.trim() : "",
              phone_number: data?.parent.phone_number,
            })
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="family_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("ParentFamilyName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("ParentFamilyName")}
                          type="text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:w-1/2">
                    <FormLabel>{t("ParentEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("ParentEmail")}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
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
