// WhatsApp, Viber and call links for a seller's phone. Albanian numbers come in every shape (069 …, +355 69 …,
// 00355 …, 69 …): all become the international digits the apps want, or null when it is not a phone number.
export function intlDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.trim().replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `355${d.slice(1)}`;
  else if (/^6\d{8}$/.test(d)) d = `355${d}`;
  return /^\d{9,15}$/.test(d) ? d : null;
}

export function chatLinks(phone: string | null | undefined, text: string): { wa: string; viber: string; tel: string } | null {
  const d = intlDigits(phone);
  if (!d) return null;
  return { wa: `https://wa.me/${d}?text=${encodeURIComponent(text)}`, viber: `viber://chat?number=%2B${d}`, tel: `tel:+${d}` };
}
