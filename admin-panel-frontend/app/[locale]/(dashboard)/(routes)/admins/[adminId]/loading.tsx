import DisplayProperty from "@/components/DisplayProperty";
import { Card, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="w-full flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">
          <Skeleton className="h-8 w-1/2" />
        </h1>
        <DisplayProperty property={undefined} value={undefined} />
      </div>
      <Card className="space-y-4">
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <Separator />
      </Card>
    </div>
  );
}
