export default interface Group {
  id: number;
  name: string;
  member_count?: number;
  viewed_count?: boolean;
  not_viewed_count?: boolean;
  created_at?: string;
  student_numbers?: string[];
  group_category_id?: number | null;
  category_name?: string;
}
