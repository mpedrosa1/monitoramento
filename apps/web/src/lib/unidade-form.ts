import { labelTipoSensor } from "./equipamento-sensor";
import {
  tipoEquipamentoLabel,
  tipoMonitoramentoLabel,
} from "./labels";
import { parseCoordPair } from "./geocode";
import { randomId } from "./random-id";
import type {
  Equipamento,
  Unidade,
  UnidadeAreaVertice,
  UnidadeEndereco,
  UnidadeEquipamento,
} from "./types";

export const BR_ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function emptyUnidadeEndereco(): UnidadeEndereco {
  return {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };
}

export type UnidadeFormState = {
  codigo: string;
  nome: string;
  diretores: string[];
  telefones: string[];
  emails: string[];
  endereco: UnidadeEndereco;
  latitude: string;
  longitude: string;
  areaM2: string;
  areaVertices: UnidadeAreaVertice[];
  ip: string;
  equipamentos: UnidadeEquipamento[];
  intervaloS: string;
  alertaOfflineS: string;
};

export function emptyUnidadeForm(): UnidadeFormState {
  return {
    codigo: "",
    nome: "",
    diretores: [""],
    telefones: [""],
    emails: [""],
    endereco: emptyUnidadeEndereco(),
    latitude: "",
    longitude: "",
    areaM2: "",
    areaVertices: [],
    ip: "",
    equipamentos: [],
    intervaloS: "30",
    alertaOfflineS: "60",
  };
}

/** Mantém apenas dígitos no ID institucional da unidade. */
export function sanitizeUnidadeCodigo(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidUnidadeCodigo(codigo: string): boolean {
  return /^\d+$/.test(codigo.trim());
}

/** Ordenação crescente por ID numérico (fallback lexicográfico). */
export function compareUnidadeCodigo(a: string, b: string): number {
  const da = sanitizeUnidadeCodigo(a);
  const db = sanitizeUnidadeCodigo(b);
  const na = Number(da);
  const nb = Number(db);
  if (da && db && Number.isFinite(na) && Number.isFinite(nb)) {
    return na - nb;
  }
  return da.localeCompare(db, undefined, { numeric: true });
}

export function sortUnidadesByCodigo(list: Unidade[]): Unidade[] {
  return [...list].sort((a, b) => compareUnidadeCodigo(a.codigo, b.codigo));
}

export type UnidadeConnectivityStatus = "sem_ip" | "online" | "offline";

export function unidadeConnectivityStatus(
  u: Unidade,
  hostOnline: boolean
): UnidadeConnectivityStatus {
  if (!u.ip?.trim()) return "sem_ip";
  return hostOnline ? "online" : "offline";
}

export function unidadeConnectivityLabel(
  status: UnidadeConnectivityStatus
): string {
  switch (status) {
    case "sem_ip":
      return "Sem IP";
    case "online":
      return "Online";
    case "offline":
      return "Offline";
  }
}

/** Offline (com IP) primeiro; demais unidades por ID crescente. */
export function sortUnidadesForPainel(
  list: Unidade[],
  isHostOffline: (u: Unidade) => boolean
): Unidade[] {
  const sorted = sortUnidadesByCodigo(list);
  const offline = sorted.filter(isHostOffline);
  const rest = sorted.filter((u) => !isHostOffline(u));
  return [...offline, ...rest];
}

function normalizeEndereco(raw: unknown): UnidadeEndereco {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      cep: String(o.cep ?? ""),
      logradouro: String(o.logradouro ?? ""),
      numero: String(o.numero ?? ""),
      complemento: String(o.complemento ?? ""),
      bairro: String(o.bairro ?? ""),
      cidade: String(o.cidade ?? ""),
      estado: String(o.estado ?? ""),
    };
  }
  if (typeof raw === "string" && raw.trim()) {
    return { ...emptyUnidadeEndereco(), logradouro: raw.trim() };
  }
  return emptyUnidadeEndereco();
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [""];
  const items = raw.map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : [""];
}

