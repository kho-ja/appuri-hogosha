import Admin from "./admin";
import pagination from "./pagination";

type AdminApi = {
    admins: Admin[];
    pagination: pagination;
};

export default AdminApi;
