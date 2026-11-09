const SYSTEM_INSTRUCTION = `Você é a SERVMAQ IA, assistente virtual do Portal Servmaq, uma empresa ligada ao agronegócio em Quirinópolis, Goiás, Brasil.
Responda em português brasileiro, de forma clara, cordial e objetiva. Ajude com dúvidas gerais sobre agronegócio, lavoura, pecuária, máquinas agrícolas, clima e uso do portal.
Não invente cotações, previsões, notícias, dados técnicos ou informações sobre estoque da Servmaq. Se não tiver dado atual conectado, diga claramente que não consegue confirmar naquele momento e indique consultar fontes oficiais.
Não dê diagnóstico agronômico definitivo nem substitua engenheiro agrônomo, veterinário, mecânico ou consultor financeiro. Em temas de risco, recomende profissional habilitado.
Não afirme que consultou dados ao vivo se não recebeu esses dados no contexto.`;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({error:'Método não permitido.'}) };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { statusCode: 503, headers, body: JSON.stringify({error:'A SERVMAQ IA ainda não foi ativada. Falta configurar a chave gratuita do serviço de IA no Netlify.'}) };

  try {
    const payload = JSON.parse(event.body || '{}');
    const message = String(payload.message || '').trim().slice(0, 1200);
    if (!message) return { statusCode: 400, headers, body: JSON.stringify({error:'Digite uma pergunta.'}) };
    const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];
    const contents = [];
    for (const item of history) {
      if (!item || !['user','model'].includes(item.role) || !Array.isArray(item.parts)) continue;
      const text = item.parts.map(p => String(p.text || '')).join(' ').slice(0, 2500);
      if (text) contents.push({role:item.role, parts:[{text}]});
    }
    contents.push({role:'user', parts:[{text:message}]});

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
    const response = await fetch(endpoint, {
      method:'POST',
      headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:SYSTEM_INSTRUCTION}]},
        contents,
        generationConfig:{temperature:0.5,maxOutputTokens:700}
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = response.status === 429 ? 'O limite gratuito de perguntas foi atingido por enquanto. Tente novamente mais tarde.' : 'O serviço de IA não respondeu. Tente novamente em instantes.';
      return {statusCode:response.status === 429 ? 429 : 502,headers,body:JSON.stringify({error:msg})};
    }
    const reply = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!reply) throw new Error('Resposta vazia');
    return {statusCode:200,headers,body:JSON.stringify({reply})};
  } catch (error) {
    return {statusCode:500,headers,body:JSON.stringify({error:'Não foi possível processar sua pergunta agora.'})};
  }
};
