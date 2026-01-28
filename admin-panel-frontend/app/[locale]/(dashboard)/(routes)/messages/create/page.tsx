"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import DraftsDialog from "@/components/DraftsDialog";
import { X, Send } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateTimePicker24h } from "@/components/DateTimePicker24h";
import { Switch } from "@/components/ui/switch";
import { postCreateSchema } from "@/lib/validationSchemas";

const formSchema = postCreateSchema;

export default function SendMessagePage() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const tName = useTranslations("names");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [draftsData, setDraftsData] = useState<any[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [shouldPersistForm, setShouldPersistForm] = useState(true);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isImageUploading, setIsImageUploading] = useState(false);
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
  const clearFormPersistence = () => {
    setShouldPersistForm(false);
    localStorage.removeItem("formDataMessages");
  };
  const { mutate, isPending } = useApiMutation<{ post: Post }>(
    `post/create`,
    "POST",
    ["sendMessage"],
    {
      onSuccess: (data) => {
        toast({
          title: t("messageSent"),
          description: data?.post?.title ?? "",
        });
        setSelectedStudents([]);
        setSelectedGroups([]);
        clearFormPersistence();
        form.reset();
        setImagePreview("");
        setFileKey((prev) => prev + 1);
        router.push("/messages");
      },
    }
  );
  const priority = form.watch("priority");

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  const scheduleMutation = useApiMutation<{ post: Post }>(
    `schedule`,
    "POST",
    ["scheduledPosts"],
    {
      onSuccess: (data) => {
        if (data?.post?.title) {
          toast({
            title: t("scheduledSuccessfully"),
            description: data.post.title,
          });
        } else {
          toast({
            title: t("scheduledSuccessfully"),
            description: t("noTitleAvailable"),
          });
        }
        setSelectedStudents([]);
        setSelectedGroups([]);
        clearFormPersistence();
        form.reset();
        setImagePreview("");
        setFileKey((prev) => prev + 1);
        router.push("/messages?tab=scheduled");
      },
    }
  );
  const uploadImageMutation = useApiMutation<
    { image: string },
    { image: string }
  >(`post/image`, "POST", ["postImage"], {
    onSuccess: (data) => {
      form.setValue("image", data.image, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setImagePreview("");
    },
    onSettled: () => {
      setIsImageUploading(false);
      toast({
        title: "Image upload finished",
      });
    },
  });

  useEffect(() => {
    form.setValue("priority", priority);
  }, [priority, form]);

  useEffect(() => {
    if (!shouldPersistForm) return;
    const savedFormData = localStorage.getItem("formDataMessages");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.reset(parsedFormData);
    }

    const subscription = form.watch((values) => {
      const safeValues = { ...values, image: undefined };
      localStorage.setItem("formDataMessages", JSON.stringify(safeValues));
    });
    return () => subscription.unsubscribe();
  }, [form, shouldPersistForm]);

  useEffect(() => {
    const draftsLocal = localStorage.getItem("DraftsData");
    const parsedDrafts = draftsLocal ? JSON.parse(draftsLocal) : [];
    setDraftsData(parsedDrafts);
  }, []);

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedStudents.length === 0 && selectedGroups.length === 0) {
      toast({
        title: t("error"),
        description: t("selectAtLeastOne"),
      });
      return;
    }
    if (isImageUploading) {
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

    if (scheduleEnabled) {
      if (!scheduledAt) {
        toast({
          title: t("error"),
          description: t("selectDateTime"),
        });
        return;
      }
      scheduleMutation.mutate({
        ...payload,
        scheduled_at: scheduledAt.toISOString(),
      } as any);
    } else {
      mutate(payload as any);
    }
  };

  const isFormValid = form.formState.isValid;
  const hasRecipients =
    selectedStudents.length > 0 || selectedGroups.length > 0;
  const isSubmitting =
    isPending || scheduleMutation.isPending || isImageUploading;

  const handleSaveDraft = (e: any) => {
    e.preventDefault();
    const data = form.getValues();

    const draftsLocal = JSON.parse(localStorage.getItem("DraftsData") || "[]");
    const parsedData = {
      id: draftsLocal.length || 0,
      ...data,
      groups: selectedGroups,
      students: selectedStudents,
    };

    if (parsedData) {
      draftsLocal.push(parsedData);
    }

    localStorage.setItem("DraftsData", JSON.stringify(draftsLocal));
    setDraftsData(draftsLocal);

    setSelectedStudents([]);
    setSelectedGroups([]);
    setFileKey((prev) => prev + 1);
    setImagePreview("");
    form.reset({
      title: "",
      description: "",
      priority: "low",
      image: "",
    });
    toast({
      title: t("draftSaved"),
      description: parsedData?.title,
    });
    localStorage.removeItem("formDataMessages");
  };

  const handleSelectedDraft = (draft: any) => {
    const draftImage =
      typeof draft.image === "string" && !draft.image.startsWith("data:")
        ? draft.image
        : "";
    form.reset({
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      image: draftImage,
    });

    setFileKey((prev) => prev + 1);
    setImagePreview("");
    setSelectedGroups(draft.groups || []);
    setSelectedStudents(draft.student || []);
  };

  const handleRemoveImg = () => {
    form.setValue("image", "");
    setImagePreview("");
    setFileKey((prev) => prev + 1);
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          ref={formRef}
          className="space-y-4"
        >
          <PageHeader title={t("sendMessage")} variant="create">
            <DraftsDialog
              draftsDataProp={draftsData}
              handleSelectedDraft={handleSelectedDraft}
            />
            <Link href="/fromcsv/message">
              <Button variant={"secondary"}>{t("createFromCSV")}</Button>
            </Link>
            <BackButton href={`/messages`} />
          </PageHeader>
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
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high">{t("high")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">{t("medium")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low">{t("low")}</Label>
                    </div>
                  </RadioGroup>
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
            render={() => (
              <FormItem>
                <FormLabel>{t("picture")}</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    key={fileKey}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        setIsImageUploading(true);
                        reader.onloadend = () => {
                          const result = reader.result;
                          if (typeof result !== "string") {
                            setIsImageUploading(false);
                            return;
                          }
                          setImagePreview(result);
                          form.setValue("image", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          uploadImageMutation.mutate(
                            { image: result },
                            {
                              onError: () => {
                                setImagePreview("");
                              },
                            }
                          );
                        };
                        reader.onerror = () => {
                          setIsImageUploading(false);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
                {(imagePreview || form.getValues("image")) && (
                  <div className="flex justify-start">
                    <div className="relative mt-2">
                      <div
                        className="absolute top-0 right-0 translate-x-[25%] -translate-y-[25%]"
                        onClick={handleRemoveImg}
                      >
                        <X className="h-7 w-7 bg-red-500 rounded-full cursor-pointer hover:bg-red-600 aspect-square p-1 font-bold" />
                      </div>
                      <Image
                        src={
                          imagePreview ||
                          (form.getValues("image")
                            ? `/${form.getValues("image")}`
                            : "")
                        }
                        alt="Selected image"
                        width={200}
                        height={200}
                        className="rounded object-cover"
                      />
                    </div>
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
                useIndependentState={true}
              />
            </TabsContent>
            <TabsContent value="student">
              <StudentTable
                selectedStudents={selectedStudents}
                setSelectedStudents={setSelectedStudents}
                useIndependentState={true}
              />
            </TabsContent>
          </Tabs>
          <div className="flex flex-col gap-4 border p-4 rounded-md bg-muted/40">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                {t("doYouWantSchedule")}
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={scheduleEnabled}
                  onCheckedChange={setScheduleEnabled}
                  id="schedule-switch"
                />
                <Label htmlFor="schedule-switch" className="ml-2">
                  {scheduleEnabled ? t("yes") : t("no")}
                </Label>
              </div>
            </div>
            {scheduleEnabled && (
              <div className="mt-2">
                <DateTimePicker24h
                  value={scheduledAt}
                  onChange={setScheduledAt}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  isLoading={isSubmitting}
                  disabled={!isFormValid || !hasRecipients || isSubmitting}
                  icon={<Send className="h-4 w-4" />}
                >
                  {t("sendMessage")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[80%] max-h-max">
                <div className="sm:flex gap-4">
                  <DialogHeader className="w-full whitespace-pre-wrap">
                    <DialogTitle className="whitespace-pre-wrap break-all text-center">
                      {formValues.title}
                    </DialogTitle>
                    <DialogDescription className="whitespace-pre-wrap break-all">
                      <ReactLinkify>{formValues.description}</ReactLinkify>
                    </DialogDescription>
                    <div className="flex w-full">
                      <div className="bg-slate-500 px-4 py-1 rounded ">
                        {t("priority")}:{" "}
                        {formValues.priority && t(formValues.priority)}
                      </div>
                    </div>
                    {(imagePreview || formValues.image) && (
                      <div className="mt-4">
                        <Image
                          src={
                            imagePreview ||
                            (formValues.image ? `/${formValues.image}` : "")
                          }
                          alt="Selected image"
                          width={300}
                          height={200}
                          className="rounded object-cover"
                        />
                      </div>
                    )}
                    {scheduleEnabled && scheduledAt && (
                      <div className="mt-2 text-left text-sm">
                        {t("scheduledAt")}:{" "}
                        {scheduledAt &&
                          scheduledAt
                            .toLocaleString("uz-UZ", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                            .replace(",", "")}
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
                <DialogFooter className="flex flex-wrap justify-end gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      {t("close")}
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="submit"
                      disabled={!isFormValid || !hasRecipients || isSubmitting}
                      isLoading={isSubmitting}
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
                  <DialogClose asChild></DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant={"secondary"}
              disabled={isSubmitting || !isFormValid || !hasRecipients}
              onClick={(e) => handleSaveDraft(e)}
            >
              {t("saveToDraft")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
