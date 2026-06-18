import {
  Inter,
  Roboto,
  Montserrat,
  Playfair_Display,
  Bebas_Neue,
  Oswald,
} from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
  weight: ['400', '700'],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '700', '900'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '700'],
});

const bebas = Bebas_Neue({
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
  weight: ['400'],
});

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
  weight: ['400', '700'],
});

export const fontVariables = `${inter.variable} ${roboto.variable} ${montserrat.variable} ${playfair.variable} ${bebas.variable} ${oswald.variable}`;

/**
 * Resolved font-family strings produced by next/font/google.
 * These are the actual family names that the browser matches in
 * the @font-face declarations (the public label like "Montserrat"
 * is NOT registered in the document, only the hashed one is).
 * Use this in canvas/Konva calls.
 */
export const fontFamilies = {
  Inter: inter.style.fontFamily,
  Roboto: roboto.style.fontFamily,
  Montserrat: montserrat.style.fontFamily,
  'Playfair Display': playfair.style.fontFamily,
  'Bebas Neue': bebas.style.fontFamily,
  Oswald: oswald.style.fontFamily,
  Arial: 'Arial, Helvetica, sans-serif',
  Impact: 'Impact, Haettenschweiler, sans-serif',
  Helvetica: 'Helvetica, Arial, sans-serif',
  'Times New Roman': '"Times New Roman", Times, serif',
} as const;

export type FontKey = keyof typeof fontFamilies;
