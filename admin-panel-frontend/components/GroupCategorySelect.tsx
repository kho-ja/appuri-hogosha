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
import GroupCategory from "@/types/group-category";
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

interface GroupCategorySelectProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

interface CreateCategoryPayload {
  name: string;
  parent_category_id?: number | null;
}

export function GroupCategorySelect({
  value,
  onChange,
  placeholder,
  allowEmpty = true,
}: GroupCategorySelectProps) {
  const t = useTranslations("GroupCategory");
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  const { data: categories } = useApiQuery<{ categories: GroupCategory[] }>(
    "group-category/list",
    ["group-categories"]
  );

  const { mutate: createCategory, isPending } = useApiMutation<
    { id: number; name: string },
    CreateCategoryPayload
  >("group-category/create", "POST", ["create-category"], {
    onSuccess: (data) => {
      toast({
        title: t("categoryCreated"),
        description: data.name,
      });
      queryClient.invalidateQueries({ queryKey: ["group-categories"] });
      setNewCategoryName("");
      setSelectedParentId(null);
      setIsCreateDialogOpen(false);
      onChange(data.id);
    },
  });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    createCategory({
      name: newCategoryName.trim(),
      parent_category_id: selectedParentId,
    });
  };

  // Create a flat list with indentation for tree structure
  const flattenCategories = (
    cats: GroupCategory[] = [],
    level = 0
  ): Array<GroupCategory & { level: number }> => {
    const result: Array<GroupCategory & { level: number }> = [];

    cats
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((cat) => {
        result.push({ ...cat, level });
        if (cat.children && cat.children.length > 0) {
          result.push(...flattenCategories(cat.children, level + 1));
        }
      });

    return result;
  };

  // Build the tree structure
  const buildTree = (cats: GroupCategory[]): GroupCategory[] => {
    const categoryMap = new Map<number, GroupCategory>();
    const result: GroupCategory[] = [];

    // First pass: create all categories with empty children arrays
    cats.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build the tree
    cats.forEach((cat) => {
      const categoryWithChildren = categoryMap.get(cat.id)!;
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.children!.push(categoryWithChildren);
        }
      } else {
        result.push(categoryWithChildren);
      }
    });

    return result;
  };

  const tree = categories ? buildTree(categories.categories) : [];
  const flatCategories = flattenCategories(tree);

  const getIndentPrefix = (level: number) => "  ".repeat(level);

  return (
    <div className="flex gap-2">
      <Select
        value={value?.toString() || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : parseInt(val))}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || t("selectCategory")} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value="none">{t("noCategory")}</SelectItem>
          )}
          {flatCategories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              {getIndentPrefix(category.level)}
              {category.name}
              {category.group_count !== undefined && (
                <span className="text-muted-foreground ml-1">
                  ({category.group_count})
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
            <DialogTitle>{t("createCategory")}</DialogTitle>
            <DialogDescription>
              {t("createCategoryDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{t("categoryName")}</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t("enterCategoryName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-category">{t("parentCategory")}</Label>
              <Select
                value={selectedParentId?.toString() || "none"}
                onValueChange={(val) =>
                  setSelectedParentId(val === "none" ? null : parseInt(val))
                }
              >
                <SelectTrigger id="parent-category">
                  <SelectValue placeholder={t("selectParentCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noParent")}</SelectItem>
                  {flatCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {getIndentPrefix(category.level)}
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || isPending}
            >
              {isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
