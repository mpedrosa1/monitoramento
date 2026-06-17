"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Heart,
  MapPin,
  Pencil,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { COLABORADOR_AVATAR_PADRAO } from "@/lib/colaborador-avatar";
import {
  ESTADO_CIVIL_OPCOES,
  LOCAL_TRABALHO_OPCOES,
} from "@/lib/colaborador-form";
import {
  colaboradorStatusLabel,
  colaboradorStatusVariant,
  labelTipoAcesso,
} from "@/lib/labels";
import { salarioNumeroParaInput } from "@/lib/masks";
import type { Colaborador } from "@/lib/types";
import { EditarColaboradorDialog } from "@/components/colaboradores/editar-colaborador-dialog";
import { ExcluirColaboradorDialog } from "@/components/colaboradores/excluir-colaborador-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatarData(value?: string): string {
  if (!value?.trim()) return "—";
  const [ano, mes, dia] = value.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  return value;
}

function labelEstadoCivil(value?: string): string {
  if (!value) return "—";
  return ESTADO_CIVIL_OPCOES.find((o) => o.value === value)?.label ?? value;
}

function labelLocalTrabalho(value?: string): string {
  if (!value) return "—";
  return LOCAL_TRABALHO_OPCOES.find((o) => o.value === value)?.label ?? value;
}

function valorOuTraco(value?: string): string {
  return value?.trim() ? value : "—";
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function ColaboradorDetail({
  colaborador,
  canManage,
  onChanged,
  voltarHref = "/dashboard/colaboradores",
  escaladoSobreaviso = false,
  sobreavisoHref = "/dashboard/meus-dados/sobreaviso",
}: {
  colaborador: Colaborador;
  canManage: boolean;
  onChanged: () => void | Promise<void>;
  voltarHref?: string;
  escaladoSobreaviso?: boolean;
  sobreavisoHref?: string;
}) {
  const router = useRouter();
  const { canViewFinanceiro } = usePermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const foto = colaborador.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO;
  const cargo = colaborador.cargo?.trim() || "Colaborador";
  const enderecoCompleto = (() => {
    const e = colaborador.endereco;
    if (!e) return "—";
    const linha1 = [e.logradouro, e.numero].filter(Boolean).join(", ");
    const linha2 = [e.bairro, e.cidade, e.estado].filter(Boolean).join(" · ");
    const partes = [linha1, e.complemento, linha2, e.cep].filter(
      (p) => p && p.trim()
    );
    return partes.length ? partes.join(" — ") : "—";
  })();

  async function confirmDelete() {
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/colaboradores/${colaborador.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      router.push("/dashboard/colaboradores");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao excluir";
      window.alert(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
      {/* Coluna lateral */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="rounded-2xl border-2 border-background bg-background p-1.5 shadow-md ring-1 ring-border/60">
            <Avatar className="h-32 w-32 rounded-xl after:rounded-xl">
              <AvatarImage
                src={foto}
                alt={colaborador.nome}
                className="rounded-lg object-cover"
              />
              <AvatarFallback className="rounded-lg text-2xl font-semibold">
                {iniciais(colaborador.nome)}
              </AvatarFallback>
            </Avatar>
          </div>
          <h2 className="mt-4 text-lg font-semibold leading-tight">
            {colaborador.nome}
          </h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {cargo}
          </p>
          <Badge
            variant={colaboradorStatusVariant[colaborador.status]}
            className="mt-3 px-2.5 py-0.5 text-[10px] uppercase tracking-wide"
          >
            {colaboradorStatusLabel[colaborador.status]}
          </Badge>

          <div className="mt-5 flex w-full flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(voltarHref)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Voltar
            </Button>
            {escaladoSobreaviso && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(sobreavisoHref)}
              >
                <CalendarDays className="mr-1.5 h-4 w-4" />
                Ver sobreaviso
              </Button>
            )}
            {canManage && (
              <>
                <Button className="w-full" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="grid gap-6">
        <Section icon={User} title="Dados pessoais">
          <dl className="grid gap-4 sm:grid-cols-2">
            <InfoRow label="Nome completo" value={colaborador.nome} />
            <InfoRow
              label="Data de nascimento"
              value={formatarData(colaborador.dataNascimento)}
            />
            <InfoRow label="CPF" value={valorOuTraco(colaborador.cpf)} />
            <InfoRow
              label="RG"
              value={
                colaborador.rg?.trim()
                  ? `${colaborador.rg}${
                      colaborador.rgOrgaoEmissor?.trim()
                        ? ` · ${colaborador.rgOrgaoEmissor}`
                        : ""
                    }`
                  : "—"
              }
            />
            <InfoRow
              label="Estado civil"
              value={labelEstadoCivil(colaborador.estadoCivil)}
            />
            <InfoRow
              label="Telefone de contato"
              value={valorOuTraco(colaborador.telefoneContato)}
            />
            <InfoRow
              label="E-mail"
              value={valorOuTraco(colaborador.email)}
            />
          </dl>
        </Section>

        {colaborador.estadoCivil === "casado" && (
          <Section icon={Heart} title="Cônjuge">
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Nome" value={valorOuTraco(colaborador.conjuge)} />
              <InfoRow label="CPF" value={valorOuTraco(colaborador.conjugeCpf)} />
              <InfoRow
                label="Data de nascimento"
                value={formatarData(colaborador.conjugeDataNascimento)}
              />
              <InfoRow
                label="Dependente"
                value={colaborador.conjugeDependente ? "Sim" : "Não"}
              />
            </dl>
          </Section>
        )}

        {colaborador.dependentes && colaborador.dependentes.length > 0 && (
          <Section icon={Users} title="Dependentes">
            <ul className="grid gap-3 sm:grid-cols-2">
              {colaborador.dependentes.map((d, i) => (
                <li
                  key={`${d.nome}-${i}`}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="text-sm font-medium">{d.nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nascimento: {formatarData(d.dataNascimento)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CPF: {valorOuTraco(d.cpf)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section icon={MapPin} title="Endereço">
          <p className="text-sm text-foreground">{enderecoCompleto}</p>
        </Section>

        <Section icon={Briefcase} title="Dados profissionais">
          <dl className="grid gap-4 sm:grid-cols-2">
            <InfoRow label="Cargo" value={valorOuTraco(colaborador.cargo)} />
            <InfoRow
              label="Local de trabalho"
              value={labelLocalTrabalho(colaborador.localTrabalho)}
            />
            <InfoRow
              label="Data de admissão"
              value={formatarData(colaborador.dataAdmissao)}
            />
            <InfoRow
              label="Telefone corporativo"
              value={valorOuTraco(colaborador.telefoneCorporativo)}
            />
            <InfoRow
              label="E-mail corporativo"
              value={valorOuTraco(colaborador.emailCorporativo)}
            />
            {canViewFinanceiro && (
              <InfoRow
                label="Salário"
                value={
                  colaborador.salario && colaborador.salario > 0
                    ? `R$ ${salarioNumeroParaInput(colaborador.salario)}`
                    : "—"
                }
              />
            )}
          </dl>
        </Section>

        <Section icon={Shield} title="Acesso ao sistema">
          <dl className="grid gap-4 sm:grid-cols-2">
            <InfoRow
              label="Tipo de acesso"
              value={labelTipoAcesso(
                colaborador.tipoAcesso,
                colaborador.permissoesAdmin
              )}
            />
          </dl>
        </Section>
      </div>

      <EditarColaboradorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        colaborador={colaborador}
        onSuccess={onChanged}
      />

      <ExcluirColaboradorDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        colaborador={colaborador}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
