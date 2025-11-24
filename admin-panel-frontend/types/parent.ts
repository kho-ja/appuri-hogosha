export default interface Parent {
  id: number;
  given_name: string;
  family_name: string;
  email: string;
  phone_number: string;
  created_at?: string;
  last_login_at?: string;
  viewed_at?: string;
  arn?: string;
  student_numbers?: string[];
  student_number?: string;
  students?: Array<{
    id: number;
    given_name: string;
    family_name: string;
    student_number?: string;
  }>;
}
