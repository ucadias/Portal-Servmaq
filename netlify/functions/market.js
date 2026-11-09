
function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

exports.handler = async () => {
  try {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 10);

    const base = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)';

    const params = [
      `@dataInicial=${encodeURIComponent("'" + formatDate(start) + "'")}`,
      `@dataFinalCotacao=${encodeURIComponent("'" + formatDate(end) + "'")}`,
      '$format=json',
      '$top=100'
    ];

    const url = `${base}?${params.join('&')}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Banco Central HTTP ${response.status}`);
    }

    const data = await response.json();

    const rows = (data.value || [])
      .filter(item => Number.isFinite(Number(item.cotacaoVenda)))
      .sort((a, b) =>
        new Date(b.dataHoraCotacao) - new Date(a.dataHoraCotacao)
      );

    if (!rows.length) {
      throw new Error('Nenhuma cotação encontrada');
    }

    const latest = rows[0];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900'
      },
      body: JSON.stringify({
        dollar: {
          buy: Number(latest.cotacaoCompra),
          sell: Number(latest.cotacaoVenda),
          referenceDate: latest.dataHoraCotacao.slice(0, 10)
        },
        source: 'Banco Central do Brasil'
      })
    };
  } catch (error) {
    console.error('ERRO MARKET:', error);

    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Não foi possível consultar o dólar.',
        detail: error.message
      })
    };
  }
};
