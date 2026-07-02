export type FileKey = "processos" | "cgi" | "sydle";

export interface FileSourceStatus {
  found: boolean;
  path: string | null;
  name?: string | null;
  lastModified?: string | null;
  size?: number | null;
  rows: number;
  error: string | null;
}

export interface ChartPoint {
  name: string;
  total?: number;
  value?: number;
  slaMedio?: number;
  tempoMedioResposta?: number;
  percentualDentroSla?: number;
  valorTotalImoveis?: number;
  valorTotalOperacoes?: number;
  ltvMedio?: number;
}

export interface ProcessCase {
  id: string;
  assunto: string | null;
  comarca: string | null;
  vara: string | null;
  status: string | null;
  polo_ativo: string | null;
  polo_passivo: string | null;
  valor_causa: number | null;
  valor_aluguel_depois: number | null;
  sentenca: string | null;
  resumo_caso: string | null;
  ultima_atualizacao: string | null;
  data_sentenca: string | null;
  data_distribuicao: string | null;
  data_transito: string | null;
  classe?: string | null;
  responsavel?: string | null;
  prioridade?: string | null;
  risco?: string | null;
  proximo_passo?: string | null;
  data_ultima_atualizacao?: string | null;
  ativo: boolean;
  encerrado: boolean;
}

export interface ProcessMetrics {
  total: number;
  ativos: number;
  encerrados: number;
  valorTotalCausa: number;
  valorTotalAluguel: number;
  byStatus: ChartPoint[];
  byAssunto: ChartPoint[];
  byComarca: ChartPoint[];
  bySentenca: ChartPoint[];
  valorPorAssunto: ChartPoint[];
  valorPorComarca: ChartPoint[];
  casosRelevantes: ProcessCase[];
}

export interface ServiceMetrics {
  total: number;
  slaMedio: number;
  tempoMedioResposta: number;
  percentualDentroSla: number;
  dentroSla: number;
  foraSla: number;
  valorTotalImoveis?: number;
  valorTotalOperacoes?: number;
  ltvMedio?: number;
  porCliente: ChartPoint[];
  slaStatus: ChartPoint[];
}

export interface ExecutiveSummary {
  totalProcessos: number;
  processosAtivos: number;
  processosEncerrados: number;
  valorTotalCausa: number;
  valorTotalAluguel: number;
  demandasCgi: number;
  demandasSydle: number;
  slaMedioCgi: number;
  slaMedioSydle: number;
  percentualDentroSlaCgi: number;
  percentualDentroSlaSydle: number;
}

export interface NextStep {
  id: string;
  assunto: string | null;
  responsavel?: string | null;
  proximo_passo: string;
}

export interface DashboardData {
  lastUpdated: string;
  referenceMonth: string;
  refreshSeconds: number;
  dataSource: string;
  spreadsheetsPath: string;
  spreadsheetsPathExists: boolean;
  usingDefaultSpreadsheetsPath: boolean;
  files: Record<FileKey, FileSourceStatus>;
  executiveSummary: ExecutiveSummary;
  processos: Pick<
    ProcessMetrics,
    "byStatus" | "byAssunto" | "byComarca" | "bySentenca" | "valorPorAssunto" | "valorPorComarca" | "casosRelevantes"
  >;
  cgi: ServiceMetrics;
  sydle: ServiceMetrics;
  nextSteps: NextStep[];
  executiveText: string;
}
