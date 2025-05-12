"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import useFormMutation from "@/lib/useFormMutation";
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
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
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
import Student from "@/types/student";
import { convertToUtf8IfNeeded, download } from "@/lib/utils";
import useApiMutation from "@/lib/useApiMutation";
import { useEffect } from "react";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const formSchema = z.object({
  kintoneUrl: z.string().min(1).url(),
  kintoneToken: z.string().min(1),
  given_name_field: z.string().min(1),
  family_name_field: z.string().min(1),
  email_field: z.string().min(1),
  student_number_field: z.string().min(1),
  phone_number_field: z.string().min(1),
});

export default function CreateFromKintone() {
  const t = useTranslations("fromKintone");
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  const { mutate, error, isPending } = useApiMutation<{ message: string }>(
    `student/kintoneUpload`,
    "POST",
    ["uploadKintoneStudents"],
    {
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["students"],
        });
        toast({
          title: t("studentsUploaded"),
          description: t(data?.message),
        });
        router.push("/students");
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formDataKintoneStudent");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("kintoneUrl", parsedFormData.kintoneUrl);
      form.setValue("kintoneToken", parsedFormData.kintoneToken);
      form.setValue("given_name_field", parsedFormData.given_name_field);
      form.setValue("family_name_field", parsedFormData.family_name_field);
      form.setValue("email_field", parsedFormData.email_field);
      form.setValue(
        "student_number_field",
        parsedFormData.student_number_field
      );
      form.setValue("phone_number_field", parsedFormData.phone_number_field);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formDataKintoneStudent", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    mutate(values as any);
  };

  const errors = (error?.body ?? []) as Upload<Student>;

  return (
    <main className="space-y-4">
      <PageHeader title={t("createFromKintone")}>
        <BackButton href={`/students/create`} />
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("kintoneUrlDescription")}
                  </FormDescription>
                  <FormMessage />
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("kintoneTokenDescription")}
                  </FormDescription>
                  <FormMessage />
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("given_nameDescription")}
                  </FormDescription>
                  <FormMessage />
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("family_nameDescription")}
                  </FormDescription>
                  <FormMessage />
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("student_numberDescription")}
                  </FormDescription>
                  <FormMessage />
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>{t("emailDescription")}</FormDescription>
                  <FormMessage />
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("phone_numberDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" isLoading={isPending}>
              {t("uploadFromKintone")}
            </Button>
          </form>
        </Form>
        <div>{t("newHere?")}</div>
        <Link href="/fromKintone/instruction" className="text-blue-600">
          {t("howToCreateFromKintone")}
        </Link>
      </Card>

      <Card x-chunk="dashboard-05-chunk-3">
        <CardHeader className="flex flex-row justify-between items-center ">
          <div>
            <CardTitle>{t("studentsschema")}</CardTitle>
            <CardDescription>{t("errorsInStudents")}</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              errors?.csvFile && download(errors?.csvFile, "errors.kintone")
            }
            className="h-7 gap-1 text-sm"
          >
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
                      <ErrorCell name="student_number" error={error} />
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
              title={t("studentsCreated")}
              description={t("studentsCreatedDescription")}
              errors={errors}
              name="inserted"
            />
          )}
          {errors.updated?.length > 0 && (
            <ErrorTable
              title={t("studentsUpdated")}
              description={t("studentsUpdatedDescription")}
              errors={errors}
              name="updated"
            />
          )}
          {errors.deleted?.length > 0 && (
            <ErrorTable
              title={t("studentsDeleted")}
              description={t("studentsDeletedDescription")}
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
  name: keyof Upload<Student>["errors"][0]["row"];
  error: Upload<Student>["errors"][0];
}) => {
  return (
    <div className="w-full flex justify-between">
      {error?.row?.[name] !== undefined && (
        <span>{error?.row[name] as string}</span>
      )}
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
  errors: Upload<Student>;
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
            {errors[name]?.map((student, index) => (
              <TableRow key={index}>
                <TableCell>
                  <span>{student?.email}</span>
                </TableCell>
                <TableCell>
                  <span>{student?.given_name}</span>
                </TableCell>
                <TableCell>
                  <span>{student?.family_name}</span>
                </TableCell>
                <TableCell>
                  <span>{student?.phone_number}</span>
                </TableCell>
                <TableCell>
                  <span>{student?.student_number}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
