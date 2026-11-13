import Image from "next/image";
import { type GalleryPhoto, type SiteContent, type TourPackage } from "@/lib/site-content";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const destinations = [
  { name: "Srinagar", description: "Dal Lake, Mughal gardens and old-city charm.", image: "/travel-gallery/srinagar.png" },
  { name: "Gulmarg", description: "Alpine meadows and the famous gondola.", image: "/travel-gallery/forest-hike.png" },
  { name: "Pahalgam", description: "Riverside views, pine forests and green valleys.", image: "/travel-gallery/pahalgam.png" },
  { name: "Sonmarg", description: "Wide mountain views and quiet high valleys.", image: "/travel-gallery/sonmarg.png" },
  { name: "Doodhpathri", description: "Peaceful meadows, hills and clear streams.", image: "/travel-gallery/stream-crossing.png" },
  { name: "Drung Waterfall", description: "A refreshing waterfall stop near Gulmarg.", image: "/travel-gallery/waterfall.png" },
];

const packageRatingOptions = [
  { label: "All hotel ratings", value: "" },
  { label: "1 star", value: "1" },
  { label: "2 stars", value: "2" },
  { label: "3 stars", value: "3" },
  { label: "4 stars", value: "4" },
  { label: "5 stars", value: "5" },
];

const travelerTypes = [
  { title: "Couples & honeymooners", description: "Romantic stays, beautiful views and thoughtful moments together.", image: "/travel-gallery/lakeside-camp.png" },
  { title: "Families", description: "Comfortable plans and memorable experiences for every generation.", image: "/travel-gallery/riverside-town.png" },
  { title: "Friends & groups", description: "A fun, flexible getaway with room for everyone to explore.", image: "/travel-gallery/forest-hike.png" },
  { title: "Corporate & large groups", description: "Coordinated travel arrangements for a smooth group journey.", image: "/travel-gallery/sonmarg.png" },
  { title: "Your own kind of trip", description: "A personalized itinerary shaped around your preferences and budget.", image: "/travel-gallery/trekking-pack.png" },
];

const reasons = [
  "250+ successful tours",
  "Registered Kashmir-based travel company",
  "Personalized packages for every kind of traveller",
  "3-star, 4-star and 5-star hotel options",
  "Plans shaped around your budget and preferences",
  "Dedicated support throughout your journey",
];

const whatsappHref =
  "https://wa.me/918923326455?text=Hello%20Stressout%20Tours%20and%20Travel%2C%20I%27d%20like%20to%20plan%20a%20Kashmir%20trip.";

function GlassLayers() {
  return (
    <>
      <span className="benefit-panel__effect" aria-hidden="true" />
      <span className="benefit-panel__tint" aria-hidden="true" />
      <span className="benefit-panel__shine" aria-hidden="true" />
    </>
  );
}

function NavbarGlassLayers() {
  return (
    <>
      <span className="site-header__effect" aria-hidden="true" />
      <span className="site-header__tint" aria-hidden="true" />
      <span className="site-header__shine" aria-hidden="true" />
    </>
  );
}

