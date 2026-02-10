import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StudentTable } from "@/components/StudentTable";
import { useTranslations } from "next-intl";
import Student from "@/types/student";
import useApiMutation from "@/lib/useApiMutation";
import { toast } from "@/components/ui/use-toast";

interface EditStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  currentStudents: Student[];
}

export default function EditStudentsDialog({
  isOpen,
  onClose,
  messageId,
  currentStudents,
}: EditStudentsDialogProps) {
  const t = useTranslations("EditStudentsDialog");
  const [selectedStudents, setSelectedStudents] =
    useState<Student[]>(currentStudents);

  const { mutate, isPending } = useApiMutation<
    { success: boolean },
    { students: number[] }
  >(`post/${messageId}/sender`, "PUT", ["message", messageId], {
    onSuccess: () => {
      toast({
        title: t("studentsUpdated"),
        description: t("studentsUpdatedDescription"),
      });
      onClose();
    },
  });

  const handleSave = () => {
    mutate({
      students: selectedStudents.map((student) => student.id),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80%] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editStudents")}</DialogTitle>
        </DialogHeader>
        <StudentTable
          selectedStudents={selectedStudents}
          setSelectedStudents={setSelectedStudents}
        />
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
