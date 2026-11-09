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

    const url = new URL(
      'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)'
    );

    url.searchParams.set('@dataInicial', `'${formatDate(start)}'`);
    url.searchParams.set('@dataFinalCotacao', `'${formatDate(end)}'`);
    url.searchParams.set('$format', 'json');
    url.searchParams.set('$top', '100');
    url.searchParams.set('$orderby', 'dataHoraCotacao desc');

    const response = await fetch(url);

    if (!response.ok) throw new Error('Erro no Banco Central');

    const data = await response.json();
    const latest = (data.value || []).find(
      item => Number.isFinite(Number(item.cotacaoVenda))
    );

    if (!latest) throw new Error('Cotação não encontrada');

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
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Não foi possível consultar o dólar.'
      })
    };
  }
};
