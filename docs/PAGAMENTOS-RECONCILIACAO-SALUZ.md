# SALUZ — Reconciliação interna de pedidos (STAGING)

> Implementação interna **não conectada a endpoint público**. Não é um webhook em produção, não faz cobranças, não cria pedidos e não inicia checkout. Estágio de preparação para integração com Mercado Pago.

## O que existe
`cloudflare/d1/payment-reconciliation.mjs` define política de conciliação após o backend recuperar uma ordem no Mercado Pago via GET autenticado. A função exige:
- identificação do pedido local, da order e do vendedor recebedor;
- total em centavos (subtotal + frete), moeda BRL;
- estado local elegível e pelo menos uma reserva de estoque ainda ativa;
- estado `processed / accredited` para aprovação. Outros estados são mantidos em espera, revisão manual ou cancelamento seguro.

A operação de escrita, quando aprovada, usa `D1.batch` + `UPDATE ... WHERE` condicional (CAS). Um cancelamento/falha terminal devolve reservas por triggers existentes apenas quando o estado do pedido foi movido para cancelado. Notificações repetidas são ignoradas.

## Restrições e trabalho restante antes de integrar
1. **Não expor** `reconcilePaymentD1` em rota pública nem confiar nos parâmetros enviados por navegador/webhook. A recuperação GET autenticada e o parser/validador específico do payload Mercado Pago estão pendentes.
2. Confirmar modelo real de resposta Mercado Pago, moeda, recebedor, total e assinatura de notificações; não presumir que o formato de teste é o da API externa.
3. Implementar persistência idempotente de eventos, fila de revisão para situações tardias e envio de alertas, webhook verificado, autorização e proteção antirreplay.
4. Criar uma política segura para **expiração**: consultar o provedor e cancelar efetivamente o pagamento antes de devolver estoque. Não liberar reserva automaticamente apenas por relógio.
5. Tratar reembolso/estorno/contestação segundo status de despacho e política comercial. Não restocar automaticamente compra enviada.
6. Integrar frete real Correios (pendência Anny: issue #63), credenciais de titularidade Anny e rota de criação de Orders idempotente.
7. Executar testes transacionais com D1 de laboratório e testes E2E Mercado Pago sandbox antes de liberar qualquer checkout.

**Checkout bloqueado**. Não modificar `CHECKOUT_ENABLED=false`. Não executar esse módulo em produção. Issue #60.
