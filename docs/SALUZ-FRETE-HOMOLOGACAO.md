# SALUZ — Frete na homologação (etapa 1)

**Estado:** infraestrutura de cotação por faixa de CEP, somente homologação; entrega e tarifas **não aprovadas pela Anny**. Nenhum pedido, reserva, pagamento ou tarifa fictícia deve ser publicado.

## O que já existe
- `cloudflare/d1/0005_shipping_rules.sql`: regras de entrega **local com valor fixo por faixa de CEP**, inicialmente vazias e desativadas. É apenas uma modalidade técnica possível, não uma decisão comercial por Correios, transportadora ou entrega local.
- `cloudflare/d1/orders.mjs`: carrinho, preço e estoque calculados no servidor D1; quando autorizado, frete também é consultado no D1 e soma ao total. Nunca aceita `shipping_cents`/preço passados pelo navegador.
- `loja.js`: prévia mostra o frete e total consultados, quando disponíveis; **pagamento continua desativado**.
- `reserveOrderD1`: ainda é helper interno, não exposto por API. Recalcula frete usando o CEP do endereço do cliente e exige que o valor seja igual ao valor autorizado no banco. Não torna seguro nem libera o fluxo pago por si só.

## Passos controlados (somente STAGING)
1. Confirmar com Anny: CEP de origem da expedição, se haverá entrega local, retirada, Correios ou transportadora; regiões atendidas; embalagem/peso/dimensões e política de prazo/tarifas. Não inventar frete grátis, tarifas ou prazos.
2. Se a Anny **aprovar tabela fixa de entrega local**, executar a migração SQL `0005_shipping_rules.sql` apenas no D1 de STAGING, após backup. A migração **não cria tarifas**.
3. Cadastrar valores e faixas de CEP **confirmados e identificáveis**, com `enabled=0` inicialmente. Testar sobreposição e limites de CEP.
4. Para teste controlado, habilitar as regras aprovadas no banco e configurar a variável `SALUZ_SHIPPING_RULES_ENABLED=true` **somente na configuração PREVIEW** do Pages `saluz-loja`. Sem ambas as condições, o sistema não exibe valor.
5. Testar faixa válida, fora de cobertura, CEP inválido, CEP ausente, zero somente se explicitamente aprovado, valor adulterado e soma de preços.
6. Desligar a flag quando os testes terminarem até aprovação operacional. **Nunca habilitar `CHECKOUT_ENABLED` nem `MP_CHECKOUT_ENABLED` nesta etapa.**

## Contrato da API
`POST https://homologacao.saluz-loja.pages.dev/api/migration-orders/quote`
Entrada:
```json
{"items":[{"id":"UUID_DE_PRODUTO","color":"Cor","size":"Tamanho","quantity":1}],"postal_code":"00000000"}
```
Saída segura quando não aprovado: `shipping_cents:null`, `total_cents:null`, `payment_enabled:false`.
Saída quando houver faixa ativa aprovada: `shipping_status:"cotado"`, `shipping_cents` em centavos, `total_cents`, `shipping_label`, `estimated_days`, **sempre `payment_enabled:false`**.

## Limites
- Esta tabela não consulta preço oficial dos Correios nem transportadora e não serve para frete nacional sem regra comercial; caso Anny escolha transportadora/Correios, criar um adaptador para cálculo real no servidor, separado deste recurso.
- Ainda faltam endereço/retirada, venda, notificações, expiração, reserva, pagamentos e webhooks; o status do checkout segue **bloqueado**.
- D1 STAGING tem dados de testes; não replicar dados para produção.
- Não ativar nenhum recurso em produção nesta PR.

## Critérios de aceite
- `node --test tests/d1-orders.test.mjs tests/checkout-preview.test.mjs` passa.
- Homologação não exibe frete sem regra aprovada.
- API de produção não oferece esta cotação e pagamento segue bloqueado.
- Próxima etapa depende de definição de frete/retirada pela Anny.
