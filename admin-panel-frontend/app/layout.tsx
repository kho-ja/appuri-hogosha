import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Appuri Hogosha",
    template: "%s | Appuri Hogosha",
  },
  description: "School notification platform for parents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
