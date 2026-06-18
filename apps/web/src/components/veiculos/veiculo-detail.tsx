"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  Car,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Pencil,
  Scale,
  Trash2,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Colaborador, Veiculo } from "@/lib/types";
import { formatPlaca } from "@/lib/veiculo-placa";
import { locadoraRotulo } from "@/lib/veiculo-locadora";
import { motoristaAtualForaDaListaAutorizados } from "@/lib/veiculo-condutores";
import { salarioNumeroParaInput } from "@/lib/masks";
import { VEICULO_FOTO_PADRAO } from "@/lib/veiculo-imagem";
import { EditarVeiculoDialog } from "@/components/veiculos/editar-veiculo-dialog";
import { ExcluirVeiculoDialog } from "@/components/veiculos/excluir-veiculo-dialog";
import { SolicitarTrocaVeiculoDialog } from "@/components/veiculos/solicitar-troca-veiculo-dialog";
import { TrocaAdminVeiculosDialog } from "@/components/veiculos/troca-admin-veiculos-dialog";
import { VeiculoPeriodosMotoristaPanel } from "@/components/veiculos/veiculo-periodos-motorista-panel";
import { VeiculoMultasPanel } from "@/components/veiculos/veiculo-multas-panel";
import { ColaboradorCard } from "@/components/dashboard/colaborador-card";
import { ColaboradorListItem } from "@/components/dashboard/colaborador-list-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AbaVeiculo = "geral" | "motoristas" | "multas";

const abas: { id: AbaVeiculo; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "geral", label: "Geral", icon: Car },
  { id: "motoristas", label: "Histórico de motoristas", icon: History },
  { id: "multas", label: "Multas", icon: Scale },
];

