// Everything that makes a site one dealer rather than another. Pages read the
// brand; nothing about one dealer (its name, niche or contact details) lives in code.

/** One colour set; every value becomes a CSS variable (--color-<key>). */
export interface Palette {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  picked: string;
  /** Dark bands (the sell band, the hero's shade): dark in both themes. */
  band: string;
  bandFg: string;
  bandMuted: string;
  /** The footer; its accent is the logo, links under the pointer and focus rings. */
  foot: string;
  footFg: string;
  footMuted: string;
  footLine: string;
  footAccent: string;
}

export interface Phone {
  label: string;
  /** As shown: "07801 110000". */
  display: string;
  /** For tel: links: "+447801110000". */
  tel: string;
}

/** The sell your car page's words. */
/** The About page's words (the selling steps come from SellCopy). */
export interface AboutCopy {
  heading: string;
  intro: string;
  /** Up to three numbers, e.g. { value: "15", label: "years buying LHD cars" }. */
  /** google: filled with the live Google rating and count once Admin, Reviews has fetched them. */
  stats: { value: string; label: string; google?: boolean }[];
  /** "We buy left hand drive cars" text. */
  buy: string;
  /** "We sell left hand drive cars" text. */
  sell: string;
  /** Paragraphs of "Our story". */
  story: string[];
  /** Real reviews only; replaced by the newest Google reviews once Admin, Reviews has fetched them. */
  reviews: { text: string; name: string }[];
}

export interface SellCopy {
  /** The homepage's sell band. */
  bandHeading: string;
  bandText: string;
  /** Small line under the send button. */
  trust: string;
  /** Under the sell page's heading; introLookup when the registration lookup is on. */
  intro: string;
  introLookup: string;
  /** "What happens next", in order. */
  steps: { title: string; text: string }[];
  /** Under the thank-you heading. */
  thanks: string;
  /** Questions on the sell-your-<model> landing pages; "{model}" becomes the model's name. */
  faqs?: { q: string; a: string }[];
}

export interface Brand {
  /** Folder-safe id; picks this brand via the BRAND env var. */
  id: string;
  name: string;
  domain: string;
  /** The registered company's name and number, for the footer's small print. */
  company?: string;
  /** The small print's pages; without an address one shows in [brackets], not as a link. */
  legal?: { label: string; href?: string }[];
  /** Wordmark: a first line and a second smaller line (logo concept E). */
  logo: { top: string; bottom: string };
  colors: { light: Palette; dark: Palette };
  /** Font family stacks; the font files themselves load in the layout. */
  fonts: { display: string; body: string };
  contact: {
    phones: Phone[];
    email: string;
    address: string;
    hours: string;
    viewings?: string;
    /** WhatsApp number in international digits ("447801110000"); empty until known. */
    whatsapp?: string;
    googleProfileUrl?: string;
  };
  features: {
    sellForm: boolean;
    carsWanted: boolean;
    soldGallery: boolean;
    legacyRedirects: boolean;
    blog: boolean;
  };
  /** Per-brand copy. Only facts the client has confirmed. */
  copy: {
    carsTitle: string;
    carsIntro: string;
    /** /cars with no stock. */
    carsEmpty: string;
    /** /sell-your-car; needed when features.sellForm is on. */
    sell?: SellCopy;
    /** /about; the page is off without it. */
    about?: AboutCopy;
    /** Under the /blog heading. */
    blogIntro?: string;
    /** Under the /contact heading. */
    contactIntro?: string;
    /** Under the footer's logo: a sentence or two. */
    footer?: string;
  };
  /**
   * How car photos sit in the /cars grid frame. "contain" shows the whole
   * photo (bands at the sides if it doesn't fit); "cover" fills the frame and
   * trims the edges. Photos are never cropped on disk, so this can change any
   * time.
   */
  cardPhoto: { fit: "contain" | "cover"; ratio: string };
}
