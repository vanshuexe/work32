import LaunchLandingPage from "@/components/LaunchLandingPage";
import { defaultSiteContent } from "@/lib/site-content";
import { getSiteContent } from "@/lib/site-content-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let content = defaultSiteContent;
  try {
    content = await getSiteContent();
  } catch (error) {
    console.error("Falling back to default site content on initial load:", error);
  }

  return <LaunchLandingPage initialContent={content} />;
}