function PackageFilterDropdown({
  value,
  onChange,
  options,
  id,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  id: string;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const optionsId = `package-${id}-options`;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option) return;

    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab" && isOpen) {
      setIsOpen(false);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!isOpen) {
        setActiveIndex(selectedIndex);
        setIsOpen(true);
      } else {
        setActiveIndex((index) => (index + direction + options.length) % options.length);
      }
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
      setIsOpen(true);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        selectOption(activeIndex);
      } else {
        setActiveIndex(selectedIndex);
        setIsOpen(true);
      }
    }
  };

  return (
    <div className="package-location" ref={rootRef}>
      <NavbarGlassLayers />
      <button
        ref={triggerRef}
        type="button"
        className="package-location__trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={optionsId}
        aria-activedescendant={isOpen ? `${optionsId}-${activeIndex}` : undefined}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setIsOpen((open) => !open);
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="package-location__label">{options[selectedIndex].label}</span>
        <span className={`package-location__chevron${isOpen ? " is-open" : ""}`} aria-hidden="true">⌄</span>
      </button>
      <div
        id={optionsId}
        className={`package-location__menu${isOpen ? " is-open" : ""}`}
        role="listbox"
        aria-label={label}
        aria-hidden={!isOpen}
      >
        <NavbarGlassLayers />
        <span
          className="package-location__lens"
          aria-hidden="true"
          style={{ top: 8 + activeIndex * 38 }}
        />
        {options.map((option, index) => (
          <div
            id={`${optionsId}-${index}`}
            className="package-location__option"
            key={option.label}
            role="option"
            aria-selected={option.value === value}
            onPointerMove={() => setActiveIndex(index)}
            onClick={() => selectOption(index)}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TravelSiteContent({ content }: { content: SiteContent }) {
  const packages = [...content.packages].sort((a, b) => a.sortOrder - b.sortOrder);
  const packageGroups = [...content.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const galleryPhotos = [...content.galleryPhotos].sort((a, b) => a.sortOrder - b.sortOrder);
  const packageLocationOptions = [
    { label: "All locations", value: "" },
    ...content.locations.map((location) => ({ label: location, value: location })),
  ];
  const [selectedPackage, setSelectedPackage] = useState<TourPackage | null>(null);
  const [packageSearch, setPackageSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (selectedLocation && !content.locations.some((loc) => loc.toLowerCase() === selectedLocation.toLowerCase())) {
      setSelectedLocation("");
    }
  }, [content.locations, selectedLocation]);
  const previewRef = useRef<HTMLDialogElement>(null);
  const galleryPreviewRef = useRef<HTMLDialogElement>(null);
  const navigateGalleryPreview = (direction: -1 | 1) => {
    setSelectedGalleryPhoto((currentPhoto) => {
      if (!currentPhoto || !galleryPhotos.length) return null;
      const currentIndex = galleryPhotos.findIndex((photo) => photo.id === currentPhoto.id);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (startIndex + direction + galleryPhotos.length) % galleryPhotos.length;
      return galleryPhotos[nextIndex];
    });
  };
  const searchTerm = packageSearch.trim().toLowerCase();
  const filteredPackages = packages.filter((item) => {
    const searchableText = [
      item.title,
      item.group,
      item.duration,
      item.price,
      item.rateNote,
      item.personRate ?? "",
      item.places,
      `${item.hotelStars}-star ${item.hotelStars} star`,
    ].join(" ").toLowerCase();
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
    const matchesLocation = !selectedLocation || item.places.toLowerCase().includes(selectedLocation.toLowerCase());
    const matchesRating = !selectedRating || item.hotelStars === Number(selectedRating);
    return matchesSearch && matchesLocation && matchesRating;
  });

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    if (selectedPackage && !preview.open) {
      preview.showModal();
    } else if (!selectedPackage && preview.open) {
      preview.close();
    }
  }, [selectedPackage]);

  useEffect(() => {
    const preview = galleryPreviewRef.current;
    if (!preview) return;

    if (selectedGalleryPhoto && !preview.open) {
      preview.showModal();
    } else if (!selectedGalleryPhoto && preview.open) {
      preview.close();
    }
  }, [selectedGalleryPhoto]);

  return (
    <>
      <section className="packages-section" id="packages" aria-labelledby="packages-title">
        <div className="travel-section-heading">
          <h2 id="packages-title">Find your Kashmir <em>escape.</em></h2>
        </div>
        <div className="package-filter-bar" role="search" aria-label="Find a Kashmir tour package">
          <label className="package-search">
            <span className="site-header__effect" aria-hidden="true" />
            <span className="site-header__tint" aria-hidden="true" />
            <span className="site-header__shine" aria-hidden="true" />
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              aria-label="Search tour packages"
              placeholder="Search packages or destinations"
              value={packageSearch}
              onChange={(event) => setPackageSearch(event.target.value)}
            />
          </label>
          <PackageFilterDropdown
            id="location"
            label="Filter packages by location"
            options={packageLocationOptions}
            value={selectedLocation}
            onChange={setSelectedLocation}
          />
          <PackageFilterDropdown
            id="rating"
            label="Filter packages by hotel rating"
            options={packageRatingOptions}
            value={selectedRating}
            onChange={setSelectedRating}
          />
        </div>
        {packageGroups.map((category) => {
          const groupPackages = filteredPackages.filter((item) => item.categoryId === category.id);
          return groupPackages.length > 0 ? (
              <div className="travel-package-group" key={category.id}>
                <h3 className="travel-package-group__title">{category.name}</h3>
                <div className="travel-package-grid">
                  {groupPackages.map((item) => (
                    <article className="product-card travel-package" key={item.id}>
                      <span className="product-card__effect" aria-hidden="true" />
                      <span className="product-card__tint" aria-hidden="true" />
                      <span className="product-card__shine" aria-hidden="true" />
                      <button
                        type="button"
                        className="product-card__visual travel-package__visual travel-package__image-button"
                        aria-label={`View full image: ${item.title}, ${item.duration}, ${item.rateNote}`}
                        onClick={() => setSelectedPackage(item)}
                      >
                        <Image src={item.image} alt={item.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 25vw" />
                        <span className="travel-package__image-hint" aria-hidden="true">⤢</span>
                      </button>
                      <div className="product-card__content travel-package__content">
                        <p>{item.duration}</p>
                        <h3>{item.title}</h3>
                        <p className="travel-package__rating">{item.hotelStars}-star hotel</p>
                        <p className="travel-package__places">{item.places}</p>
                        <div className="travel-package__price">
                          <span>Package rate</span>
                          <strong>{item.price}</strong>
                          <span>{item.rateNote}</span>
                          {item.personRate && <span className="travel-package__person-rate">{item.personRate}</span>}
                        </div>
                        <a
                          className="header-cta travel-package__cta"
                          href={`${whatsappHref}%20I%27m%20interested%20in%20the%20${encodeURIComponent(item.title)}%20(${encodeURIComponent(item.group)}%2C%20${encodeURIComponent(item.duration)})%20package.`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="glass-control__content">Ask about this trip</span>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null;
        })}
        {filteredPackages.length === 0 && (
          <div className="package-empty" role="status">
            <p>No packages match your search. Try another location or clear your filters.</p>
            <button
              className="header-cta"
              type="button"
              onClick={() => {
                setPackageSearch("");
                setSelectedLocation("");
                setSelectedRating("");
              }}
            >
              <span className="glass-control__content">Clear filters</span>
            </button>
          </div>
        )}
        <p className="package-note">Rates shown are as shared in the package artwork. Ask us about your dates and travel requirements.</p>
      </section>

      <dialog
        ref={previewRef}
        className="travel-package-preview"
        aria-labelledby="travel-package-preview-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
        onClose={() => setSelectedPackage(null)}
      >
        <span className="site-header__effect" aria-hidden="true" />
        <span className="site-header__tint" aria-hidden="true" />
        <span className="site-header__shine" aria-hidden="true" />
        {selectedPackage && (
          <>
            <button
              type="button"
              className="travel-package-preview__close"
              aria-label="Close image preview"
              onClick={() => previewRef.current?.close()}
            >
              ×
            </button>
            <h2 id="travel-package-preview-title">{selectedPackage.title}</h2>
            <Image
              className="travel-package-preview__image"
              src={selectedPackage.image}
              alt={selectedPackage.alt}
              width={768}
              height={832}
              sizes="(max-width: 700px) 94vw, 800px"
            />
          </>
        )}
      </dialog>

      <dialog
        ref={galleryPreviewRef}
        className="travel-package-preview travel-gallery-preview"
        aria-labelledby="travel-gallery-preview-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedGalleryPhoto(null);
            event.currentTarget.close();
          }
        }}
        onCancel={() => setSelectedGalleryPhoto(null)}
        onClose={() => setSelectedGalleryPhoto(null)}
      >
        <span className="site-header__effect" aria-hidden="true" />
        <span className="site-header__tint" aria-hidden="true" />
        <span className="site-header__shine" aria-hidden="true" />
        {selectedGalleryPhoto && (
          <>
            <button
              type="button"
              className="travel-package-preview__close"
              aria-label="Close gallery preview"
              onClick={() => {
                setSelectedGalleryPhoto(null);
                galleryPreviewRef.current?.close();
              }}
            >
              ×
            </button>
            <h2 id="travel-gallery-preview-title">{selectedGalleryPhoto.title}</h2>
            <div className="travel-gallery-preview__media-frame">
              <button
                type="button"
                className="travel-gallery-preview__nav travel-gallery-preview__nav--previous"
                aria-label="Previous gallery image"
                onClick={() => navigateGalleryPreview(-1)}
              >
                ←
              </button>
              {"video" in selectedGalleryPhoto && selectedGalleryPhoto.video ? (
                <video
                  key={selectedGalleryPhoto.id}
                  className="travel-gallery-preview__media"
                  controls
                  autoPlay
                  muted
                  playsInline
                >
                  <source src={selectedGalleryPhoto.video} type="video/mp4" />
                </video>
              ) : selectedGalleryPhoto.image ? (
                <Image
                  className="travel-gallery-preview__media"
                  src={selectedGalleryPhoto.image}
                  alt={selectedGalleryPhoto.alt}
                  fill
                  sizes="(max-width: 700px) 94vw, 860px"
                />
              ) : null}
              <button
                type="button"
                className="travel-gallery-preview__nav travel-gallery-preview__nav--next"
                aria-label="Next gallery image"
                onClick={() => navigateGalleryPreview(1)}
              >
                →
              </button>
            </div>
          </>
        )}
      </dialog>

      <section className="travel-welcome" id="about" aria-labelledby="welcome-title">
        <div className="travel-welcome__copy" id="discover">
          <p className="eyebrow">Come with dreams. Return with memories.</p>
          <h2 id="welcome-title">
            Welcome to <em>Stressout Tours And Travel.</em>
          </h2>
          <p>
            Some journeys are remembered for the places we visit. Others stay with us because
            of the people, experiences and beautiful memories we create along the way.
          </p>
          <p>
            For us, a Kashmir holiday is more than getting from one destination to another.
            It is time with the people you love, breathtaking views, local culture and the
            comfort of knowing we are here to help.
          </p>
          <p>
            Established in January 2025, we are a registered Kashmir-based travel company
            committed to making every journey comfortable, memorable and truly special.
          </p>
          <a className="text-link" href="#packages">
            Find your Kashmir getaway <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="travel-welcome__facts">
          <article className="benefit-panel travel-fact">
            <GlassLayers />
            <div className="travel-fact__content">
              <span className="travel-fact__number">250+</span>
              <h3>successful tours</h3>
              <p>Hundreds of journeys, shared with our guests.</p>
            </div>
          </article>
          <article className="benefit-panel travel-fact">
            <GlassLayers />
            <div className="travel-fact__content">
              <span className="travel-fact__number">01</span>
              <h3>your people in Kashmir</h3>
              <p>Come as a guest. Leave feeling like family.</p>
            </div>
          </article>
          <p className="travel-license">Registered travel company · Licence No. JKEA00004953</p>
        </div>
      </section>

      <section className="travel-gallery-section" id="gallery" aria-labelledby="gallery-title">
        <div className="travel-section-heading">
          <h2 id="gallery-title">Travel, <em>frame by frame.</em></h2>
        </div>
        <div className="travel-gallery-grid">
          {galleryPhotos.map((photo) => (
            <button
              type="button"
              className={`travel-gallery__item${photo.size ? ` travel-gallery__item--${photo.size}` : ""}${"video" in photo && photo.video && photo.size === "full" ? " travel-gallery__item--video" : ""}`}
              key={photo.id}
              aria-label={`Open ${photo.title} gallery preview`}
              onClick={() => setSelectedGalleryPhoto(photo)}
            >
              {"video" in photo && photo.video ? (
                <video autoPlay loop muted playsInline preload="metadata" aria-hidden="true">
                  <source src={photo.video} type="video/mp4" />
                </video>
              ) : photo.image ? (
                <Image src={photo.image} alt={photo.alt} fill sizes="(max-width: 500px) 100vw, (max-width: 900px) 50vw, 25vw" />
              ) : null}
              <span className="travel-gallery__details">{photo.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="destination-section" id="destinations" aria-labelledby="destination-title">
        <div className="travel-section-heading">
          <h2 id="destination-title">Experience the magic <em>of Kashmir.</em></h2>
        </div>
        <div className="destination-grid">
          {destinations.map(({ name, description, image }) => (
            <article className="destination-card" key={name}>
              <div className="destination-card__image-wrap">
                <Image
                  className="destination-card__image"
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw"
                />
              </div>
              <div className="destination-card__body">
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="traveler-section" aria-labelledby="traveler-title">
        <div className="traveler-section__intro">
          <p className="eyebrow">Discover Kashmir, your way</p>
          <h2 id="traveler-title">Every traveller has <em>a different dream.</em></h2>
          <p>
            Whether you are travelling as two or with a large group, your journey gets the
            attention it deserves.
          </p>
        </div>
        <div className="traveler-grid">
          {travelerTypes.map(({ title, description, image }, index) => (
            <article className="benefit-panel traveler-card" key={title}>
              <GlassLayers />
              <span className="traveler-card__image-wrap" aria-hidden="true">
                <Image
                  className="traveler-card__image"
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 40vw, (max-width: 1000px) 30vw, 22vw"
                />
              </span>
              <div className="traveler-card__content">
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="stay-section" aria-labelledby="stay-title">
        <div className="stay-section__copy">
          <p className="eyebrow">Stay comfortably, travel happily</p>
          <h2 id="stay-title">A beautiful holiday deserves <em>a beautiful stay.</em></h2>
          <p>
            Choose from carefully selected accommodation to match your budget, preferences
            and group. From a comfortable stay to premium hospitality, we will help you find
            the right fit for your journey.
          </p>
        </div>
        <div className="stay-options">
          {["3-star stays", "4-star comfort", "5-star luxury"].map((stay, index) => (
            <article className="benefit-panel stay-option" key={stay}>
              <GlassLayers />
              <span className="stay-option__number">0{index + 1}</span>
              <h3>{stay}</h3>
              <p>Thoughtful options for the way you want to travel.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="benefits-section travel-reasons" id="why-us" aria-labelledby="reasons-title">
        <div className="benefits-section__header">
          <p className="eyebrow">A little more than just travel</p>
          <h2 id="reasons-title">Why travel with <em>Stressout?</em></h2>
          <p className="travel-reasons__lead">
            We do not just plan tour packages. We create experiences that make our guests happy.
          </p>
        </div>
        <div className="benefits-grid travel-reasons__grid">
          {reasons.map((reason, index) => (
            <article className="benefit-panel travel-reason" key={reason}>
              <GlassLayers />
              <div className="benefit-panel__content">
                <span className="travel-reason__number">0{index + 1}</span>
                <p>{reason}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="travel-contact" id="contact" aria-labelledby="contact-title">
        <p className="eyebrow">Your happiness comes first</p>
        <h2 id="contact-title">Come as a guest.<br /><em>Leave as family.</em></h2>
        <p>
          Tell us what your dream Kashmir holiday looks like. We will help you plan a
          comfortable, personal journey—then hope you return home with stories to share.
        </p>
        <a className="header-cta travel-contact__cta" href={whatsappHref} target="_blank" rel="noreferrer">
          <span className="glass-control__content">
            <svg className="travel-contact__whatsapp-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3.6a8.3 8.3 0 0 0-7.2 12.4L3.8 20l4.3-1.1A8.3 8.3 0 1 0 12 3.6Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M8.1 7.7c.3-.4.8-.5 1.2-.1l1 1.3c.3.3.2.7-.1 1l-.5.6a7.6 7.6 0 0 0 2.8 2.8l.6-.5c.3-.3.7-.4 1-.1l1.3 1c.4.3.3.9-.1 1.2-.4.4-1.1.6-1.7.4-2.9-1-5.1-3.2-6.1-6.1-.2-.6 0-1.3.4-1.7Z" fill="currentColor" />
            </svg>
            Plan your Kashmir trip
          </span>
        </a>
        <a className="travel-contact__phone" href="tel:+918923326455">+91 89233 26455</a>
        <div className="travel-contact__addresses">
          <p className="travel-contact__address">
            <span className="travel-contact__address-label">Main Office:</span> Gulmarg Road, Agri Kalan, Magam, Kashmir
          </p>
          <p className="travel-contact__address">
            <span className="travel-contact__address-label">Branch Office:</span> Rehmat Nagar, Muzaffarnagar
          </p>
        </div>
        <p className="travel-contact__licence">Registration: January 2025 · Licence No. JKEA00004953</p>
      </section>
    </>
  );
}
