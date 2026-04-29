"use client";

import type { qimela } from "@/types/qimela";

interface CreatorDashboardProps {
  qimela: qimela;
}

export default function CreatorDashboard({ qimela }: CreatorDashboardProps) {
  return (
    <div>
      <h1>{qimela.name} - Creator</h1>
    </div>
  );
}
