"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import TravelSiteContent from "@/components/TravelSiteContent";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content";

function SocialIcon({ platform }: { platform: string }) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14.5 21v-7.8h2.6l.4-3h-3V8.3c0-.9.3-1.5 1.5-1.5h1.6V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.1H8.7v3h2.5V21h3.3Z" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.8" y="5.5" width="18.4" height="13" rx="4" stroke="currentColor" strokeWidth="1.9" />
          <path d="M10.2 9.2 15.6 12l-5.4 2.8V9.2Z" fill="currentColor" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3.8a8.1 8.1 0 0 0-7 12.1L4 20l4.2-1.1A8.1 8.1 0 1 0 12 3.8Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M8.5 8.2c.3-.3.7-.4 1-.1l.9 1.1c.2.3.2.6-.1.9l-.4.5a6.8 6.8 0 0 0 2.5 2.5l.5-.4c.3-.3.6-.3.9-.1l1.1.9c.3.3.3.8 0 1-.4.4-1 .5-1.6.3-2.5-.9-4.5-2.9-5.4-5.4-.2-.6-.1-1.2.3-1.6Z" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4.5 4.2h3.4l4.4 6 5.1-6h1.9l-6.1 7.1 6.4 8.5h-3.4l-4.7-6.3-5.5 6.3H4.1l6.5-7.5-6.1-8.1Z" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14.5 4v10.2a3.7 3.7 0 1 1-2.9-3.6V7.5a6.7 6.7 0 1 0 5.9 6.7V8.7a6 6 0 0 0 3.2 1V6.6a3.9 3.9 0 0 1-3.2-2.6h-3Z" fill="currentColor" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="8.2" cy="8.5" r="1.1" fill="currentColor" />
          <path d="M7.2 11.2v5.6M11.4 16.8v-5.6m0 2c.4-1.2 1.4-2.1 2.7-2.1 1.6 0 2.7 1.1 2.7 2.9v2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" />
          <path d="M3.8 12h16.4M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
  }
}

function MainNavigation() {
  const navRef = useRef<HTMLElement | null>(null);
  const [lens, setLens] = useState<{ left: number; width: number } | null>(null);

  const moveLens = (link: HTMLAnchorElement) => {
    const nav = navRef.current;
    if (!nav) return;

    const navBounds = nav.getBoundingClientRect();
    const linkBounds = link.getBoundingClientRect();
    setLens({
      left: linkBounds.left - navBounds.left - 10,
      width: linkBounds.width + 20,
    });
  };

  return (
    <nav
      ref={navRef}
      className="main-nav"
      aria-label="Main navigation"
      onPointerLeave={() => setLens(null)}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setLens(null);
        }
      }}
    >
      <span
        className="main-nav__lens"
        aria-hidden="true"
        style={{
          left: lens?.left ?? 0,
          width: lens?.width ?? 0,
          opacity: lens ? 1 : 0,
        }}
      />
      <a href="#destinations" onPointerEnter={(event) => moveLens(event.currentTarget)} onFocus={(event) => moveLens(event.currentTarget)}>
        Destinations
      </a>
      <a href="#packages" onPointerEnter={(event) => moveLens(event.currentTarget)} onFocus={(event) => moveLens(event.currentTarget)}>
        Tour packages
      </a>
      <a href="#gallery" onPointerEnter={(event) => moveLens(event.currentTarget)} onFocus={(event) => moveLens(event.currentTarget)}>
        Gallery
      </a>
      <a href="#about" onPointerEnter={(event) => moveLens(event.currentTarget)} onFocus={(event) => moveLens(event.currentTarget)}>
        About us
      </a>
    </nav>
  );
}

