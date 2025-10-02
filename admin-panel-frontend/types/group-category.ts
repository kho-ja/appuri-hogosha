import Group from "./group";

export default interface GroupCategory {
  id: number;
  name: string;
  parent_category_id?: number | null;
  parent_category_name?: string;
  created_at?: string;
  group_count?: number;
  children?: GroupCategory[];
  groups?: Group[];
}
