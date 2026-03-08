import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    loader: "custom",
    loaderFile: "./lib/imageLoader.js",
  },
  transpilePackages: ["@mdx-js/mdx", "@mdx-js/react"],
};

export default withNextIntl(nextConfig);
