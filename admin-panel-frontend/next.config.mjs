import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    loader: "custom",
    loaderFile: "./lib/imageLoader.js",
  },
};

export default withNextIntl(nextConfig);
