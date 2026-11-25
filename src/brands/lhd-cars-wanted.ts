import type { Brand } from "./types.ts";

// LHD Cars Wanted. Everything in [BRACKETS] is a placeholder until the client
// confirms it: the live site (Nov 2026) still shows a sample phone number, so
// nothing is copied from it without checking. The look follows the v2
// mockups (fonts, layout); its own colours and logo are still to be chosen,
// so the colours below are neutral placeholders.
export const lhdCarsWanted: Brand = {
  id: "lhd-cars-wanted",
  name: "LHD Cars Wanted",
  domain: "www.lhdcarswanted.co.uk",
  company: "[COMPANY NAME AND NUMBER]",
  // Their pages aren't written yet: give each its href when it is.
  legal: [{ label: "Privacy" }, { label: "Terms" }],
  logo: { top: "LHD", bottom: "CARS WANTED" },
  colors: {
    light: {
      bg: "#f4f5f7", surface: "#ffffff", fg: "#16181d", muted: "#5d6470",
      line: "#dcdfe5", accent: "#2f5f8a", accentInk: "#ffffff", picked: "#e6eef6",
      band: "#16202e", bandFg: "#ffffff", bandMuted: "#c7d1de",
      foot: "#0f1723", footFg: "#ffffff", footMuted: "#b4bfcc", footLine: "#2b3647", footAccent: "#8fbbe3",
    },
    dark: {
      bg: "#101216", surface: "#191c22", fg: "#e8eaee", muted: "#9ba3af",
      line: "#2c313a", accent: "#7fb0dc", accentInk: "#101216", picked: "#1f2f40",
      band: "#0c121b", bandFg: "#e8eaee", bandMuted: "#b4bfcc",
      foot: "#090d14", footFg: "#e8eaee", footMuted: "#a6b0bd", footLine: "#2c313a", footAccent: "#7fb0dc",
    },
  },
  fonts: {
    // Font files and preloads: src/brands/fonts/lhd-cars-wanted.ts
    display: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
    body: '"Source Sans 3", "Segoe UI", system-ui, sans-serif',
  },
  contact: {
    // Phone confirmed by the client 22 Nov 2026; the same number is on WhatsApp (23 Nov).
    phones: [{ label: "Sales", display: "07447 430488", tel: "+447447430488" }],
    // Shown on the live site; to confirm.
    email: "info@lhdcarswanted.co.uk",
    address: "[ADDRESS]",
    hours: "[OPENING HOURS]",
    whatsapp: "447447430488",
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
    sell: {
      // Confirmed by the client, 18 Nov 2026.
      bandHeading: "Got a car to sell? Get a free valuation today",
      bandText: "Top cash prices paid, outstanding finance settled, secure payment and free UK collection.",
      trust: "[No obligation] · your details stay with us",
      intro: "Free valuation. Start with your registration and we'll come back with a price.",
      introLookup: "Free valuation. Start with your registration and we'll find your car.",
      steps: [
        { title: "We look at your car's details", text: "And the photos, if you sent any." },
        { title: "We come back with a price", text: "[Usually within REPLY TIME]" },
        { title: "Paid and collected", text: "Secure payment and free collection anywhere in the UK." },
      ],
      thanks: "[We'll reply within REPLY TIME] by email, or by phone if you gave us a number.",
      // Answers in brackets wait for the client.
      faqs: [
        { q: "There's finance outstanding on my {model}. Can I still sell it?", a: "Yes. We settle outstanding finance as part of buying your car." },
        { q: "Do I have to bring the car to you?", a: "No. Collection is free, anywhere in the UK." },
        { q: "Do you buy cars that aren't registered in the UK?", a: "[CLIENT TO CONFIRM: whether you buy cars still on foreign plates, and how.]" },
        { q: "How and when do I get paid?", a: "[CLIENT TO CONFIRM: how payment works and how quickly.] Payment is secure." },
        { q: "Do you buy cars that don't run?", a: "[CLIENT TO CONFIRM]" },
      ],
    },
    about: {
      heading: "Left hand drive cars, bought and sold",
      intro: "[Who we are, in one or two sentences: who runs it, since when, where.]",
      stats: [
        { value: "[Years]", label: "[years buying and selling LHD cars]" },
        { value: "[Number]", label: "[cars bought]" },
        { value: "[Rating]", label: "[from Google reviews]" },
      ],
      // The confirmed sell band wording.
      buy: "Free valuation and top cash prices paid. Outstanding finance settled, secure payment and free UK collection.",
      sell: "[What you sell: the kind of cars, how they're prepared, viewings.]",
      story: ["[How it started.]", "[Why left hand drive cars.]", "[What sellers and buyers can expect from you.]"],
      reviews: [
        { text: "[A real review, from Google]", name: "[Name]" },
        { text: "[A real review, from Google]", name: "[Name]" },
        { text: "[A real review, from Google]", name: "[Name]" },
      ],
    },
    blogIntro: "[Blog intro: what you write about, in a sentence or two]",
    contactIntro: "Call, WhatsApp or email us, or send a message below. [We usually reply within REPLY TIME.]",
    footer: "Left hand drive cars, bought and sold. Free valuation, secure payment and free UK collection.",
  },
  cardPhoto: { fit: "cover", ratio: "3 / 2" },
};
