export const VEICULO_FOTO_PADRAO = "/veiculo-placeholder.webp";

/** URL ilustrativa do modelo (Imagin Studio) ou placeholder local. */
export function buildVeiculoFotoUrl(
  marca: string,
  modelo: string,
  ano?: number | string
): string {
  const customer = process.env.IMAGIN_STUDIO_CUSTOMER?.trim();
  const mk = marca.trim();
  const md = modelo.trim();
  if (!customer || !mk || !md) {
    return VEICULO_FOTO_PADRAO;
  }

  const url = new URL("https://cdn.imagin.studio/getimage");
  url.searchParams.set("customer", customer);
  url.searchParams.set("make", mk.toLowerCase());
  const family =
    md.split(/\s+/)[0]?.toLowerCase() ?? md.toLowerCase();
  url.searchParams.set("modelFamily", family);
  const yearNum = Number(ano);
  url.searchParams.set(
    "modelYear",
    String(yearNum > 1900 ? yearNum : new Date().getFullYear())
  );
  url.searchParams.set("angle", "23");
  url.searchParams.set("zoomType", "fullscreen");
  return url.toString();
}
