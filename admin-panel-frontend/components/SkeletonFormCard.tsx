import DisplayProperty from "./DisplayProperty";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export default function SkeletonFormCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <Skeleton className="w-1/2 h-6" />
        <Skeleton className="w-1/4 h-4" />
      </CardHeader>

      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="space-y-1.5">
            <DisplayProperty property={undefined} value={undefined} />
            <DisplayProperty property={undefined} value={undefined} />
            <DisplayProperty property={undefined} value={undefined} />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="w-full h-5" />
            <Skeleton className="w-3/4 h-5" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 flex-wrap">
        <Skeleton className="w-24 h-10" />
        <Skeleton className="w-24 h-10" />
      </CardFooter>
    </Card>
  );
}
