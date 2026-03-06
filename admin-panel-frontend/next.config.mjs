import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    loader: "custom",
    loaderFile: "./lib/imageLoader.js",
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "www.parents.jdu.uz",
        "parents.jdu.uz",
        "*.amplifyapp.com",
        "localhost:3000",
      ],
    },
  },
};

export default withNextIntl(nextConfig);
