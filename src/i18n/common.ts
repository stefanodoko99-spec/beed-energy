// Words used by the shared shell (header, menu, dock, footer, loader, toasts). Page words live in their own files.
import type { Lang } from '../lib/i18n';

export const common = {
  sq: {
    skip: 'Kalo te përmbajtja',
    brandTag: 'Treg për energjinë e rinovueshme dhe ndërtimin',
    nav: { shop: 'Dyqani', compare: 'Krahaso', cart: 'Shporta', menu: 'Menu', close: 'Mbyll', search: 'Kërko', categories: 'Kategoritë', calculator: 'Kalkulatori', sellers: 'Shitësit', quote: 'Kërko ofertë', sell: 'Shit me ne', about: 'Rreth nesh', contact: 'Kontakt', home: 'Kreu' },
    lang: { sq: 'Shqip', en: 'English', switchTo: 'Switch to English' },
    saver: { label: 'Kursim energjie', on: 'Kursimi i energjisë është i ndezur: animacionet janë ndalur.', off: 'Kursimi i energjisë është i fikur.', hint: 'Ndal animacionet dhe efektet e rënda' },
    menu: { heading: 'Kategoritë', products: (n: number) => `${n} produkte`, from: 'nga', empty: 'pa oferta ende', allShop: 'I gjithë dyqani', tools: 'Mjete', hours: 'Tregu është i hapur 24 orë, shitësit përgjigjen në ditët e punës.' },
    groups: { energy: 'Energji e rinovueshme', efficiency: 'Efikasitet energjetik', build: 'Ndërtim' },
    cartCount: (n: number) => (n === 1 ? '1 artikull në shportë' : `${n} artikuj në shportë`),
    compareCount: (n: number) => (n === 1 ? '1 produkt për krahasim' : `${n} produkte për krahasim`),
    tray: { title: 'Krahasimi', go: 'Krahaso tani', clear: 'Pastro', remove: 'Hiq', full: 'Mund të krahasoni deri në 4 produkte. Hiqni një për të shtuar këtë.', reset: 'Krahasimi filloi nga e para: krahasohen vetëm produkte të së njëjtës kategori.' },
    toast: { added: 'U shtua në shportë', view: 'Shiko shportën', error: 'Diçka nuk shkoi. Provoni përsëri.', compared: 'U shtua për krahasim' },
    loader: { skip: 'Kalo', loading: 'Duke u karikuar' },
    footer: {
      shop: 'Dyqani', company: 'Kompania', help: 'Ndihmë', legal: 'Ligjore',
      about: 'BeeD Energy është treg online për energjinë e rinovueshme në Shqipëri: furnitorët dhe instaluesit shesin panele diellore, bateri, pompa nxehtësie dhe karikues për makina elektrike, krah për krah me kompanitë e ndërtimit që shesin izolim dhe materiale ndërtimi.',
      operator: 'Tregu drejtohet nga BeeD Consulting sh.p.k. · NIPT M41722050A · Tiranë',
      prices: 'Çmimet janë në lekë dhe përfshijnë TVSH-në 20% (për shitësit e regjistruar për TVSH).',
      terms: 'Kushtet e përdorimit', privacy: 'Privatësia', returns: 'Kthimet dhe e drejta e heqjes dorë nga kontrata', delivery: 'Dërgesa', payments: 'Pagesat',
      demo: 'Prototip: shitësit, çmimet dhe stoku janë shembuj deri në nisjen e tregut.',
      top: 'Kthehu lart',
    },
    dock: { home: 'Kreu', search: 'Kërko', categories: 'Kategoritë', compare: 'Krahaso', cart: 'Shporta' },
    unit: { lek: 'L', from: 'nga' },
  },
  en: {
    skip: 'Skip to content',
    brandTag: 'The marketplace for renewable energy and building',
    nav: { shop: 'Shop', compare: 'Compare', cart: 'Basket', menu: 'Menu', close: 'Close', search: 'Search', categories: 'Categories', calculator: 'Calculator', sellers: 'Sellers', quote: 'Request a quote', sell: 'Sell with us', about: 'About', contact: 'Contact', home: 'Home' },
    lang: { sq: 'Shqip', en: 'English', switchTo: 'Kalo në shqip' },
    saver: { label: 'Energy saving', on: 'Energy saving is on: animations are stopped.', off: 'Energy saving is off.', hint: 'Stop animations and heavy effects' },
    menu: { heading: 'Categories', products: (n: number) => `${n} products`, from: 'from', empty: 'no offers yet', allShop: 'The whole shop', tools: 'Tools', hours: 'The market is open 24 hours; sellers reply on working days.' },
    groups: { energy: 'Renewable energy', efficiency: 'Energy efficiency', build: 'Building' },
    cartCount: (n: number) => (n === 1 ? '1 item in the basket' : `${n} items in the basket`),
    compareCount: (n: number) => (n === 1 ? '1 product to compare' : `${n} products to compare`),
    tray: { title: 'Compare', go: 'Compare now', clear: 'Clear', remove: 'Remove', full: 'You can compare up to 4 products. Remove one to add this.', reset: 'Comparison restarted: only products from the same category can be compared.' },
    toast: { added: 'Added to the basket', view: 'View basket', error: 'Something went wrong. Please try again.', compared: 'Added to compare' },
    loader: { skip: 'Skip', loading: 'Charging' },
    footer: {
      shop: 'Shop', company: 'Company', help: 'Help', legal: 'Legal',
      about: 'BeeD Energy is an online marketplace for renewable energy in Albania: suppliers and installers sell solar panels, batteries, heat pumps and EV chargers, side by side with construction companies selling insulation and building materials.',
      operator: 'The marketplace is run by BeeD Consulting sh.p.k. · NIPT M41722050A · Tirana',
      prices: 'Prices are in lekë (ALL) and include 20% VAT (for VAT-registered sellers).',
      terms: 'Terms of use', privacy: 'Privacy', returns: 'Returns and withdrawal', delivery: 'Delivery', payments: 'Payments',
      demo: 'Prototype: sellers, prices and stock are samples until the marketplace launches.',
      top: 'Back to top',
    },
    dock: { home: 'Home', search: 'Search', categories: 'Categories', compare: 'Compare', cart: 'Basket' },
    unit: { lek: 'ALL', from: 'from' },
  },
} as const;

export type Common = (typeof common)[Lang];
export const tc = (lang: Lang) => common[lang];
