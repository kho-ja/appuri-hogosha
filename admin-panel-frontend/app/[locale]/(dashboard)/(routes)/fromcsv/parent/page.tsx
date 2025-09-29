"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import useFormMutation from "@/lib/useFormMutation";
import useFileMutation from "@/lib/useFileMutation";
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
import { File as FileIcon, Info, UploadIcon, Download } from "lucide-react";
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
import Parent from "@/types/parent";
import { convertToUtf8IfNeeded, download } from "@/lib/utils";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const formSchema = z.object({
  csvFile: z
    .instanceof(File)
    .refine((file) => file.name.endsWith(".csv"), {
      message: "Only CSV files are allowed",
    })
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size must be less than 10MB",
    }),
  mode: z.enum(["create", "update", "delete"]),
});

export default function CreateFromCsv() {
  const t = useTranslations("fromcsv");
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      mode: "create",
      csvFile: undefined,
    },
  });
  const { mutate, error, isPending } = useFormMutation<Upload<Parent>>(
    `parent/upload`,
    "POST",
    ["uploadParents"],
    {
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["parents"],
        });
        form.reset();

        // Show success/warning toast based on results
        if (data.success && data.summary) {
          const { inserted, updated, deleted, errors } = data.summary;
          const totalProcessed = inserted + updated + deleted;

          if (errors > 0) {
            toast({
              title: t("parentsUploadedWithWarnings"),
              description: `${totalProcessed} parents processed, ${errors} errors found`,
              variant: "destructive",
            });
          } else {
            toast({
              title: t("parentsUploaded"),
              description: `${totalProcessed} parents processed successfully`,
            });
          }
        } else {
          toast({
            title: t("parentsUploaded"),
            description: t(data?.message || "Upload completed"),
          });
        }

        // Only navigate if no errors or user wants to proceed
        if (
          data.success &&
          (!data.summary?.errors || data.summary.errors === 0)
        ) {
          router.push("/parents");
        }
      },
      onError(error) {
        toast({
          title: t("uploadFailed"),
          description: t(error?.message || "wentWrong"),
          variant: "destructive",
        });
      },
    }
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const file = values.csvFile;
    const formData = new FormData();
    const convertedFile = await convertToUtf8IfNeeded(file);
    formData.append("file", convertedFile);
    formData.append("throwInError", "false");
    formData.append("withCSV", "true");
    formData.append("action", values.mode);

    mutate(formData);
  };

  const { mutate: downloadTemplate, isPending: isDownloading } =
    useFileMutation<Blob>("parent/template", ["downloadTemplate"]);

  // Safely derive structured CSV upload result from possible error body shape
  let errors: Upload<Parent> | null = null;
  if (error?.body && typeof error.body === "object") {
    const body = error.body as Record<string, unknown>;
    if (
      Array.isArray(body?.errors) &&
      Array.isArray(body?.inserted) &&
      Array.isArray(body?.updated) &&
      Array.isArray(body?.deleted)
    ) {
      errors = body as unknown as Upload<Parent>;
    }
  }

  return (
    <main className="space-y-4">
      <PageHeader title={t("createParentFromCsv")}>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadTemplate()}
            isLoading={isDownloading}
            icon={<Download className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            {t("downloadTemplate")}
          </Button>
          <BackButton href={`/parents/create`} />
        </div>
      </PageHeader>
      <Card className="p-5 space-y-2">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="csvFile"
              render={({ field: { onChange, value: _value, ...rest } }) => (
                <FormItem>
                  <FormLabel>{t("createParent")}</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target?.files?.[0];
                        if (file) {
                          onChange(file);
                        }
                      }}
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>{t("Upload csv file")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mode")}</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("choose")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create">{t("create")}</SelectItem>
                        <SelectItem value="update">{t("update")}</SelectItem>
                        <SelectItem value="delete">{t("delete")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>{t("chooseMode")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              isLoading={isPending}
              icon={<UploadIcon size={16} />}
            >
              {isPending ? t("processing") : t("Upload csv file")}
            </Button>
          </form>
        </Form>
        <div>{t("newHere?")}</div>
        <Link href="/instruction" className="text-blue-600">
          {t("howToCreateFromCSV")}
        </Link>
      </Card>

      <Card x-chunk="dashboard-05-chunk-3">
        <CardHeader className="flex flex-row justify-between items-center ">
          <div>
            <CardTitle>{t("parentsschema")}</CardTitle>
            <CardDescription>
              {errors?.summary && (
                <div className="mt-2 space-y-1">
                  <div>Total records: {errors.summary.total}</div>
                  <div>Processed: {errors.summary.processed}</div>
                  <div>Inserted: {errors.summary.inserted}</div>
                  <div>Updated: {errors.summary.updated}</div>
                  <div>Deleted: {errors.summary.deleted}</div>
                  <div className="text-red-500">
                    Errors: {errors.summary.errors}
                  </div>
                </div>
              )}
              {errors && errors?.errors?.length > 0 && (
                <div className="text-red-500 mt-2">{t("errorsInParents")}</div>
              )}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              errors?.csvFile && download(errors?.csvFile, "errors.csv")
            }
            className="h-7 gap-1 text-sm"
            disabled={!errors?.csvFile}
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
                <TableHead>student_numbers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors?.errors &&
                errors.errors.length > 0 &&
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
                        {Array.isArray(error.row.student_numbers)
                          ? error?.row?.student_numbers.join(", ")
                          : error?.row?.student_numbers}
                        {error?.errors?.student_numbers && (
                          <HoverCard>
                            <HoverCardTrigger className="flex justify-end flex-grow">
                              <Info className="text-red-500" />
                            </HoverCardTrigger>
                            <HoverCardContent className="text-red-500">
                              {error.errors.student_numbers}
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

type ParentField = "email" | "given_name" | "family_name" | "phone_number";

const ErrorCell = ({
  name,
  error,
}: {
  name: ParentField;
  error: Upload<Parent>["errors"][0];
}) => {
  const t = useTranslations("fromcsv");
  return (
    <div className="w-full flex justify-between">
      {error?.row[name] !== undefined && <span>{error?.row[name]}</span>}
      {error?.errors[name] && (
        <HoverCard>
          <HoverCardTrigger className="flex justify-end flex-grow">
            <Info className="text-red-500" />
          </HoverCardTrigger>
          <HoverCardContent className="text-red-500">
            {t(error.errors[name] || "")}
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
              <TableHead>student_numbers</TableHead>
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
                  <span>{parent?.student_numbers?.join(", ")}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
