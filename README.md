# Diretoria Dashboard

Dashboard executivo juridico para apresentacoes mensais a diretoria. Por padrao, o MVP funciona localmente lendo planilhas da pasta do projeto. Em producao, pode ler arquivos Excel diretamente de uma pasta do Google Drive via API.

## Como instalar

```powershell
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Depois, acesse:

- Dashboard: `http://localhost:3000`
- Modo apresentação: `http://localhost:3000/presentation`
- Saúde do app: `http://localhost:3000/api/health`

## Deploy na Vercel com Google Drive

Para publicar este projeto na Vercel lendo os arquivos Excel diretamente do Google Drive, configure o projeto como Next.js e cadastre as variaveis de ambiente abaixo em **Project Settings > Environment Variables**:

```env
DATA_SOURCE=google-drive
DASHBOARD_REFRESH_SECONDS=60
DATABASE_URL="file:/tmp/dashboard.db"

GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REFRESH_TOKEN="..."
GOOGLE_DRIVE_FOLDER_ID="1u1bChpn8_BBD1BaINVThaS2o8f86XY2I"
```

Notas importantes:

- A pasta do Drive precisa conter os arquivos `processos.xlsx`, `cgi.xlsx` e `sydle.xlsx`, ou os nomes alternativos descritos abaixo.
- A conta Google usada para gerar o `GOOGLE_REFRESH_TOKEN` precisa ter acesso de leitura a pasta.
- O OAuth precisa autorizar o escopo `https://www.googleapis.com/auth/drive.readonly`.
- Se os arquivos forem Google Sheets nativos, o app tenta exportar cada planilha como `.xlsx` antes de processar.
- O SQLite em `DATABASE_URL="file:/tmp/dashboard.db"` e temporario na Vercel. O dashboard funciona porque os dados principais vem das planilhas; snapshots/logs nao devem ser tratados como persistentes nesse modo.
- Para historico persistente, troque o Prisma para Postgres/Neon antes de usar dados reais em producao.

Com Git integrado, a Vercel usa:

- Install Command: `npm install`
- Build Command: `npm run build`
- Output: automatico do Next.js

Depois do deploy, valide:

```text
/api/health
/api/dashboard
/
```

## Estrutura de dados

Coloque as planilhas em:

```text
data/
  spreadsheets/
    processos.xlsx
    cgi.xlsx
    sydle.xlsx
  cache/
  exports/
```

Nomes recomendados:

- `processos.xlsx`
- `cgi.xlsx`
- `sydle.xlsx`

Também são aceitos no MVP:

- `Dados_teste.xlsx`
- `Dados_teste(1).xlsx`
- `CGI teste.xlsx`
- `Sydle Teste.xlsx`

Arquivos `.csv` com os mesmos nomes-base também são aceitos. CSV separado por ponto e vírgula é suportado.

## Usando Google Drive sincronizado localmente

No desenvolvimento local, a leitura pode continuar apontando para uma pasta do computador. Na Vercel, use `DATA_SOURCE=google-drive` para baixar os arquivos diretamente pela Google Drive API.

Passo a passo:

1. Instale o Google Drive para desktop.
2. Crie no Google Drive uma pasta chamada `Dashboard Diretoria`.
3. Coloque dentro dela:
   - `processos.xlsx`
   - `cgi.xlsx`
   - `sydle.xlsx`
4. Aguarde a sincronizacao no computador.
5. Descubra o caminho local da pasta sincronizada.
6. Configure no `.env`:

```env
LOCAL_SPREADSHEETS_PATH="CAMINHO_DA_PASTA"
```

Exemplos:

```env
LOCAL_SPREADSHEETS_PATH="G:\Meu Drive\Dashboard Diretoria"
```

ou

```env
LOCAL_SPREADSHEETS_PATH="C:\Users\isaqu\Google Drive\Dashboard Diretoria"
```

7. Reinicie o servidor:

```powershell
npm run dev
```

8. Acesse `http://localhost:3000/api/health` para confirmar se os arquivos foram encontrados.
9. Edite as planilhas pelo navegador no Google Drive, aguarde a sincronizacao no desktop e clique em `Atualizar agora` no dashboard.

Se `LOCAL_SPREADSHEETS_PATH` estiver vazio ou nao existir, o sistema usa o caminho padrao `data/spreadsheets`.

### Aviso importante sobre Google Sheets

No modo local sincronizado pelo Google Drive para desktop, prefira manter os arquivos como Excel `.xlsx`. Se o arquivo for convertido para Google Sheets nativo, o Drive para desktop pode criar apenas um atalho ou arquivo especial, e o dashboard pode nao conseguir ler como `.xlsx`.

No modo `DATA_SOURCE=google-drive`, arquivos Google Sheets nativos sao exportados como `.xlsx` pela Drive API antes da leitura.

## Planilha de processos

Arquivo principal: `data/spreadsheets/processos.xlsx`

Alternativas aceitas: `Dados_teste.xlsx` e `Dados_teste(1).xlsx`

Aba lida: primeira aba disponível.

Colunas atuais:

- `ID`
- `assunto`
- `comarca`
- `vara`
- `data_sentenca`
- `status`
- `polo_ativo`
- `polo_passivo`
- `data_distribuicao`
- `data_transito`
- `valor_causa`
- `valor_aluguel_depois`
- `sentenca`
- `Resumo do Caso`
- `ultima_atualizacao`

