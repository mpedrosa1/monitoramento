export function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element })
      .webkitFullscreenElement ??
    null
  );
}

export async function requestElementFullscreen(element: HTMLElement): Promise<void> {
  const request =
    element.requestFullscreen ??
    (
      element as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      }
    ).webkitRequestFullscreen;

  if (!request) {
    throw new Error("Tela cheia não suportada neste navegador.");
  }

  await request.call(element);
}

export async function exitDocumentFullscreen(): Promise<void> {
  const exit =
    document.exitFullscreen ??
    (document as Document & { webkitExitFullscreen?: () => Promise<void> | void })
      .webkitExitFullscreen;

  if (getFullscreenElement() && exit) {
    await exit.call(document);
  }
}
