import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AdoptionIcon, ImageIcon, PawIcon } from "@/design-system/icons";
import { Logo } from "@/design-system/logo";
import { RegistrationForm } from "@/features/auth/registration-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("registration");
  return { title: t("title") };
}

/** Pilares del producto (claves de "registration.pillars"). */
const PILLARS = [
  { icon: ImageIcon, key: "profile" },
  { icon: PawIcon, key: "pawmates" },
  { icon: AdoptionIcon, key: "adoption" },
] as const;

export default function RegistrationPage() {
  const t = useTranslations("registration");
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panel de marca: siempre oscuro, en los dos temas. */}
      <section className="hidden flex-1 flex-col gap-9 bg-stone-900 px-14 py-12 text-stone-50 lg:flex">
        <Logo />
        <div className="max-w-[520px]">
          <h1 className="font-display text-[46px] leading-[1.06] font-extrabold tracking-tight">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-stone-300">{t("heroDescription")}</p>
        </div>
        <ul className="flex max-w-[480px] flex-col gap-4">
          {PILLARS.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-[#3a2620] text-[#ff8a6b]">
                <Icon size={22} />
              </span>
              <span>
                <span className="block font-bold">{t(`pillars.${key}.title`)}</span>
                <span className="mt-0.5 block text-sm text-stone-300">
                  {t(`pillars.${key}.text`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-8 lg:px-8">
        <div className="flex w-full max-w-[420px] flex-col gap-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h2 className="font-display text-[28px] font-extrabold tracking-tight text-ink lg:text-[30px]">
              <span className="lg:hidden">{t("heroTitle")}</span>
              <span className="hidden lg:inline">{t("title")}</span>
            </h2>
            <p className="mt-1.5 text-[15px] text-ink-2">{t("nextStep")}</p>
          </div>
          <RegistrationForm />
          <p className="border-t border-line pt-3 text-center text-sm text-ink-2">
            {t.rich("haveAccount", {
              login: (chunks) => (
                <Link href="/" className="font-bold text-primary-ink">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </section>
    </div>
  );
}
