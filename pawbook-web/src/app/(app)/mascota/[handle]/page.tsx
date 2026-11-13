import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/design-system/avatar";
import { Photo } from "@/design-system/photo";
import { getPet, getPostsByPet } from "@/lib/api";
import { ALL_PETS, MY_PETS } from "@/lib/sample-data";

const SPECIES_LABEL = { dog: "Perro", cat: "Gato" } as const;
const SEX_LABEL = { female: "Hembra", male: "Macho" } as const;

export async function generateMetadata(props: PageProps<"/mascota/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const pet = await getPet(handle);
  if (!pet) return { title: "Mascota no encontrada" };
  // Open Graph para compartir el perfil (UI-005).
  return {
    title: `${pet.name} (@${pet.handle})`,
    description: pet.bio,
    openGraph: { title: `${pet.name} en PawBook`, description: pet.bio },
  };
}

/** Prerenderiza los perfiles conocidos; un handle nuevo se resuelve en la petición. */
export function generateStaticParams() {
  return ALL_PETS.map((pet) => ({ handle: pet.handle }));
}

export default function PetProfilePage(props: PageProps<"/mascota/[handle]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PetProfile params={props.params} />
    </Suspense>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex max-w-[680px] items-center gap-4 pt-2">
      <span className="size-[88px] rounded-full bg-skeleton" />
      <span className="h-6 flex-1 rounded-full bg-surface-2" />
    </div>
  );
}

async function PetProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const pet = await getPet(handle);
  if (!pet) notFound();

  const posts = await getPostsByPet(handle);
  const isMine = MY_PETS.some((mine) => mine.id === pet.id);
  const stats = [
    { label: "Publicaciones", value: pet.stats.posts },
    { label: "Seguidores", value: pet.stats.followers },
    { label: "Siguiendo", value: pet.stats.following },
  ];

  return (
    <div className="mx-auto max-w-[680px]">
      <section className="flex flex-col gap-4 pt-2">
        <div className="flex items-center gap-4">
          <Avatar name={pet.name} tone={pet.tone} size={88} ring={isMine} />
          <dl className="grid flex-1 grid-cols-3 gap-1 text-center">
            {stats.map(({ label, value }) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="font-display text-xl font-extrabold text-ink">
                  {value.toLocaleString("es")}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {pet.name}
          </h1>
          <p className="text-sm text-muted">@{pet.handle}</p>
          <ul className="flex flex-wrap gap-1.5">
            {[SPECIES_LABEL[pet.species], pet.breed, pet.ageLabel, SEX_LABEL[pet.sex]].map(
              (chip) => (
                <li
                  key={chip}
                  className="rounded-[10px] bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2"
                >
                  {chip}
                </li>
              ),
            )}
          </ul>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">
            {pet.bio} <span className="text-muted">Responsable: {pet.ownerName}.</span>
          </p>
        </div>

        <div className="flex gap-2">
          {isMine ? (
            <button
              type="button"
              className="h-11 flex-1 rounded-[14px] bg-inverse text-sm font-bold text-on-inverse"
            >
              Editar perfil
            </button>
          ) : (
            <button
              type="button"
              className="h-11 flex-1 rounded-[14px] bg-inverse text-sm font-bold text-on-inverse"
            >
              Seguir
            </button>
          )}
          <button
            type="button"
            className="h-11 flex-1 rounded-[14px] border border-line bg-surface text-sm font-bold text-ink"
          >
            Compartir
          </button>
        </div>
      </section>

      <h2 className="mt-6 border-b-2 border-ink pb-2.5 text-center text-sm font-bold text-ink">
        Publicaciones
      </h2>
      {posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{pet.name} aún no ha publicado nada.</p>
      ) : (
        <div className="mt-0.5 grid grid-cols-3 gap-0.5">
          {posts.map((post) => (
            <Photo
              key={post.id}
              tone={post.photo.tone}
              alt={post.photo.alt}
              className="aspect-square"
              showPaw={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
