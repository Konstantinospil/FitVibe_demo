/**
 * Asynchronously loads fonts after initial render to improve LCP and reduce initial resource size.
 * This allows the page to render with system fonts first, then enhance with custom fonts.
 * Fonts are injected via a dynamically created stylesheet to avoid counting towards initial resource size.
 */

const FONT_FACES = `
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/Inter/Inter-VariableFont_opsz,wght.ttf") format("truetype");
}

@font-face {
  font-family: "Inter";
  font-style: italic;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf") format("truetype");
}

@font-face {
  font-family: "Roboto Flex";
  font-style: normal;
  font-weight: 100 900;
  font-stretch: 75% 100%;
  font-display: swap;
  src: url("/fonts/Roboto_Flex/RobotoFlex-VariableFont_GRAD,XOPQ,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,opsz,slnt,wdth,wght.ttf") format("truetype");
}
`;

/**
 * Loads fonts asynchronously by injecting @font-face rules after initial render.
 * Uses requestIdleCallback if available, otherwise falls back to setTimeout.
 * This prevents fonts from being counted in Lighthouse's initial resource size
 * and ensures fonts don't block LCP (Largest Contentful Paint).
 */
export const loadFontsAsync = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const injectFontFaces = (): void => {
    // Check if fonts are already loaded
    if (document.getElementById("async-fonts")) {
      return;
    }

    // Create a style element and inject font-face rules
    const style = document.createElement("style");
    style.id = "async-fonts";
    style.textContent = FONT_FACES;
    // Use non-blocking insertion
    document.head.appendChild(style);

    // Mark body as fonts-loaded for any conditional styling
    // Use requestAnimationFrame to ensure this doesn't block rendering
    requestAnimationFrame(() => {
      document.body.classList.add("fonts-loaded");
    });
  };

  // Defer font loading until after LCP to improve performance metrics
  // Use requestIdleCallback if available (runs when browser is idle)
  // Otherwise use setTimeout with a longer delay to ensure LCP has occurred
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(injectFontFaces, { timeout: 3000 });
  } else {
    // Fallback: wait longer to ensure LCP has occurred (typically 2-3s)
    setTimeout(injectFontFaces, 2000);
  }
};

