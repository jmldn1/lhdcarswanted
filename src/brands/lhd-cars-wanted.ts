import type { Brand } from "./types.ts";

// LHD Cars Wanted. Everything in [BRACKETS] is a placeholder until the client
// confirms it: the live site (Nov 2026) still shows a sample phone number, so
// nothing is copied from it without checking. The look (colours, fonts, logo)
// hasn't been chosen yet; these neutral values only keep pages readable.
export const lhdCarsWanted: Brand = {
  id: "lhd-cars-wanted",
  name: "LHD Cars Wanted",
  domain: "www.lhdcarswanted.co.uk",
  logo: { top: "LHD", bottom: "CARS WANTED" },
  colors: {
    light: {
      bg: "#f4f5f7", surface: "#ffffff", fg: "#16181d", muted: "#5d6470",
      line: "#dcdfe5", accent: "#2f5f8a", accentInk: "#ffffff", picked: "#e6eef6",
    },
    dark: {
      bg: "#101216", surface: "#191c22", fg: "#e8eaee", muted: "#9ba3af",
      line: "#2c313a", accent: "#7fb0dc", accentInk: "#101216", picked: "#1f2f40",
    },
  },
  fonts: {
    // System fonts until a look is chosen. Font files and preloads:
    // src/brands/fonts/lhd-cars-wanted.ts
    display: '"Arial Narrow", Arial, sans-serif',
    body: 'system-ui, "Segoe UI", sans-serif',
  },
  contact: {
    phones: [{ label: "Sales", display: "[PHONE]", tel: "" }],
    // Shown on the live site; to confirm.
    email: "info@lhdcarswanted.co.uk",
    address: "[ADDRESS]",
    hours: "[OPENING HOURS]",
  },
  features: {
    sellForm: true,
    carsWanted: true,
    soldGallery: false,
    legacyRedirects: true,
    blog: true,
  },
  copy: {
    carsTitle: "Cars for sale",
    carsIntro: "[One line about the stock, confirmed by the client]",
    carsEmpty: "[What to say when there are no cars in stock]",
  },
  cardPhoto: { fit: "contain", ratio: "3 / 2" },
};
