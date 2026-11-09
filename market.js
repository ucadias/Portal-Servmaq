function brDate(date) {
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
    const url = new URL('https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)');
    url.searchParams.set('@dataInicial', `'${brDate(start)}'`);
    url.searchParams.set('@dataFinalCotacao', `'${brDate(end)}'`);
    url.searchParams.set('$format', 'json');
    url.searchParams.set('$top', '100');
    url.searchParams.set('$orderby', 'dataHoraCotacao desc');

    const response = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error(`BCB respondeu HTTP ${response.status}`);
    const payload = await response.json();
    const latest = (payload.value || []).find(row => Number.isFinite(Number(row.cotacaoVenda)));
    if (!latest) throw new Error('Não há cotação PTAX publicada no período consultado');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=900'
      },
      body: JSON.stringify({
        dollar: {
          buy: Number(latest.cotacaoCompra),
          sell: Number(latest.cotacaoVenda),
          referenceDate: String(latest.dataHoraCotacao).slice(0, 10),
          referenceTime: latest.dataHoraCotacao
        },
        source: 'Banco Central do Brasil · PTAX',
        fetchedAt: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Não foi possível obter a cotação oficial do dólar neste momento.' })
    };
  }
};
