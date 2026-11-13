import React, { useState } from "react";
import { X, Plus, Image as ImageIcon } from "lucide-react";
import { MarketplaceItem, ItemCategory, ItemCondition, PetProfile } from "../../types";

interface PublishItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePet: PetProfile;
  onPublishItem: (newItem: Omit<MarketplaceItem, "id" | "createdAt" | "likesCount">) => void;
}

const PRESET_PRODUCT_IMAGES = [
  { label: "Cama", url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=800" },
  { label: "Rascador", url: "https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&q=80&w=800" },
  { label: "Comedero", url: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=800" },
  { label: "Correa", url: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=800" },
  { label: "Juguete", url: "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?auto=format&fit=crop&q=80&w=800" },
  { label: "Transporte", url: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&q=80&w=800" },
];

export const PublishItemModal: React.FC<PublishItemModalProps> = ({
  isOpen,
  onClose,
  activePet,
  onPublishItem,
}) => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("€");
  const [category, setCategory] = useState<ItemCategory>("Juguetes");
  const [condition, setCondition] = useState<ItemCondition>("Como nuevo");
  const [petSpecies, setPetSpecies] = useState<"dog" | "cat" | "both">("both");
  const [imageUrl, setImageUrl] = useState(PRESET_PRODUCT_IMAGES[0].url);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(activePet.location || "Madrid");
  const [contactPhone, setContactPhone] = useState("+34 600 123 456");
  const [sellerName] = useState(`Familia de ${activePet.name}`);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price || isNaN(Number(price))) {
      setErrorMsg("Completa el título y un precio numérico válido.");
      return;
    }

    const finalImage = customImageUrl.trim() ? customImageUrl.trim() : imageUrl;

    onPublishItem({
      title: title.trim(),
      price: parseFloat(price),
      currency,
      category,
      condition,
      petSpecies,
      imageUrl: finalImage,
      description: description.trim() || "Artículo en excelentes condiciones para tu mascota.",
      sellerName,
      sellerPetName: activePet.name,
      sellerAvatar: activePet.avatar,
      sellerContactPhone: contactPhone.trim(),
      location: location.trim(),
      isUserOwner: true,
    });

    setTitle("");
    setPrice("");
    setDescription("");
    setCustomImageUrl("");
    setErrorMsg("");
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setCustomImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 my-8">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-stone-900">Vender un artículo</h2>
            <p className="text-xs text-stone-500">Publicado por la familia de {activePet.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-[#FAF9F6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Título del artículo
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cama ortopédica mediana, Rascador de madera..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg("");
              }}
              className="w-full px-3.5 py-2.5 bg-[#FAF9F6] rounded-xl border border-stone-200 focus:outline-none focus:border-stone-400 text-xs text-stone-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Precio</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="25"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 focus:outline-none focus:border-stone-400 text-xs font-bold text-stone-900 tabular-nums"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-2.5 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 font-bold text-xs text-stone-800"
                >
                  <option value="€">€</option>
                  <option value="$">$</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Estado</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none"
              >
                <option value="Nuevo">Nuevo</option>
                <option value="Como nuevo">Como nuevo</option>
                <option value="Buen estado">Buen estado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none"
              >
                <option value="Juguetes">Juguetes</option>
                <option value="Comida y Premios">Comida y Premios</option>
                <option value="Accesorios y Ropa">Accesorios y Ropa</option>
                <option value="Camas y Casas">Camas y Casas</option>
                <option value="Higiene y Salud">Higiene y Salud</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Especie</label>
              <select
                value={petSpecies}
                onChange={(e) => setPetSpecies(e.target.value as "dog" | "cat" | "both")}
                className="w-full px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none"
              >
                <option value="both">Perros y gatos</option>
                <option value="dog">Solo perros</option>
                <option value="cat">Solo gatos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Fotografía
            </label>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {PRESET_PRODUCT_IMAGES.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImageUrl(img.url);
                    setCustomImageUrl("");
                  }}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                    imageUrl === img.url && !customImageUrl
                      ? "border-[#FF5A36]"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="O pega el enlace de una foto (URL)"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none"
              />
              <label className="cursor-pointer bg-[#F3F1EC] hover:bg-stone-200 text-stone-800 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Subir</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Ciudad</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">WhatsApp</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Descripción</label>
            <textarea
              rows={2}
              placeholder="Detalles de uso, medidas o entrega..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF9F6] rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-stone-600 font-semibold text-xs hover:bg-[#FAF9F6] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar artículo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
