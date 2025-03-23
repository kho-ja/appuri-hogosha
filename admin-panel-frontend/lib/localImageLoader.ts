import { ImageLoaderProps } from "next/image";

export default function localImageLoader(src: ImageLoaderProps) {
  return src.src;
}