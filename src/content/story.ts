// The seven chapters of the house, energy first, and the numbers behind them. Every number has its source.
// Sources: research/albania-energy.md (STORY NUMBERS, §4 self-producers), research/tariffs-prices.md, research/pvgis-albania.json.
// Building materials (cement and masonry) are not a chapter: they stay in the shop.
import type { Lang } from '../lib/i18n';

export type Source = { label: Record<Lang, string>; url: string };
// `also`: a second source when one sentence of the fact comes from another document.
export type Fact = { value: Record<Lang, string>; text: Record<Lang, string>; source: Source; also?: Source };

/** Facts computed from product datasheets in the database (Home.astro picks the best value in the catalogue). */
export type DynamicFact = 'insulation' | 'windows' | 'heat';
/** A chapter fact: sourced text, or one computed from the catalogue. */
export type LayerFact = Fact | DynamicFact;

export type LayerId = 'pv' | 'inverter' | 'battery' | 'heat' | 'ev' | 'grid' | 'envelope';
/** Equipment on the stage's house: each part has a spot on the wide shot and a close-up (lib/stage-scenes.ts, ASSETS.md). */
export type Part = 'pv' | 'inverter' | 'battery' | 'heatpump' | 'swh' | 'ev' | 'meter' | 'envelope';

export type Layer = {
  id: LayerId;
  n: number;
  name: Record<Lang, string>;
  short: Record<Lang, string>;
  /** What this chapter lights up in the house. */
  parts: Part[];
  categories: string[]; // categories.slug_en, first = the chapter's main shelf
  /** Every fact of the chapter, headline first. */
  facts: LayerFact[];
  /** @deprecated The headline, `facts[0]`. Kept while Home.astro still reads it. */
  fact: LayerFact;
  /** @deprecated The first sourced fact after the headline. Kept while Home.astro still reads it. */
  extra?: Fact;
};

