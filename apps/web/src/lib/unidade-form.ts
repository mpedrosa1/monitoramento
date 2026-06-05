import {
  tipoEquipamentoLabel,
  tipoMonitoramentoLabel,
} from "./labels";
import type {
  Equipamento,
  Unidade,
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
    ip: "",
    equipamentos: [],
    intervaloS: "30",
    alertaOfflineS: "60",
  };
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
    codigo: u.codigo ?? "",
    nome: u.nome ?? "",
    diretores: normalizeStringList(u.diretores),
    telefones: normalizeStringList(u.telefones),
    emails: normalizeStringList(u.emails),
    endereco: normalizeEndereco(u.endereco),
    latitude: u.latitude != null ? String(u.latitude) : "",
    longitude: u.longitude != null ? String(u.longitude) : "",
    ip: u.ip ?? "",
    equipamentos: Array.isArray(u.equipamentos) ? [...u.equipamentos] : [],
    intervaloS: String(u.intervaloS || 30),
    alertaOfflineS: String(u.alertaOfflineS || 60),
  };
}

function filterNonEmpty(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

const OBJECT_ID_HEX = /^[a-f\d]{24}$/i;

function sanitizeEquipamentos(
  links: UnidadeEquipamento[]
): UnidadeEquipamento[] {
  return links.filter((l) => OBJECT_ID_HEX.test(l.equipamentoId.trim()));
}

export function formToUnidadeBody(
  form: UnidadeFormState,
  existing?: Unidade
): Record<string, unknown> {
  const lat = Number.parseFloat(form.latitude.replace(",", "."));
  const lng = Number.parseFloat(form.longitude.replace(",", "."));
  const body: Record<string, unknown> = {
    codigo: form.codigo.trim(),
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

export function labelEquipamentoCatalogo(eq: Equipamento): string {
  return `${eq.nome} (${tipoEquipamentoLabel[eq.tipoEquipamento]} · ${tipoMonitoramentoLabel[eq.tipoMonitoramento]})`;
}

/** Nome exibido do vínculo equipamento ↔ unidade. */
export function nomeEquipamentoVinculo(
  link: UnidadeEquipamento,
  eq?: Equipamento
): string {
  const local = link.nomeLocal?.trim();
  if (local) return local;
  return eq?.nome ?? link.equipamentoId;
}
