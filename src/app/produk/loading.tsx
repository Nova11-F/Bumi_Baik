import { Skeleton } from "@/components/ui/Skeleton";

export default function ProdukLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-52" />

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-3 h-3 w-28" />
            <Skeleton className="mt-2 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-24" />
            <Skeleton className="mt-2 h-6 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
