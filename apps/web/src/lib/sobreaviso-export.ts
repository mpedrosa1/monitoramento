// Exportação da escala de sobreaviso (calendário mensal) para PDF (via janela
// de impressão) e Excel (.xls compatível, gerado a partir de HTML com estilos).

export type EscalaDiaEntrada = {
  nome: string;
  horario: string;
};

export type EscalaExportData = {
  ano: number;
  /** 1-12 */
  mes: number;
  /** Entradas por dia do mês (chave = número do dia). */
  entradasPorDia: Map<number, EscalaDiaEntrada[]>;
  /** Dias do mês que são feriado (destacados em amarelo). */
  feriados?: Set<number>;
  horas: { nome: string; horas: number }[];
};

const MESES_MAIUSCULO = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const COR_FIM_SEMANA_CABECALHO = "#E6B94E";
const COR_FIM_SEMANA_CELULA = "#F6D45E";
const COR_VAZIO = "#C9C9C9";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarTotalHoras(horas: number): string {
  const arred = Math.round(horas * 10) / 10;
  return Number.isInteger(arred) ? String(arred) : arred.toFixed(1);
}

/** Offset (Segunda = 0 ... Domingo = 6) do primeiro dia do mês. */
function offsetSegunda(ano: number, mes: number): number {
  return (new Date(ano, mes - 1, 1).getDay() + 6) % 7;
}

/** Monta o HTML da escala (calendário + tabela de horas). */
function montarCorpoHtml(data: EscalaExportData): string {
  const { ano, mes, entradasPorDia, horas } = data;
  const feriados = data.feriados ?? new Set<number>();
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const offset = offsetSegunda(ano, mes);
  const totalCelulas = Math.ceil((offset + diasNoMes) / 7) * 7;

  const cabecalho = DIAS_SEMANA.map((dia, i) => {
    const fds = i >= 5;
    return `<th style="border:1px solid #000;padding:6px;font-size:11px;${
      fds ? `background-color:${COR_FIM_SEMANA_CABECALHO};` : ""
    }">${dia}</th>`;
  }).join("");

  const celulas: string[] = [];
  for (let i = 0; i < totalCelulas; i++) {
    const coluna = i % 7;
    const fds = coluna >= 5;
    const dia = i - offset + 1;
    const dentroDoMes = dia >= 1 && dia <= diasNoMes;

    if (!dentroDoMes) {
      celulas.push(
        `<td style="border:1px solid #000;background-color:${COR_VAZIO};height:78px;"></td>`
      );
      continue;
    }

    const destacar = fds || feriados.has(dia);
    const entradas = entradasPorDia.get(dia) ?? [];
    const corpoEntradas = entradas
      .map(
        (e) =>
          `<div style="margin-top:4px;line-height:1.25;"><div style="font-size:10px;">${escapeHtml(
            e.nome
          )}</div>${
            e.horario
              ? `<div style="font-size:10px;">${escapeHtml(e.horario)}</div>`
              : ""
          }</div>`
      )
      .join("");

    celulas.push(
      `<td style="border:1px solid #000;vertical-align:top;padding:4px;height:78px;font-size:10px;text-align:center;${
        destacar ? `background-color:${COR_FIM_SEMANA_CELULA};` : ""
      }"><div style="font-weight:bold;">${dia}</div>${corpoEntradas}</td>`
    );
  }

  const linhas: string[] = [];
  for (let i = 0; i < celulas.length; i += 7) {
    linhas.push(`<tr>${celulas.slice(i, i + 7).join("")}</tr>`);
  }

  const titulo = `SOBREAVISO - ${MESES_MAIUSCULO[mes - 1]} ${ano}`;

  const calendario = `
    <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
      <thead>
        <tr>
          <th colspan="7" style="border:1px solid #000;padding:8px;font-size:13px;">${titulo}</th>
        </tr>
        <tr>${cabecalho}</tr>
      </thead>
      <tbody>
        ${linhas.join("")}
      </tbody>
    </table>`;

  const linhasHoras = horas
    .map(
      (h) =>
        `<tr><td style="border:1px solid #000;padding:5px 8px;font-size:11px;font-weight:bold;">${escapeHtml(
          h.nome
        )}</td><td style="border:1px solid #000;padding:5px 8px;font-size:11px;text-align:center;">${formatarTotalHoras(
          h.horas
        )}</td></tr>`
    )
    .join("");

  const tabelaHoras = `
    <table style="border-collapse:collapse;margin-top:16px;width:320px;">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:5px 8px;"></th>
          <th style="border:1px solid #000;padding:5px 8px;font-size:11px;">Total de horas</th>
        </tr>
      </thead>
      <tbody>${linhasHoras}</tbody>
    </table>`;

  // Linhas em branco para separar o calendário da tabela de horas no Excel
  // (que ignora margens). No PDF a margem da tabela também garante o respiro.
  const espacador = `
    <table style="border-collapse:collapse;">
      <tr><td style="height:10px;font-size:10px;">&nbsp;</td></tr>
      <tr><td style="height:10px;font-size:10px;">&nbsp;</td></tr>
    </table>`;

  return `${calendario}${espacador}${tabelaHoras}`;
}

/** Abre a janela de impressão com a escala formatada (para salvar como PDF). */
export function imprimirEscalaPdf(data: EscalaExportData): void {
  const corpo = montarCorpoHtml(data);
  const titulo = `Sobreaviso ${MESES_MAIUSCULO[data.mes - 1]} ${data.ano}`;

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    window.alert(
      "Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups."
    );
    return;
  }

  win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(titulo)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; padding: 16px; }
  </style>
</head>
<body>
  ${corpo}
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
  win.document.close();
}

/** Gera e baixa um arquivo .xls (HTML) com a escala formatada. */
export function baixarEscalaExcel(data: EscalaExportData): void {
  const corpo = montarCorpoHtml(data);
  const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>Sobreaviso</x:Name>
  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>${corpo}</body>
</html>`;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sobreaviso-${data.ano}-${String(data.mes).padStart(2, "0")}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
