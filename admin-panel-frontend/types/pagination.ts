type pagination = {
  prev_page: number;
  next_page: number;
  current_page: number;
  total_pages: number;
  total_students: number;
  links: Array<string | number>;
};

export default pagination;
