'use client';

export default function imageLoader({ src, width, quality }) {
  const url = new URL(`${process.env.NEXT_PUBLIC_IMAGES_URL}${src}`);
  url.searchParams.set('format', 'auto');
  url.searchParams.set('width', width.toString());
  url.searchParams.set('quality', (quality || 75).toString());
  return url.href;
}
