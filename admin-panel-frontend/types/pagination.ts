type pagination = {
  prev_page: number;
  next_page: number;
  current_page: number;
  links: Array<string | number>;
};

export default pagination;
