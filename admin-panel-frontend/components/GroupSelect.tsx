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

  const { data: groupsResp } = useApiQuery<{ groups: Group[] }>(
    `group/list?page=1&name=`,
    ["groups", 1, ""]
  );

  const groups = groupsResp?.groups ?? [];

  return (
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
  );
}
