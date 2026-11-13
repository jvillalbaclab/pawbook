"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFeed, reactToPost, toggleSave } from "@/lib/api";
import type { FeedTab, Post, ReactionKind } from "@/lib/types";
import { applyReaction } from "./reactions";

const feedKey = (tab: FeedTab, petId: string) => ["feed", tab, petId] as const;

export function useFeed(tab: FeedTab, petId: string) {
  return useQuery({ queryKey: feedKey(tab, petId), queryFn: () => getFeed(tab, petId) });
}

/** Aplica un cambio a una publicación en todos los feeds en caché. */
function updatePostEverywhere(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  update: (post: Post) => Post,
) {
  queryClient.setQueriesData<Post[]>({ queryKey: ["feed"] }, (posts) =>
    posts?.map((post) => (post.id === postId ? update(post) : post)),
  );
}

/**
 * Reacción optimista: la UI cambia al instante y, si el servidor falla, vuelve atrás.
 * Es el mismo patrón que pedirá la API real (useReact en la arquitectura §6.1).
 */
export function useReact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, kind }: { postId: string; kind: ReactionKind }) =>
      reactToPost(postId, kind),
    onMutate: async ({ postId, kind }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const snapshot = queryClient.getQueriesData<Post[]>({ queryKey: ["feed"] });
      updatePostEverywhere(queryClient, postId, (post) => applyReaction(post, kind));
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
    },
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => toggleSave(postId),
    onMutate: (postId) => {
      updatePostEverywhere(queryClient, postId, (post) => ({ ...post, saved: !post.saved }));
    },
  });
}
