"use client";

import type { Qimela } from "@/types/qimela";

interface ParticipantDashboardProps {
  qimela: Qimela;
}

export default function ParticipantDashboard({ qimela }: ParticipantDashboardProps) {
  return (
    <div>
      <h1>{qimela.name} - Participant</h1>
    </div>
  );
}
