import type { GalleryPhoto, SiteContent } from "@/lib/site-content";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string, maxLength = 500): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${label} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalString(value: unknown, label: string, maxLength = 500): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredString(value, label, maxLength);
}

function mediaReference(value: unknown, label: string): string {
  const reference = requiredString(value, label, 2048);
  if (reference.startsWith("/") && !reference.startsWith("//")) return reference;
  try {
    const url = new URL(reference);
    if (url.protocol === "https:") return reference;
  } catch {
    // Not an absolute URL.
  }
  throw new Error(`${label} must be a site path or an HTTPS URL.`);
}

function uniqueIds<T extends { id: string }>(items: T[], label: string): T[] {
  const ids = new Set<string>();
  for (const item of items) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id)) {
      throw new Error(`${label} must have unique, valid IDs.`);
    }
    ids.add(item.id);
  }
  return items;
}

function order(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 10000) {
    throw new Error(`${label} must be an integer from 0 to 10000.`);
  }
  return Number(value);
}

function parseGalleryPhoto(value: unknown, index: number): GalleryPhoto {
  if (!isRecord(value)) throw new Error(`Gallery item ${index + 1} is invalid.`);
  if (typeof value.size !== "string" || value.size.length > 20) {
    throw new Error(`Gallery item ${index + 1} size is invalid.`);
  }
  const base = {
    id: requiredString(value.id, `Gallery item ${index + 1} ID`, 80),
    sortOrder: order(value.sortOrder, `Gallery item ${index + 1} order`),
    title: requiredString(value.title, `Gallery item ${index + 1} title`, 120),
    alt: requiredString(value.alt, `Gallery item ${index + 1} description`, 300),
    size: value.size,
  };
  if (!["", "medium", "large", "portrait", "full"].includes(base.size)) {
    throw new Error(`Gallery item ${index + 1} has an unsupported layout size.`);
  }
  if (typeof value.video === "string" && value.video.trim()) {
    return { ...base, video: mediaReference(value.video, `Gallery item ${index + 1} video`) };
  }
  if (typeof value.image === "string" && value.image.trim()) {
    return { ...base, image: mediaReference(value.image, `Gallery item ${index + 1} image`) };
  }
  throw new Error(`Gallery item ${index + 1} needs an image or video URL.`);
}

export function parseSiteContent(value: unknown): SiteContent {
  if (!isRecord(value)) throw new Error("Site content must be an object.");
  if (!isRecord(value.hero)) throw new Error("Hero image settings are missing.");
  if (!Array.isArray(value.categories) || value.categories.length > 50) {
    throw new Error("Categories must be a list of at most 50 entries.");
  }
  if (!Array.isArray(value.packages) || value.packages.length > 300) {
    throw new Error("Plans must be a list of at most 300 entries.");
  }
  if (!Array.isArray(value.galleryPhotos) || value.galleryPhotos.length > 100) {
    throw new Error("Gallery must be a list of at most 100 entries.");
  }
  if (!Array.isArray(value.locations) || value.locations.length > 100) {
    throw new Error("Locations must be a list of at most 100 entries.");
  }
  if (!Array.isArray(value.socialLinks) || value.socialLinks.length > 20) {
    throw new Error("Social links must be a list of at most 20 entries.");
  }

  const parsedCategories = uniqueIds(
    value.categories.map((item, index) => {
      if (!isRecord(item)) throw new Error(`Category ${index + 1} is invalid.`);
      return {
        id: requiredString(item.id, `Category ${index + 1} ID`, 80),
        name: requiredString(item.name, `Category ${index + 1} name`, 80),
        sortOrder: order(item.sortOrder, `Category ${index + 1} order`),
      };
    }),
    "Categories",
  );
  if (new Set(parsedCategories.map((c) => c.name.toLowerCase())).size !== parsedCategories.length) {
    throw new Error("Category names must be unique.");
  }
  const categories = parsedCategories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category, sortOrder) => ({ ...category, sortOrder }));

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const parsedPackages = uniqueIds(
    value.packages.map((item, index) => {
      if (!isRecord(item)) throw new Error(`Plan ${index + 1} is invalid.`);
      if (!Number.isInteger(item.hotelStars) || Number(item.hotelStars) < 1 || Number(item.hotelStars) > 5) {
        throw new Error(`Plan ${index + 1} hotel rating must be from 1 to 5 stars.`);
      }
      const categoryId = requiredString(item.categoryId, `Plan ${index + 1} category`, 80);
      const matchedCategory = categoryById.get(categoryId);
      if (!matchedCategory) throw new Error(`Plan ${index + 1} refers to a missing category.`);
      return {
        id: requiredString(item.id, `Plan ${index + 1} ID`, 80),
        categoryId,
        sortOrder: order(item.sortOrder, `Plan ${index + 1} order`),
        title: requiredString(item.title, `Plan ${index + 1} title`, 120),
        group: matchedCategory.name,
        hotelStars: Number(item.hotelStars) as 1 | 2 | 3 | 4 | 5,
        duration: requiredString(item.duration, `Plan ${index + 1} duration`, 100),
        price: requiredString(item.price, `Plan ${index + 1} price`, 60),
        rateNote: requiredString(item.rateNote, `Plan ${index + 1} rate note`, 120),
        personRate: optionalString(item.personRate, `Plan ${index + 1} per-person rate`, 60),
        image: mediaReference(item.image, `Plan ${index + 1} image`),
        alt: requiredString(item.alt, `Plan ${index + 1} image description`, 300),
        places: requiredString(item.places, `Plan ${index + 1} locations`, 300),
      };
    }),
    "Plans",
  );
  const packages = parsedPackages
    .sort((a, b) => {
      const catDiff = (categoryById.get(a.categoryId)?.sortOrder ?? 0) - (categoryById.get(b.categoryId)?.sortOrder ?? 0);
      return catDiff !== 0 ? catDiff : a.sortOrder - b.sortOrder;
    })
    .map((pkg, sortOrder) => ({ ...pkg, sortOrder }));

  const galleryPhotos = uniqueIds(value.galleryPhotos.map(parseGalleryPhoto), "Gallery")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((photo, sortOrder) => ({ ...photo, sortOrder }));

  const locations = value.locations.map((item, index) =>
    requiredString(item, `Location ${index + 1}`, 80),
  );
  if (new Set(locations.map((location) => location.toLowerCase())).size !== locations.length) {
    throw new Error("Locations must be unique.");
  }

  const socialLinks = uniqueIds(
    value.socialLinks.map((item, index) => {
      if (!isRecord(item)) throw new Error(`Social link ${index + 1} is invalid.`);
      const urlValue = requiredString(item.url, `Social link ${index + 1} URL`, 2048);
      let url: URL;
      try {
        url = new URL(urlValue);
      } catch {
        throw new Error(`Social link ${index + 1} must be a valid HTTPS URL.`);
      }
      if (url.protocol !== "https:") throw new Error(`Social link ${index + 1} must use HTTPS.`);
      return {
        id: requiredString(item.id, `Social link ${index + 1} ID`, 80),
        platform: requiredString(item.platform, `Social link ${index + 1} platform`, 40),
        url: url.toString(),
      };
    }),
    "Social links",
  );

  return {
    hero: {
      desktopImage: mediaReference(value.hero.desktopImage, "Desktop hero image"),
      mobileImage: mediaReference(value.hero.mobileImage, "Mobile hero image"),
    },
    categories,
    packages,
    galleryPhotos,
    locations,
    socialLinks,
  };
}
