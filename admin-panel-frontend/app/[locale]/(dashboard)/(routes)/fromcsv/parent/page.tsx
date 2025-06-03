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
import Parent from "@/types/parent";
import { convertToUtf8IfNeeded, download } from "@/lib/utils";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";

const formSchema = z.object({
  csvFile: z.instanceof(File).refine((file) => file.name.endsWith(".csv")),
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
  const { mutate, error, isPending } = useFormMutation<{ message: string }>(
    `parent/upload`,
    "POST",
    ["uploadParents"],
    {
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["parents"],
        });
        form.reset();
        toast({
          title: t("parentsUploaded"),
          description: t(data?.message),
        });
        router.push("/parents");
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

  const errors = (error?.body ?? []) as Upload<Parent>;

  return (
    <main className="space-y-4">
      <PageHeader title={t("createParentFromCsv")}>
        <BackButton href={`/parents/create`} />
      </PageHeader>
      <Card className="p-5 space-y-2">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="csvFile"
              render={({ field: { onChange, value, ...rest } }) => (
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

            <Button type="submit" isLoading={isPending}>
              {t("Upload csv file")}
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
            <CardDescription>{t("errorsInParents")}</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              errors?.csvFile && download(errors?.csvFile, "errors.csv")
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
                <TableHead>student_numbers</TableHead>
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

const ErrorCell = ({
  name,
  error,
}: {
  name: keyof Upload<Parent>["errors"][0]["row"];
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
