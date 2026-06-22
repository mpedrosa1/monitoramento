import L from "leaflet";
import { COLABORADOR_AVATAR_PADRAO } from "@/lib/colaborador-avatar";
import {
  formatOdometroKm,
  formatVelocidadeKmH,
} from "@/lib/rastreamento-format";

const COLOR_MOVING = "#3b82f6";
const COLOR_STOPPED = "#6366f1";

function escapeHtml(text: string): string {
  return text.replace(/[<>&"']/g, "");
}

function escapeAttr(text: string): string {
  return text.replace(/[&"']/g, "");
}

export function veiculoMapIcon(options: {
  moving: boolean;
  placa: string;
  velocidadeKm?: number;
  odometroKm?: number;
  motoristaFotoUrl?: string;
  motoristaNome?: string;
  /** Rótulo com placa, nome e telemetria abaixo do avatar. */
  mostrarInfo?: boolean;
  selecionado?: boolean;
}): L.DivIcon {
  const {
    moving,
    placa,
    velocidadeKm,
    odometroKm,
    motoristaFotoUrl,
    motoristaNome,
    mostrarInfo = true,
    selecionado = false,
  } = options;

  const borderColor = selecionado
    ? "#f59e0b"
    : moving
      ? COLOR_MOVING
      : COLOR_STOPPED;
  const foto =
    motoristaFotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO;
  const avatarSize = 40;
  const label = `${formatVelocidadeKmH(velocidadeKm)} · ${formatOdometroKm(odometroKm)}`;
  const placaSafe = escapeHtml(placa);
  const labelSafe = escapeHtml(label);
  const nomeSafe = motoristaNome ? escapeHtml(motoristaNome) : "";
  const fotoSafe = escapeAttr(foto);

  const avatarHtml = `<img src="${fotoSafe}" alt="" width="${avatarSize}" height="${avatarSize}" style="display:block;width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;object-fit:cover;border:3px solid ${borderColor};background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.35)${selecionado ? ";box-shadow:0 0 0 2px rgba(245,158,11,.55),0 1px 4px rgba(0,0,0,.35)" : ""}" />`;

  if (!mostrarInfo) {
    const html = `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))">${avatarHtml}</div>`;
    return L.divIcon({
      className: "",
      html,
      iconSize: [avatarSize, avatarSize],
      iconAnchor: [avatarSize / 2, avatarSize / 2],
    });
  }

  const nomeHtml = nomeSafe
    ? `<div style="font-family:system-ui,sans-serif;font-size:9px;font-weight:600;opacity:.95;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nomeSafe}</div>`
    : "";

  const html = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))">
    ${avatarHtml}
    <div style="max-width:120px;border-radius:6px;background:rgba(15,23,42,.88);color:#fff;padding:2px 6px;text-align:center;line-height:1.25;border:1px solid rgba(255,255,255,.2)">
      <div style="font-family:ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:.04em">${placaSafe}</div>
      ${nomeHtml}
      <div style="font-family:system-ui,sans-serif;font-size:9px;opacity:.92;white-space:nowrap">${labelSafe}</div>
    </div>
  </div>`;

  const totalH = avatarSize + 44 + (nomeSafe ? 4 : 0);
  return L.divIcon({
    className: "",
    html,
    iconSize: [120, totalH],
    iconAnchor: [60, avatarSize / 2],
    popupAnchor: [0, -avatarSize / 2],
  });
}