export function unidadeToForm(u: Unidade): UnidadeFormState {
  return {
    codigo: sanitizeUnidadeCodigo(u.codigo ?? ""),
    nome: u.nome ?? "",
    diretores: normalizeStringList(u.diretores),
    telefones: normalizeStringList(u.telefones),
    emails: normalizeStringList(u.emails),
    endereco: normalizeEndereco(u.endereco),
    latitude: u.latitude != null ? String(u.latitude) : "",
    longitude: u.longitude != null ? String(u.longitude) : "",
    areaM2: u.areaM2 != null && u.areaM2 > 0 ? String(u.areaM2) : "",
    areaVertices: Array.isArray(u.areaVertices) ? [...u.areaVertices] : [],
    ip: u.ip ?? "",
    equipamentos: normalizeEquipamentosVinculos(
      Array.isArray(u.equipamentos) ? u.equipamentos : []
    ),
    intervaloS: String(u.intervaloS || 30),
    alertaOfflineS: String(u.alertaOfflineS || 60),
  };
}

function filterNonEmpty(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

const OBJECT_ID_HEX = /^[a-f\d]{24}$/i;

export function newEquipamentoVinculo(
  partial: Pick<UnidadeEquipamento, "equipamentoId" | "porta"> &
    Partial<UnidadeEquipamento>
): UnidadeEquipamento {
  return {
    ...partial,
    _localId: partial._localId?.trim() || randomId(),
  };
}

export function newMaquinaGrupoId(): string {
  return randomId();
}

export function parseSlaveIdInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0 || n > 255) return null;
  return n;
}

export function isVinculoMaquina(link: UnidadeEquipamento): boolean {
  return !!link.maquinaId?.trim();
}

/** Agrupa vínculos de máquina (sensores) para exibição na lista. */
export function agruparEquipamentosUnidade(links: UnidadeEquipamento[]): Array<
  | { tipo: "item"; link: UnidadeEquipamento; index: number }
  | { tipo: "maquina"; maquinaId: string; links: UnidadeEquipamento[]; indices: number[] }
> {
  const maquinasVistas = new Set<string>();
  const out: Array<
    | { tipo: "item"; link: UnidadeEquipamento; index: number }
    | { tipo: "maquina"; maquinaId: string; links: UnidadeEquipamento[]; indices: number[] }
  > = [];

  links.forEach((link, index) => {
    const maquinaId = link.maquinaId?.trim();
    if (!maquinaId) {
      out.push({ tipo: "item", link, index });
      return;
    }
    if (maquinasVistas.has(maquinaId)) return;
    maquinasVistas.add(maquinaId);
    const indices: number[] = [];
    const grupo: UnidadeEquipamento[] = [];
    links.forEach((l, i) => {
      if (l.maquinaId?.trim() === maquinaId) {
        indices.push(i);
        grupo.push(l);
      }
    });
    out.push({ tipo: "maquina", maquinaId, links: grupo, indices });
  });

  return out;
}

export function normalizeEquipamentosVinculos(
  links: UnidadeEquipamento[]
): UnidadeEquipamento[] {
  return links.map((l) => ({
    ...l,
    _localId: l._localId?.trim() || randomId(),
  }));
}

export function vinculoEquipamentoKey(
  link: UnidadeEquipamento,
  index: number
): string {
  return link._localId?.trim() || `${link.equipamentoId}:${link.porta}:${index}`;
}

/** Porta já usada por outro vínculo ou máquina na mesma unidade. */
export function portaEquipamentoEmUso(
  links: UnidadeEquipamento[],
  porta: number,
  exceto?: { localId?: string; maquinaId?: string }
): boolean {
  return links.some((l) => {
    if (l.porta !== porta) return false;
    if (exceto?.maquinaId && l.maquinaId?.trim() === exceto.maquinaId) {
      return false;
    }
    if (
      exceto?.localId &&
      !l.maquinaId?.trim() &&
      l._localId === exceto.localId
    ) {
      return false;
    }
    return true;
  });
}