export default function LaunchLandingPage({ initialContent = defaultSiteContent }: { initialContent?: SiteContent }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const [content, setContent] = useState<SiteContent>(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    let active = true;
    fetch("/api/site-content", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Content request failed (${response.status}).`);
        return (await response.json()) as SiteContent;
      })
      .then((siteContent) => {
        if (active) setContent(siteContent);
      })
      .catch((error: unknown) => {
        console.error("Could not load updated site content:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !window.isSecureContext || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    const setParallax = (x: number, y: number) => {
      hero.style.setProperty("--parallax-x", `${x}px`);
      hero.style.setProperty("--parallax-y", `${y}px`);
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;
      const clamp = (value: number) => Math.max(-1, Math.min(1, value / 35));
      setParallax(clamp(event.gamma) * 24, clamp(event.beta) * 16);
    };

    const onMouseMove = (event: MouseEvent) => {
      const bounds = hero.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      setParallax(-x * 18, -y * 12);
    };

    if (isTouchDevice) {
      if (typeof DeviceOrientationEvent !== "undefined") {
        window.addEventListener("deviceorientation", onOrientation, { passive: true });
      }
    } else {
      hero.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      hero.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="site-shell">
      <header className="site-header">
        <span className="site-header__effect" aria-hidden="true" />
        <span className="site-header__tint" aria-hidden="true" />
        <span className="site-header__shine" aria-hidden="true" />
        <a className="brand" href="#top" aria-label="Stressout Tours & Travels home">
          <Image
            src="https://ik.imagekit.io/kirgb3odmp/stressout/Stressout%20Tours%20&%20Travels%20Logo.png"
            alt="Stressout Tours & Travels"
            width={2000}
            height={480}
            priority
          />
        </a>
        <MainNavigation />
        <a className="header-cta header-cta--whatsapp" href="#contact">
          <span className="glass-control__content">
            <svg className="header-cta__whatsapp-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3.6a8.3 8.3 0 0 0-7.2 12.4L3.8 20l4.3-1.1A8.3 8.3 0 1 0 12 3.6Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M8.1 7.7c.3-.4.8-.5 1.2-.1l1 1.3c.3.3.2.7-.1 1l-.5.6a7.6 7.6 0 0 0 2.8 2.8l.6-.5c.3-.3.7-.4 1-.1l1.3 1c.4.3.3.9-.1 1.2-.4.4-1.1.6-1.7.4-2.9-1-5.1-3.2-6.1-6.1-.2-.6 0-1.3.4-1.7Z" fill="currentColor" />
            </svg>
            Plan your trip
          </span>
        </a>
      </header>

      <main id="top">
        <section ref={heroRef} className="launch-hero" aria-labelledby="launch-title">
          <picture className="launch-hero__picture">
            <source
              media="(max-width: 700px)"
              srcSet={content.hero.mobileImage}
            />
            <Image
              className="launch-hero__image"
              src={content.hero.desktopImage}
              alt="A scenic mountain road trip"
              fill
              priority
              sizes="100vw"
            />
          </picture>
          <div className="launch-hero__shade" />
          <div className="launch-hero__content">
            <h1 id="launch-title">Stressing<br /><em>Out</em></h1>
            <div className="hero-actions">
              <a className="button button--light" href="#discover">
                <span className="glass-control__content">Discover the vision</span>
              </a>
            </div>
          </div>
        </section>

        <TravelSiteContent content={content} />
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#top" aria-label="Stressout Tours and Travel home">
          <Image
            src="https://ik.imagekit.io/kirgb3odmp/stressout/Stressout%20Tours%20&%20Travels%20Logo.png"
            alt="Stressout Tours & Travels"
            width={2000}
            height={480}
          />
        </a>
        <div className="footer-contact">
          <p>Come with dreams. Return with memories.</p>
          <a href="tel:+918923326455">+91 89233 26455</a>
        </div>
        {content.socialLinks.length > 0 && (
          <nav className="footer-social-links" aria-label="Social media">
            {content.socialLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                <SocialIcon platform={link.platform} />
                <span>{link.platform}</span>
              </a>
            ))}
          </nav>
        )}
        <span className="footer-copyright">© {new Date().getFullYear()} Stressout Tours And Travel</span>
      </footer>
    </div>
  );
}
