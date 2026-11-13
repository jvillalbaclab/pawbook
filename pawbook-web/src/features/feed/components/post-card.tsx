import Link from "next/link";
import { Avatar } from "@/design-system/avatar";
import { BookmarkIcon, MessageIcon, MoreIcon } from "@/design-system/icons";
import { Photo } from "@/design-system/photo";
import type { Pet, Post, ReactionKind } from "@/lib/types";
import { ReactionBar } from "./reaction-bar";

type PostCardProps = {
  post: Post;
  activePet: Pick<Pet, "name" | "tone">;
  onReact: (kind: ReactionKind) => void;
  onToggleSave: () => void;
};

/** Separa los hashtags del texto para enlazarlos (FR-SRCH-002 llegará después). */
function renderText(text: string) {
  return text.split(/(#[\p{L}\d_]+)/u).map((part, index) =>
    part.startsWith("#") ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: el texto no cambia de orden
      <span key={index} className="font-semibold text-primary-ink">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function PostCard({ post, activePet, onReact, onToggleSave }: PostCardProps) {
  const { author } = post;
  return (
    <article className="overflow-hidden rounded-[22px] border border-line bg-surface">
      <header className="flex items-center gap-2.5 py-3 pr-2 pl-3.5">
        <Link href={`/@${author.handle}`} className="shrink-0">
          <Avatar name={author.name} tone={author.tone} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/@${author.handle}`}
            className="font-display text-[15px] font-bold text-ink hover:underline"
          >
            {author.name}
          </Link>
          <p className="truncate text-xs text-muted">
            @{author.handle} · {post.timeLabel}
            {post.location ? ` · ${post.location}` : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Más opciones"
          className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2"
        >
          <MoreIcon />
        </button>
      </header>

      <Photo tone={post.photo.tone} alt={post.photo.alt} className="aspect-[5/4] lg:aspect-[16/10]">
        {post.photo.count > 1 && (
          <span className="absolute top-3 right-3 rounded-xl bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
            1/{post.photo.count}
          </span>
        )}
        {post.mood && (
          <span className="absolute bottom-3 left-3 rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-stone-900">
            {post.mood}
          </span>
        )}
      </Photo>

      <p className="px-3.5 pt-3 pb-1 text-[15px] leading-relaxed text-ink">
        <strong>{author.name}</strong> {renderText(post.text)}
      </p>

      <div className="flex flex-wrap items-center gap-2 px-2.5 pt-2 pb-3">
        <ReactionBar counts={post.reactions} mine={post.myReaction} onReact={onReact} />
        <div className="ml-auto flex items-center">
          <span className="flex h-10 items-center gap-1 px-1.5 text-[13px] font-semibold text-ink-2">
            <MessageIcon size={20} />
            <span className="sr-only">Comentarios:</span>
            {post.commentCount}
          </span>
          <button
            type="button"
            aria-pressed={post.saved}
            aria-label={post.saved ? "Quitar de guardados" : "Guardar publicación"}
            onClick={onToggleSave}
            className={`flex size-10 items-center justify-center rounded-xl hover:bg-surface-2 ${
              post.saved ? "text-primary-ink" : "text-ink-2"
            }`}
          >
            <BookmarkIcon size={20} filled={post.saved} />
          </button>
        </div>
      </div>

      {post.comments.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-line-soft px-4 pt-3 pb-4">
          {post.comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <Avatar name={comment.author.name} tone={comment.author.tone} size={30} />
              <p className="text-sm leading-snug text-ink">
                <strong>{comment.author.name}</strong> {comment.text}
                <span className="mt-0.5 block text-xs text-muted">{comment.timeLabel}</span>
              </p>
            </div>
          ))}
          <label className="flex items-center gap-2.5">
            <Avatar name={activePet.name} tone={activePet.tone} size={30} />
            <span className="sr-only">Comentar como {activePet.name}</span>
            <input
              type="text"
              placeholder={`Comenta como ${activePet.name}…`}
              className="h-10 min-w-0 flex-1 rounded-full border border-line bg-canvas px-3.5 text-sm text-ink outline-none placeholder:text-muted focus:border-line-strong"
            />
          </label>
        </div>
      )}
    </article>
  );
}
