"use client";

import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Input } from "postcss";
import { useTranslations } from "next-intl";
import useApiMutation from "@/lib/useApiMutation";
import useApiQuery from "@/lib/useApiQuery";
import { useEffect } from "react";

const notificationsFormSchema = z.object({
  high: z.boolean(),
  medium: z.boolean(),
  low: z.boolean(),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

const defaultValues: Partial<NotificationsFormValues> = {
  high: false,
  medium: false,
  low: false,
};

type School = {
  school: {
    id: number;
    name: string;
    contact_email: string;
    priority: {
      high: boolean;
      medium: boolean;
      low: boolean;
    };
  };
};

export function NotificationsForm() {
  const { toast } = useToast();
  const t = useTranslations("NotificationsForm");
  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues,
  });
  const { data, isLoading } = useApiQuery<School>("school/sms", ["SMS"]);
  const { mutate, isPending } = useApiMutation("school/sms", "POST", ["SMS"], {
    onSuccess: (data: any) => {
      toast({
        title: t("NotificationSettingUpdated"),
        description: data?.message ?? "",
      });
    },
    onError: (error) => {
      toast({
        title: t("NotificationSettingUpdateFailed"),
        description: error?.message ?? "",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && data) {
      form.reset({
        high: data.school.priority.high,
        medium: data.school.priority.medium,
        low: data.school.priority.low,
      });
    }
  }, [isLoading, form, data]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutate(values as any))}
        className="space-y-4"
      >
        <div>
          <FormLabel>{t("SMSHeader")}</FormLabel>
          <FormDescription>{t("SMSDescription")}</FormDescription>
        </div>

        <div className="grid gap-2">
          <FormField
            control={form.control}
            name={"high"}
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-2 place-items-center">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={field.disabled}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name="high"
                    />
                  </FormControl>
                  <FormLabel>{t("highCheckbox")}</FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"medium"}
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-2 place-items-center">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={field.disabled}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name="medium"
                    />
                  </FormControl>
                  <FormLabel>{t("mediumCheckbox")}</FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"low"}
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-2 place-items-center">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={field.disabled}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name="low"
                    />
                  </FormControl>
                  <FormLabel>{t("lowCheckbox")}</FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button disabled={!data || isLoading || isPending} type="submit">
          {t("NotificationSettingUpdate") + (isPending ? "..." : "")}
        </Button>
      </form>
    </Form>
  );
}
