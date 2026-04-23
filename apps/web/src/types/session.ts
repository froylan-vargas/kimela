export interface SessionContender {
  id: string;
  name: string;
  imgUrl: string | null;
}

export interface SessionScore {
  home: string | null;
  away: string | null;
}

export interface Session {
  id: string;
  name: string;
  scheduledAt: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" | "POSTPONED";
  home: SessionContender;
  away: SessionContender;
  score: SessionScore;
}
