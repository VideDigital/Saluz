# SALUZ — Mercado Pago Checkout Pro (Orders API)

Estado atual: base técnica em homologação. Pagamentos reais continuam desativados.

## Custos e propriedade
A API/Checkout Pro padrão não exige mensalidade de integração por si só. O Mercado Pago cobra tarifas por pagamentos processados, conforme método e prazo de recebimento, definidos nas condições da conta da Anny. Custos de desenvolvimento e hospedagem são separados.

A aplicação, conta que recebe as vendas e segredos precisam pertencer à Anny.

Referências:
https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/create-order
https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/notifications

## Implementado sem ativar checkout
- Migração privada de campos de pagamento no banco de homologação.
- Backend preparado para criar Orders com X-Idempotency-Key, valores em centavos e URL de checkout.
- Consulta do estado da order no Mercado Pago.
- Validador HMAC-SHA256 de webhooks, timestamp e comparação de assinatura.
- Indicador administrativo /api/admin/payment-integration, sempre declarando pagamentos bloqueados nesta fase.
- Testes com respostas simuladas; nenhuma cobrança real.

## Pendências obrigatórias antes de cobrar
- Reserva transacional atômica de estoque e liberação por expiração, cancelamento e reembolso.
- Frete e regras comerciais validadas pela cliente.
- Endpoint público de checkout com idempotência, preço buscado do servidor e token antiabuso.
- Webhook de pagamento autenticado, reconsulta da order na API e conciliação de valor, moeda, referência e recebedor. Retorno do navegador jamais prova pagamento.
- Processamento idempotente de status, cancelamento, reembolso e contestação.
- Chaves de teste e webhook da conta Mercado Pago da Anny, armazenados APENAS como secretos da Cloudflare. Nunca compartilhar pelo chat, repositório ou prints.
- Teste integral em homologação, aprovação comercial e técnica, backup e plano de monitoramento.
- Aplicar schema na produção apenas após validar o processo.
- Nunca habilitar pagamento apenas alterando flags de ambiente.

## Configuração
CHECKOUT_ENABLED: false
MP_CHECKOUT_ENABLED: false
MP_STOCK_RESERVATION_VERIFIED: false
MP_WEBHOOK_VERIFIED: false
MP_LIVE_APPROVED: false

A API está preparada, mas sem rota operacional de cobrança até existir o fluxo de estoque e conciliação seguro.

## Desvinculação da VIDE
Credenciais, titularidade do Mercado Pago, GitHub, Cloudflare, Supabase e domínio devem ficar com a Anny. Revogar o acesso da VIDE somente depois de uma publicação totalmente funcional usando credenciais e permissões controladas pela cliente.


## Verificação da credencial de teste — 29/10/2026

A aplicação de teste do desenvolvedor (VIDE), **não pertencente à Anny**, está configurada apenas no ambiente **Preview** do Pages `saluz-loja`. A variável `MP_ACCESS_TOKEN` é um **Secret** criptografado; não há token no ambiente de produção. A flag `CHECKOUT_ENABLED` continua `false` nos dois ambientes.

Verificar a conexão **após autenticar-se no painel de homologação**:

```
GET https://homologacao.saluz-admin.pages.dev/api/admin/payment-integration?probe=1
```

A mesma rota da área administrativa usa a autorização atual do Supabase (validada no backend antes da ação). A consulta **não está disponível** na produção e não cria pedido nem pagamento. A Function chama somente `GET https://api.mercadopago.com/v1/payment_methods` com `Authorization: Bearer <secret>` no servidor. Nunca incluir o segredo no navegador, GitHub, prints ou logs.

Resposta mínima: `connection_status` pode ser `verified_read_only`, `rejected`, `not_configured`, `blocked`, `unavailable` ou `unexpected_response`; `checkout_enabled:false` é invariável. Nenhum token, e-mail, identificação da conta ou meio de pagamento é retornado.

**Importante:** `verified_read_only` só significa que a API aceitou a credencial para consultar métodos de pagamento; não confirma funcionamento da API Orders, da reserva de estoque, dos webhooks, nem autorização para pagamentos reais. Executar teste real de compra simulada somente após revisar as dependências obrigatórias do checkout.

Referência: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/payment-methods/get
