import { Suspense } from "react";
import { CampusMap } from "@/components/campus-map";

export default function MapPage() {
  return (
    <Suspense>
      <CampusMap />
    </Suspense>
  );
}
