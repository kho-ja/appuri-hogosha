"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Group from "@/types/group";
import { GroupTable } from "@/components/GroupTable";
import Student from "@/types/student";
import { StudentTable } from "@/components/StudentTable";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { toast } from "@/components/ui/use-toast";
import Post from "@/types/post";
import ReactLinkify from "react-linkify";
import useApiMutation from "@/lib/useApiMutation";
import { Send } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  image: z.string().optional(),
});

export default function SendMessagePage() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const tName = useTranslations("names");
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(
    null
  );
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      priority: "low",
      image: "",
    },
  });
  const formValues = useWatch({ control: form.control });
  const router = useRouter();
  const { mutate, isPending } = useApiMutation<{ post: Post }>(
    `post/create`,
    "POST",
    ["sendMessage"],
    {
      onSuccess: (data) => {
        toast({
          title: t("messageSent"),
          description: data.post.title,
        });
        setSelectedStudents([]);
        setSelectedGroups([]);
        setSelectedImageBase64(null);
        form.reset();
        localStorage.removeItem("formDataMessages");
        router.push("/messages");
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formDataMessages");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.reset(parsedFormData);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formDataMessages", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedStudents.length === 0 && selectedGroups.length === 0) {
      toast({
        title: t("error"),
        description: t("selectAtLeastOne"),
      });
      return;
    }
    const payload = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      students: selectedStudents.map((student) => student.id),
      groups: selectedGroups.map((group) => group.id),
      image: data.image,
    };

    mutate(payload as any);
  };

  const isFormValid = form.formState.isValid;
  const hasRecipients =
    selectedStudents.length > 0 || selectedGroups.length > 0;

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          ref={formRef}
          className="space-y-4"
        >
          <div className="flex flex-row justify-between items-center">
            <h1 className="text-3xl font-bold">{t("sendMessage")}</h1>
            <div className="space-x-4">
              <Link href="/fromcsv/message">
                <Button variant={"secondary"}>{t("createFromCSV")}</Button>
              </Link>
              <Link href="/messages" passHref>
                <Button type="button" variant={"secondary"}>
                  {t("back")}
                </Button>
              </Link>
            </div>
          </div>
          <FormField
            control={form.control}
            name="title"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("title")}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t("typeTitle")} />
                </FormControl>
                <FormMessage>
                  {formState.errors.title &&
                    "Title is required. Title should be more than 5 characters"}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("yourMessage")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder={t("typeMessage")}
                    {...field}
                  />
                </FormControl>
                <FormMessage>
                  {formState.errors.description &&
                    "Message is required. Message should be more than 10 characters"}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("choosePriority")}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("choosePriority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t("priority")}</SelectLabel>
                        <SelectItem value="high">{t("high")}</SelectItem>
                        <SelectItem value="medium">{t("medium")}</SelectItem>
                        <SelectItem value="low">{t("low")}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage>
                  {formState.errors.priority &&
                    "You should select one priority"}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("picture")}</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        field.onChange(file.name); // Save file name
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSelectedImageBase64(reader.result as string);
                          form.setValue("image", reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
                {selectedImageBase64 && (
                  <div className="mt-2">
                    <Image
                      src={selectedImageBase64}
                      alt="Selected image"
                      width={200}
                      height={200}
                      className="rounded object-cover"
                    />
                  </div>
                )}
              </FormItem>
            )}
          />

          <Tabs defaultValue="group">
            <TabsList>
              <TabsTrigger value="group">{t("groups")}</TabsTrigger>
              <TabsTrigger value="student">{t("students")}</TabsTrigger>
            </TabsList>
            <TabsContent value="group">
              <GroupTable
                selectedGroups={selectedGroups}
                setSelectedGroups={setSelectedGroups}
              />
            </TabsContent>
            <TabsContent value="student">
              <StudentTable
                selectedStudents={selectedStudents}
                setSelectedStudents={setSelectedStudents}
              />
            </TabsContent>
          </Tabs>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                isLoading={isPending}
                disabled={!isFormValid || !hasRecipients}
                icon={<Send className="h-4 w-4" />}
              >
                {t("sendMessage")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[80%] max-h-max">
              <div className="sm:flex gap-4">
                <DialogHeader className="w-full whitespace-pre-wrap">
                  <DialogTitle className="whitespace-pre-wrap text-center">
                    {formValues.title}
                  </DialogTitle>
                  <DialogDescription className="whitespace-pre-wrap">
                    <ReactLinkify>{formValues.description}</ReactLinkify>
                  </DialogDescription>
                  <div className="flex w-full">
                    <div className="bg-slate-500 px-4 py-1 rounded ">
                      {t("priority")}:{" "}
                      {formValues.priority && t(formValues.priority)}
                    </div>
                  </div>
                  {selectedImageBase64 && (
                    <div className="mt-4">
                      <Image
                        src={selectedImageBase64}
                        alt="Selected image"
                        width={300}
                        height={200}
                        className="rounded object-cover"
                      />
                    </div>
                  )}
                </DialogHeader>
                <div className="sm:w-1 sm:h-full bg-slate-600"></div>
                <div className="flex flex-wrap gap-4 items-start content-start sm:max-w-[40%]">
                  <div className="flex flex-col gap-1">
                    <b>{t("groups")}</b>
                    <div className="flex flex-wrap gap-2 items-start content-start ">
                      {selectedGroups.map((group) => (
                        <Badge key={group.id}>{group?.name}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <b>{t("students")}</b>
                    <div className="flex flex-wrap gap-2 items-start content-start ">
                      {selectedStudents.map((e) => (
                        <Badge key={e.id}>
                          {tName("name", { ...e, parents: "" })}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {!hasRecipients && (
                    <div className="w-full text-destructive text-center font-semibold">
                      {t("selectatleastone")}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    {t("close")}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    type="submit"
                    disabled={!isFormValid || !hasRecipients}
                    isLoading={isPending}
                    onClick={() => {
                      if (formRef.current) {
                        formRef.current.dispatchEvent(
                          new Event("submit", { bubbles: true })
                        );
                      }
                    }}
                  >
                    {t("confirm")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      </Form>
    </div>
  );
}
