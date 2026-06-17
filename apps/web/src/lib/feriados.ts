function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(ano: number, mes: number, dia: number): string {
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function dateToYmd(d: Date): string {
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const cacheFeriados = new Map<number, Map<string, string>>();

/**
 * Feriados nacionais brasileiros (fixos + móveis) de um ano,
 * mapeando "yyyy-mm-dd" para o nome do feriado.
 */
export function feriadosNacionais(ano: number): Map<string, string> {
  const cached = cacheFeriados.get(ano);
  if (cached) return cached;

  const mapa = new Map<string, string>();

  // Fixos
  mapa.set(ymd(ano, 1, 1), "Confraternização Universal");
  mapa.set(ymd(ano, 4, 21), "Tiradentes");
  mapa.set(ymd(ano, 5, 1), "Dia do Trabalho");
  mapa.set(ymd(ano, 9, 7), "Independência do Brasil");
  mapa.set(ymd(ano, 10, 12), "Nossa Senhora Aparecida");
  mapa.set(ymd(ano, 11, 2), "Finados");
  mapa.set(ymd(ano, 11, 15), "Proclamação da República");
  mapa.set(ymd(ano, 11, 20), "Consciência Negra");
  mapa.set(ymd(ano, 12, 25), "Natal");

  // Móveis (relativos à Páscoa)
  const pascoa = domingoDePascoa(ano);
  mapa.set(dateToYmd(addDias(pascoa, -47)), "Carnaval");
  mapa.set(dateToYmd(addDias(pascoa, -2)), "Sexta-feira Santa");
  mapa.set(dateToYmd(addDias(pascoa, 60)), "Corpus Christi");

  cacheFeriados.set(ano, mapa);
  return mapa;
}

export function nomeFeriado(dataYmd: string): string | undefined {
  const ano = Number.parseInt(dataYmd.slice(0, 4), 10);
  if (Number.isNaN(ano)) return undefined;
  return feriadosNacionais(ano).get(dataYmd);
}
