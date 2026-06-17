export const RH_COLABORADORES_PATH =
  "/dashboard/recursos-humanos/colaboradores";

export function rhColaboradorDetailPath(id: string): string {
  return `${RH_COLABORADORES_PATH}/${id}`;
}
