const SYSTEM_INSTRUCTION = `Você é a SERVMAQ IA, assistente virtual do Portal Servmaq, ligado ao agronegócio em Quirinópolis, Goiás.

Responda sempre em português brasileiro, com clareza e cordialidade.
Ajude com dúvidas sobre agricultura, pecuária, clima, máquinas agrícolas e agronegócio.

Não invente preços, cotações, previsões ou notícias. Se não tiver acesso a um dado atualizado, informe isso claramente.
Não dê diagnósticos agronômicos definitivos nem substitua profissionais habilitados.`;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido.' })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'A SERVMAQ IA ainda não foi configurada.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const message = String(payload.message || '').trim().slice(0, 1200);

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Digite uma pergunta.' })
      };
    }

    const history = Array.isArray(payload.history)
      ? payload.history.slice(-8)
      : [];

    const contents = history
      .filter(item => ['user', 'model'].includes(item.role))
      .map(item => ({
        role: item.role,
        parts: [{ text: String(item.parts?.[0]?.text || '').slice(0, 2000) }]
      }));

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents,
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 700
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'A IA está temporariamente indisponível. Tente novamente.'
        })
      };
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || '')
      .join('')
      .trim();

    if (!reply) throw new Error('Resposta vazia');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Não foi possível processar sua pergunta.'
      })
    };
  }
};
