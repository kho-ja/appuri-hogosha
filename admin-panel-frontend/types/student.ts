import Parent from "./parent";

export default interface Student {
  id: number;
  email: string;
  phone_number: string;
  student_number: string;
  given_name: string;
  family_name: string;
  parents?: Parent[];
}
