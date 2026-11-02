export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 lg:py-20">{children}</div>
  );
}
