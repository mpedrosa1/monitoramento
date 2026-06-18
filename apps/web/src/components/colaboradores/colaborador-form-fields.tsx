"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  dependenteFieldKey,
  enderecoFieldKey,
  ESTADO_CIVIL_OPCOES,
  LOCAL_TRABALHO_OPCOES,
  novoDependenteVazio,
  TIPO_ACESSO_OPCOES,
  type ColaboradorFormErrors,
  type ColaboradorFormState,
  type DependenteForm,
} from "@/lib/colaborador-form";
import {
  emptyPermissoesAdmin,
  isMaster,
  podeEditarPermissoesColaborador,
} from "@/lib/acesso";
import { TIPO_ACESSO_DESCRICOES, permissoesEfetivas } from "@/lib/permissoes-admin";
import { resolveAuthUserPermissoes, resolveAuthUserTipoAcesso } from "@/lib/auth-session";
import { useAuth } from "@/components/auth-provider";
import {
  formatCnhInput,
  formatCpfInput,
  formatRgInput,
  formatSalarioInput,
  formatTelefoneInput,
} from "@/lib/masks";
import type { ColaboradorEndereco, UnidadeEndereco } from "@/lib/types";
import {
  buscarEnderecoPorCep,
  cepDigits,
  formatCepInput,
  isCepComplete,
  mergeEnderecoViaCep,
} from "@/lib/viacep";
import {
  ColaboradorField,
  ColaboradorFormErrorsBanner,
  ColaboradorFormLegend,
} from "@/components/colaboradores/colaborador-form-ui";
import { ColaboradorFotoUpload } from "@/components/colaboradores/colaborador-foto-upload";
import { PermissoesAdminFields } from "@/components/colaboradores/permissoes-admin-fields";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ColaboradorFormFields({
  form,
  onChange,
  errors = {},
}: {
  form: ColaboradorFormState;
  onChange: (patch: Partial<ColaboradorFormState>) => void;
  errors?: ColaboradorFormErrors;
}) {
  const { user } = useAuth();
  const editorTipo = resolveAuthUserTipoAcesso(user);
  const editorPerm = resolveAuthUserPermissoes(user);
  const { canViewFinanceiro, isMaster: isMasterHook } = usePermissions();
  const editorIsMaster = isMasterHook || isMaster(editorTipo, editorPerm);
  const permissoesBloqueadas = !podeEditarPermissoesColaborador(
    editorTipo,
    editorPerm,
    form.tipoAcesso,
    form.permissoesAdmin
  );
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const [tab, setTab] = useState<
    "pessoais" | "endereco" | "profissionais" | "permissoes"
  >("pessoais");
  const ultimoCepBuscado = useRef("");
  const enderecoRef = useRef(form.endereco);
  enderecoRef.current = form.endereco;

  const estadoCivilItems = ESTADO_CIVIL_OPCOES.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  const localItems = LOCAL_TRABALHO_OPCOES.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  const acessoItems = TIPO_ACESSO_OPCOES.filter(
    (o) => o.value !== "master" || editorIsMaster
  ).map((o) => ({
    value: o.value,
    label: o.label,
  }));

  function patchEndereco(
    field: keyof ColaboradorEndereco,
    value: string
  ) {
    onChange({ endereco: { ...form.endereco, [field]: value } });
  }

  function handleCepInput(raw: string) {
    const formatted = formatCepInput(raw);
    patchEndereco("cep", formatted);
    setCepErro(null);
    if (cepDigits(formatted) !== ultimoCepBuscado.current) {
      ultimoCepBuscado.current = "";
    }
  }

  useEffect(() => {
    const cep = form.endereco.cep;
    if (!isCepComplete(cep)) return;

    const digits = cepDigits(cep);
    if (digits === ultimoCepBuscado.current) return;

    const timer = setTimeout(async () => {
      setCepLoading(true);
      setCepErro(null);
      try {
        const dados = await buscarEnderecoPorCep(cep);
        if (!dados) {
          setCepErro("CEP não encontrado");
          return;
        }
        ultimoCepBuscado.current = digits;
        onChange({
          endereco: mergeEnderecoViaCep(
            enderecoRef.current as UnidadeEndereco,
            dados
          ) as ColaboradorEndereco,
        });
      } catch {
        setCepErro("Não foi possível consultar o CEP. Tente novamente.");
      } finally {
        setCepLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.endereco.cep, onChange]);

  function addDependente() {
    onChange({
      dependentes: [...form.dependentes, novoDependenteVazio()],
    });
  }

  function updateDependente(
    localId: string,
    patch: Partial<Omit<DependenteForm, "localId">>
  ) {
    onChange({
      dependentes: form.dependentes.map((d) =>
        d.localId === localId ? { ...d, ...patch } : d
      ),
    });
  }

  function removeDependente(localId: string) {
    onChange({
      dependentes: form.dependentes.filter((d) => d.localId !== localId),
    });
  }

  const mostrarConjuge = form.estadoCivil === "casado";
  const cepFieldError = errors[enderecoFieldKey("cep")] ?? cepErro ?? undefined;

  function tabFromFieldKey(fieldKey: string) {
    if (fieldKey.startsWith("endereco.")) return "endereco" as const;
    if (fieldKey === "tipoAcesso" || fieldKey === "permissoesAdmin") {
      return "permissoes" as const;
    }
    if (
      fieldKey === "cargo" ||
      fieldKey === "dataAdmissao" ||
      fieldKey === "localTrabalho" ||
      fieldKey === "telefoneCorporativo" ||
      fieldKey === "emailCorporativo" ||
      fieldKey === "salario"
    ) {
      return "profissionais" as const;
    }
    // Defaults: pessoais (inclui dependentes e cônjuge).
    return "pessoais" as const;
  }

  useEffect(() => {
    function onFocusField(ev: Event) {
      const e = ev as CustomEvent<{ fieldKey?: string }>;
      const fieldKey = e.detail?.fieldKey;
      if (!fieldKey) return;
      setTab(tabFromFieldKey(fieldKey));
    }

    window.addEventListener("colaborador-form:focus-field", onFocusField);
    return () =>
      window.removeEventListener("colaborador-form:focus-field", onFocusField);
  }, []);

  function TabButton({
    value,
    label,
  }: {
    value: typeof tab;
    label: string;
  }) {
    const active = tab === value;
    return (
      <button
        type="button"
        onClick={() => setTab(value)}
        className={[
          "whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        ].join(" ")}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="grid gap-5 py-1">
      <ColaboradorFormLegend />
      <ColaboradorFormErrorsBanner errors={errors} />

      <div className="flex flex-wrap gap-2">
        <TabButton value="pessoais" label="Dados pessoais" />
        <TabButton value="endereco" label="Endereço" />
        <TabButton value="profissionais" label="Dados profissionais" />
        <TabButton value="permissoes" label="Permissões" />
      </div>

      <div className="h-[min(52vh,28rem)] overflow-y-auto overscroll-contain pr-1">
      {tab === "pessoais" ? (
        <section className="grid gap-4">
          <ColaboradorFotoUpload
            nome={form.nome}
            fotoUrl={form.fotoUrl}
            onChange={(fotoUrl) => onChange({ fotoUrl })}
          />
          <ColaboradorField
            fieldKey="nome"
            label="Nome"
            required
            error={errors.nome}
          >
            <Input
              id="col-nome"
              value={form.nome}
              onChange={(e) => onChange({ nome: e.target.value })}
              placeholder="Nome completo"
              aria-invalid={!!errors.nome}
            />
          </ColaboradorField>
          <ColaboradorField
            fieldKey="dataNascimento"
            label="Data de nascimento"
            required
            error={errors.dataNascimento}
          >
            <Input
              id="col-nascimento"
              type="date"
              value={form.dataNascimento}
              onChange={(e) => onChange({ dataNascimento: e.target.value })}
              aria-invalid={!!errors.dataNascimento}
            />
          </ColaboradorField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColaboradorField
              fieldKey="telefoneContato"
              label="Telefone de contato"
              required
              error={errors.telefoneContato}
            >
              <Input
                id="col-tel"
                value={form.telefoneContato}
                onChange={(e) =>
                  onChange({
                    telefoneContato: formatTelefoneInput(e.target.value),
                  })
                }
                placeholder="(00) 00000-0000"
                inputMode="tel"
                aria-invalid={!!errors.telefoneContato}
              />
            </ColaboradorField>
            <ColaboradorField
              fieldKey="email"
              label="E-mail"
              required
              error={errors.email}
            >
              <Input
                id="col-email"
                type="email"
                value={form.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="nome@exemplo.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
              />
            </ColaboradorField>
          </div>
          <ColaboradorField fieldKey="cpf" label="CPF" required error={errors.cpf}>
            <Input
              id="col-cpf"
              value={form.cpf}
              onChange={(e) => onChange({ cpf: formatCpfInput(e.target.value) })}
              placeholder="000.000.000-00"
              inputMode="numeric"
              aria-invalid={!!errors.cpf}
            />
          </ColaboradorField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColaboradorField fieldKey="rg" label="RG" required error={errors.rg}>
              <Input
                id="col-rg"
                value={form.rg}
                onChange={(e) => onChange({ rg: formatRgInput(e.target.value) })}
                placeholder="00.000.000"
                aria-invalid={!!errors.rg}
              />
            </ColaboradorField>
            <ColaboradorField
              fieldKey="rgOrgaoEmissor"
              label="Órgão emissor"
              required
              error={errors.rgOrgaoEmissor}
            >
              <Input
                id="col-rg-org"
                value={form.rgOrgaoEmissor}
                onChange={(e) => onChange({ rgOrgaoEmissor: e.target.value })}
                placeholder="Ex.: SSP/SP"
                aria-invalid={!!errors.rgOrgaoEmissor}
              />
            </ColaboradorField>
          </div>
          <ColaboradorField
            fieldKey="cnh"
            label="Número da CNH"
            error={errors.cnh}
          >
            <Input
              id="col-cnh"
              value={form.cnh}
              onChange={(e) => onChange({ cnh: formatCnhInput(e.target.value) })}
              placeholder="000.000.000-00"
              inputMode="numeric"
              aria-invalid={!!errors.cnh}
            />
          </ColaboradorField>
          <ColaboradorField
            fieldKey="estadoCivil"
            label="Estado civil"
            required
            error={errors.estadoCivil}
          >
            <Select
              items={estadoCivilItems}
              value={form.estadoCivil || null}
              onValueChange={(v) =>
                onChange({
                  estadoCivil: (v ?? "") as ColaboradorFormState["estadoCivil"],
                  conjuge: v === "casado" ? form.conjuge : "",
                  conjugeCpf: v === "casado" ? form.conjugeCpf : "",
                  conjugeDataNascimento:
                    v === "casado" ? form.conjugeDataNascimento : "",
                  conjugeDependente:
                    v === "casado" ? form.conjugeDependente : false,
                })
              }
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.estadoCivil}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_CIVIL_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ColaboradorField>
          {mostrarConjuge && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ColaboradorField
                fieldKey="conjuge"
                label="Cônjuge"
                required
                error={errors.conjuge}
                className="sm:col-span-2"
              >
                <Input
                  id="col-conjuge"
                  value={form.conjuge}
                  onChange={(e) => onChange({ conjuge: e.target.value })}
                  placeholder="Nome do cônjuge"
                  aria-invalid={!!errors.conjuge}
                />
              </ColaboradorField>
              <ColaboradorField
                fieldKey="conjugeCpf"
                label="CPF do cônjuge"
                error={errors.conjugeCpf}
                className="sm:col-span-2"
              >
                <Input
                  id="col-conjuge-cpf"
                  value={form.conjugeCpf}
                  onChange={(e) => onChange({ conjugeCpf: formatCpfInput(e.target.value) })}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  aria-invalid={!!errors.conjugeCpf}
                />
              </ColaboradorField>
              <ColaboradorField
                fieldKey="conjugeDataNascimento"
                label="Data de nascimento do cônjuge"
                error={errors.conjugeDataNascimento}
                className="sm:col-span-2"
              >
                <Input
                  id="col-conjuge-nascimento"
                  type="date"
                  value={form.conjugeDataNascimento}
                  onChange={(e) =>
                    onChange({ conjugeDataNascimento: e.target.value })
                  }
                  aria-invalid={!!errors.conjugeDataNascimento}
                />
              </ColaboradorField>
              <div className="sm:col-span-2">
                <label
                  htmlFor="col-conjuge-dependente"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <span className="text-sm font-medium">
                    Cônjuge é dependente
                  </span>
                  <button
                    id="col-conjuge-dependente"
                    type="button"
                    role="switch"
                    aria-checked={form.conjugeDependente}
                    onClick={() =>
                      onChange({ conjugeDependente: !form.conjugeDependente })
                    }
                    className={[
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      form.conjugeDependente ? "bg-primary" : "bg-muted",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                        form.conjugeDependente
                          ? "translate-x-5"
                          : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </label>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Dependentes</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDependente}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Opcional. Ao incluir um dependente, preencha todos os campos dele.
            </p>
            {form.dependentes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum dependente cadastrado.
              </p>
            ) : (
              <ul className="space-y-3">
                {form.dependentes.map((d, index) => (
                  <li
                    key={d.localId}
                    className="space-y-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Dependente {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeDependente(d.localId)}
                        aria-label="Remover dependente"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ColaboradorField
                        fieldKey={dependenteFieldKey(d.localId, "nome")}
                        label="Nome"
                        required
                        error={errors[dependenteFieldKey(d.localId, "nome")]}
                        className="sm:col-span-2"
                      >
                        <Input
                          value={d.nome}
                          onChange={(e) =>
                            updateDependente(d.localId, { nome: e.target.value })
                          }
                          placeholder="Nome completo"
                          aria-invalid={
                            !!errors[dependenteFieldKey(d.localId, "nome")]
                          }
                        />
                      </ColaboradorField>
                      <ColaboradorField
                        fieldKey={dependenteFieldKey(d.localId, "dataNascimento")}
                        label="Data de nascimento"
                        required
                        error={
                          errors[dependenteFieldKey(d.localId, "dataNascimento")]
                        }
                      >
                        <Input
                          type="date"
                          value={d.dataNascimento}
                          onChange={(e) =>
                            updateDependente(d.localId, {
                              dataNascimento: e.target.value,
                            })
                          }
                          aria-invalid={
                            !!errors[
                              dependenteFieldKey(d.localId, "dataNascimento")
                            ]
                          }
                        />
                      </ColaboradorField>
                      <ColaboradorField
                        fieldKey={dependenteFieldKey(d.localId, "cpf")}
                        label="CPF"
                        required
                        error={errors[dependenteFieldKey(d.localId, "cpf")]}
                        className="sm:col-span-2"
                      >
                        <Input
                          value={d.cpf}
                          onChange={(e) =>
                            updateDependente(d.localId, {
                              cpf: formatCpfInput(e.target.value),
                            })
                          }
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          aria-invalid={
                            !!errors[dependenteFieldKey(d.localId, "cpf")]
                          }
                        />
                      </ColaboradorField>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {tab === "endereco" ? (
        <section className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ColaboradorField
              fieldKey={enderecoFieldKey("cep")}
              label="CEP"
              required
              error={cepFieldError}
              className="relative sm:col-span-1"
            >
              <Input
                id="col-cep"
                value={form.endereco.cep}
                onChange={(e) => handleCepInput(e.target.value)}
                placeholder="00000-000"
                inputMode="numeric"
                aria-invalid={!!cepFieldError}
              />
              {cepLoading && (
                <Loader2 className="absolute right-2 top-8 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </ColaboradorField>
            <ColaboradorField
              fieldKey={enderecoFieldKey("logradouro")}
              label="Rua"
              required
              error={errors[enderecoFieldKey("logradouro")]}
              className="sm:col-span-2"
            >
              <Input
                id="col-rua"
                value={form.endereco.logradouro}
                onChange={(e) => patchEndereco("logradouro", e.target.value)}
                aria-invalid={!!errors[enderecoFieldKey("logradouro")]}
              />
            </ColaboradorField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColaboradorField
              fieldKey={enderecoFieldKey("numero")}
              label="Número"
              required
              error={errors[enderecoFieldKey("numero")]}
            >
              <Input
                id="col-num"
                value={form.endereco.numero}
                onChange={(e) => patchEndereco("numero", e.target.value)}
                aria-invalid={!!errors[enderecoFieldKey("numero")]}
              />
            </ColaboradorField>
            <ColaboradorField
              fieldKey={enderecoFieldKey("complemento")}
              label="Complemento"
              className="sm:col-span-2"
            >
              <Input
                id="col-comp"
                value={form.endereco.complemento}
                onChange={(e) => patchEndereco("complemento", e.target.value)}
              />
            </ColaboradorField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColaboradorField
              fieldKey={enderecoFieldKey("bairro")}
              label="Bairro"
              required
              error={errors[enderecoFieldKey("bairro")]}
            >
              <Input
                id="col-bairro"
                value={form.endereco.bairro}
                onChange={(e) => patchEndereco("bairro", e.target.value)}
                aria-invalid={!!errors[enderecoFieldKey("bairro")]}
              />
            </ColaboradorField>
            <ColaboradorField
              fieldKey={enderecoFieldKey("cidade")}
              label="Cidade"
              required
              error={errors[enderecoFieldKey("cidade")]}
            >
              <Input
                id="col-cidade"
                value={form.endereco.cidade}
                onChange={(e) => patchEndereco("cidade", e.target.value)}
                aria-invalid={!!errors[enderecoFieldKey("cidade")]}
              />
            </ColaboradorField>
            <ColaboradorField
              fieldKey={enderecoFieldKey("estado")}
              label="Estado"
              required
              error={errors[enderecoFieldKey("estado")]}
            >
              <Input
                id="col-uf"
                value={form.endereco.estado}
                onChange={(e) =>
                  patchEndereco("estado", e.target.value.toUpperCase().slice(0, 2))
                }
                placeholder="UF"
                maxLength={2}
                aria-invalid={!!errors[enderecoFieldKey("estado")]}
              />
            </ColaboradorField>
          </div>
        </section>
      ) : null}

      {tab === "profissionais" ? (
        <section className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColaboradorField fieldKey="cargo" label="Cargo" required error={errors.cargo}>
              <Input
                id="col-cargo"
                value={form.cargo}
                onChange={(e) => onChange({ cargo: e.target.value })}
                aria-invalid={!!errors.cargo}
              />
            </ColaboradorField>
            <ColaboradorField
              fieldKey="localTrabalho"
              label="Local de trabalho"
              required
              error={errors.localTrabalho}
            >
              <Select
                items={localItems}
                value={form.localTrabalho || null}
                onValueChange={(v) =>
                  onChange({
                    localTrabalho: (v ?? "") as ColaboradorFormState["localTrabalho"],
                  })
                }
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.localTrabalho}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {LOCAL_TRABALHO_OPCOES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ColaboradorField>
          </div>
          <ColaboradorField
            fieldKey="dataAdmissao"
            label="Data de admissão"
            required
            error={errors.dataAdmissao}
            className="sm:max-w-xs"
          >
            <Input
              id="col-data-admissao"
              type="date"
              value={form.dataAdmissao}
              onChange={(e) => onChange({ dataAdmissao: e.target.value })}
              aria-invalid={!!errors.dataAdmissao}
            />
          </ColaboradorField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColaboradorField
              fieldKey="telefoneCorporativo"
              label="Telefone corporativo"
              required
              error={errors.telefoneCorporativo}
            >
              <Input
                id="col-tel-corp"
                value={form.telefoneCorporativo}
                onChange={(e) =>
                  onChange({
                    telefoneCorporativo: formatTelefoneInput(e.target.value),
                  })
                }
                placeholder="(00) 00000-0000"
                inputMode="tel"
                aria-invalid={!!errors.telefoneCorporativo}
              />
            </ColaboradorField>
            <ColaboradorField
              fieldKey="emailCorporativo"
              label="E-mail corporativo"
              required
              error={errors.emailCorporativo}
            >
              <Input
                id="col-email-corp"
                type="email"
                value={form.emailCorporativo}
                onChange={(e) => onChange({ emailCorporativo: e.target.value })}
                placeholder="nome@empresa.com"
                autoComplete="off"
                aria-invalid={!!errors.emailCorporativo}
              />
            </ColaboradorField>
          </div>
          {canViewFinanceiro ? (
            <ColaboradorField
              fieldKey="salario"
              label="Salário"
              error={errors.salario}
              className="sm:max-w-xs"
            >
              <Input
                id="col-salario"
                value={form.salario}
                onChange={(e) =>
                  onChange({ salario: formatSalarioInput(e.target.value) })
                }
                placeholder="0,00"
                inputMode="numeric"
                aria-invalid={!!errors.salario}
              />
            </ColaboradorField>
          ) : null}
        </section>
      ) : null}

      {tab === "permissoes" ? (
        <section className="grid gap-4">
          <ColaboradorField
            fieldKey="tipoAcesso"
            label="Tipo de acesso ao sistema"
            required
            error={errors.tipoAcesso}
          >
            <Select
              items={acessoItems}
              value={form.tipoAcesso || null}
              disabled={permissoesBloqueadas}
              onValueChange={(v) => {
                const tipo = (v ?? "") as ColaboradorFormState["tipoAcesso"];
                onChange({
                  tipoAcesso: tipo,
                  ...(tipo === "usuario" || tipo === "master"
                    ? { permissoesAdmin: emptyPermissoesAdmin() }
                    : {}),
                });
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.tipoAcesso}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_ACESSO_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ColaboradorField>

          {form.tipoAcesso === "administrador" ? (
            <ColaboradorField
              fieldKey="permissoesAdmin"
              label="Permissões do administrador"
              required
              error={errors.permissoesAdmin}
            >
              {permissoesBloqueadas ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  As permissões deste colaborador estão acima da sua hierarquia
                  e não podem ser alteradas.
                </p>
              ) : null}
              <PermissoesAdminFields
                value={form.permissoesAdmin}
                onChange={(permissoesAdmin) => onChange({ permissoesAdmin })}
                disabled={permissoesBloqueadas}
                editorPermissoes={
                  editorIsMaster
                    ? undefined
                    : permissoesEfetivas(editorTipo, editorPerm)
                }
              />
            </ColaboradorField>
          ) : form.tipoAcesso ? (
            <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {TIPO_ACESSO_DESCRICOES[form.tipoAcesso]}
            </p>
          ) : null}
        </section>
      ) : null}
      </div>
    </div>
  );
}
