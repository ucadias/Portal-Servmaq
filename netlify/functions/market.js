function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function getDollar() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 10);
  const base = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)';
  const params = [
    `@dataInicial=${encodeURIComponent("'" + formatDate(start) + "'")}`,
    `@dataFinalCotacao=${encodeURIComponent("'" + formatDate(end) + "'")}`,
    '$format=json', '$top=100'
  ];
  const data = await fetchJson(`${base}?${params.join('&')}`);
  const rows = (data.value || [])
    .filter(item => Number.isFinite(Number(item.cotacaoVenda)))
    .sort((a, b) => new Date(b.dataHoraCotacao) - new Date(a.dataHoraCotacao));
  if (!rows.length) throw new Error('Nenhuma cotação PTAX encontrada');
  const latest = rows[0];
  return {
    buy: Number(latest.cotacaoCompra),
    sell: Number(latest.cotacaoVenda),
    referenceDate: latest.dataHoraCotacao.slice(0, 10),
    source: 'Banco Central do Brasil'
  };
}

async function getIbovespa() {
  const headers = {};
  if (process.env.BRAPI_TOKEN) headers.Authorization = `Bearer ${process.env.BRAPI_TOKEN}`;
  const data = await fetchJson('https://brapi.dev/api/quote/%5EBVSP', { headers });
  const item = data.results && data.results[0];
  if (!item || !Number.isFinite(Number(item.regularMarketPrice))) {
    throw new Error('Cotação do Ibovespa não disponível na resposta');
  }
  return {
    value: Number(item.regularMarketPrice),
    change: Number(item.regularMarketChange || 0),
    changePercent: Number(item.regularMarketChangePercent || 0),
    marketTime: item.regularMarketTime || null,
    source: 'brapi'
  };
}

async function getAgroQuotes() {
  const data = await fetchJson('https://agrodocai.com.br/api/v1/cotacao');
  const result = {};
  const definitions = {
    soy: ['soja', 'soja'],
    corn: ['milho', 'milho'],
    cattle: ['boi_gordo_cepea_sp', 'boi_gordo_cepea_sp']
  };
  for (const [key, [field]] of Object.entries(definitions)) {
    const value = Number(data[field]);
    result[key] = Number.isFinite(value) && value > 0
      ? { value, updatedAt: data.atualizado || null, source: 'AgroDoc · dados CEPEA/ESALQ e fontes indicadas pela API' }
      : null;
  }
  return result;
}

exports.handler = async () => {
  const [dollarResult, ibovResult, agroResult] = await Promise.allSettled([
    getDollar(), getIbovespa(), getAgroQuotes()
  ]);

  const payload = {
    dollar: dollarResult.status === 'fulfilled' ? dollarResult.value : null,
    ibovespa: ibovResult.status === 'fulfilled' ? ibovResult.value : null,
    agro: agroResult.status === 'fulfilled' ? agroResult.value : null,
    cotton: null,
    updatedAt: new Date().toISOString(),
    notes: {
      cotton: 'Cotação automática ainda sem fonte validada.',
      agroAttribution: 'Dados agrícolas: AgroDoc API, com atribuição conforme licença CC BY 4.0.'
    },
    errors: {
      dollar: dollarResult.status === 'rejected' ? dollarResult.reason.message : null,
      ibovespa: ibovResult.status === 'rejected' ? ibovResult.reason.message : null,
      agro: agroResult.status === 'rejected' ? agroResult.reason.message : null
    }
  };

  const hasAnyData = payload.dollar || payload.ibovespa || payload.agro;
  return {
    statusCode: hasAnyData ? 200 : 502,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    },
    body: JSON.stringify(payload)
  };
};
