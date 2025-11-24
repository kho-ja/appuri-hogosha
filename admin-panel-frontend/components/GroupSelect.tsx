"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useApiQuery from "@/lib/useApiQuery";
import { useTranslations } from "next-intl";
import Group from "@/types/group";

interface GroupSelectProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
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
