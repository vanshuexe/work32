import { defaultSiteContent, type GalleryPhoto, type SiteContent } from "@/lib/site-content";
import { prisma } from "@/lib/prisma";
import { parseSiteContent } from "@/lib/site-content-validation";

let pendingSeed: Promise<SiteContent> | null = null;

async function readStoredSiteContent(): Promise<SiteContent | null> {
  const [settings, categories, plans, galleryItems, locations, socialLinks] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "main" } }),
    prisma.planCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.tourPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.galleryItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.location.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!settings) return null;

  return parseSiteContent({
    hero: {
      desktopImage: settings.heroDesktopImage,
      mobileImage: settings.heroMobileImage,
    },
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
    })),
    packages: plans.map((plan) => ({
      id: plan.id,
      categoryId: plan.categoryId,
      sortOrder: plan.sortOrder,
      title: plan.title,
      group: plan.groupLabel,
      hotelStars: plan.hotelStars as 1 | 2 | 3 | 4 | 5,
      duration: plan.duration,
      price: plan.price,
      rateNote: plan.rateNote,
      personRate: plan.personRate ?? undefined,
      image: plan.image,
      alt: plan.alt,
      places: plan.places,
    })),
    galleryPhotos: galleryItems.map((item): GalleryPhoto => {
      const base = {
        id: item.id,
        sortOrder: item.sortOrder,
        title: item.title,
        alt: item.alt,
        size: item.size,
      };
      return item.mediaType === "video"
        ? { ...base, video: item.mediaUrl }
        : { ...base, image: item.mediaUrl };
    }),
    locations: locations.map((location) => location.name),
    socialLinks: socialLinks.map((link) => ({
      id: link.id,
      platform: link.platform,
      url: link.url,
    })),
  });
}

export async function getSiteContent(): Promise<SiteContent> {
  if (!process.env.DATABASE_URL) return defaultSiteContent;

  const existing = await readStoredSiteContent();
  if (existing) return existing;

  if (!pendingSeed) {
    pendingSeed = saveSiteContent(defaultSiteContent).finally(() => {
      pendingSeed = null;
    });
  }
  return pendingSeed;
}

export async function saveSiteContent(content: SiteContent): Promise<SiteContent> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured. Set it before saving site content.");
  }

  const normalized = parseSiteContent(content);

  await prisma.$transaction([
    prisma.siteSettings.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        heroDesktopImage: normalized.hero.desktopImage,
        heroMobileImage: normalized.hero.mobileImage,
      },
      update: {
        heroDesktopImage: normalized.hero.desktopImage,
        heroMobileImage: normalized.hero.mobileImage,
      },
    }),
    prisma.tourPlan.deleteMany(),
    prisma.planCategory.deleteMany(),
    ...(normalized.categories.length > 0
      ? [
          prisma.planCategory.createMany({
            data: normalized.categories.map((category) => ({
              id: category.id,
              name: category.name,
              sortOrder: category.sortOrder,
            })),
          }),
        ]
      : []),
    ...(normalized.packages.length > 0
      ? [
          prisma.tourPlan.createMany({
            data: normalized.packages.map((plan) => ({
              id: plan.id,
              categoryId: plan.categoryId,
              sortOrder: plan.sortOrder,
              title: plan.title,
              groupLabel: plan.group,
              hotelStars: plan.hotelStars,
              duration: plan.duration,
              price: plan.price,
              rateNote: plan.rateNote,
              personRate: plan.personRate ?? null,
              image: plan.image,
              alt: plan.alt,
              places: plan.places,
            })),
          }),
        ]
      : []),
    prisma.galleryItem.deleteMany(),
    ...(normalized.galleryPhotos.length > 0
      ? [
          prisma.galleryItem.createMany({
            data: normalized.galleryPhotos.map((item) => ({
              id: item.id,
              sortOrder: item.sortOrder,
              title: item.title,
              alt: item.alt,
              size: item.size,
              mediaType: "video" in item && item.video ? "video" : "image",
              mediaUrl: ("video" in item && item.video ? item.video : item.image) ?? "",
            })),
          }),
        ]
      : []),
    prisma.location.deleteMany(),
    ...(normalized.locations.length > 0
      ? [
          prisma.location.createMany({
            data: normalized.locations.map((name, sortOrder) => ({
              name,
              sortOrder,
            })),
          }),
        ]
      : []),
    prisma.socialLink.deleteMany(),
    ...(normalized.socialLinks.length > 0
      ? [
          prisma.socialLink.createMany({
            data: normalized.socialLinks.map((link, sortOrder) => ({
              id: link.id,
              platform: link.platform,
              url: link.url,
              sortOrder,
            })),
          }),
        ]
      : []),
  ]);

  const saved = await readStoredSiteContent();
  return saved ?? normalized;
}