function sanitizeEquipamentos(
  links: UnidadeEquipamento[]
): UnidadeEquipamento[] {
  const portasAvulsas = new Set<number>();
  const portasMaquinas = new Map<string, number>();
  const out: UnidadeEquipamento[] = [];

  for (const l of links) {
    if (!OBJECT_ID_HEX.test(l.equipamentoId.trim())) continue;

    const maquinaId = l.maquinaId?.trim();
    if (maquinaId) {
      const portaMaquina = portasMaquinas.get(maquinaId);
      if (portaMaquina != null && portaMaquina !== l.porta) continue;
      if (portasAvulsas.has(l.porta)) continue;
      portasMaquinas.set(maquinaId, l.porta);
    } else if (portasAvulsas.has(l.porta)) {
      continue;
    } else if ([...portasMaquinas.values()].includes(l.porta)) {
      continue;
    } else {
      portasAvulsas.add(l.porta);
    }

    const { _localId: _, ...rest } = l;
    let base = { ...rest };
    if (!maquinaId) {
      const { slaveId: _s, ...semSlave } = base;
      base = semSlave;
    } else if (base.slaveId == null || base.slaveId <= 0) {
      const { slaveId: _s, ...semSlave } = base;
      base = semSlave;
    }
    if (!base.paginaWeb) {
      const { paginaWeb: _p, portaWeb: _w, ...semWeb } = base;
      out.push(semWeb);
      continue;
    }
    out.push(base);
  }
  return out;
}

/** Linha de detalhe do vínculo equipamento ↔ unidade. */
export function detalheVinculoEquipamento(
  link: UnidadeEquipamento,
  eq?: Equipamento
): string {
  const partes: string[] = [];
  if (eq) {
    partes.push(labelEquipamentoCatalogo(eq));
  }
  partes.push(`porta ${link.porta}`);
  if (link.paginaWeb && link.portaWeb) {
    partes.push(`web :${link.portaWeb}`);
  }
  return partes.join(" · ");
}

/** URL HTTP(S) da interface web do equipamento na unidade. */
export function urlPaginaWebEquipamento(
  ip: string | undefined,
  link: UnidadeEquipamento
): string | null {
  if (!link.paginaWeb || !link.portaWeb) return null;
  const host = ip?.trim();
  if (!host) return null;

  const port = link.portaWeb;
  const protocol = port === 443 ? "https" : "http";
  const omitPort =
    (protocol === "http" && port === 80) ||
    (protocol === "https" && port === 443);

  return omitPort
    ? `${protocol}://${host}`
    : `${protocol}://${host}:${port}`;
}

export function unidadeCoordenadasPreenchidas(
  form: Pick<UnidadeFormState, "latitude" | "longitude">
): boolean {
  return parseCoordPair(form.latitude, form.longitude) != null;
}

function sanitizeAreaVertices(form: UnidadeFormState): UnidadeAreaVertice[] {
  if (!unidadeCoordenadasPreenchidas(form)) return [];
  return form.areaVertices.filter(
    (v) =>
      Number.isFinite(v.latitude) &&
      Number.isFinite(v.longitude) &&
      v.latitude >= -90 &&
      v.latitude <= 90 &&
      v.longitude >= -180 &&
      v.longitude <= 180
  );
}