function valorOuTraco(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function formatarMoeda(value?: number | null): string {
  if (value === undefined || value === null || value <= 0) return "—";
  return `R$ ${salarioNumeroParaInput(value)}`;
}

function formatarKm(km?: number): string {
  if (km === undefined || km === null) return "—";
  return `${km.toLocaleString("pt-BR")} km`;
}

function formatarDataIso(data?: string): string {
  if (!data?.trim()) return "—";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
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
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function VeiculoDetail({
  veiculo,
  colaborador,
  colaboradores,
  isMeuVeiculo,
  canCrudVeiculos,
  canFrotaTrocarVeiculos,
  canFrotaRegistrarPeriodo,
  canFrotaRegistrarMulta,
  canFrotaValoresAlugueis,
  canFrotaVisualizarContratos,
  meusVeiculos,
  todosVeiculos,
  onChanged,
  voltarHref = "/dashboard/veiculos",
}: {
  veiculo: Veiculo;
  colaborador?: Colaborador | null;
  colaboradores?: Colaborador[];
  isMeuVeiculo: boolean;
  /** @deprecated use permissões granulares */
  canManage?: boolean;
  canCrudVeiculos?: boolean;
  canFrotaTrocarVeiculos?: boolean;
  canFrotaRegistrarPeriodo?: boolean;
  canFrotaRegistrarMulta?: boolean;
  canFrotaValoresAlugueis?: boolean;
  canFrotaVisualizarContratos?: boolean;
  meusVeiculos: Veiculo[];
  todosVeiculos: Veiculo[];
  onChanged: () => void | Promise<void>;
  voltarHref?: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [adminSwapOpen, setAdminSwapOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaVeiculo>("geral");

  const podeCrudVeiculo = Boolean(canCrudVeiculos);
  const podeTrocaAdmin = Boolean(canFrotaTrocarVeiculos);
  const podeRegistrarPeriodo = Boolean(canFrotaRegistrarPeriodo);
  const podeRegistrarMulta = Boolean(canFrotaRegistrarMulta);
  const podeVerValoresAluguel = Boolean(canFrotaValoresAlugueis);
  const podeVerContrato = Boolean(canFrotaVisualizarContratos);

  const foto = veiculo.fotoUrl?.trim() || VEICULO_FOTO_PADRAO;
  const usaImgNativo = foto.startsWith("http") || foto.startsWith("/pics/");
  const rotulo = `${veiculo.marca} ${veiculo.modelo}`.trim();
  const podeTrocar = !isMeuVeiculo;
  const motoristaForaAutorizados =
    podeTrocaAdmin && motoristaAtualForaDaListaAutorizados(veiculo);

  const condutoresAutorizados = useMemo(() => {
    const ids = veiculo.colaboradoresAdicionaisIds ?? [];
    if (ids.length === 0 || !colaboradores?.length) return [];
    return ids
      .map((id) => colaboradores.find((c) => c.id === id))
      .filter((c): c is Colaborador => Boolean(c))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [colaboradores, veiculo.colaboradoresAdicionaisIds]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/veiculos/${veiculo.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      router.push(voltarHref);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  function abrirTroca() {
    if (podeTrocaAdmin) {
      setAdminSwapOpen(true);
    } else {
      setSwapOpen(true);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted/40">
              {isMeuVeiculo && (
                <Badge className="absolute left-2 top-2 z-10 border-amber-300 bg-amber-400 font-semibold text-amber-950 shadow-sm">
                  Meu veículo
                </Badge>
              )}
              {podeTrocaAdmin && veiculo.alertaTrocaNaoAutorizada && (
                <Badge className="absolute right-2 top-2 z-10 border-red-300 bg-red-500 font-semibold text-white shadow-sm">
                  Alerta
                </Badge>
              )}
              {usaImgNativo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={foto}
                  alt={rotulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={foto}
                  alt={rotulo}
                  fill
                  className="object-cover"
                  sizes="300px"
                />
              )}
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {veiculo.marca}
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight">
              {veiculo.modelo}
            </h2>
            <span className="mt-2 inline-flex rounded-md bg-muted px-2.5 py-1 font-mono text-sm font-semibold tracking-wide ring-1 ring-border">
              {formatPlaca(veiculo.placa)}
            </span>
            {veiculo.cor?.trim() ? (
              <p className="mt-2 text-sm text-muted-foreground">{veiculo.cor}</p>
            ) : null}

            <div className="mt-5 flex w-full flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(voltarHref)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar
              </Button>
              {podeTrocar && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={abrirTroca}
                >
                  <ArrowLeftRight className="mr-1.5 h-4 w-4" />
                  {podeTrocaAdmin ? "Trocar condutores" : "Solicitar troca"}
                </Button>
              )}
              {podeCrudVeiculo && (
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

        <div className="grid gap-6">
          {motoristaForaAutorizados ? (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200"
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Motorista fora dos autorizados</p>
                <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                  O motorista atual deste veículo não está na lista de
                  condutores autorizados. Atualize o cadastro se necessário.
                </p>
              </div>
            </div>
          ) : null}

          {podeTrocaAdmin && veiculo.alertaTrocaNaoAutorizada ? (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Troca solicitada por não autorizado</p>
                <p className="mt-1 text-destructive/90">
                  Há uma solicitação de troca pendente feita por colaborador que
                  não está entre os condutores autorizados deste veículo.
                  Verifique a situação antes de confirmar a troca.
                </p>
              </div>
            </div>
          ) : null}

          <nav
            className="flex flex-wrap gap-1 border-b border-border"
            aria-label="Seções da ficha do veículo"
          >
            {abas.map((aba) => {
              const Icon = aba.icon;
              const ativa = abaAtiva === aba.id;
              return (
                <button
                  key={aba.id}
                  type="button"
                  onClick={() => setAbaAtiva(aba.id)}
                  className={cn(
                    "relative flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium transition-colors",
                    ativa
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {aba.label}
                  {ativa ? (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="min-h-[calc(100dvh-15rem)]">
            {abaAtiva === "geral" ? (
              <div className="grid gap-6">
              <Section icon={Car} title="Identificação">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="Placa" value={formatPlaca(veiculo.placa)} />
                  <InfoRow label="Marca" value={valorOuTraco(veiculo.marca)} />
                  <InfoRow label="Modelo" value={valorOuTraco(veiculo.modelo)} />
                  <InfoRow label="Cor" value={valorOuTraco(veiculo.cor)} />
                </dl>
              </Section>

              <Section icon={Gauge} title="Ano e quilometragem">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoRow
                    label="Ano de fabricação"
                    value={valorOuTraco(veiculo.anoFabricacao)}
                  />
                  <InfoRow
                    label="Ano modelo"
                    value={valorOuTraco(veiculo.anoModelo)}
                  />
                  <InfoRow label="KM atual" value={formatarKm(veiculo.kmAtual)} />
                </dl>
              </Section>

              <Section icon={FileText} title="Documentação">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="RENAVAM" value={valorOuTraco(veiculo.renavam)} />
                  <InfoRow
                    label="Chassi"
                    value={
                      <span className="break-all font-mono text-xs sm:text-sm">
                        {valorOuTraco(veiculo.chassi)}
                      </span>
                    }
                  />
                </dl>
              </Section>

              <Section icon={Building2} title="Locação">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoRow
                    label="Locadora"
                    value={valorOuTraco(locadoraRotulo(veiculo.locadora))}
                  />
                  <InfoRow
                    label="Data da locação"
                    value={formatarDataIso(veiculo.dataLocacao)}
                  />
                  {podeVerContrato ? (
                    <InfoRow
                      label="Número de contrato"
                      value={valorOuTraco(veiculo.numeroContrato)}
                    />
                  ) : null}
                  {podeVerValoresAluguel ? (
                    <InfoRow
                      label="Valor do aluguel"
                      value={formatarMoeda(veiculo.valorAluguel)}
                    />
                  ) : null}
                  {podeVerContrato ? (
                    <InfoRow
                      label="Contrato"
                      value={
                        veiculo.contratoUrl ? (
                          <a
                            href={veiculo.contratoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            Abrir PDF
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          "—"
                        )
                      }
                    />
                  ) : null}
                  {veiculo.dataDevolucao ? (
                    <>
                      <InfoRow
                        label="Data da devolução"
                        value={formatarDataIso(veiculo.dataDevolucao)}
                      />
                      <InfoRow
                        label="Hora da devolução"
                        value={valorOuTraco(veiculo.horaDevolucao)}
                      />
                    </>
                  ) : null}
                </dl>
              </Section>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <Section
                  icon={User}
                  title="Motorista atual"
                  className="w-full shrink-0 lg:w-auto lg:max-w-[248px]"
                >
                  {colaborador ? (
                    <ColaboradorCard
                      colaborador={colaborador}
                      linkable={podeCrudVeiculo}
                      centered={false}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum motorista atribuído a este veículo.
                    </p>
                  )}
                </Section>

                <Section
                  icon={Users}
                  title="Condutores autorizados"
                  className="min-w-0 flex-1"
                >
                  {condutoresAutorizados.length > 0 ? (
                    <div className="space-y-2">
                      {condutoresAutorizados.map((c) => (
                        <ColaboradorListItem
                          key={c.id}
                          colaborador={c}
                          linkable={podeCrudVeiculo}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum condutor autorizado cadastrado.
                    </p>
                  )}
                </Section>
              </div>
              </div>
            ) : null}

            {abaAtiva === "motoristas" ? (
              <VeiculoPeriodosMotoristaPanel
                veiculoId={veiculo.id}
                colaboradores={colaboradores ?? []}
                canManage={podeRegistrarPeriodo}
                refreshKey={veiculo.updatedAt}
              />
            ) : null}

            {abaAtiva === "multas" ? (
              <VeiculoMultasPanel
                veiculoId={veiculo.id}
                colaboradores={colaboradores ?? []}
                canManage={podeRegistrarMulta}
              />
            ) : null}
          </div>
        </div>
      </div>

      <EditarVeiculoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        veiculo={veiculo}
        onSuccess={onChanged}
      />

      <ExcluirVeiculoDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        veiculo={veiculo}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      <SolicitarTrocaVeiculoDialog
        open={swapOpen}
        onOpenChange={setSwapOpen}
        veiculoAlvo={veiculo}
        colaboradorAlvo={colaborador ?? undefined}
        meusVeiculos={meusVeiculos}
        onSuccess={onChanged}
      />

      <TrocaAdminVeiculosDialog
        open={adminSwapOpen}
        onOpenChange={setAdminSwapOpen}
        veiculoInicial={veiculo}
        veiculos={todosVeiculos}
        onSuccess={onChanged}
      />
    </>
  );
}
