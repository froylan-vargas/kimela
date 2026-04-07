"use client";

import type { Kimela } from "@/types/kimela";

interface CreatorDashboardProps {
  kimela: Kimela;
}

export default function CreatorDashboard({ kimela }: CreatorDashboardProps) {
  return (
    <div>
      <h1>{kimela.name} - Creator</h1>
    </div>
  );
}
