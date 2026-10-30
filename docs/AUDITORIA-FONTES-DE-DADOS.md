# SALUZ — Auditoria das fontes de dados (homologação)
**Data:** 30/10/2026  
**Escopo:** somente `homologacao`. Nenhuma troca de banco ou alteração no domínio de produção. Checkout desativado.

## Diagnóstico
O problema dos zeros no Início tinha causa comprovada no código: `saluz-professional.js` consultava `/api/admin/store-health` (Supabase) enquanto a aba Produtos e a vitrine de homologação já usavam D1. Eram indicadores de um catálogo diferente, não ausência comprovada de produtos.

## Mapeamento após esta etapa

| Seção/fluxo | Fonte em homologação | Situação |
|---|---|---|
| Vitrine de produtos e detalhes | D1 `saluz_products` via `/api/products?source=d1` | Já existente; leitura pública apenas staging |
| Cadastro, edição e estoque em Produtos | D1 `saluz_products` via `/api/migration-admin/products` | Já existente, protegido por admin legado |
| **Início — contagem de produtos, ativos, alertas de estoque** | **D1 `saluz_products` via `/api/migration-admin/store-health`** | **Corrigido nesta etapa** |
| Banners exibidos no resumo D1 | D1 `saluz_site_content.published` | Apenas conteúdo publicado D1; o editor ainda é legado |
| Campanhas e ofertas | Integração anterior Supabase | P0: migrar conteúdo com contrato compatível e fluxo de publicação |
| Aparência e links | Integração anterior Supabase | P0/P1: migrar rascunho, versão e publicação; preservar aprovação |
| Pedidos e clientes | Integração anterior Supabase | P0: NÃO ligar D1 até autenticação, frete, reservas e reconciliação aprovados |
| Resultados/analytics | Integração anterior Supabase | P2: análise separada de consentimento/eventos |
| Simulador de taxas | Local no navegador | Sem movimentação financeira; permanece igual |
| Teste Mercado Pago | Secret Preview + GET read-only no backend | Verificado pelo usuário; não valida checkout |

## Critérios de segurança desta correção
1. O endpoint D1 de resumo somente responde no hostname `homologacao.saluz-loja.pages.dev`, via proxy do painel `homologacao.saluz-admin.pages.dev` e após a autenticação administrativa existente.
2. Nunca faz fallback silencioso para Supabase. Falha do D1 aparece como falha, e não como zero enganoso.
3. Apenas consultas SELECT: sem alteração de produtos, estoque, preço, conteúdo ou pedido.
4. Limite de até 2.000 produtos para resumo; sinaliza `truncated` e mantém comportamento anterior de estoque baixo (1 a 5), sem estoque (0) e somente visíveis.
5. A vitrine pública continua usando suas rotas aprovadas; checkout não muda.
6. Indicador de banners D1 é rotulado como D1 e não direciona para o editor legado como se ele atualizasse a mesma fonte.

## Próxima fase — pendências P0
- **Conteúdo e campanhas:** mapear contrato e regras `site-content`, validar rascunho, revisão concorrente, publicação D1 e migração controlada de dados existentes, sem substituir o editor antes da homologação E2E.
- **Pedidos:** resolver origem, capacidade de estoque, frete e status pago com webhook assinado e reconciliação; não abrir POST de pagamentos antes de segurança.
- **Dados reais:** obter aprovação da Anny, backup e inventário/itens da loja; separar os produtos fictícios de homologação.
- **Validação manual:** entrar em homologação, carregar Produtos e Início e conferir que os totais batem, além de erros de sessão e comportamento mobile.

**Produção:** `usesaluz.com.br` e `admin.usesaluz.com.br` permanecem no sistema anterior até corte aprovado e com plano de rollback.
