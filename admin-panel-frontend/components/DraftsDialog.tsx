"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import Image from "next/image";
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
import Student from "@/types/student";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/navigation";
import { toast } from "@/components/ui/use-toast";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type DraftsDialogProps = {
  handleSelectedDraft: (data: any) => void;
  draftsDataProp: any[];
};

export default function DraftsDialog({
  draftsDataProp,
  handleSelectedDraft,
}: DraftsDialogProps) {
  const t = useTranslations("sendmessage");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [fileKey, setFileKey] = useState(0);
  const [draftsData, setDraftsData] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const tName = useTranslations("names");

  useEffect(() => {
    let draftsLocal = localStorage.getItem("DraftsData");
    let parsedDrafts = draftsLocal ? JSON.parse(draftsLocal) : [];
    setDraftsData(parsedDrafts);
  }, []);

  useEffect(() => {
    setDraftsData(draftsDataProp);
  }, [draftsDataProp]);

  const handleDeleteDraft = (draft: any) => {
    if (draft) {
      let drafts = draftsData.filter((d) => {
        if (
          !(
            d.title === draft.title &&
            d.description === draft.description &&
            d.priority === draft.priority &&
            d.image === draft.image &&
            d.students === draft.students &&
            d.groups === draft.groups
          )
        ) {
          return d;
        }
      });
      setDraftsData(drafts);
      localStorage.setItem("DraftsData", JSON.stringify(drafts));
      toast({
        title: t("draftDeleted"),
        description: draft?.title,
      });
    }
  };

  const handleSelectedDraftFunction = (data: any) => {
    let draft = {
      title: data?.title,
      description: data?.description,
      priority: data?.priority,
      image: data?.image,
      groups: data?.groups || [],
      student: data?.students || [],
    };

    handleSelectedDraft(draft as any);
    setSelectedGroups(data?.groups || []);
    setSelectedStudents(data?.students || []);
    setIsDialogOpen(false);
  };

  return (
    <div className="inline-block">
      <Dialog>
        <DialogTrigger asChild>
          <Button onClick={() => {}}>
            {t("drafts")}
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-[60%] max-h-max"
          aria-describedby={undefined}
        >
          <DialogTitle className="text-2xl">{t("drafts")}</DialogTitle>
          <div className="w-full">
            {draftsData.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 w-full">
                {draftsData.map((draft, index) => (
                  <div key={index}>
                    <Card
                      onClick={() => {
                        setIsDialogOpen(true);
                        setSelectedDraft(draft);
                      }}
                      className="p-2 cursor-pointer hover:bg-muted/40 flex flex-col gap-1"
                    >
                      <CardTitle className="text-md w-full font-bold overflow-hidden text-ellipsis line-clamp-1">
                        {draft.title}
                      </CardTitle>
                      <CardDescription className="text-sm font-light whitespace-pre-wrap overflow-hidden text-ellipsis line-clamp-1">
                        {draft.description}
                      </CardDescription>
                      <div className="flex justify-start">
                        <div className="text-sm whitespace-pre-wrap px-3 py-1 rounded-full border">
                          {draft.priority ? t(`${draft.priority}`) : t("low")}
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full col-start-2 text-center">
                {t("noDrafts")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[80%] max-h-max"
          aria-describedby={undefined}
        >
          {/* title description image priority */}
          <DialogHeader className="flex flex-row ">
            <div className="w-[60%] flex flex-col gap-2">
              <DialogTitle className="text-xl text-center">
                {selectedDraft?.title}
              </DialogTitle>
              <DialogDescription className="text-md">
                {selectedDraft?.description}
              </DialogDescription>
              <div className="flex justify-start">
                <div className="rounded-md bg-slate-500 p-2 flex justify-center">
                  {t("priority")}:{" "}
                  {selectedDraft?.priority
                    ? t(`${selectedDraft?.priority}`)
                    : t("low")}
                </div>
              </div>
              {selectedDraft?.image ? (
                <div className="rounded object-cover flex justify-start">
                  <div className="border">
                    <Image
                      src={`${selectedDraft?.image}`}
                      width={300}
                      height={200}
                      alt={selectedDraft?.title}
                      className="rounded object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="sm:w-1 sm:h-full bg-slate-600 mx-3"></div>
            <div className="w-[40%] sm:max-w-[40%] flex flex-col gap-2">
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
            </div>
          </DialogHeader>
          {/* buttons */}
          <DialogFooter className="flex gap-1 justify-end">
            <DialogClose asChild>
              <Button
                onClick={() => handleSelectedDraftFunction(selectedDraft)}
              >
                {t("place")}
              </Button>
            </DialogClose>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant={"secondary"}>{t("delete")}</Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-[40%] max-h-max"
                aria-describedby={undefined}
              >
                <DialogTitle>{t("AreYouSureDelete")}</DialogTitle>
                <div className="flex flex-row justify-start gap-2 items-center">
                  <DialogClose asChild>
                    <Button
                      variant={"secondary"}
                      onClick={() => {
                        handleDeleteDraft(selectedDraft);
                        setIsDialogOpen(false);
                      }}
                    >
                      {t("delete")}
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>{t("cancel")}</Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
            <DialogClose asChild>
              <Button>{t("close")}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
