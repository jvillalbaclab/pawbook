import React, { useState } from "react";
import { PetProfile, Post, ReactionType } from "../../types";
import { MessageCircle, Bookmark, Share2, Heart, MapPin, Send, Maximize2 } from "lucide-react";
import { playBark, playMeow, playSqueak } from "../../utils/soundSynthesizer";
import { PetFilterOverlay, COLOR_FILTER_STYLES } from "./PetFilterOverlay";

interface PostCardProps {
  post: Post;
  activePet: PetProfile;
  onReact: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onSavePost: (postId: string) => void;
  immersiveMode?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  activePet,
  onReact,
  onAddComment,
  onSavePost,
  immersiveMode = false,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [copiedToast, setCopiedToast] = useState(false);
  const [expandedImage, setExpandedImage] = useState(false);
  const [showPawBurst, setShowPawBurst] = useState(false);

  const handleReactionClick = (type: ReactionType) => {
    onReact(post.id, type);

    if (type === "bones") {
      playBark("happy");
    } else if (type === "fish") {
      playMeow("cute");
    } else if (type === "paws") {
      playSqueak();
    } else {
      playBark("playful");
    }
  };

  const handleDoubleTapPhoto = () => {
    setShowPawBurst(true);
    setTimeout(() => setShowPawBurst(false), 850);
    if (post.userReaction !== "paws") {
      handleReactionClick("paws");
    } else {
      playSqueak();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(post.id, commentInput.trim());
    setCommentInput("");
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const totalReactions =
    post.reactions.paws + post.reactions.bones + post.reactions.fish + post.reactions.hearts;

  const cssFilterValue =
    COLOR_FILTER_STYLES.find((c) => c.id === post.photoFilterStyle)?.cssFilter || "none";

  // Immersive TikTok-style card layout
  if (immersiveMode && post.imageUrl) {
    return (
      <article className="relative bg-stone-950 rounded-3xl overflow-hidden shadow-lg border border-stone-800 aspect-[4/5] sm:aspect-[9/13] max-h-[680px] w-full flex flex-col justify-end select-none">
        {/* Background Media */}
        <img
          src={post.imageUrl}
          alt={post.petName}
          referrerPolicy="no-referrer"
          onDoubleClick={handleDoubleTapPhoto}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          style={{ filter: cssFilterValue }}
        />

        {post.filterOverlay && post.filterOverlay !== "none" && (
          <PetFilterOverlay overlayId={post.filterOverlay} colorStyle={post.photoFilterStyle} />
        )}

        {/* Double-tap Paw Animation */}
        {showPawBurst && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 rounded-full bg-[#FF5A36]/90 text-white flex items-center justify-center text-5xl shadow-2xl animate-paw-pop">
              🐾
            </div>
          </div>
        )}

        {/* Measured Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

        {/* Right Side Vertical Action Rail (TikTok style) */}
        <div className="absolute right-3.5 bottom-24 z-20 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => handleReactionClick("paws")}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-transform active:scale-90 backdrop-blur-md ${
                post.userReaction === "paws"
                  ? "bg-[#FF5A36] text-white shadow-lg"
                  : "bg-black/45 text-white hover:bg-black/65 border border-white/15"
              }`}
            >
              🐾
            </div>
            <span className="text-[11px] font-bold text-white tabular-nums drop-shadow">
              {post.reactions.paws}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleReactionClick(post.species === "dog" ? "bones" : "fish")}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-transform active:scale-90 backdrop-blur-md ${
                post.userReaction === "bones" || post.userReaction === "fish"
                  ? "bg-amber-500 text-white shadow-lg"
                  : "bg-black/45 text-white hover:bg-black/65 border border-white/15"
              }`}
            >
              {post.species === "dog" ? "🦴" : "🐟"}
            </div>
            <span className="text-[11px] font-bold text-white tabular-nums drop-shadow">
              {post.species === "dog" ? post.reactions.bones : post.reactions.fish}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/45 hover:bg-black/65 border border-white/15 backdrop-blur-md text-white flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-white tabular-nums drop-shadow">
              {post.comments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSavePost(post.id)}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <div
              className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center ${
                post.isSaved
                  ? "bg-[#FF5A36] text-white"
                  : "bg-black/45 text-white hover:bg-black/65 border border-white/15"
              }`}
            >
              <Bookmark className={`w-5 h-5 ${post.isSaved ? "fill-current" : ""}`} />
            </div>
          </button>
        </div>

        {/* Bottom Caption Overlay */}
        <div className="relative z-20 p-5 pr-16 text-white space-y-2">
          <div className="flex items-center gap-2.5">
            <img
              src={post.petAvatar}
              alt={post.petName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF5A36]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-bold text-base text-white">{post.petName}</h3>
                <span className="text-xs text-stone-300">
                  {post.species === "dog" ? "🐕" : "🐈"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-300">
                <span>{post.breed}</span>
                {post.location && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{post.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-stone-100 leading-relaxed line-clamp-3">{post.caption}</p>
        </div>

        {/* Comments Drawer in Immersive Mode */}
        {showComments && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-white rounded-t-3xl p-4 max-h-[65%] flex flex-col shadow-2xl">
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-display font-bold text-sm text-stone-900">
                Comentarios ({post.comments.length})
              </span>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {post.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 items-start text-xs">
                  <img
                    src={c.petAvatar}
                    alt={c.petName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <span className="font-bold text-stone-900 mr-1.5">{c.petName}</span>
                    <span className="text-stone-700">{c.content}</span>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-2 border-t border-stone-100">
              <input
                type="text"
                placeholder={`Comentar como ${activePet.name}...`}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 bg-[#F3F1EC] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="bg-[#FF5A36] text-white px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
              >
                Publicar
              </button>
            </form>
          </div>
        )}
      </article>
    );
  }

  // Standard Clean Minimalist Card (Instagram-inspired with warm animal touches)
  return (
    <article className="bg-white rounded-3xl border border-stone-200/80 transition-all duration-200 overflow-hidden">
      {/* Post Header: Clean Unboxed Metadata (Zero-Pill Discipline) */}
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#FF5A36] via-orange-400 to-amber-300">
              <img
                src={post.petAvatar}
                alt={post.petName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
              />
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 text-[11px] bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-2xs"
              title={post.species === "dog" ? "Perro" : "Gato"}
            >
              {post.species === "dog" ? "🐕" : "🐈"}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display font-bold text-stone-900 text-sm truncate">
                {post.petName}
              </h3>
              <span className="text-stone-300" aria-hidden="true">·</span>
              <span className="text-xs text-stone-500 truncate">{post.breed}</span>
              <span className="text-stone-300" aria-hidden="true">·</span>
              <span className="text-xs text-stone-400">{post.timestamp}</span>
            </div>

            {(post.location || post.mood) && (
              <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5 truncate">
                {post.location && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-[#FF5A36] shrink-0" />
                    <span className="truncate">{post.location}</span>
                  </span>
                )}
                {post.location && post.mood && (
                  <span className="text-stone-300" aria-hidden="true">·</span>
                )}
                {post.mood && <span className="text-stone-500 truncate">{post.mood}</span>}
              </div>
            )}
          </div>
        </div>

        {post.imageUrl && (
          <button
            type="button"
            onClick={() => setExpandedImage(true)}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-[#FAF9F6] rounded-xl transition-colors cursor-pointer shrink-0"
            title="Ver imagen completa"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Photo Attachment with Double-Tap Paw Burst */}
      {post.imageUrl && (
        <div
          className="relative overflow-hidden bg-stone-100 group select-none cursor-pointer"
          onDoubleClick={handleDoubleTapPhoto}
        >
          <img
            src={post.imageUrl}
            alt={`Foto de ${post.petName}`}
            referrerPolicy="no-referrer"
            className="w-full max-h-[540px] object-cover"
            style={{ filter: cssFilterValue }}
          />

          {post.filterOverlay && post.filterOverlay !== "none" && (
            <PetFilterOverlay overlayId={post.filterOverlay} colorStyle={post.photoFilterStyle} />
          )}

          {/* Animated Paw Pop on Double Tap */}
          {showPawBurst && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-black/10">
              <div className="w-24 h-24 rounded-full bg-[#FF5A36] text-white flex items-center justify-center text-5xl shadow-2xl animate-paw-pop">
                🐾
              </div>
            </div>
          )}

          {/* Subtle bottom-left double-tap hint on hover */}
          <div className="absolute bottom-3 left-3 bg-black/55 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Doble toque para dar patita 🐾
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {expandedImage && post.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpandedImage(false)}
        >
          <div className="relative max-w-full max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={post.imageUrl}
              alt={post.petName}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[90vh] rounded-2xl object-contain"
              style={{ filter: cssFilterValue }}
            />
            {post.filterOverlay && post.filterOverlay !== "none" && (
              <PetFilterOverlay overlayId={post.filterOverlay} colorStyle={post.photoFilterStyle} />
            )}
          </div>
        </div>
      )}

      {/* Action Bar: Clean Instagram Ergonomics + Animal Reactions */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {/* Patita (Primary Like) */}
          <button
            type="button"
            onClick={() => handleReactionClick("paws")}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer tabular-nums ${
              post.userReaction === "paws"
                ? "bg-[#FF5A36] text-white shadow-2xs"
                : "bg-[#FAF9F6] text-stone-700 hover:bg-[#F3F1EC]"
            }`}
            title="Dar Patita"
          >
            <span className="text-sm">🐾</span>
            <span>{post.reactions.paws}</span>
          </button>

          {/* Huesito (Dogs) */}
          <button
            type="button"
            onClick={() => handleReactionClick("bones")}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer tabular-nums ${
              post.userReaction === "bones"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-[#FAF9F6] text-stone-700 hover:bg-[#F3F1EC]"
            }`}
            title="Premiar con Huesito"
          >
            <span className="text-sm">🦴</span>
            <span>{post.reactions.bones}</span>
          </button>

          {/* Pescadito (Cats) */}
          <button
            type="button"
            onClick={() => handleReactionClick("fish")}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer tabular-nums ${
              post.userReaction === "fish"
                ? "bg-teal-600 text-white shadow-2xs"
                : "bg-[#FAF9F6] text-stone-700 hover:bg-[#F3F1EC]"
            }`}
            title="Premiar con Pescadito"
          >
            <span className="text-sm">🐟</span>
            <span>{post.reactions.fish}</span>
          </button>

          {/* Corazón */}
          <button
            type="button"
            onClick={() => handleReactionClick("hearts")}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer tabular-nums ${
              post.userReaction === "hearts"
                ? "bg-rose-500 text-white shadow-2xs"
                : "bg-[#FAF9F6] text-stone-700 hover:bg-[#F3F1EC]"
            }`}
            title="Me encanta"
          >
            <Heart className={`w-3.5 h-3.5 ${post.userReaction === "hearts" ? "fill-current" : "text-rose-500"}`} />
            <span>{post.reactions.hearts}</span>
          </button>
        </div>

        {/* Right Controls: Comment, Share, Bookmark */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="min-h-[38px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-[#FAF9F6] hover:text-stone-900 transition-colors cursor-pointer tabular-nums"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments.length}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center text-stone-600 hover:bg-[#FAF9F6] hover:text-stone-900 rounded-xl transition-colors relative cursor-pointer"
            title="Copiar enlace"
          >
            <Share2 className="w-4 h-4" />
            {copiedToast && (
              <span className="absolute bottom-full right-0 mb-1.5 px-2.5 py-1 bg-stone-900 text-white text-[10px] font-semibold rounded-lg whitespace-nowrap shadow-md">
                Enlace copiado
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSavePost(post.id)}
            className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              post.isSaved
                ? "text-[#FF5A36] bg-orange-50"
                : "text-stone-600 hover:bg-[#FAF9F6] hover:text-stone-900"
            }`}
            title={post.isSaved ? "Guardado" : "Guardar publicación"}
          >
            <Bookmark className={`w-4 h-4 ${post.isSaved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>

      {/* Caption & Summary Section */}
      <div className="px-4 pb-4 space-y-2">
        <div className="text-xs font-semibold text-stone-500 tabular-nums">
          {totalReactions} reacciones de la manada
        </div>

        <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-line">
          <span className="font-display font-bold text-stone-900 mr-1.5">{post.petName}</span>
          {post.caption}
        </p>

        {/* Preview of first comment when collapsed */}
        {!showComments && post.comments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="block text-xs text-stone-400 hover:text-stone-600 font-medium pt-0.5 cursor-pointer"
          >
            Ver los {post.comments.length} comentarios...
          </button>
        )}
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="px-4 py-3.5 bg-[#FAF9F6] border-t border-stone-100 space-y-3">
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {post.comments.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-2">
                Sé la primera mascota en dejar un ladrido o maullido
              </p>
            ) : (
              post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-2.5 items-start bg-white p-2.5 rounded-2xl border border-stone-200/60"
                >
                  <img
                    src={comment.petAvatar}
                    alt={comment.petName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-stone-900">
                        {comment.petName} {comment.species === "dog" ? "🐕" : "🐈"}
                      </span>
                      <span className="text-stone-300" aria-hidden="true">·</span>
                      <span className="text-[11px] text-stone-400">{comment.timestamp}</span>
                    </div>
                    <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1">
            <img
              src={activePet.avatar}
              alt={activePet.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
            <input
              type="text"
              placeholder={`Comentar como ${activePet.name}...`}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="flex-1 bg-white border border-stone-200/90 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="bg-[#FF5A36] hover:bg-[#E04826] disabled:opacity-40 text-white p-2 rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </article>
  );
};
