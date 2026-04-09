"use client";

import type { Qimela } from "@/types/qimela";

interface CreatorDashboardProps {
  qimela: Qimela;
}

export default function CreatorDashboard({ qimela }: CreatorDashboardProps) {
  return (
    <div>
      <h1>{qimela.name} - Creator</h1>
    </div>
  );
}
