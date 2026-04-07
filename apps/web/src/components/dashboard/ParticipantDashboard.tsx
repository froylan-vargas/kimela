"use client";

import type { Kimela } from "@/types/kimela";

interface ParticipantDashboardProps {
  kimela: Kimela;
}

export default function ParticipantDashboard({ kimela }: ParticipantDashboardProps) {
  return (
    <div>
      <h1>{kimela.name} - Participant</h1>
    </div>
  );
}
