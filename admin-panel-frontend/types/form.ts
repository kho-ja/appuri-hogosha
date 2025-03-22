import Parent from "./parent";
import Student from "./student";

export default interface Form {
  additional_message: string;
  date: string;
  id: number;
  parent: Parent;
  reason: "absence" | "lateness" | "leaving" | "other";
  sent_at: string;
  status: "accept" | "decline" | "wait";
  student: Student;
}