function sanitizeAreaM2(form: UnidadeFormState): number {
  const vertices = sanitizeAreaVertices(form);
  if (vertices.length < 3) return 0;
  const parsed = Number.parseFloat(form.areaM2.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function formToUnidadeBody(
  form: UnidadeFormState,
  existing?: Unidade
): Record<string, unknown> {
  const lat = Number.parseFloat(form.latitude.replace(",", "."));
  const lng = Number.parseFloat(form.longitude.replace(",", "."));
  const body: Record<string, unknown> = {
    codigo: sanitizeUnidadeCodigo(form.codigo),
    nome: form.nome.trim(),
    diretores: filterNonEmpty(form.diretores),
    telefones: filterNonEmpty(form.telefones),
    emails: filterNonEmpty(form.emails),
    endereco: {
      cep: form.endereco.cep.trim(),
      logradouro: form.endereco.logradouro.trim(),
      numero: form.endereco.numero.trim(),
      complemento: form.endereco.complemento.trim(),
      bairro: form.endereco.bairro.trim(),
      cidade: form.endereco.cidade.trim(),
      estado: form.endereco.estado.trim(),
    },
    latitude: Number.isFinite(lat) ? lat : 0,
    longitude: Number.isFinite(lng) ? lng : 0,
    areaM2: sanitizeAreaM2(form),
    areaVertices: sanitizeAreaVertices(form),
    ip: form.ip.trim(),
    equipamentos: sanitizeEquipamentos(form.equipamentos),
    intervaloS: Number.parseInt(form.intervaloS, 10) || 30,
    alertaOfflineS: Number.parseInt(form.alertaOfflineS, 10) || 60,
  };
  if (existing) {
    body.id = existing.id;
    if (existing.createdAt?.trim()) {
      body.createdAt = existing.createdAt;
    }
    if (existing.updatedAt?.trim()) {
      body.updatedAt = existing.updatedAt;
    }
  }
  return body;
}

export function formatUnidadeEndereco(e: UnidadeEndereco): string {
  const parts = [
    e.logradouro,
    e.numero && `nº ${e.numero}`,
    e.bairro,
    e.cidade && e.estado ? `${e.cidade}/${e.estado}` : e.cidade || e.estado,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

export function defaultPortaForEquipamento(eq: Equipamento | undefined): string {
  if (!eq) return "502";
  return eq.tipoMonitoramento === "snmp" ? "161" : "502";
}

export function rotuloEquipamento(eq: Equipamento): string {
  const marca = eq.marca?.trim();
  const modelo = eq.nome?.trim();
  if (marca && modelo) return `${marca} ${modelo}`;
  return marca || modelo || "—";
}

/** Rótulo do sensor na unidade: tipo de sensor cadastrado (não marca/modelo). */
export function rotuloTipoSensorEquipamento(eq: Equipamento): string {
  if (eq.tipoEquipamento === "sensor") {
    const tipo = labelTipoSensor(eq.tipoSensor);
    if (tipo !== "—") return tipo;
  }
  return rotuloEquipamento(eq);
}

export function nomeSensorMaquina(
  link: UnidadeEquipamento,
  eq?: Equipamento
): string {
  const local = link.nomeLocal?.trim();
  if (local) return local;
  return eq ? rotuloTipoSensorEquipamento(eq) : link.equipamentoId;
}

export function labelEquipamentoCatalogo(eq: Equipamento): string {
  const tipo =
    eq.tipoEquipamento === "sensor" && eq.tipoSensor
      ? `${tipoEquipamentoLabel.sensor} · ${labelTipoSensor(eq.tipoSensor)}`
      : tipoEquipamentoLabel[eq.tipoEquipamento];
  return `${rotuloEquipamento(eq)} (${tipo} · ${tipoMonitoramentoLabel[eq.tipoMonitoramento]})`;
}

/** Nome exibido do vínculo equipamento ↔ unidade. */
export function nomeEquipamentoVinculo(
  link: UnidadeEquipamento,
  eq?: Equipamento
): string {
  const local = link.nomeLocal?.trim();
  if (local) return local;
  if (link.maquinaNome?.trim() && link.maquinaId && eq?.tipoEquipamento === "sensor") {
    return `${link.maquinaNome.trim()} · ${rotuloTipoSensorEquipamento(eq)}`;
  }
  if (link.maquinaNome?.trim() && link.maquinaId) {
    return link.maquinaNome.trim();
  }
  return eq ? rotuloEquipamento(eq) : link.equipamentoId;
}

export function nomeMaquinaVinculo(link: UnidadeEquipamento): string {
  return link.maquinaNome?.trim() || "Máquina";
}
