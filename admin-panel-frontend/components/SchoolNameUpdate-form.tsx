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
import { useTranslations } from "next-intl";
import useApiMutation from "@/lib/useApiMutation";
import useApiQuery from "@/lib/useApiQuery";
import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

const formSchema = z.object({
  name: z.string().min(1),
});

type SchoolNameValues = z.infer<typeof formSchema>;

const defaultValues: Partial<SchoolNameValues> = {
  name: "",
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

export function SchoolNameUpdate() {
  const { update, data: session } = useSession()
  const { toast } = useToast();
  const t = useTranslations("SchoolNameUpdate");
  const form = useForm<SchoolNameValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  const { data, isLoading } = useApiQuery<School>("school/sms", ["SMS"]);
  const { mutate, isPending } = useApiMutation(
    "school/name",
    "POST",
    ["schoolName"],
    {
      onSuccess: async (data: any) => {
        toast({
          title: t("SchoolNameUpdated"),
          description: data?.message ?? "",
        });
        console.log('school', data.school.name)
        const updatedSession = { schoolName: data.school.name };
        const response = await update(updatedSession);
        console.log('response', response);
      },
      onError: (error) => {
        toast({
          title: t("SchoolNameUpdateFailed"),
          description: error?.message ?? "",
        });
        console.log(error);
      },
    }
  );

  useEffect(() => {
    if (!isLoading && data) {
      form.reset({
        name: data.school.name,
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
          <div>
            <FormLabel className="text-lg font-medium">
              {t("SchoolName")}
            </FormLabel>
            <FormDescription>{t("SchoolNameDescription")}</FormDescription>
          </div>

          <div className="flex flex-row gap-4 items-center mt-2">
            <FormField
              control={form.control}
              name={"name"}
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2 place-items-center">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("SchoolName")}
                        className="w-[300px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <Button disabled={!data || isLoading || isPending} type="submit">
              {t("SchoolNameEditBtn") + (isPending ? "..." : "")}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
