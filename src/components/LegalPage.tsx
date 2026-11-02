import { Footer, Header } from "./Brand";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-14 pt-32 sm:px-6">
        <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-subtle">Last updated {updated}</p>
        <div className="mt-10 space-y-4 leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
