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
import Post from "@/types/post";
import { convertToUtf8IfNeeded, download } from "@/lib/utils";

export default function MessageFromCSV() {
  const t = useTranslations("fromcsv");
  const formSchema = z.object({
    csvFile: z.instanceof(File).refine((file) => file.name.endsWith(".csv")),
  });

  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });
  const { mutate, error, isPending } = useFormMutation<{ message: string }>(
    `post/upload`,
    "POST",
    ["uploadPosts"],
    {
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["posts"],
        });
        form.reset();
        toast({
          title: t("postsUploaded"),
          description: data?.message,
        });
        router.push("/messages");
      },
    }
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const file = values.csvFile;
    const formData = new FormData();

    const utf8Blob = await convertToUtf8IfNeeded(file);

    formData.append("file", utf8Blob);
    formData.append("throwInError", "false");
    formData.append("withCSV", "true");

    mutate(formData);
  };

  const errors = (error?.body ?? []) as Upload<Post>;

  return (
    <main className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">{t("createPostsFromCsv")}</h1>
        <Link href="/messages/create" passHref>
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
                  <FormLabel>{t("createPosts")}</FormLabel>
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
            <CardTitle>{t("postsschema")}</CardTitle>
            <CardDescription>{t("errorsInPosts")}</CardDescription>
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
                <TableHead>title</TableHead>
                <TableHead>description</TableHead>
                <TableHead>priority</TableHead>
                <TableHead>group_names</TableHead>
                <TableHead>student_number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.errors?.length > 0 &&
                errors.errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <ErrorCell name="title" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="description" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="priority" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="group_names" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="student_numbers" error={error} />
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
              title={t("postsCreated")}
              description={t("postsCreatedDescription")}
              errors={errors}
              name="inserted"
            />
          )}
          {errors.updated?.length > 0 && (
            <ErrorTable
              title={t("postsUpdated")}
              description={t("postsUpdatedDescription")}
              errors={errors}
              name="updated"
            />
          )}
          {errors.deleted?.length > 0 && (
            <ErrorTable
              title={t("postsDeleted")}
              description={t("postsDeletedDescription")}
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
  name: keyof Upload<Post>["errors"][0]["row"];
  error: Upload<Post>["errors"][0];
}) => {
  const t = useTranslations("fromcsv");
  return (
    <div className="w-full flex justify-between">
      {error?.row[name] !== undefined && (
        <span>
          {Array.isArray(error?.row[name])
            ? (error?.row[name] as any)?.join(", ")
            : (error?.row[name] as string)}
        </span>
      )}
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
  errors: Upload<Post>;
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
              <TableHead>title</TableHead>
              <TableHead>description</TableHead>
              <TableHead>priority</TableHead>
              <TableHead>group_names</TableHead>
              <TableHead>student_numbers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors[name]?.map((post, index) => (
              <TableRow key={index}>
                <TableCell>
                  <span>{post?.title}</span>
                </TableCell>
                <TableCell>
                  <span>{post?.description}</span>
                </TableCell>
                <TableCell>
                  <span>{post?.priority}</span>
                </TableCell>
                <TableCell>
                  <span>
                    {Array.isArray(post?.group_names)
                      ? post?.group_names.join(", ")
                      : post?.group_names}
                  </span>
                </TableCell>
                <TableCell>
                  <span>
                    {Array.isArray(post?.student_numbers)
                      ? post?.student_numbers.join(", ")
                      : post?.student_numbers}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
