"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import type { GalleryPhoto, PackageCategory, SiteContent, SocialLink, TourPackage } from "@/lib/site-content";

type AdminTab = "plans" | "categories" | "media" | "locations" | "social";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "plans", label: "Plans" },
  { id: "categories", label: "Categories" },
  { id: "media", label: "Hero & Gallery" },
  { id: "locations", label: "Locations" },
  { id: "social", label: "Social links" },
];

const socialPlatforms = ["Instagram", "Facebook", "YouTube", "WhatsApp", "X", "TikTok", "LinkedIn", "Other"];

function newId(prefix: string): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid}`;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

async function readApiPayload(response: Response): Promise<Record<string, unknown> | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getApiError(payload: Record<string, unknown> | null, response: Response, fallback: string): string {
  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  if (response.status === 413) {
    return "Images must be smaller than 5 MB.";
  }
  return fallback;
}

function normalizePackagesOrder(categories: PackageCategory[], packages: TourPackage[]): TourPackage[] {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryMap = new Map(sortedCategories.map((category) => [category.id, category]));
  let sortOrder = 0;

  return sortedCategories.flatMap((category) =>
    packages
      .filter((plan) => plan.categoryId === category.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((plan) => ({
        ...plan,
        group: categoryMap.get(plan.categoryId)?.name ?? plan.group,
        sortOrder: sortOrder++,
      })),
  );
}

function splitPlaces(places: string): string[] {
  return places
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
}

function togglePlaceInString(places: string, location: string): string {
  const current = splitPlaces(places);
  const exists = current.some((item) => item.toLowerCase() === location.toLowerCase());
  const next = exists
    ? current.filter((item) => item.toLowerCase() !== location.toLowerCase())
    : [...current, location];
  return next.join(" · ");
}

function UploadableUrl({
  label,
  value,
  onChange,
  allowUpload = true,
  placeholder = "Paste an HTTPS URL or site path",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowUpload?: boolean;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      setError("Images must be smaller than 5 MB.");
      input.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(getApiError(result, response, "Image upload failed."));
      }
      if (!result || typeof result.url !== "string") {
        throw new Error("Image upload failed.");
      }
      onChange(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  return (
    <label className="admin-field admin-field--media">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {allowUpload && (
        <span className="admin-upload-control">
          <input type="file" accept="image/avif,image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} />
          <span>{uploading ? "Uploading…" : "Upload image (max 5 MB)"}</span>
        </span>
      )}
      {error && <span className="admin-inline-error" role="alert">{error}</span>}
    </label>
  );
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [tab, setTab] = useState<AdminTab>("plans");
  const [email, setEmail] = useState("admin@stressout.in");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [planSearch, setPlanSearch] = useState("");
  const [planCategoryFilter, setPlanCategoryFilter] = useState("");
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(() => new Set());
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);
  const [reassignTargets, setReassignTargets] = useState<Record<string, string>>({});

  const isDirty = useMemo(() => {
    if (!content || !savedSnapshot) return false;
    return JSON.stringify(content) !== savedSnapshot;
  }, [content, savedSnapshot]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const loadContent = async () => {
    setError("");
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    if (response.status === 401) {
      setAuthenticated(false);
      setContent(null);
      setSavedSnapshot("");
      setLoginError("Your admin session has expired. Please sign in again.");
      return;
    }
    const result = await readApiPayload(response);
    if (!response.ok) {
      throw new Error(getApiError(result, response, "Could not load content."));
    }
    if (!result) {
      throw new Error("Site content response was empty.");
    }
    const loaded = result as unknown as SiteContent;
    setContent(loaded);
    setSavedSnapshot(JSON.stringify(loaded));
    setError("");
  };

  useEffect(() => {
    let active = true;
    fetch("/api/admin/auth", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return false;
        if (!response.ok) throw new Error("Could not verify the admin session.");
        return true;
      })
      .then(async (isAuthenticated) => {
        if (!active) return;
        setAuthenticated(isAuthenticated);
        if (isAuthenticated) await loadContent();
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load admin.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setError("");
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(getApiError(result, response, "Sign in failed."));
      }
    } catch (signInError) {
      setLoginError(signInError instanceof Error ? signInError.message : "Sign in failed.");
      return;
    }

    setAuthenticated(true);
    setPassword("");
    try {
      await loadContent();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load content.");
    }
  };

  const signOut = async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/auth", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not end the admin session.");
      setAuthenticated(false);
      setContent(null);
      setSavedSnapshot("");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
    }
  };

  const save = async () => {
    if (!content) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (response.status === 401) {
        throw new Error("Your admin session has expired. Sign in again in another tab, then click Save changes.");
      }
      const result = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(getApiError(result, response, "Could not save changes."));
      }
      if (!result) {
        throw new Error("Could not save changes.");
      }
      const saved = result as unknown as SiteContent;
      setContent(saved);
      setSavedSnapshot(JSON.stringify(saved));
      setMessage("Changes saved to database. The live website is now updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const togglePlanExpanded = (id: string, isOpen: boolean) => {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const updatePlan = (id: string, updates: Partial<TourPackage>) => {
    setContent((current) => {
      if (!current) return current;
      const updatedPackages = current.packages.map((plan) => (plan.id === id ? { ...plan, ...updates } : plan));
      if (updates.categoryId) {
        const targetCategoryPlans = updatedPackages.filter(
          (plan) => plan.categoryId === updates.categoryId && plan.id !== id,
        );
        const maxOrder = targetCategoryPlans.reduce((max, item) => Math.max(max, item.sortOrder), -1);
        const repositioned = updatedPackages.map((plan) =>
          plan.id === id ? { ...plan, sortOrder: maxOrder + 1 } : plan,
        );
        return {
          ...current,
          packages: normalizePackagesOrder(current.categories, repositioned),
        };
      }
      return {
        ...current,
        packages: updatedPackages,
      };
    });
    setMessage("");
  };

  const movePlanToIndex = (plan: TourPackage, targetIndex: number) => {
    if (!content) return;
    const categoryPlans = content.packages
      .filter((item) => item.categoryId === plan.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = categoryPlans.findIndex((item) => item.id === plan.id);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categoryPlans.length || currentIndex === targetIndex) {
      return;
    }

    const [moved] = categoryPlans.splice(currentIndex, 1);
    categoryPlans.splice(targetIndex, 0, moved);

    const updated = content.packages.map((item) => {
      if (item.categoryId !== plan.categoryId) return item;
      const newPos = categoryPlans.findIndex((cPlan) => cPlan.id === item.id);
      return { ...item, sortOrder: newPos };
    });

    setContent({
      ...content,
      packages: normalizePackagesOrder(content.categories, updated),
    });
    setMessage("");
  };

  const movePlan = (plan: TourPackage, direction: -1 | 1) => {
    if (!content) return;
    const categoryPlans = content.packages
      .filter((item) => item.categoryId === plan.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = categoryPlans.findIndex((item) => item.id === plan.id);
    movePlanToIndex(plan, index + direction);
  };

  const addPlan = (targetCategoryId?: string) => {
    if (!content?.categories.length) {
      setError("Create a category before adding a plan.");
      setTab("categories");
      return;
    }
    const sorted = [...content.categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const category =
      sorted.find((c) => c.id === (targetCategoryId || planCategoryFilter)) ?? sorted[0];

    const planId = newId("plan");
    const categoryPlanCount = content.packages.filter((p) => p.categoryId === category.id).length;
    const plan: TourPackage = {
      id: planId,
      categoryId: category.id,
      sortOrder: categoryPlanCount,
      title: "New Kashmir plan",
      group: category.name,
      hotelStars: 3,
      duration: "3 Nights / 4 Days",
      price: "₹35,000",
      rateNote: "for a couple",
      image: "/travel-packages/kashmir-4-days.png",
      alt: "Kashmir tour plan",
      places: content.locations.slice(0, 3).join(" · ") || "Srinagar · Gulmarg · Pahalgam",
    };

    setContent({
      ...content,
      packages: normalizePackagesOrder(content.categories, [...content.packages, plan]),
    });
    setPlanSearch("");
    if (planCategoryFilter && planCategoryFilter !== category.id) {
      setPlanCategoryFilter(category.id);
    }
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      next.add(planId);
      return next;
    });
    setMessage("");
    setError("");
  };

  const deletePlan = (id: string) => {
    if (!content) return;
    const remaining = content.packages.filter((plan) => plan.id !== id);
    setContent({
      ...content,
      packages: normalizePackagesOrder(content.categories, remaining),
    });
    setConfirmDeletePlanId(null);
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setMessage("");
  };

  const moveCategory = (categoryId: string, direction: -1 | 1) => {
    if (!content) return;
    const categories = [...content.categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = categories.findIndex((item) => item.id === categoryId);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) return;
    [categories[index], categories[nextIndex]] = [categories[nextIndex], categories[index]];
    const reorderedCategories = categories.map((item, sortOrder) => ({ ...item, sortOrder }));
    setContent({
      ...content,
      categories: reorderedCategories,
      packages: normalizePackagesOrder(reorderedCategories, content.packages),
    });
    setMessage("");
  };

  const addCategory = () => {
    if (!content) return;
    const name = newCategoryName.trim();
    if (!name) return;
    if (content.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      setError("A category with this name already exists.");
      return;
    }
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id =
      baseSlug && !content.categories.some((category) => category.id === baseSlug)
        ? baseSlug
        : newId("category");
    const category: PackageCategory = { id, name, sortOrder: content.categories.length };
    setContent({ ...content, categories: [...content.categories, category] });
    setNewCategoryName("");
    setError("");
    setMessage("");
  };

  const deleteCategory = (categoryId: string) => {
    if (!content) return;
    const attachedPlans = content.packages.filter((plan) => plan.categoryId === categoryId);
    if (attachedPlans.length > 0) {
      setError("Move or delete this category’s plans before deleting the category.");
      return;
    }
    const remainingCategories = content.categories
      .filter((category) => category.id !== categoryId)
      .map((category, sortOrder) => ({ ...category, sortOrder }));
    setContent({
      ...content,
      categories: remainingCategories,
      packages: normalizePackagesOrder(remainingCategories, content.packages),
    });
    setError("");
    setMessage("");
  };

  const reassignCategoryPlansAndDelete = (fromCategoryId: string, toCategoryId: string) => {
    if (!content || !toCategoryId || fromCategoryId === toCategoryId) return;
    const target = content.categories.find((c) => c.id === toCategoryId);
    if (!target) return;

    const updatedPackages = content.packages.map((plan) =>
      plan.categoryId === fromCategoryId
        ? { ...plan, categoryId: target.id, group: target.name }
        : plan,
    );
    const remainingCategories = content.categories
      .filter((c) => c.id !== fromCategoryId)
      .map((c, sortOrder) => ({ ...c, sortOrder }));

    setContent({
      ...content,
      categories: remainingCategories,
      packages: normalizePackagesOrder(remainingCategories, updatedPackages),
    });
    setError("");
    setMessage("");
  };

  const addGalleryPhoto = (mediaType: "image" | "video" = "image") => {
    if (!content) return;
    const base = {
      id: newId("gallery"),
      sortOrder: content.galleryPhotos.length,
      title: mediaType === "video" ? "New gallery video" : "New gallery image",
      alt: mediaType === "video" ? "Travel video" : "Travel photo",
      size: "medium",
    };
    const photo: GalleryPhoto =
      mediaType === "video" ? { ...base, video: "" } : { ...base, image: "" };
    setContent({ ...content, galleryPhotos: [...content.galleryPhotos, photo] });
    setMessage("");
  };

  const updateGallery = (
    id: string,
    updates: Partial<Pick<GalleryPhoto, "title" | "alt" | "size">>,
  ) => {
    if (!content) return;
    setContent({
      ...content,
      galleryPhotos: content.galleryPhotos.map((photo) => (photo.id === id ? { ...photo, ...updates } : photo)),
    });
    setMessage("");
  };

  const setGalleryMediaType = (id: string, mediaType: "image" | "video") => {
    if (!content) return;
    setContent({
      ...content,
      galleryPhotos: content.galleryPhotos.map((photo) => {
        if (photo.id !== id) return photo;
        const currentUrl = ("video" in photo && photo.video ? photo.video : photo.image) ?? "";
        const base = {
          id: photo.id,
          sortOrder: photo.sortOrder,
          title: photo.title,
          alt: photo.alt,
          size: photo.size,
        };
        return mediaType === "video" ? { ...base, video: currentUrl } : { ...base, image: currentUrl };
      }),
    });
    setMessage("");
  };

  const updateGalleryMedia = (id: string, url: string) => {
    if (!content) return;
    setContent({
      ...content,
      galleryPhotos: content.galleryPhotos.map((photo) => {
        if (photo.id !== id) return photo;
        const isVideo = "video" in photo && photo.video !== undefined;
        const base = {
          id: photo.id,
          sortOrder: photo.sortOrder,
          title: photo.title,
          alt: photo.alt,
          size: photo.size,
        };
        return isVideo ? { ...base, video: url } : { ...base, image: url };
      }),
    });
    setMessage("");
  };

  const addLocation = () => {
    if (!content) return;
    const location = newLocation.trim();
    if (!location) return;
    if (content.locations.some((item) => item.toLowerCase() === location.toLowerCase())) {
      setError("This location is already listed.");
      return;
    }
    setContent({ ...content, locations: [...content.locations, location] });
    setNewLocation("");
    setError("");
    setMessage("");
  };

  const moveLocation = (index: number, direction: -1 | 1) => {
    if (!content) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= content.locations.length) return;
    const locations = [...content.locations];
    [locations[index], locations[nextIndex]] = [locations[nextIndex], locations[index]];
    setContent({ ...content, locations });
    setMessage("");
  };

  const addSocialLink = () => {
    if (!content) return;
    const link: SocialLink = { id: newId("social"), platform: "Instagram", url: "" };
    setContent({ ...content, socialLinks: [...content.socialLinks, link] });
    setMessage("");
  };

  const moveSocialLink = (index: number, direction: -1 | 1) => {
    if (!content) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= content.socialLinks.length) return;
    const socialLinks = [...content.socialLinks];
    [socialLinks[index], socialLinks[nextIndex]] = [socialLinks[nextIndex], socialLinks[index]];
    setContent({ ...content, socialLinks });
    setMessage("");
  };

  const handleEnterKey = (callback: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      callback();
    }
  };

  if (loading) {
    return <main className="admin-loading" aria-live="polite">Loading admin panel…</main>;
  }

  if (!authenticated) {
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={signIn}>
          <a className="admin-back-link" href="/">← Back to website</a>
          <p className="admin-eyebrow">Stressout Tours &amp; Travel</p>
          <h1>Admin sign in</h1>
          <p className="admin-description">Sign in to manage plans, categories, hero images, gallery, locations and social links.</p>
          <label className="admin-field">
            <span>Admin ID (Email)</span>
            <input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <div className="admin-password-wrap">
              <input
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {loginError && <p className="admin-alert admin-alert--error" role="alert">{loginError}</p>}
          <button className="admin-primary-button" type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <h1>Content could not be loaded</h1>
          <p className="admin-alert admin-alert--error" role="alert">{error || "Please refresh and try again."}</p>
          <button className="admin-primary-button" type="button" onClick={() => loadContent().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load content."))}>
            Retry
          </button>
        </section>
      </main>
    );
  }

  const sortedCategories = [...content.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedPlans = [...content.packages].sort((a, b) => a.sortOrder - b.sortOrder);
  const planSearchTerm = planSearch.trim().toLowerCase();
  const visibleCategories = planCategoryFilter
    ? sortedCategories.filter((c) => c.id === planCategoryFilter)
    : sortedCategories;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <a className="admin-back-link" href="/">← View website</a>
          <p className="admin-eyebrow">Stressout Tours &amp; Travel</p>
          <h1>Content studio</h1>
        </div>
        <div className="admin-header-actions">
          <span className={`admin-status-badge ${isDirty ? "is-dirty" : "is-clean"}`}>
            {isDirty ? "Unsaved changes" : "Published"}
          </span>
          <button className="admin-secondary-button" type="button" onClick={signOut}>Sign out</button>
          <button className="admin-primary-button" type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Content sections">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? "is-active" : ""}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="admin-content">
        {error && (
          <div className="admin-alert admin-alert--error admin-alert--dismissible" role="alert">
            <span>{error}</span>
            <button type="button" className="admin-alert__close" aria-label="Dismiss error" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {message && <p className="admin-alert admin-alert--success" role="status">{message}</p>}

        {tab === "plans" && (
          <div className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Tour plans ({content.packages.length})</h2>
                <p>Edit any plan card, change its category or hotel rating, add/delete plans, and arrange their display order.</p>
              </div>
              <button className="admin-primary-button" type="button" onClick={() => addPlan()}>＋ Add plan</button>
            </div>

            <div className="admin-plan-toolbar">
              <label className="admin-field">
                <span>Filter by category section</span>
                <select value={planCategoryFilter} onChange={(event) => setPlanCategoryFilter(event.target.value)}>
                  <option value="">All category sections ({sortedCategories.length})</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({sortedPlans.filter((p) => p.categoryId === category.id).length})
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Search plans</span>
                <input
                  type="search"
                  placeholder="Search by title, location, duration, price…"
                  value={planSearch}
                  onChange={(event) => setPlanSearch(event.target.value)}
                />
              </label>
            </div>

            {visibleCategories.map((category) => {
              const allCategoryPlans = sortedPlans.filter((plan) => plan.categoryId === category.id);
              const plans = planSearchTerm
                ? allCategoryPlans.filter((plan) =>
                    [plan.title, plan.duration, plan.price, plan.rateNote, plan.places, `${plan.hotelStars} star`]
                      .join(" ")
                      .toLowerCase()
                      .includes(planSearchTerm),
                  )
                : allCategoryPlans;

              if (planSearchTerm && plans.length === 0) return null;

              return (
                <section className="admin-plan-section" key={category.id}>
                  <div className="admin-plan-section__header">
                    <h3>{category.name} <span>{plans.length}</span></h3>
                    <button
                      type="button"
                      className="admin-secondary-button admin-secondary-button--sm"
                      onClick={() => addPlan(category.id)}
                    >
                      ＋ Add plan here
                    </button>
                  </div>

                  {plans.length === 0 && (
                    <p className="admin-empty">No plans in this category yet. Click “＋ Add plan here” to add one.</p>
                  )}

                  {plans.map((plan) => {
                    const categoryIndex = allCategoryPlans.findIndex((p) => p.id === plan.id);
                    const isExpanded = expandedPlanIds.has(plan.id);
                    const selectedPlaceSet = new Set(splitPlaces(plan.places).map((p) => p.toLowerCase()));

                    return (
                      <details
                        className="admin-plan-card"
                        key={plan.id}
                        open={isExpanded}
                        onToggle={(event) => togglePlanExpanded(plan.id, event.currentTarget.open)}
                      >
                        <summary>
                          <div className="admin-plan-summary-main">
                            {plan.image && (
                              <img className="admin-plan-thumb" src={plan.image} alt="" />
                            )}
                            <span>
                              <strong>{plan.title || "Untitled plan"}</strong>
                              <small>
                                {plan.duration} · {"★".repeat(plan.hotelStars)} ({plan.hotelStars}-star) · {plan.price} {plan.rateNote}
                              </small>
                            </span>
                          </div>
                          <span className="admin-order-controls" onClick={(event) => event.stopPropagation()}>
                            <select
                              aria-label={`Position for ${plan.title}`}
                              className="admin-position-select"
                              disabled={Boolean(planSearchTerm)}
                              value={categoryIndex}
                              title={planSearchTerm ? "Clear search to reorder plans" : "Move to position"}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => movePlanToIndex(plan, Number(event.target.value))}
                            >
                              {allCategoryPlans.map((_, posIndex) => (
                                <option key={posIndex} value={posIndex}>
                                  #{posIndex + 1}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              aria-label={`Move ${plan.title} up`}
                              disabled={Boolean(planSearchTerm) || categoryIndex === 0}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                movePlan(plan, -1);
                              }}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${plan.title} down`}
                              disabled={Boolean(planSearchTerm) || categoryIndex === allCategoryPlans.length - 1}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                movePlan(plan, 1);
                              }}
                            >
                              ↓
                            </button>
                          </span>
                        </summary>
                        <div className="admin-form-grid">
                          <label className="admin-field">
                            <span>Plan title</span>
                            <input value={plan.title} onChange={(event) => updatePlan(plan.id, { title: event.target.value })} />
                          </label>
                          <label className="admin-field">
                            <span>Category section</span>
                            <select
                              value={plan.categoryId}
                              onChange={(event) => {
                                const nextCategory = content.categories.find((item) => item.id === event.target.value);
                                if (nextCategory) {
                                  updatePlan(plan.id, { categoryId: nextCategory.id, group: nextCategory.name });
                                  if (planCategoryFilter && planCategoryFilter !== nextCategory.id) {
                                    setPlanCategoryFilter(nextCategory.id);
                                  }
                                }
                              }}
                            >
                              {sortedCategories.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                              ))}
                            </select>
                          </label>
                          <label className="admin-field">
                            <span>Hotel rating</span>
                            <select
                              value={plan.hotelStars}
                              onChange={(event) => updatePlan(plan.id, { hotelStars: Number(event.target.value) as TourPackage["hotelStars"] })}
                            >
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <option value={rating} key={rating}>
                                  {"★".repeat(rating)} ({rating} star{rating > 1 ? "s" : ""})
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="admin-field">
                            <span>Duration</span>
                            <input value={plan.duration} onChange={(event) => updatePlan(plan.id, { duration: event.target.value })} />
                          </label>
                          <label className="admin-field">
                            <span>Package price</span>
                            <input value={plan.price} onChange={(event) => updatePlan(plan.id, { price: event.target.value })} />
                          </label>
                          <label className="admin-field">
                            <span>Price applies to</span>
                            <input value={plan.rateNote} onChange={(event) => updatePlan(plan.id, { rateNote: event.target.value })} />
                          </label>
                          <label className="admin-field">
                            <span>Per-person price (optional)</span>
                            <input value={plan.personRate ?? ""} onChange={(event) => updatePlan(plan.id, { personRate: event.target.value || undefined })} />
                          </label>
                          <div className="admin-field">
                            <span>Locations on card</span>
                            <input
                              aria-label="Locations on card"
                              value={plan.places}
                              onChange={(event) => updatePlan(plan.id, { places: event.target.value })}
                            />
                            {content.locations.length > 0 && (
                              <div className="admin-location-chips" aria-label="Quick toggle locations">
                                {content.locations.map((loc) => {
                                  const active = selectedPlaceSet.has(loc.toLowerCase());
                                  return (
                                    <button
                                      key={loc}
                                      type="button"
                                      className={`admin-chip ${active ? "is-selected" : ""}`}
                                      onClick={() => updatePlan(plan.id, { places: togglePlaceInString(plan.places, loc) })}
                                    >
                                      {active ? "✓ " : "+ "}
                                      {loc}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="admin-media-row admin-field--wide">
                            {plan.image && (
                              <img className="admin-preview-thumb" src={plan.image} alt={plan.alt || plan.title} />
                            )}
                            <UploadableUrl label="Card image" value={plan.image} onChange={(image) => updatePlan(plan.id, { image })} />
                          </div>
                          <label className="admin-field admin-field--wide">
                            <span>Image description (accessibility)</span>
                            <input value={plan.alt} onChange={(event) => updatePlan(plan.id, { alt: event.target.value })} />
                          </label>
                          <div className="admin-card-actions admin-field--wide">
                            {confirmDeletePlanId === plan.id ? (
                              <div className="admin-confirm-delete">
                                <span>Delete this plan?</span>
                                <button className="admin-danger-button" type="button" onClick={() => deletePlan(plan.id)}>Confirm delete</button>
                                <button className="admin-secondary-button admin-secondary-button--sm" type="button" onClick={() => setConfirmDeletePlanId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button className="admin-danger-button" type="button" onClick={() => setConfirmDeletePlanId(plan.id)}>Delete plan</button>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </section>
              );
            })}
            {!sortedCategories.length && <p className="admin-empty">Create a category before adding plans.</p>}
          </div>
        )}

        {tab === "categories" && (
          <div className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Plan categories</h2>
                <p>Create, rename and arrange the category sections shown on the tour packages section.</p>
              </div>
            </div>
            <div className="admin-add-row">
              <input
                aria-label="New category name"
                placeholder="New category name (e.g. Honeymoon Specials)"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={handleEnterKey(addCategory)}
              />
              <button className="admin-primary-button" type="button" onClick={addCategory}>Add category</button>
            </div>
            <div className="admin-list">
              {sortedCategories.map((category, index) => {
                const count = content.packages.filter((plan) => plan.categoryId === category.id).length;
                const otherCategories = sortedCategories.filter((c) => c.id !== category.id);
                const selectedReassignTarget = reassignTargets[category.id] || otherCategories[0]?.id || "";

                return (
                  <div className="admin-list-row admin-category-row" key={category.id}>
                    <input
                      aria-label="Category name"
                      value={category.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setContent({
                          ...content,
                          categories: content.categories.map((item) => item.id === category.id ? { ...item, name } : item),
                          packages: content.packages.map((plan) => plan.categoryId === category.id ? { ...plan, group: name } : plan),
                        });
                        setMessage("");
                      }}
                    />
                    <span>{count} {count === 1 ? "plan" : "plans"}</span>
                    <div className="admin-order-controls">
                      <button type="button" aria-label={`Move ${category.name} up`} disabled={index === 0} onClick={() => moveCategory(category.id, -1)}>↑</button>
                      <button type="button" aria-label={`Move ${category.name} down`} disabled={index === sortedCategories.length - 1} onClick={() => moveCategory(category.id, 1)}>↓</button>
                    </div>
                    {count > 0 && otherCategories.length > 0 ? (
                      <div className="admin-reassign-group">
                        <select
                          aria-label={`Move plans from ${category.name} to`}
                          value={selectedReassignTarget}
                          onChange={(event) => setReassignTargets((prev) => ({ ...prev, [category.id]: event.target.value }))}
                        >
                          {otherCategories.map((target) => (
                            <option key={target.id} value={target.id}>Move plans → {target.name}</option>
                          ))}
                        </select>
                        <button
                          className="admin-danger-button"
                          type="button"
                          onClick={() => reassignCategoryPlansAndDelete(category.id, selectedReassignTarget)}
                        >
                          Move &amp; Delete
                        </button>
                      </div>
                    ) : (
                      <button className="admin-danger-button" type="button" onClick={() => deleteCategory(category.id)}>Delete</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "media" && (
          <div className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Hero images (Desktop &amp; Mobile)</h2>
                <p>Set separate responsive hero images for desktop screens (&gt;700px) and mobile screens (≤700px).</p>
              </div>
            </div>
            <div className="admin-hero-cards">
              <div className="admin-hero-card">
                <div className="admin-hero-preview admin-hero-preview--desktop">
                  {content.hero.desktopImage ? (
                    <img src={content.hero.desktopImage} alt="Desktop hero preview" />
                  ) : (
                    <span>No desktop image</span>
                  )}
                </div>
                <UploadableUrl
                  label="Desktop hero image (>700px)"
                  value={content.hero.desktopImage}
                  onChange={(desktopImage) => {
                    setContent({ ...content, hero: { ...content.hero, desktopImage } });
                    setMessage("");
                  }}
                />
              </div>
              <div className="admin-hero-card">
                <div className="admin-hero-preview admin-hero-preview--mobile">
                  {content.hero.mobileImage ? (
                    <img src={content.hero.mobileImage} alt="Mobile hero preview" />
                  ) : (
                    <span>No mobile image</span>
                  )}
                </div>
                <UploadableUrl
                  label="Mobile hero image (≤700px)"
                  value={content.hero.mobileImage}
                  onChange={(mobileImage) => {
                    setContent({ ...content, hero: { ...content.hero, mobileImage } });
                    setMessage("");
                  }}
                />
              </div>
            </div>

            <div className="admin-section-heading admin-gallery-heading">
              <div>
                <h3>Image &amp; video gallery ({content.galleryPhotos.length})</h3>
                <p>Add, edit, remove or arrange the image and video tiles shown in the gallery grid.</p>
              </div>
              <div className="admin-gallery-add-actions">
                <button className="admin-primary-button" type="button" onClick={() => addGalleryPhoto("image")}>＋ Add image</button>
                <button className="admin-secondary-button" type="button" onClick={() => addGalleryPhoto("video")}>＋ Add video</button>
              </div>
            </div>
            <div className="admin-gallery-list">
              {[...content.galleryPhotos].sort((a, b) => a.sortOrder - b.sortOrder).map((photo, index, list) => {
                const isVideo = "video" in photo && photo.video !== undefined;
                const mediaUrl = (isVideo ? photo.video : photo.image) ?? "";

                return (
                  <article className="admin-gallery-card" key={photo.id}>
                    <div className="admin-gallery-card__heading">
                      <strong>#{index + 1} · {photo.title || "Untitled item"}</strong>
                      <div className="admin-order-controls">
                        <button
                          type="button"
                          aria-label={`Move ${photo.title} up`}
                          disabled={index === 0}
                          onClick={() => {
                            const items = [...list];
                            [items[index - 1], items[index]] = [items[index], items[index - 1]];
                            setContent({ ...content, galleryPhotos: items.map((item, sortOrder) => ({ ...item, sortOrder })) });
                            setMessage("");
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${photo.title} down`}
                          disabled={index === list.length - 1}
                          onClick={() => {
                            const items = [...list];
                            [items[index], items[index + 1]] = [items[index + 1], items[index]];
                            setContent({ ...content, galleryPhotos: items.map((item, sortOrder) => ({ ...item, sortOrder })) });
                            setMessage("");
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <label className="admin-field">
                        <span>Title</span>
                        <input value={photo.title} onChange={(event) => updateGallery(photo.id, { title: event.target.value })} />
                      </label>
                      <label className="admin-field">
                        <span>Media type</span>
                        <select
                          value={isVideo ? "video" : "image"}
                          onChange={(event) => setGalleryMediaType(photo.id, event.target.value as "image" | "video")}
                        >
                          <option value="image">Image</option>
                          <option value="video">Video (MP4 URL)</option>
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>Tile layout</span>
                        <select value={photo.size} onChange={(event) => updateGallery(photo.id, { size: event.target.value })}>
                          {[["", "Standard"], ["medium", "Medium"], ["large", "Large"], ["portrait", "Portrait"], ["full", "Full width"]].map(([value, label]) => (
                            <option key={value || "standard"} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>Image/video description</span>
                        <input value={photo.alt} onChange={(event) => updateGallery(photo.id, { alt: event.target.value })} />
                      </label>
                      <div className="admin-media-row admin-field--wide">
                        {mediaUrl && (
                          isVideo ? (
                            <video className="admin-preview-thumb" src={mediaUrl} muted playsInline />
                          ) : (
                            <img className="admin-preview-thumb" src={mediaUrl} alt={photo.alt || photo.title} />
                          )
                        )}
                        <UploadableUrl
                          label={isVideo ? "Video URL (HTTPS MP4)" : "Image URL"}
                          value={mediaUrl}
                          allowUpload={!isVideo}
                          placeholder={isVideo ? "Paste an HTTPS MP4 video URL" : "Paste an HTTPS URL or upload an image"}
                          onChange={(url) => updateGalleryMedia(photo.id, url)}
                        />
                      </div>
                      <div className="admin-card-actions admin-field--wide">
                        <button
                          className="admin-danger-button"
                          type="button"
                          onClick={() => {
                            const remaining = list
                              .filter((item) => item.id !== photo.id)
                              .map((item, sortOrder) => ({ ...item, sortOrder }));
                            setContent({ ...content, galleryPhotos: remaining });
                            setMessage("");
                          }}
                        >
                          Remove gallery item
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {tab === "locations" && (
          <div className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Package filter locations</h2>
                <p>Add, edit or reorder locations shown in the website’s package filter and available as quick tags on plan cards.</p>
              </div>
            </div>
            <div className="admin-add-row">
              <input
                aria-label="New location"
                placeholder="Add a location (e.g. Yusmarg, Gurez Valley)"
                value={newLocation}
                onChange={(event) => setNewLocation(event.target.value)}
                onKeyDown={handleEnterKey(addLocation)}
              />
              <button className="admin-primary-button" type="button" onClick={addLocation}>Add location</button>
            </div>
            <div className="admin-list">
              {content.locations.map((location, index) => (
                <div className="admin-list-row" key={index}>
                  <input
                    aria-label="Location name"
                    value={location}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setContent({
                        ...content,
                        locations: content.locations.map((item, itemIndex) => itemIndex === index ? nextValue : item),
                      });
                      setMessage("");
                    }}
                  />
                  <div className="admin-order-controls">
                    <button type="button" aria-label={`Move ${location} up`} disabled={index === 0} onClick={() => moveLocation(index, -1)}>↑</button>
                    <button type="button" aria-label={`Move ${location} down`} disabled={index === content.locations.length - 1} onClick={() => moveLocation(index, 1)}>↓</button>
                  </div>
                  <button
                    className="admin-danger-button"
                    type="button"
                    onClick={() => {
                      setContent({
                        ...content,
                        locations: content.locations.filter((_, itemIndex) => itemIndex !== index),
                      });
                      setMessage("");
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {!content.locations.length && <p className="admin-empty">No locations added yet.</p>}
            </div>
          </div>
        )}

        {tab === "social" && (
          <div className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Footer social links</h2>
                <p>Add Instagram, Facebook, YouTube, WhatsApp and other profile links to show in the site footer.</p>
              </div>
              <button className="admin-primary-button" type="button" onClick={addSocialLink}>＋ Add social link</button>
            </div>
            <div className="admin-list">
              {content.socialLinks.map((link, index) => (
                <div className="admin-list-row admin-social-row" key={link.id}>
                  <label className="admin-field">
                    <span>Platform</span>
                    <select
                      value={socialPlatforms.includes(link.platform) ? link.platform : "Other"}
                      onChange={(event) => {
                        setContent({
                          ...content,
                          socialLinks: content.socialLinks.map((item) => item.id === link.id ? { ...item, platform: event.target.value } : item),
                        });
                        setMessage("");
                      }}
                    >
                      {socialPlatforms.map((platform) => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Profile URL</span>
                    <input
                      type="url"
                      placeholder="https://instagram.com/yourhandle"
                      value={link.url}
                      onChange={(event) => {
                        setContent({
                          ...content,
                          socialLinks: content.socialLinks.map((item) => item.id === link.id ? { ...item, url: event.target.value } : item),
                        });
                        setMessage("");
                      }}
                      onBlur={(event) => {
                        const raw = event.target.value.trim();
                        if (raw && !/^https?:\/\//i.test(raw)) {
                          setContent((current) =>
                            current
                              ? {
                                  ...current,
                                  socialLinks: current.socialLinks.map((item) =>
                                    item.id === link.id ? { ...item, url: `https://${raw}` } : item,
                                  ),
                                }
                              : current,
                          );
                        }
                      }}
                    />
                  </label>
                  <div className="admin-order-controls">
                    <button type="button" aria-label={`Move ${link.platform} up`} disabled={index === 0} onClick={() => moveSocialLink(index, -1)}>↑</button>
                    <button type="button" aria-label={`Move ${link.platform} down`} disabled={index === content.socialLinks.length - 1} onClick={() => moveSocialLink(index, 1)}>↓</button>
                  </div>
                  <button
                    className="admin-danger-button"
                    type="button"
                    onClick={() => {
                      setContent({ ...content, socialLinks: content.socialLinks.filter((item) => item.id !== link.id) });
                      setMessage("");
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {!content.socialLinks.length && <p className="admin-empty">No social links added yet. Click “＋ Add social link” to add Instagram, Facebook, etc.</p>}
            </div>
          </div>
        )}
      </section>

      <footer className="admin-footer">
        <span>{isDirty ? "You have unsaved changes — click Save changes to publish." : "All changes are saved and live."}</span>
        <button className="admin-primary-button" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </footer>
    </main>
  );
}
