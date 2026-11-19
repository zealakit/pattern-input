import type { ReactNode } from "react";

export const metadata = {
  title: "pattern-input Next.js smoke",
  description: "SSR smoke test for @zealakit/pattern-input-react.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
