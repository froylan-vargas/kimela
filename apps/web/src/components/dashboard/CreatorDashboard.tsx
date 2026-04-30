"use client";

import type { qimela } from "@/types/qimela";
import ParticipantDashboard from "@/components/dashboard/ParticipantDashboard";

interface CreatorDashboardProps {
  qimela: qimela;
}

export default function CreatorDashboard({ qimela }: CreatorDashboardProps) {
  return <ParticipantDashboard qimela={qimela} />;
}
