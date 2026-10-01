"use client";
import useSWR from "swr";
import type { ApiRequest } from "@/features/library/presentation/shared";
import type { FeedEvent, PublicGame } from "../domain";

export type Person = { handle: string; name: string; avatarColor?: string };
export type SocialMe = { enabled: boolean; handle?: string; unread: number };
export type FeedItem = FeedEvent & { id: string; at: string; author: Person };
export type Notice = {
  id: string;
  type: "follow";
  at: string;
  read: boolean;
  from: Person;
};
export type FeedData = {
  following: number;
  events: FeedItem[];
  notifications: Notice[];
};
export type NetworkData = {
  following: Person[];
  followers: (Person & { followedBack: boolean })[];
};
export type ProfileGameSummary = {
  gameId: string;
  title: string;
  cover?: string;
  status: PublicGame["status"];
  wishlist: boolean;
  favorite: boolean;
  rating?: number;
};
export type ProfileData = {
  profile: {
    handle: string;
    name: string;
    bio: string;
    avatarColor?: string;
    stats: { games: number; completed: number; playing: number };
    playing: { gameId: string; title: string; cover?: string }[];
    favorites: { gameId: string; title: string; cover?: string }[];
    library: ProfileGameSummary[];
  };
  events: (FeedEvent & { id: string; at: string })[];
  self: boolean;
  following: boolean;
};

// Sin sesión las páginas públicas se piden sin token.
export async function publicRequest(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, cache: "no-store" });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error ?? "No se ha podido cargar.");
  }
  return r;
}

export function useSocial<T>(request: ApiRequest, path: string | null) {
  const swr = useSWR<T, Error>(
    path,
    (url: string) => request(url).then((r) => r.json() as Promise<T>),
    { revalidateOnFocus: true, shouldRetryOnError: false },
  );
  return {
    data: swr.data,
    error: swr.error?.message ?? "",
    loading: !!path && swr.isLoading,
    refresh: () => swr.mutate(),
  };
}

export const sendJson = (
  request: ApiRequest,
  url: string,
  method: string,
  body?: unknown,
) =>
  request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).then((r) => r.json());
