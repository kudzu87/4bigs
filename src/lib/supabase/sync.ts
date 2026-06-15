import { normalizeSession } from "../session-math";
import { loadSessions, saveSessions } from "../storage";
import type { Session } from "../types";
import { createClient } from "./client";

type SupabaseSessionRow = {
  id: string;
  user_id: string;
  data: Session;
  updated_at: string;
  deleted_at: string | null;
};

function getSessionUpdatedAt(session: Session): string {
  return session.endTime ?? session.startTime;
}

function sessionUpdatedMs(session: Session): number {
  return new Date(getSessionUpdatedAt(session)).getTime();
}

function sortSessionsNewestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

async function fetchSessionRows(userId: string): Promise<SupabaseSessionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, data, updated_at, deleted_at")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []) as SupabaseSessionRow[];
}

/** Push a single session to Supabase (upsert by id). */
export async function pushSession(
  session: Session,
  userId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sessions").upsert(
    {
      id: session.id,
      user_id: userId,
      data: session,
      updated_at: getSessionUpdatedAt(session),
      deleted_at: null,
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

/** Pull all non-deleted sessions for a user from Supabase. */
export async function pullSessions(userId: string): Promise<Session[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("data")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeSession(row.data as Session)
  );
}

/** Soft-delete a session in Supabase when removed locally. */
export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  const deletedAt = new Date().toISOString();
  const { error } = await supabase
    .from("sessions")
    .update({
      deleted_at: deletedAt,
      updated_at: deletedAt,
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

/**
 * Merge remote sessions into localStorage.
 *
 * - Sessions only in Supabase → add to localStorage
 * - Sessions only in localStorage → push to Supabase
 * - Same session ID on both sides → newer updated_at wins
 * - deleted_at set on Supabase → remove from localStorage
 */
export async function mergeSessions(userId: string): Promise<void> {
  const remoteRows = await fetchSessionRows(userId);
  const localSessions = loadSessions();
  const localById = new Map(localSessions.map((session) => [session.id, session]));
  const mergedById = new Map<string, Session>();
  const toPush: Session[] = [];

  for (const row of remoteRows) {
    const local = localById.get(row.id);

    if (row.deleted_at) {
      localById.delete(row.id);
      continue;
    }

    const remoteSession = normalizeSession(row.data);
    const remoteUpdatedMs = new Date(row.updated_at).getTime();

    if (!local) {
      mergedById.set(row.id, remoteSession);
      continue;
    }

    const localUpdatedMs = sessionUpdatedMs(local);

    if (remoteUpdatedMs > localUpdatedMs) {
      mergedById.set(row.id, remoteSession);
    } else if (localUpdatedMs > remoteUpdatedMs) {
      mergedById.set(row.id, local);
      toPush.push(local);
    } else {
      mergedById.set(row.id, local);
    }

    localById.delete(row.id);
  }

  for (const local of localById.values()) {
    mergedById.set(local.id, local);
    toPush.push(local);
  }

  saveSessions(sortSessionsNewestFirst([...mergedById.values()]));

  for (const session of toPush) {
    await pushSession(session, userId);
  }
}

/** Push all archived localStorage sessions to Supabase (first sign-in migration). */
export async function migrateLocalToCloud(userId: string): Promise<void> {
  const localSessions = loadSessions();

  for (const session of localSessions) {
    await pushSession(session, userId);
  }
}
