"use client";

import { useMemo } from "react";
import * as runtime from "react/jsx-runtime";
import { MDXProvider } from "@mdx-js/react";

interface MDXContentProps {
  code: string;
}

export function MDXContent({ code }: MDXContentProps) {
  const Content = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(code);
    return (fn({ ...runtime }) as { default: React.ComponentType }).default;
  }, [code]);

  return (
    <MDXProvider>
      <Content />
    </MDXProvider>
  );
}
