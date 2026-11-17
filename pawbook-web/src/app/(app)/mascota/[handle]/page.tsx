import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Avatar } from "@/design-system/avatar";
import { Photo } from "@/design-system/photo";
import { LoadingState, Skeleton } from "@/design-system/states";
import { fmt } from "@/i18n/formatters";
import { getMyPets, getPet, getPostsByPet, listPetHandles } from "@/lib/api";

export async function generateMetadata(props: PageProps<"/mascota/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const [pet, t] = await Promise.all([getPet(handle), getTranslations("profile")]);
  if (!pet) return { title: t("notFoundTitle") };
  // Open Graph para compartir el perfil (UI-005).
  return {
    title: t("metaTitle", { name: pet.name, handle: pet.handle }),
    description: pet.bio,
    openGraph: { title: t("ogTitle", { name: pet.name }), description: pet.bio },
  };
}

/** Prerenderiza los perfiles conocidos; un handle nuevo se resuelve en la petición. */
export async function generateStaticParams() {
  const handles = await listPetHandles();
  return handles.map((handle) => ({ handle }));
}

export default function PetProfilePage(props: PageProps<"/mascota/[handle]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PetProfile params={props.params} />
    </Suspense>
  );
}

function ProfileSkeleton() {
  const t = useTranslations("profile");
  return (
    <LoadingState
      label={t("loading")}
      className="mx-auto flex max-w-[680px] items-center gap-4 pt-2"
    >
      <Skeleton className="size-[88px] shrink-0 rounded-full" />
      <Skeleton className="h-6 flex-1 rounded-full" />
    </LoadingState>
  );
}

async function PetProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [pet, t, tPets] = await Promise.all([
    getPet(handle),
    getTranslations("profile"),
    getTranslations("pets"),
  ]);
  if (!pet) notFound();

  const [posts, myPets] = await Promise.all([getPostsByPet(handle), getMyPets()]);
  const isMine = myPets.some((mine) => mine.id === pet.id);
  const stats = [
    { label: t("postsStat", { count: pet.stats.posts }), value: pet.stats.posts },
    { label: t("followersStat", { count: pet.stats.followers }), value: pet.stats.followers },
    { label: t("followingStat"), value: pet.stats.following },
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
                  {fmt.number(value)}
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
            {[
              tPets(`species.${pet.species}`),
              pet.breed,
              pet.ageLabel,
              tPets(`sex.${pet.sex}`),
            ].map((chip) => (
              <li
                key={chip}
                className="rounded-chip bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2"
              >
                {chip}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">
            {pet.bio} <span className="text-muted">{t("owner", { name: pet.ownerName })}</span>
          </p>
        </div>

        <div className="flex gap-2">
          {isMine ? (
            <button
              type="button"
              className="h-11 flex-1 rounded-control bg-inverse text-sm font-bold text-on-inverse"
            >
              {t("edit")}
            </button>
          ) : (
            <button
              type="button"
              className="h-11 flex-1 rounded-control bg-inverse text-sm font-bold text-on-inverse"
            >
              {t("follow")}
            </button>
          )}
          <button
            type="button"
            className="h-11 flex-1 rounded-control border border-line bg-surface text-sm font-bold text-ink"
          >
            {t("share")}
          </button>
        </div>
      </section>

      <h2 className="mt-6 border-b-2 border-ink pb-2.5 text-center text-sm font-bold text-ink">
        {t("postsHeading")}
      </h2>
      {posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{t("noPosts", { name: pet.name })}</p>
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
