# Portal Servmaq — notícias automáticas

Esta versão adiciona uma função serverless do Netlify para consultar notícias do Canal Rural e Notícias Agrícolas. A página mostra título, resumo quando disponível, fonte, data e link para a matéria original.

## Importante sobre a publicação

Como o projeto agora usa uma função serverless (`netlify/functions/news.js`), não basta publicar somente o `index.html`. A função também precisa ser enviada ao Netlify.

A forma mais simples e repetível é conectar o projeto a um repositório GitHub no Netlify. Outra opção é publicar pelo Netlify CLI, que envia os arquivos estáticos e as funções. O ZIP pode ser extraído normalmente, mas o deploy manual por arrastar apenas a pasta de arquivos estáticos não garante a publicação da função.

O arquivo `netlify.toml` já informa ao Netlify onde estão a pasta pública e a função.

## Funcionamento

- Consulta RSS do Canal Rural e Notícias Agrícolas.
- Cache no servidor por 5 minutos.
- Atualização automática no navegador a cada 10 minutos.
- Se uma das fontes falhar, tenta exibir os resultados da outra.
- As notícias abrem no site original da fonte.

Esta etapa não integra cotações de mercado nem a SERVMAQ IA.


## Etapa de cotações — primeira integração

- O dólar comercial exibe a cotação PTAX de venda do Banco Central do Brasil.
- A consulta ocorre por função serverless do Netlify, com cache de 15 minutos e nova tentativa no navegador a cada 30 minutos.
- A PTAX é uma referência oficial diária, não uma cotação intradiária em tempo real.
- Ibovespa e indicadores agropecuários aparecem como "A integrar" até definirmos uma fonte com autorização adequada para redistribuição comercial.

### Por que as outras cotações ainda não exibem números?
- A B3 informa que seus dados são protegidos por termos de uso e que as APIs são voltadas a clientes B2B; precisamos escolher um fornecedor/licença para o Ibovespa.
- O CEPEA publica indicadores e disponibiliza serviços de API; a licença de uso precisa ser conferida para o uso comercial do Portal Servmaq.
- Não serão usados valores inventados, raspagem não autorizada ou cotações sem praça/unidade identificadas.


## Etapa CONAB — consulta pública

Os cartões de soja, milho, algodão e boi gordo agora direcionam para a consulta pública oficial de Preços de Mercado da CONAB. A CONAB informa que sua base reúne mais de 20 mil registros e pesquisas de mais de 112/130 produtos em todas as UFs. O portal não copia nem inventa valores enquanto a forma de acesso automatizado e os termos de reutilização não estiverem confirmados.

Fonte oficial: https://consultaprecosdemercado.conab.gov.br/
Página institucional: https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/precos-agropecuarios/precos-agropecuarios


## SERVMAQ IA — protótipo de integração gratuita

- Interface de chat integrada ao layout do portal.
- Backend Netlify Function em `netlify/functions/servmaq-ai.js`.
- Modelo inicial: `gemini-2.5-flash-lite`, que possui nível gratuito sujeito a limites e disponibilidade.
- A chave nunca deve ser colocada no HTML. Configure `GEMINI_API_KEY` nas variáveis de ambiente do Netlify.
- A API gratuita do Gemini pode usar o conteúdo enviado para melhorar os produtos do Google; não envie dados pessoais, sigilosos ou informações comerciais confidenciais.
- O nível gratuito tem limites de requisições que podem mudar. Não é uma garantia de disponibilidade para tráfego público alto.
- Antes de publicar, adicionar proteção contra abuso/rate limiting mais forte e revisar a política de privacidade do portal.

### Ativação
1. Criar uma chave no Google AI Studio.
2. No Netlify, adicionar a variável de ambiente `GEMINI_API_KEY` com a chave.
3. Publicar a pasta do projeto com as Netlify Functions.
4. Testar o chat publicado e acompanhar os limites da conta Google AI Studio.

A interface pode ser testada visualmente localmente, mas a IA só responde depois da configuração da chave e publicação da função.


## Preparação para publicação no Netlify

Este pacote contém:
- `index.html` — portal e interface do chatbot;
- `netlify/functions/news.js` — busca das notícias;
- `netlify/functions/market.js` — consulta PTAX do Banco Central;
- `netlify/functions/servmaq-ai.js` — endpoint privado do chatbot;
- `netlify.toml` — configuração de publicação e diretório das funções.

**Importante:** a chave Gemini não está incluída no ZIP. Ela deve ser cadastrada no Netlify como variável de ambiente `GEMINI_API_KEY`.

Para publicar todas as funções, use integração Git ou Netlify CLI. A publicação manual de arquivos estáticos por arrastar/soltar pode não publicar funções; o Netlify documenta a publicação das funções por CLI/API ou deploy conectado a Git.