const ERE_AR_URL = 'https://www.ere.gov.al/images/files/2026/09/11/Annual_Report_2025.pdf';
const ereAr = (pages: { sq: string; en: string }): Source => ({ label: { sq: `ERE, Raporti vjetor 2025, ${pages.sq}`, en: `ERE, Annual Report 2025, ${pages.en}` }, url: ERE_AR_URL });
const ERE_AR_T10 = ereAr({ sq: 'tabela 10, f. 48', en: 'Table 10, p. 48' });
const PVGIS: Source = { label: { sq: 'PVGIS 5.3, JRC', en: 'PVGIS 5.3, JRC' }, url: 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=41.32833&lon=19.81806&peakpower=1&loss=14&optimalangles=1&outputformat=json' };
const INSTR_URL = 'https://web.archive.org/web/20250420015647/https://ere.gov.al/doc/Udhezim_3_20.06.2019%20(2).pdf';
const INSTR_3: Source = { label: { sq: 'Ministria e Infrastrukturës dhe Energjisë, Udhëzimi 3/2019, pika 17', en: 'Ministry of Infrastructure and Energy, Instruction 3/2019, point 17' }, url: INSTR_URL };
const INSTR_3_SIZE: Source = { label: { sq: 'Udhëzimi 3/2019, pikat 4, 6 dhe 15', en: 'Instruction 3/2019, points 4, 6 and 15' }, url: INSTR_URL };
const INSTR_3_METERS: Source = { label: { sq: 'Udhëzimi 3/2019, pika 7/d', en: 'Instruction 3/2019, point 7(d)' }, url: INSTR_URL };
const PV_MAG: Source = { label: { sq: 'pv magazine, 27.08.2026', en: 'pv magazine, 27 Aug 2026' }, url: 'https://www.pv-magazine.com/2026/08/27/albanias-solar-market-shifts-toward-storage-market-integration/' };
const ERE_TAR: Source = { label: { sq: 'ERE, Vendimi 322/2025', en: 'ERE, Decision 322/2025' }, url: 'https://ere.gov.al/media/files/2025/12/24/Tarifat_dhe_%C3%87mimet_e_energjis%C3%AB_Elektrike_dhe_Gazit_natyror_p%C3%ABr_VITIN_2026.pdf' };
const INSTAT_EL: Source = { label: { sq: 'INSTAT, bilanci i energjisë elektrike 2025', en: 'INSTAT, electricity balance 2025' }, url: 'https://www.instat.gov.al/media/mngpviyc/balance-of-electric-power-2025.pdf' };

type LayerSpec = Omit<Layer, 'fact' | 'extra'>;
const layer = (l: LayerSpec): Layer => ({
  ...l,
  fact: l.facts[0],
  extra: l.facts.slice(1).find((f): f is Fact => typeof f !== 'string'),
});

export const LAYERS: Layer[] = [
  layer({
    id: 'pv',
    n: 1,
    name: { sq: 'Panelet diellore', en: 'Solar panels' },
    short: { sq: 'Panele, struktura montimi, kabllo diellore dhe lidhës MC4', en: 'Panels, mounting systems, solar cable and MC4 connectors' },
    parts: ['pv'],
    categories: ['solar-panels', 'mounting-systems', 'pv-accessories'],
    facts: [
      {
        value: { sq: '1 435 kWh', en: '1,435 kWh' },
        text: { sq: 'prodhon në vit 1 kWp panele në Tiranë, me pjerrësinë më të mirë. Në Fier arrin 1 521 kWh.', en: 'a year from 1 kWp of panels in Tirana at the best tilt. In Fier it reaches 1,521 kWh.' },
        source: PVGIS,
      },
      {
        value: { sq: '3 551', en: '3,551' },
        text: { sq: 'familje, biznese dhe institucione prodhonin vetë energji diellore në fund të vitit 2025', en: 'homes, businesses and institutions made their own solar power by the end of 2025' },
        source: ereAr({ sq: 'f. 226', en: 'p. 226' }),
      },
    ],
  }),
  layer({
    id: 'inverter',
    n: 2,
    name: { sq: 'Inverteri', en: 'The inverter' },
    short: { sq: 'Inverterë të lidhur me rrjetin dhe hibridë, njëfazorë dhe trefazorë', en: 'Grid-tied and hybrid inverters, single and three phase' },
    parts: ['inverter'],
    categories: ['inverters'],
    facts: [
      {
        value: { sq: '1 135', en: '1,135' },
        text: {
          sq: 'nga 1 261 aplikues i miratoi OSSH si vetëprodhues në vitin 2025, 27,96% më shumë se në vitin 2024.',
          en: 'of 1,261 applicants were approved as self-producers by the grid operator in 2025, 27.96% more than in 2024.',
        },
        source: ereAr({ sq: 'f. 226', en: 'p. 226' }),
      },
      {
        value: { sq: '1 400 kWh', en: '1,400 kWh' },
        text: {
          sq: 'në vit për çdo kWp, në çdo zonë të Shqipërisë: kaq llogariste Udhëzimi 3/2019 kur caktonte fuqinë e impiantit të një vetëprodhuesi sipas konsumit të dy viteve të fundit',
          en: 'a year per kWp, anywhere in Albania: what Instruction 3/2019 assumed when it set a self-producer’s plant size from the last two years of use',
        },
        source: INSTR_3_SIZE,
      },
    ],
  }),
  layer({
    id: 'battery',
    n: 3,
    name: { sq: 'Bateria', en: 'The battery' },
    short: { sq: 'Bateri litiumi për ruajtjen e energjisë, për shtëpi dhe biznese', en: 'Lithium storage batteries for homes and businesses' },
    parts: ['battery'],
    categories: ['batteries'],
    facts: [
      {
        value: { sq: '0 lekë', en: '0 lekë' },
        text: {
          sq: 'është vlera që i japim energjisë që tepron mbi konsumin e muajit. Udhëzimi 3/2019 (pika 17) e kalonte tepricën te furnizuesi pa pagesë; për rregullat e faturimit neto (net billing) të majit 2026 nuk kemi gjetur ende një çmim të publikuar. Energjia që përdorni vetë vlen sa tarifa.',
          en: 'is the value we give to power left over beyond the month’s use. Instruction 3/2019 (point 17) passed the surplus to the supplier unpaid; for the net-billing rules of May 2026 we have not yet found a published price. Power you use yourself is worth the tariff.',
        },
        source: INSTR_3,
        also: PV_MAG,
      },
      {
        value: { sq: '19:00–23:00', en: '19:00–23:00' },
        text: { sq: 'orët e pikut (prill–tetor) për bizneset në 0,4 kV: 16,1 lekë/kWh; familjet nuk kanë çmim për orët e pikut', en: 'peak hours (Apr–Oct) for businesses at 0.4 kV: 16.1 lekë/kWh; households have no peak price' },
        source: ERE_TAR,
      },
    ],
  }),
  layer({
    id: 'heat',
    n: 4,
    name: { sq: 'Ngrohja, ftohja, uji i ngrohtë', en: 'Heating, cooling, hot water' },
    short: { sq: 'Pompa nxehtësie, ngrohës uji diellorë, kondicionerë inverter', en: 'Heat pumps, solar water heaters, inverter air conditioners' },
    parts: ['heatpump', 'swh'],
    categories: ['heat-pumps', 'solar-water-heaters', 'air-conditioners'],
    facts: [
      'heat',
      {
        value: { sq: '700 kWh', en: '700 kWh' },
        text: {
          sq: 'në muaj është kufiri i familjeve në vitin 2026: deri në këtë kufi 8,5 lekë/kWh, mbi të 9,5 lekë për çdo kWh të muajit',
          en: 'a month is the household threshold in 2026: up to it 8.5 lekë/kWh, above it 9.5 lekë on every kWh of the month',
        },
        source: ERE_TAR,
      },
    ],
  }),
  layer({
    id: 'ev',
    n: 5,
    name: { sq: 'Karikuesi i makinës', en: 'The car charger' },
    short: { sq: 'Karikues muri për makina elektrike, me lidhës Type 2', en: 'Wall chargers for electric cars, Type 2 connector' },
    parts: ['ev'],
    categories: ['ev-chargers'],
    facts: [
      {
        value: { sq: '225', en: '225' },
        text: { sq: 'pika karikimi për makina elektrike u instaluan gjatë vitit 2025, 47 më shumë se në vitin 2024.', en: 'EV charging points were installed during 2025, 47 more than in 2024.' },
        source: ereAr({ sq: 'f. 18', en: 'p. 18' }),
      },
      {
        value: { sq: '22 lekë/kWh', en: '22 lekë/kWh' },
        text: {
          sq: 'paguajnë stacionet e karikimit mbi 11 kW që nga 1 nëntori 2025 (25,3 në orët e pikut); karikuesi i shtëpisë deri në 11 kW mbetet me çmimin e kategorisë së klientit',
          en: 'is what charging stations above 11 kW pay from 1 November 2025 (25.3 at peak hours); a home charger up to 11 kW stays on the customer’s normal tariff',
        },
        source: ereAr({ sq: 'f. 19 dhe 137', en: 'pp. 19 and 137' }),
      },
    ],
  }),
  layer({
    id: 'grid',
    n: 6,
    name: { sq: 'Matësi dhe rrjeti', en: 'Meter and grid' },
    short: { sq: 'Matës energjie, faturimi neto dhe tarifat', en: 'Energy meters, net billing and tariffs' },
    parts: ['meter'],
    categories: ['energy-monitoring'],
    facts: [
      {
        value: { sq: '86,8%', en: '86.8%' },
        text: { sq: 'e energjisë elektrike të prodhuar në Shqipëri në vitin 2025 erdhi nga hidrocentralet. Një vit i thatë (2017) dha 4 174 GWh, një vit me shi (2018) 8 076 GWh: shiu ende vendos për rrjetin.', en: 'of the electricity made in Albania in 2025 came from hydropower. A dry year (2017) gave 4,174 GWh, a wet one (2018) 8,076 GWh: rain still decides the grid.' },
        source: INSTAT_EL,
        also: ERE_AR_T10,
      },
      {
        value: { sq: '2 matës', en: '2 meters' },
        text: {
          sq: 'kërkonte Udhëzimi 3/2019 nga një vetëprodhues: një matës inteligjent dypalësh në lidhjen me rrjetin dhe një matës prodhimi pas inverterit, të dy me shpenzimet e klientit',
          en: 'is what Instruction 3/2019 asked of a self-producer: a smart two-way meter at the grid connection and a production meter after the inverter, both at the customer’s cost',
        },
        source: INSTR_3_METERS,
      },
    ],
  }),
  layer({
    id: 'envelope',
    n: 7,
    name: { sq: 'Energjia që nuk humbet', en: 'The energy you don’t lose' },
    short: { sq: 'Izolim termik, dritare PVC, ndriçim LED', en: 'Thermal insulation, PVC windows, LED lighting' },
    parts: ['envelope'],
    categories: ['insulation', 'windows', 'led-lighting'],
    facts: ['insulation', 'windows'],
  }),
];

/** Albania in numbers: the stat stack on the home page. */
export const NUMBERS: Fact[] = [
  { value: { sq: '21 → 631 MW', en: '21 → 631 MW' }, text: { sq: 'Kapaciteti i centraleve diellore u rrit tridhjetë herë nga viti 2020 deri në fund të vitit 2025.', en: 'Solar plant capacity grew thirtyfold from 2020 to the end of 2025.' }, source: ereAr({ sq: 'f. 42', en: 'p. 42' }) },
  { value: { sq: '832 GWh', en: '832 GWh' }, text: { sq: 'prodhuan centralet fotovoltaike në vitin 2025.', en: 'came from solar plants in 2025.' }, source: ereAr({ sq: 'f. 15', en: 'p. 15' }) },
  { value: { sq: '3 375 GWh', en: '3,375 GWh' }, text: { sq: 'energji elektrike importoi Shqipëria në vitin 2025; importi neto arriti 877 GWh.', en: 'of electricity were imported in 2025; net imports reached 877 GWh.' }, source: INSTAT_EL },
  { value: { sq: '500 kW', en: '500 kW' }, text: { sq: 'është kufiri ligjor për impiantin e një vetëprodhuesi (familje ose biznes); madhësia varet nga konsumi vjetor dhe miratohet nga OSSH.', en: 'is the legal cap for a home or business producing its own power; the size is set by yearly use and approved by the grid operator.' }, source: { label: { sq: 'Ligji 24/2023, neni 20', en: 'Law 24/2023, Art. 20' }, url: 'https://www.ere.gov.al/media/files/2024/01/31/Law_no._24_2023_On_the_promotion_of_the_use_of_energy_from_renewable_sources.pdf' }, also: INSTR_3_SIZE },
  { value: { sq: '45,4%', en: '45.4%' }, text: { sq: 'e shqiptarëve 16–74 vjeç blenë diçka online në 12 muajt e fundit (2025).', en: 'of Albanians aged 16–74 bought something online in the last 12 months (2025).' }, source: { label: { sq: 'INSTAT, TIK 2025', en: 'INSTAT, ICT survey 2025' }, url: 'https://www.instat.gov.al/media/4jkhqz0c/ict-2025_english.pdf' } },
];
