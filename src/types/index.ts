export type ActionType =
  | "MEETING_TO_ADD"
  | "NEEDS_RESPONSE"
  | "REQUEST_PENDING"
  | "SCHEDULE_MEETING";

export type ActionStatus = "OPEN" | "DONE" | "SNOOZED" | "DISMISSED";

export type ActionPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ClassifiedAction {
  type: ActionType;
  priority: ActionPriority;
  title: string;
  summary: string;
  suggestedAction?: string;
  dueHint?: string;
  meetingStart?: string;
  meetingEnd?: string;
  meetingLocation?: string;
  attendees?: string[];
}

export interface DigestStats {
  meetingsToAdd: number;
  needsResponse: number;
  requestsPending: number;
  scheduleMeetings: number;
  overdue: number;
}

export interface ActionItemWithEmail {
  id: string;
  type: ActionType;
  status: ActionStatus;
  priority: ActionPriority;
  title: string;
  summary: string;
  suggestedAction: string | null;
  dueHint: string | null;
  meetingStart: Date | null;
  meetingEnd: Date | null;
  meetingLocation: string | null;
  attendees: string;
  email: {
    gmailId: string;
    threadId: string;
    subject: string;
    fromAddress: string;
    fromName: string | null;
    snippet: string;
    receivedAt: Date;
  } | null;
}
