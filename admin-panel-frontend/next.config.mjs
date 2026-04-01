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
  experimental: {
    serverActions: {
      allowedOrigins: [
        "www.parents.jdu.uz",
        "parents.jdu.uz",
        "main.d2hff850x2l8tj.amplifyapp.com",
      ],
    },
  },
};

export default withNextIntl(nextConfig);
