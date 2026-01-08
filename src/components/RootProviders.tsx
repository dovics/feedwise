import { ThemeProvider } from "@/components/ThemeProvider";

export function RootProviders({ children }: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
