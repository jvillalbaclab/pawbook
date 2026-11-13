import React, { useState } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Heart,
  CheckCircle2,
  Trash2,
  X,
  Send,
  User,
  PackageCheck,
} from "lucide-react";
import { MarketplaceItem, PetProfile } from "../../types";
import { PublishItemModal } from "./PublishItemModal";

interface MarketplaceViewProps {
  items: MarketplaceItem[];
  activePet: PetProfile;
  onAddItem: (newItem: Omit<MarketplaceItem, "id" | "createdAt" | "likesCount">) => void;
  onToggleLike: (itemId: string) => void;
  onMarkSold?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  items,
  activePet,
  onAddItem,
  onToggleLike,
  onMarkSold,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc" | "likes">("recent");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [contactModalItem, setContactModalItem] = useState<MarketplaceItem | null>(null);
  const [sentMessage, setSentMessage] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  const categories = [
    { label: "Todos", icon: "🐾" },
    { label: "Juguetes", icon: "🎾" },
    { label: "Comida y Premios", icon: "🥩" },
    { label: "Accesorios y Ropa", icon: "🦺" },
    { label: "Camas y Casas", icon: "🛏️" },
    { label: "Higiene y Salud", icon: "🧼" },
    { label: "Otros", icon: "📦" },
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === "Todos" || item.category === selectedCategory;

    const matchesSpecies =
      selectedSpecies === "all" ||
      item.petSpecies === "both" ||
      item.petSpecies === selectedSpecies;

    const matchesCondition = selectedCondition === "all" || item.condition === selectedCondition;
    const matchesMine = !showOnlyMine || item.isUserOwner;

    return matchesSearch && matchesCategory && matchesSpecies && matchesCondition && matchesMine;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "likes") return b.likesCount - a.likesCount;
    return 0;
  });

  const handleOpenContact = (item: MarketplaceItem) => {
    setContactModalItem(item);
    setSentMessage(false);
    setCustomMsg(
      `¡Hola ${item.sellerName}! Vi tu publicación "${item.title}" por ${item.price}${item.currency} en PawBook y me interesa para ${activePet.name}. ¿Sigue disponible?`
    );
  };

  const handleSendSimulatedMsg = (e: React.FormEvent) => {
    e.preventDefault();
    setSentMessage(true);
    setTimeout(() => {
      setSentMessage(false);
      setContactModalItem(null);
    }, 2600);
  };

  const [copiedPhone, setCopiedPhone] = useState(false);

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {/* Minimalist Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF5A36]">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Mercadito entre dueños</span>
            </div>
            <h1 className="font-display text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
              Accesorios y juguetes
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FF5A36] hover:bg-[#E04826] text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Vender</span>
          </button>
        </div>

        {/* Search + Mis ventas */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar cama, rascador, correa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-[#FAF9F6] rounded-2xl border border-stone-200/80 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              showOnlyMine
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-[#FAF9F6] text-stone-700 border-stone-200/80 hover:bg-[#F3F1EC]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Mis ventas</span>
          </button>
        </div>

        {/* Clean Scrollable Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.label}
              onClick={() => setSelectedCategory(cat.label)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === cat.label
                  ? "bg-stone-900 text-white"
                  : "bg-[#FAF9F6] text-stone-600 hover:bg-[#F3F1EC] hover:text-stone-900"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Items */}
      {sortedItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 space-y-3">
          <ShoppingBag className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="font-display text-base font-bold text-stone-900">
            No encontramos artículos
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Prueba a limpiar la búsqueda o publica un artículo para la comunidad.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("Todos");
              setSelectedSpecies("all");
              setSelectedCondition("all");
              setShowOnlyMine(false);
            }}
            className="px-4 py-2 bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sortedItems.map((item) => {
            const isOwner = item.isUserOwner;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 hover:border-stone-300 transition-all flex flex-col group shadow-2xs"
              >
                <div className="relative aspect-square overflow-hidden bg-stone-100">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />

                  <div className="absolute bottom-2.5 right-2.5 bg-stone-900/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl font-display font-bold text-xs tabular-nums shadow-sm">
                    {item.price} {item.currency}
                  </div>

                  {item.isSold && (
                    <div className="absolute inset-0 bg-stone-950/65 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-white text-stone-900 font-display font-extrabold text-xs px-3 py-1 rounded-xl shadow-lg">
                        Vendido
                      </span>
                    </div>
                  )}
                </div>

                {/* Content with Unboxed Metadata */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium truncate">
                      <span>
                        {item.petSpecies === "dog"
                          ? "🐕"
                          : item.petSpecies === "cat"
                          ? "🐈"
                          : "🐾"}
                      </span>
                      <span className="text-emerald-700 font-semibold">{item.condition}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{item.location}</span>
                    </div>

                    <h3 className="font-display font-bold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-2.5 border-t border-stone-100">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={item.sellerAvatar}
                          alt={item.sellerName}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                        />
                        <span className="font-semibold text-[11px] text-stone-700 truncate">
                          {item.sellerName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleLike(item.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer tabular-nums ${
                          item.isLiked
                            ? "bg-rose-50 text-rose-600"
                            : "bg-[#FAF9F6] text-stone-600 hover:bg-[#F3F1EC]"
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${item.isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                        <span>{item.likesCount}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isOwner ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onMarkSold && onMarkSold(item.id)}
                            className="flex-1 py-2 bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-800 font-semibold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{item.isSold ? "Disponible" : "Vendido"}</span>
                          </button>
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenContact(item)}
                          disabled={item.isSold}
                          className="w-full py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Contactar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PublishItemModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        activePet={activePet}
        onPublishItem={onAddItem}
      />

      {/* Contact Seller Modal — Mobile Bottom Sheet + Desktop Centered */}
      {contactModalItem && (
        <div
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setContactModalItem(null)}
        >
          <div
            className="bg-white rounded-t-[28px] sm:rounded-3xl sm:max-w-md w-full p-5 sm:p-6 pb-8 sm:pb-6 shadow-2xl border border-stone-200 space-y-4 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-display font-bold text-stone-900 text-base">
                Mensaje al vendedor
              </h3>
              <button
                type="button"
                onClick={() => setContactModalItem(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-stone-400 hover:text-stone-800 hover:bg-[#FAF9F6] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-3 bg-[#FAF9F6] p-3 rounded-2xl border border-stone-200/70">
              <img
                src={contactModalItem.imageUrl}
                alt={contactModalItem.title}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover shrink-0"
              />
              <div className="text-xs space-y-0.5 min-w-0">
                <p className="font-bold text-stone-900 truncate">{contactModalItem.title}</p>
                <p className="font-bold text-[#FF5A36] tabular-nums">
                  {contactModalItem.price} {contactModalItem.currency}
                </p>
                <p className="text-[11px] text-stone-400">{contactModalItem.location}</p>
              </div>
            </div>

            {sentMessage ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <h4 className="font-display font-bold text-stone-900 text-sm">Mensaje enviado</h4>
                <p className="text-xs text-stone-600">
                  {contactModalItem.sellerName} recibirá tu consulta para coordinar la entrega.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSimulatedMsg} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    rows={3}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full p-3 bg-[#FAF9F6] rounded-2xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar mensaje directo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(contactModalItem.sellerContactPhone);
                      setCopiedPhone(true);
                      setTimeout(() => setCopiedPhone(false), 2500);
                    }}
                    className="w-full py-2.5 bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 text-center cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {copiedPhone
                        ? `¡Teléfono copiado! (${contactModalItem.sellerContactPhone})`
                        : `Copiar WhatsApp (${contactModalItem.sellerContactPhone})`}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
