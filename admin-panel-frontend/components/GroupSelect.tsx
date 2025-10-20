"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useApiQuery from "@/lib/useApiQuery";
import Group from "@/types/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import useApiMutation from "@/lib/useApiMutation";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface GroupSelectProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

interface CreateGroupPayload {
  name: string;
  students?: number[];
  sub_group_id?: number | null;
}

export function GroupSelect({
  value,
  onChange,
  placeholder,
  allowEmpty = true,
}: GroupSelectProps) {
  const t = useTranslations("groups");
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const { data: groupsResp } = useApiQuery<{ groups: Group[] }>(
    `group/list?page=1&name=`,
    ["groups", 1, ""]
  );

  const groups = groupsResp?.groups ?? [];

  const { mutate: createGroup, isPending } = useApiMutation<
    { id: number; name: string },
    CreateGroupPayload
  >("group/create", "POST", ["create-group"], {
    onSuccess: (data) => {
      toast({ title: t("groupCreated"), description: data.name });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setNewGroupName("");
      setIsCreateDialogOpen(false);
      onChange(data.id);
    },
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup({ name: newGroupName.trim() });
  };

  return (
    <div className="flex gap-2">
      <Select
        value={value?.toString() || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : parseInt(val))}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || t("selectParentGroup")} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="none">{t("noParent")}</SelectItem>}
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id.toString()}>
              {g.name}{" "}
              {g.member_count !== undefined && (
                <span className="text-muted-foreground ml-1">
                  ({g.member_count})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon">
            <FolderPlus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createGroup")}</DialogTitle>
            <DialogDescription>{t("createGroupDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">{t("groupName")}</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t("enterGroupName")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || isPending}
            >
              {isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
