"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { File as FileIcon, Info } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Upload from "@/types/csvfile";
import { zodResolver } from "@hookform/resolvers/zod";
import Parent from "@/types/parent";
import { useEffect } from "react";
import useApiMutation from "@/lib/useApiMutation";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const formSchema = z.object({
  kintoneUrl: z.string().url(),
  kintoneToken: z.string().min(1),
  given_name_field: z.string().min(1),
  family_name_field: z.string().min(1),
  phone_number_field: z.string().min(1),
  email_field: z.string().min(1),
  student_number_field: z.string().min(1),
});

export default function CreateFromKintone() {
  const t = useTranslations("fromKintone");
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  const { mutate, error, isPending } = useApiMutation<{ message: string }>(
    `parent/kintoneUpload`,
    "POST",
    ["uploadKitnoneParents"],
    {
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["parents"],
        });
        toast({
          title: t("parentsUploaded"),
          description: t(data?.message),
        });
        router.push("/parents");
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formDataKintoneParent");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("kintoneUrl", parsedFormData.kintoneUrl);
      form.setValue("kintoneToken", parsedFormData.kintoneToken);
      form.setValue("given_name_field", parsedFormData.given_name_field);
      form.setValue("family_name_field", parsedFormData.family_name_field);
      form.setValue("email_field", parsedFormData.email_field);
      form.setValue("phone_number_field", parsedFormData.phone_number_field);
      form.setValue(
        "student_number_field",
        parsedFormData.student_number_field
      );
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formDataKintoneParent", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await mutate(values as any);
  };

  const errors = (error?.body ?? []) as Upload<Parent>;

  return (
    <main className="space-y-4">
      <PageHeader title={t("createParentFromKintone")}>
        <BackButton href={`/parents/create`} />
      </PageHeader>
      <Card className="p-5 space-y-2">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="kintoneUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("kintoneUrl")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {t("kintoneUrlDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kintoneToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("kintoneToken")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {t("kintoneTokenDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="given_name_field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("given_name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {t("given_nameDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="family_name_field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("family_name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {t("family_nameDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number_field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phone_number")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {t("phone_numberDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email_field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>{t("emailDescription")}</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="student_number_field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("student_number")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {t("student_numberDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            <Button type="submit" isLoading={isPending}>
              {t("uploadFromKintone")}
            </Button>
          </form>
        </Form>
        <div>{t("newHere?")}</div>
        <Link href="/instruction" className="text-blue-600">
          {t("howToCreateFromKintone")}
        </Link>
      </Card>

      <Card x-chunk="dashboard-05-chunk-3">
        <CardHeader className="flex flex-row justify-between items-center ">
          <div>
            <CardTitle>{t("parentsschema")}</CardTitle>
            <CardDescription>{t("errorsInParents")}</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-sm">
            <FileIcon className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">{t("export")}</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>email</TableHead>
                <TableHead>given_name</TableHead>
                <TableHead>family_name</TableHead>
                <TableHead>phone_number</TableHead>
                <TableHead>student_number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.errors?.length > 0 &&
                errors.errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <ErrorCell name="email" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="given_name" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="family_name" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="phone_number" error={error} />
                    </TableCell>
                    <TableCell>
                      <div className="w-full flex justify-between">
                        {Array.isArray(error.row.student_number)
                          ? error?.row?.student_number.join(", ")
                          : error?.row?.student_number}
                        {error?.errors?.student_number && (
                          <HoverCard>
                            <HoverCardTrigger className="flex justify-end flex-grow">
                              <Info className="text-red-500" />
                            </HoverCardTrigger>
                            <HoverCardContent className="text-red-500">
                              {error.errors.student_number}
                            </HoverCardContent>
                          </HoverCard>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {errors && (
        <div>
          {errors.inserted?.length > 0 && (
            <ErrorTable
              title={t("parentsCreated")}
              description={t("parentsCreatedDescription")}
              errors={errors}
              name="inserted"
            />
          )}
          {errors.updated?.length > 0 && (
            <ErrorTable
              title={t("parentsUpdated")}
              description={t("parentsUpdatedDescription")}
              errors={errors}
              name="updated"
            />
          )}
          {errors.deleted?.length > 0 && (
            <ErrorTable
              title={t("parentsDeleted")}
              description={t("parentsDeletedDescription")}
              errors={errors}
              name="deleted"
            />
          )}
        </div>
      )}
    </main>
  );
}

const ErrorCell = ({
  name,
  error,
}: {
  name: keyof Upload<Parent>["errors"][0]["row"];
  error: Upload<Parent>["errors"][0];
}) => {
  return (
    <div className="w-full flex justify-between">
      {error?.row[name] !== undefined && <span>{error?.row[name]}</span>}
      {error?.errors[name] && (
        <HoverCard>
          <HoverCardTrigger className="flex justify-end flex-grow">
            <Info className="text-red-500" />
          </HoverCardTrigger>
          <HoverCardContent className="text-red-500">
            {error?.errors?.[name]}
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
};

const ErrorTable = ({
  title,
  description,
  errors,
  name,
}: {
  title: string;
  description: string;
  errors: Upload<Parent>;
  name: "inserted" | "updated" | "deleted";
}) => {
  return (
    <Card x-chunk="dashboard-05-chunk-4">
      <CardHeader className="flex flex-row justify-between items-center ">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>email</TableHead>
              <TableHead>given_name</TableHead>
              <TableHead>family_name</TableHead>
              <TableHead>phone_number</TableHead>
              <TableHead>student_number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors[name]?.map((parent, index) => (
              <TableRow key={index}>
                <TableCell>
                  <span>{parent?.email}</span>
                </TableCell>
                <TableCell>
                  <span>{parent?.given_name}</span>
                </TableCell>
                <TableCell>
                  <span>{parent?.family_name}</span>
                </TableCell>
                <TableCell>
                  <span>{parent?.phone_number}</span>
                </TableCell>
                <TableCell>
                  <span>{parent?.student_number}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