Mapeamentos principais:

- `ID` vira `id`
- `Resumo do Caso` vira `resumo_caso`
- `ultima_atualizacao` permanece `ultima_atualizacao`

O sistema normaliza nomes de colunas: remove acentos, ignora diferenças de maiúsculas/minúsculas, substitui separadores por `_` e aceita variações antigas e novas.

Campos opcionais futuros:

- `classe`
- `responsavel`
- `prioridade`
- `risco`
- `proximo_passo`
- `data_ultima_atualizacao`

Se esses campos não existirem, o dashboard continua funcionando e apenas oculta os blocos dependentes.

## Planilha CGI

Arquivo principal: `data/spreadsheets/cgi.xlsx`

Alternativa aceita: `CGI teste.xlsx`

Colunas esperadas:

- `Cliente`
- `SLA`
- `Data de Abertura`
- `Data de resposta`
- `Valor do imóvel`
- `Valor da Operação`

Métricas calculadas:

- total de demandas;
- SLA médio;
- tempo médio de resposta;
- percentual dentro do SLA;
- quantidade dentro e fora do SLA;
- valor total dos imóveis;
- valor total das operações;
- LTV médio;
- indicadores por cliente.

## Planilha Sydle

Arquivo principal: `data/spreadsheets/sydle.xlsx`

Alternativa aceita: `Sydle Teste.xlsx`

Colunas esperadas:

- `Cliente`
- `SLA`
- `Data de Abertura`
- `Data de resposta`

Métricas calculadas:

- total de demandas;
- SLA médio;
- tempo médio de resposta;
- percentual dentro do SLA;
- quantidade dentro e fora do SLA;
- indicadores por cliente.

## Atualização dos dados

Fluxo mensal:

1. Edite a planilha.
2. Salve o arquivo na pasta `data/spreadsheets`.
3. Clique em `Atualizar agora`.
4. O frontend chama `POST /api/refresh`.
5. O backend limpa o cache, relê os arquivos e devolve os dados consolidados.

O dashboard também chama `GET /api/dashboard` automaticamente a cada 60 segundos. O intervalo é configurado por:

```env
DASHBOARD_REFRESH_SECONDS=60
```

## Exportações

A página principal permite exportar:

- dados consolidados em JSON;
- resumo mensal em Markdown.

PDF e PowerPoint ficam como evolução futura, após aprovação de modelo visual e fluxo de governança.

## Banco de dados

O Prisma com SQLite é usado para:

- histórico de snapshots;
- logs de atualização;
- logs de erro quando aplicável.

O dashboard não depende de gravar todos os dados das planilhas no banco para funcionar. A leitura principal é feita diretamente dos arquivos locais.

Modelos criados:

- `DashboardSnapshot`
- `RefreshLog`

## APIs

### `GET /api/dashboard`

Retorna o JSON consolidado do dashboard.

### `POST /api/refresh`

Força releitura dos arquivos e invalida o cache.

### `GET /api/health`

Retorna status do app, existência dos arquivos, hora da última leitura e eventuais erros.

## Sigilo, LGPD e confidencialidade

Este projeto foi desenhado para funcionar localmente no MVP. Antes de conectar dados reais a serviços externos, é necessária aprovação interna conforme políticas de sigilo, LGPD, confidencialidade, segurança da informação e governança de dados.

Não coloque segredos no frontend. Chaves de API, tokens e credenciais devem ficar somente em variáveis de ambiente no backend e nunca devem ser versionados.

Os arquivos mockados ou de teste não devem conter dados reais do Banco, clientes, partes, contratos, operações, processos, números identificáveis ou qualquer informação confidencial.

## Publicação futura no SharePoint

Para publicação futura, o caminho recomendado é:

1. Validar o MVP local com planilhas anonimizadas.
2. Aprovar internamente o uso e a exposição dos dados.
3. Definir se a publicação será como app interno, página incorporada ou pacote estático.
4. Configurar autenticação, permissões e logs.
5. Só então ativar conectores como Microsoft Graph ou Google Sheets.

Arquivos de servico:

- `src/services/googleDriveService.ts` integra com Google Drive quando `DATA_SOURCE=google-drive`.
- `src/services/googleSheetsService.ts`
- `src/services/microsoftGraphService.ts`

## Fonte Google Drive por link publico

O dashboard tambem pode tentar ler uma pasta publica do Google Drive sem OAuth.

Configure no `.env`:

```env
DATA_SOURCE=googleDrivePublic
GOOGLE_DRIVE_FOLDER_URL="https://drive.google.com/drive/folders/ID_DA_PASTA"
```

O backend lista os arquivos publicos da pasta, baixa as planilhas esperadas para `data/cache/google-drive` e le esse cache local.

Arquivos esperados:

- `processos.xlsx`
- `cgi.xlsx`
- `sydle.xlsx`

Tambem continuam aceitos os nomes alternativos ja documentados.

Importante: a pasta precisa estar compartilhada como `qualquer pessoa com o link pode ver`. Se o Google Drive responder com login ou permissao negada, `/api/health` mostrara erro. Para pasta privada, sera necessario implementar uma evolucao futura com OAuth ou service account.
