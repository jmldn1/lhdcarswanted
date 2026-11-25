// The flag of the country a car is registered in, for its page. The drawings
// and the countries are London LHD Centre v1's (utils/registration.js there):
// SVG rather than emoji, which Windows shows as plain letters.
//
// "Registered in" is free text, so a flag shows only when the words are clearly
// one country ("UK", "German plates"); otherwise there's none, never a guess.

export interface Flag {
  name: string;
  /** What it may be called, in small letters. */
  words: string[];
  viewBox: string;
  /** preserveAspectRatio: striped flags stretch to the box, the rest keep their proportions. */
  fit: string;
  svg: string;
}

export const FLAGS: Flag[] = [
  { name: "United Kingdom", words: ["united kingdom","uk","gb","great britain","britain","england","scotland","wales","northern ireland","british"], viewBox: "0 0 60 30", fit: "xMidYMid slice",
    svg: "<defs><clipPath id='flag-gb-diag'><path d='M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z'/></clipPath></defs><rect width='60' height='30' fill='#012169'/><path d='M0,0 L60,30 M60,0 L0,30' stroke='#fff' stroke-width='6'/><path d='M0,0 L60,30 M60,0 L0,30' clip-path='url(#flag-gb-diag)' stroke='#C8102E' stroke-width='4'/><path d='M30,0 v30 M0,15 h60' stroke='#fff' stroke-width='10'/><path d='M30,0 v30 M0,15 h60' stroke='#C8102E' stroke-width='6'/>" },
  { name: "European Union", words: ["european union","eu"], viewBox: "0 0 30 20", fit: "xMidYMid slice",
    svg: "<rect width='30' height='20' fill='#003399'/><circle cx='15.00' cy='4.00' r='1' fill='#FFCC00'/><circle cx='18.00' cy='4.80' r='1' fill='#FFCC00'/><circle cx='20.20' cy='7.00' r='1' fill='#FFCC00'/><circle cx='21.00' cy='10.00' r='1' fill='#FFCC00'/><circle cx='20.20' cy='13.00' r='1' fill='#FFCC00'/><circle cx='18.00' cy='15.20' r='1' fill='#FFCC00'/><circle cx='15.00' cy='16.00' r='1' fill='#FFCC00'/><circle cx='12.00' cy='15.20' r='1' fill='#FFCC00'/><circle cx='9.80' cy='13.00' r='1' fill='#FFCC00'/><circle cx='9.00' cy='10.00' r='1' fill='#FFCC00'/><circle cx='9.80' cy='7.00' r='1' fill='#FFCC00'/><circle cx='12.00' cy='4.80' r='1' fill='#FFCC00'/>" },
  { name: "Austria", words: ["austria","austrian","at"], viewBox: "0 0 3 3", fit: "none",
    svg: "<rect width='3' height='3' fill='#ED2939'/><rect y='1' width='3' height='1' fill='#fff'/>" },
  { name: "Belgium", words: ["belgium","belgian","be"], viewBox: "0 0 3 2", fit: "none",
    svg: "<rect width='1' height='2' fill='#000'/><rect x='1' width='1' height='2' fill='#FDDA24'/><rect x='2' width='1' height='2' fill='#EF3340'/>" },
  { name: "Czech Republic", words: ["czech republic","czech","cz","czechia"], viewBox: "0 0 6 4", fit: "none",
    svg: "<rect width='6' height='2' fill='#fff'/><rect y='2' width='6' height='2' fill='#D7141A'/><path d='M0 0 L3 2 L0 4 Z' fill='#11457E'/>" },
  { name: "Denmark", words: ["denmark","danish","dk"], viewBox: "0 0 37 28", fit: "none",
    svg: "<rect width='37' height='28' fill='#C8102E'/><rect x='12' width='4' height='28' fill='#fff'/><rect y='12' width='37' height='4' fill='#fff'/>" },
  { name: "France", words: ["france","french","fr"], viewBox: "0 0 3 2", fit: "none",
    svg: "<rect width='1' height='2' fill='#002654'/><rect x='1' width='1' height='2' fill='#fff'/><rect x='2' width='1' height='2' fill='#CE1126'/>" },
  { name: "Germany", words: ["germany","german","de","deutschland"], viewBox: "0 0 3 3", fit: "none",
    svg: "<rect width='3' height='1' fill='#000'/><rect y='1' width='3' height='1' fill='#DD0000'/><rect y='2' width='3' height='1' fill='#FFCE00'/>" },
  { name: "Greece", words: ["greece","greek","gr","hellas"], viewBox: "0 0 27 18", fit: "none",
    svg: "<rect width='27' height='18' fill='#0D5EAF'/><rect y='2' width='27' height='2' fill='#fff'/><rect y='6' width='27' height='2' fill='#fff'/><rect y='10' width='27' height='2' fill='#fff'/><rect y='14' width='27' height='2' fill='#fff'/><rect width='10' height='10' fill='#0D5EAF'/><rect x='4' width='2' height='10' fill='#fff'/><rect y='4' width='10' height='2' fill='#fff'/>" },
  { name: "Ireland", words: ["ireland","irish","ie","irl","republic of ireland"], viewBox: "0 0 3 2", fit: "none",
    svg: "<rect width='1' height='2' fill='#169B62'/><rect x='1' width='1' height='2' fill='#fff'/><rect x='2' width='1' height='2' fill='#FF883E'/>" },
  { name: "Italy", words: ["italy","italian","it"], viewBox: "0 0 3 2", fit: "none",
    svg: "<rect width='1' height='2' fill='#009246'/><rect x='1' width='1' height='2' fill='#fff'/><rect x='2' width='1' height='2' fill='#CE2B37'/>" },
  { name: "Luxembourg", words: ["luxembourg","lu"], viewBox: "0 0 3 3", fit: "none",
    svg: "<rect width='3' height='1' fill='#EA141D'/><rect y='1' width='3' height='1' fill='#fff'/><rect y='2' width='3' height='1' fill='#00A1DE'/>" },
  { name: "Monaco", words: ["monaco","mc"], viewBox: "0 0 2 2", fit: "none",
    svg: "<rect width='2' height='1' fill='#CE1126'/><rect y='1' width='2' height='1' fill='#fff'/>" },
  { name: "Netherlands", words: ["netherlands","dutch","nl","the netherlands","holland"], viewBox: "0 0 3 3", fit: "none",
    svg: "<rect width='3' height='1' fill='#AE1C28'/><rect y='1' width='3' height='1' fill='#fff'/><rect y='2' width='3' height='1' fill='#21468B'/>" },
  { name: "Norway", words: ["norway","norwegian","no"], viewBox: "0 0 22 16", fit: "none",
    svg: "<rect width='22' height='16' fill='#BA0C2F'/><rect x='6' width='4' height='16' fill='#fff'/><rect y='6' width='22' height='4' fill='#fff'/><rect x='7' width='2' height='16' fill='#00205B'/><rect y='7' width='22' height='2' fill='#00205B'/>" },
  { name: "Poland", words: ["poland","polish","pl"], viewBox: "0 0 2 2", fit: "none",
    svg: "<rect width='2' height='1' fill='#fff'/><rect y='1' width='2' height='1' fill='#DC143C'/>" },
  { name: "Portugal", words: ["portugal","portuguese","pt"], viewBox: "0 0 30 20", fit: "xMidYMid slice",
    svg: "<rect width='30' height='20' fill='#DA291C'/><rect width='12' height='20' fill='#046A38'/><circle cx='12' cy='10' r='4.2' fill='#FFE900'/><circle cx='12' cy='10' r='2.6' fill='#DA291C'/><rect x='10.8' y='8.4' width='2.4' height='3.2' rx='.5' fill='#fff'/>" },
  { name: "Spain", words: ["spain","spanish","es"], viewBox: "0 0 4 4", fit: "none",
    svg: "<rect width='4' height='4' fill='#AA151B'/><rect y='1' width='4' height='2' fill='#F1BF00'/>" },
  { name: "Sweden", words: ["sweden","swedish","se"], viewBox: "0 0 16 10", fit: "none",
    svg: "<rect width='16' height='10' fill='#006AA7'/><rect x='5' width='2' height='10' fill='#FECC02'/><rect y='4' width='16' height='2' fill='#FECC02'/>" },
  { name: "Switzerland", words: ["switzerland","swiss","ch"], viewBox: "0 0 32 24", fit: "xMidYMid meet",
    svg: "<rect width='32' height='24' fill='#DA291C'/><rect x='13.5' y='5' width='5' height='14' fill='#fff'/><rect x='9' y='9.5' width='14' height='5' fill='#fff'/>" },
  { name: "Japan", words: ["japan","japanese","jp"], viewBox: "0 0 4 3", fit: "xMidYMid meet",
    svg: "<rect width='4' height='3' fill='#fff'/><circle cx='2' cy='1.5' r='.9' fill='#BC002D'/>" },
  { name: "United Arab Emirates", words: ["united arab emirates","uae","ae","dubai","abu dhabi","emirates"], viewBox: "0 0 12 6", fit: "none",
    svg: "<rect width='12' height='2' fill='#00732F'/><rect y='2' width='12' height='2' fill='#fff'/><rect y='4' width='12' height='2' fill='#000'/><rect width='3' height='6' fill='#FF0000'/>" },
  { name: "United States", words: ["united states","us","usa","united states of america","america","american"], viewBox: "0 0 19 10", fit: "none",
    svg: "<rect width='19' height='10' fill='#B22234'/><rect y='0.7692307692307693' width='19' height='0.7692307692307693' fill='#fff'/><rect y='2.3076923076923075' width='19' height='0.7692307692307693' fill='#fff'/><rect y='3.8461538461538463' width='19' height='0.7692307692307693' fill='#fff'/><rect y='5.384615384615385' width='19' height='0.7692307692307693' fill='#fff'/><rect y='6.923076923076923' width='19' height='0.7692307692307693' fill='#fff'/><rect y='8.461538461538462' width='19' height='0.7692307692307693' fill='#fff'/><rect width='7.6' height='5.384615384615385' fill='#3C3B6E'/>" },
];

const BY_WORD = new Map(FLAGS.flatMap((f) => f.words.map((w) => [w, f] as const)));

/** "UK", "uk registered", "German plates" → that country's flag. */
export function flagFor(registered: string | undefined): Flag | undefined {
  const words = (registered ?? "")
    .toLowerCase()
    .replace(/[.,()]/g, "")
    .replace(/\b(registered|registration|reg|plates?|in)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return BY_WORD.get(words);
}
