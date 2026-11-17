import { useTranslations } from "next-intl";
import { FeedView } from "@/features/feed/components/feed-view";
import { RightRail } from "@/features/feed/components/right-rail";

export default function HomePage() {
  const t = useTranslations("feed");
  return (
    <div className="flex gap-7">
      <div className="min-w-0 flex-1">
        <h1 className="sr-only">{t("pageTitle")}</h1>
        <FeedView />
      </div>
      <RightRail />
    </div>
  );
}
