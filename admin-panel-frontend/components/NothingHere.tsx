import React from 'react';

import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function NothingHere() {
  const theme = useTheme();

  return (
    <div className="flex flex-col col-span-3 items-center justify-center h-[60vh] w-full">
      <Image
        className={`${theme.resolvedTheme === 'dark' && `invert-[50]`}`}
        src="/assets/cat.svg"
        loader={({ src }) => src}
        alt="Nothing here Cat"
        width={200}
        height={200}
      />
      <h1 className="text-4xl text-neutral-200">Nothing Here</h1>
    </div>
  );
}
