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
import Group from "@/types/group";
import { convertToUtf8IfNeeded, download } from "@/lib/utils";

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
    `group/upload`,
    "POST",
    ["uploadGroups"],
    {
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["groups"],
        });
        form.reset();
        toast({
          title: t("groupsUploaded"),
          description: t(data?.message),
        });
        router.push("/groups");
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

  const errors = (error?.body ?? []) as Upload<Group>;

  return (
    <main className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">{t("createGroupFromCsv")}</h1>
        <Link href="/groups/create" passHref>
          <Button type="button" variant={"secondary"}>
            {t("back")}
          </Button>
        </Link>
      </div>
      <Card className="p-5 space-y-2">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="csvFile"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>{t("createGroup")}</FormLabel>
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

            <Button type="submit" disabled={isPending}>
              {t("Upload csv file") + (isPending ? "..." : "")}
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
            <CardTitle>{t("groupsschema")}</CardTitle>
            <CardDescription>{t("errorsInGroups")}</CardDescription>
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
                <TableHead>name</TableHead>
                <TableHead>student_number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.errors?.length > 0 &&
                errors.errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <ErrorCell name="name" error={error} />
                    </TableCell>
                    <TableCell>
                      {error?.row && (
                        <div className="flex justify-between">
                          {Array.isArray(error?.row?.student_numbers)
                            ? error?.row?.student_numbers.join(", ")
                            : error?.row?.student_numbers}
                          {error.errors.student_numbers && (
                            <HoverCard>
                              <HoverCardTrigger>
                                <Info className="text-red-500" />
                              </HoverCardTrigger>
                              <HoverCardContent className="text-red-500">
                                {error.errors.student_numbers}
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </div>
                      )}
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
              title={t("groupsCreated")}
              description={t("groupsCreatedDescription")}
              errors={errors}
              name="inserted"
            />
          )}
          {errors.updated?.length > 0 && (
            <ErrorTable
              title={t("groupsUpdated")}
              description={t("groupsUpdatedDescription")}
              errors={errors}
              name="updated"
            />
          )}
          {errors.deleted?.length > 0 && (
            <ErrorTable
              title={t("groupsDeleted")}
              description={t("groupsDeletedDescription")}
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
  name: keyof Upload<Group>["errors"][0]["row"];
  error: Upload<Group>["errors"][0];
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
  errors: Upload<Group>;
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
              <TableHead>name</TableHead>
              <TableHead>student_numbers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors[name]?.map((group, index) => (
              <TableRow key={index}>
                <TableCell>
                  <span>{group?.name}</span>
                </TableCell>
                <TableCell>
                  <span>{group?.student_numbers?.join(", ")}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
