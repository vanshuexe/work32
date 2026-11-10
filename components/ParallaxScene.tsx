"use client";

import { useEffect, useRef, useState } from "react";

const DOTS_AMOUNT = 40;

type MotionStatus = "enabled" | "permission-required" | "insecure" | "unavailable";

export default function ParallaxScene() {
  const containerRef = useRef<HTMLElement | null>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const [motionStatus, setMotionStatus] = useState<MotionStatus | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const background = backgroundRef.current;
    if (!container || !background) return;

    const dots = Array.from(container.querySelectorAll<HTMLElement>(".background_dot"));
    const cleanups: Array<() => void> = [];

    const createParallax = (
      element: HTMLElement,
      braking: number,
      translateScale = 1,
      isRotate = false,
      isOpposite = false
    ) => {
      let lastMove = 0;
      element.style.transform = `scale(${translateScale})`;

      const onMove = (event: MouseEvent) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (Date.now() - lastMove < 25) return;

        const rect = container.getBoundingClientRect();
        const relativeX = (event.clientX - rect.left) / rect.width;
        const relativeY = (event.clientY - rect.top) / rect.height;
        const direction = isOpposite ? -1 : 1;
        const x = Math.round(direction * (relativeX * 200 - 100) / braking);
        const y = Math.round(direction * (relativeY * 200 - 100) / braking);
        const tiltX = y * 0.9;
        const tiltY = x * 0.9;

        element.style.transform = isRotate
          ? `rotateY(${-tiltY}deg) rotateX(${tiltX}deg)`
          : `translate(${x}px, ${y}px) scale(${translateScale})`;
        lastMove = Date.now();
      };

      container.addEventListener("mousemove", onMove, { passive: true });
      cleanups.push(() => container.removeEventListener("mousemove", onMove));
    };

    dots.forEach((dot) => {
      const braking = (Math.round(Math.random() * (10 - 2) + 2)) / 5;
      createParallax(dot, braking, 0.8 / braking);
    });
    createParallax(background, 14, 1, true, true);

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background || !window.matchMedia("(pointer: coarse)").matches) return;

    if (!window.isSecureContext) {
      setMotionStatus("insecure");
      return;
    }
    if (typeof DeviceOrientationEvent === "undefined") {
      setMotionStatus("unavailable");
      return;
    }

    const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    let receivedEvent = false;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;

      const clamp = (value: number) => Math.max(-1, Math.min(1, value / 45));
      const x = Math.round(clamp(event.gamma) * 18);
      const y = Math.round(clamp(event.beta) * 12);
      background.style.transform = `translate(${x}px, ${y}px)`;
      if (!receivedEvent) {
        receivedEvent = true;
        setMotionStatus("enabled");
      }
    };

    window.addEventListener("deviceorientation", onOrientation);
    const timeout = window.setTimeout(() => {
      if (!receivedEvent) {
        setMotionStatus(orientationEvent.requestPermission ? "permission-required" : "unavailable");
      }
    }, 1500);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <section ref={containerRef} id="background" className="background" aria-label="Animated parallax background">
      <div ref={backgroundRef} id="background_image" className="background_image">
        <img
          className="smoke cloud1"
          alt=""
          aria-hidden="true"
          src="https://oleksandrpavlyshch.github.io/mouse-move-parallax_demo/img/smoke1.png"
        />
        <img
          className="smoke cloud2"
          alt=""
          aria-hidden="true"
          src="https://oleksandrpavlyshch.github.io/mouse-move-parallax_demo/img/smoke2.png"
        />
        <img
          className="smoke cloud3"
          alt=""
          aria-hidden="true"
          src="https://oleksandrpavlyshch.github.io/mouse-move-parallax_demo/img/smoke3.png"
        />
      </div>
      {Array.from({ length: DOTS_AMOUNT }, (_, index) => (
        <span className="background_dot" key={index} aria-hidden="true" />
      ))}
      {motionStatus && motionStatus !== "enabled" && (
        <div className="motion-control" role="status">
          {motionStatus === "insecure" && <p>Motion sensors need a secure HTTPS connection.</p>}
          {motionStatus === "permission-required" && (
            <p>iPhone Safari requires a tap to allow motion access; automatic access is blocked by iOS.</p>
          )}
          {motionStatus === "unavailable" && <p>Motion sensors are not available in this browser.</p>}
        </div>
      )}
      <div className="hero-copy">
        <p className="eyebrow">INTERACTIVE EXPERIENCE</p>
        <h1>Launching Soon</h1>
        <p className="subcopy">A subtle parallax scene responding to your cursor.</p>
      </div>
    </section>
  );
}
