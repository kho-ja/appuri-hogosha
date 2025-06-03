import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function useTableQuery() {
    const pathName = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const pageFromUrl = Number(searchParams.get("page")) || 1;
    const searchFromUrl = searchParams.get("search") || "";

    const [page, setPage] = useState(pageFromUrl);
    const [search, setSearch] = useState(searchFromUrl);

    useEffect(() => {
        const params = new URLSearchParams();

        if (page > 1) {
            params.set("page", page.toString());
        }
        if (search.trim() !== "") {
            params.set("search", search);
        }

        const query = params.toString();
        const url = query ? `${pathName}?${query}` : pathName;

        router.replace(url, { scroll: false });
    }, [page, search, pathName, router]);

    return {
        page,
        setPage,
        search,
        setSearch,
    };
}