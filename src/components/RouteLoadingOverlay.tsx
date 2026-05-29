"use client";

import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isInternalNavigableLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") || "";
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const next = `${url.pathname}${url.search}${url.hash}`;
    return current !== next;
  } catch {
    return false;
  }
}

function RouteLoadingOverlayInner({ logoSrc }: { logoSrc: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const hideAfterRouteRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (hideAfterRouteRef.current) window.clearTimeout(hideAfterRouteRef.current);
    timeoutRef.current = null;
    hideAfterRouteRef.current = null;
  }, []);

  const startLoading = useCallback(() => {
    clearTimers();
    startedAtRef.current = Date.now();
    setLoading(true);
    timeoutRef.current = window.setTimeout(() => setLoading(false), 9000);
  }, [clearTimers]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !isInternalNavigableLink(anchor)) return;
      startLoading();
    };

    const onRouteStart = () => startLoading();

    document.addEventListener("click", onClick, true);
    window.addEventListener("cv-route-start", onRouteStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("cv-route-start", onRouteStart);
      clearTimers();
    };
  }, [clearTimers, startLoading]);

  useEffect(() => {
    if (!loading) return;

    const elapsed = Date.now() - startedAtRef.current;
    const minVisibleMs = 1150;
    const waitForNextPaintMs = 650;
    const delay = Math.max(0, minVisibleMs - elapsed) + waitForNextPaintMs;

    if (hideAfterRouteRef.current) window.clearTimeout(hideAfterRouteRef.current);
    hideAfterRouteRef.current = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setLoading(false);
        });
      });
    }, delay);

    return () => {
      if (hideAfterRouteRef.current) {
        window.clearTimeout(hideAfterRouteRef.current);
        hideAfterRouteRef.current = null;
      }
    };
  }, [pathname, searchParams, loading]);

  return (
    <div className={`route-loader ${loading ? "show" : ""}`} aria-hidden={!loading} role="status">
      <div className="route-loader-card">
        <Image src={logoSrc} alt="" width={42} height={42} className="route-loader-logo" unoptimized />
        <span className="route-loader-text">Cargando...</span>
      </div>
    </div>
  );
}

export default function RouteLoadingOverlay({ logoSrc }: { logoSrc: string }) {
  return (
    <Suspense fallback={null}>
      <RouteLoadingOverlayInner logoSrc={logoSrc} />
    </Suspense>
  );
}
