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
