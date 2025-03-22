import pagination from "./pagination";
import Student from "./student";

type StudentApi = {
  students: Student[];
  pagination: pagination;
};

export default StudentApi;
