# SALUZ — Migração Cloudflare | Fase 1

Status: **arquitetura e módulos isolados preparados**. NÃO é uma migração concluída.
O site de produção ainda usa Supabase. Não alterar DNS, chaves, dados nem ativar checkout.

## Auditoria de origem (21/10/2026)
- Repositório: \`VideDigital/Saluz\`, público, main (produção) e homologacao (staging).
- Conta Supabase SALUZ: produção \`msulvbwahdiztxnlohdv\`, homologação \`twgaspjziugekxlrkgru\`, ambos ativos no momento da consulta.
- Serviços PostgreSQL usados pelo backend: \`saluz_products\`, \`saluz_orders\`, \`saluz_events\`, \`saluz_site_content\`, \`saluz_admins\`, \`saluz_login_limits\`. Auth Supabase com sessão e login por senha; Supabase Storage bucket \`saluz-produtos\`; agregações RPC \`saluz_analytics\` e \`saluz_check_login_limit\`.
- O checkout permanece bloqueado, inclusive na homologação, e Mercado Pago requer desenvolvimento adicional. Existe um mock de cotação sem pagamento no staging.
- Em homologação no momento da auditoria: 0 produtos, 0 pedidos, 0 eventos, 1 registro de conteúdo e 1 registro no limitador de login. Não exportar logs de login ou credenciais.
- A conta Cloudflare é a **da SALUZ**, não reutilizar a da VIDE. Os recursos D1 e R2 ainda precisam ser criados/verificados nessa conta.

## Alternativa sem cartão — validada em 21/10/2026

**Preferência atual:** Cloudflare D1 + Workers KV no plano Free; R2 apenas opcional.
A documentação oficial informa que D1 e KV fazem parte do Workers Free.
- D1: limite gratuito de 5 milhões de linhas lidas/dia, 100 mil escritas/dia e 5 GB por conta (com limite por banco).
- Workers KV: limite gratuito de 1 GB por conta (compartilhado pelos namespaces), 100 mil leituras/dia e 1.000 gravações/dia.
- KV aceita valores de até 25 MiB, mas a SALUZ deverá comprimir imagens para aproximadamente 200–500 KB e limitar arquivos grandes.
- KV possui consistência eventual. Usar nomes imutáveis por hash e cache, em vez de sobrescrever a mesma chave; aguardar propagação após upload.
- R2 inclui cota mensal gratuita maior, mas requer assinatura via fluxo de checkout. Não cadastrar cartão, PayPal nem qualquer método de pagamento sem permissão da cliente.
- Reservar DEV/STAGING em namespaces distintos; 1 GB é da **conta inteira**, não de cada ambiente.
- Implementar no painel indicadores reais de bytes usados, quantidade de arquivos, 70/85/95% de alertas, revisão manual e cópias externas. Bloquear uploads quando ultrapassar a margem segura.
- Essa alteração é de **arquitetura planejada**, não migração concluída: não houve ativação de serviços novos e a loja não usa KV.
- Antes de publicar em produção: comparar custo real, foto por foto, testes de recuperação, sessão administrativa, reserva de estoque e status de pagamento.

Referências:
https://developers.cloudflare.com/kv/platform/pricing/
https://developers.cloudflare.com/kv/platform/limits/
https://developers.cloudflare.com/r2/get-started/
https://developers.cloudflare.com/billing/get-started/create-billing-profile/

## Arquitetura alvo
| Área | Origem | Destino planejado |
| --- | --- | --- |
| Site e painel | Pages | Pages SALUZ, sem mudança de domínio |
| Produtos, variações, pedidos, conteúdo, relatórios | Supabase PostgreSQL | D1 por ambiente |
| Fotos e banners | Supabase Storage | R2 por ambiente |
| Admin, sessões e rate limiting | Supabase Auth + RPC | Implementar identidade e sessões seguras específicas, sem migrar senhas |
| API e pagamentos | Pages Functions + Supabase + MP ainda inativo | Pages Functions com binding D1/R2, MP testado e desativado inicialmente |

Recursos planejados, ainda NÃO confirmados como criados:
- DEV: \`saluz-dev-db\`, \`saluz-dev-media\`
- STAGING: \`saluz-staging-db\`, \`saluz-staging-media\`
- PROD (criar SOMENTE após aprovação): \`saluz-production-db\`, \`saluz-production-media\`

## Migrações
- \`cloudflare/d1/0001_initial.sql\` replica as estruturas conhecidas em SQLite.
- \`cloudflare/d1/dev-seed.sql\` contém somente dois produtos fictícios e inativos.
- Não executar seed em STAGING nem PROD.
- SQLite guarda JSON em TEXT validado por \`json_valid\`, e campos boolean em INTEGER 0/1.
- D1 exige \`.prepare(...).bind(...)\`; não concatenar strings do usuário em consultas.
- A função RPC de relatórios exige uma implementação SQL/JS própria no D1; não há compatibilidade direta com PostgreSQL.
- Não há SQL de sincronização em tempo real nem corte para D1 nesta fase.
- Ao importar dados reais, verificar quantitativos, chaves, JSON, preços em centavos, variações, dados sensíveis e timestamps. Dados pessoais de pedidos devem ficar restritos e nunca em logs.

## Auth e segurança
A migração de Supabase Auth NÃO significa copiar senhas ou hashes. Antes de habilitar:
1. Definir provedor de identidade controlado pela cliente e validar login seguro para Anny.
2. Usar sessões HttpOnly/Secure/SameSite, autorização no servidor, CSRF e rate limit persistente D1.
3. Conferir isolamento entre as duas bases; dados de cliente apenas na base de produção.
4. Auditar logs, webhook Mercado Pago, idempotência, reserva atômica e falhas.

## Arquivos e exclusão
- \`cloudflare/storage/r2-media.mjs\`: valida tipo/tamanho e assinatura binária, gera nomes aleatórios/segregados por ambiente.
- O banco referencia os objetos físicos; não apagar objetos vinculados, incluindo histórico.
- Exclusão: solicitar explicitamente, registrar auditoria, mover logicamente para \`trash\`, aguardar recuperação (mínimo 30 dias), conferir vínculos NOVAMENTE e só então excluir fisicamente mediante operação administrativa deliberada.
- **Não há remoção automática em execução** nesta fase.
- A seção Armazenamento será ativada quando D1/R2 estiverem conectados de verdade. Não mostrar estatísticas inventadas.

## Custos, limitações e segurança operacional
Workers Free D1 (dados publicados em 2026): ~5 milhões de linhas lidas/dia, 100 mil linhas escritas/dia; 500 MB por banco, 5 GB por conta e 10 bancos gratuitos. Ao exceder as cotas diárias gratuitas, as consultas D1 podem falhar, incluindo pedidos.
R2 Standard: cota gratuita mensal de 10 GB-mês, 1 milhão operações Classe A, 10 milhões Classe B; excedentes cobrados conforme faturamento. R2 pode exigir ativação de faturamento. Não criar R2 com custo potencial sem confirmar a preferência da cliente.
Referências oficiais: https://developers.cloudflare.com/d1/platform/pricing/ ; https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/r2/pricing/
Alertas 70%/85%/95% só deverão ser apresentados com uma **cota configurada** e dados reais ou marcados como estimativa.

## Validação e rollback
- Testar migrations em SQLite local e depois D1 DEV, D1 STAGING;
- API catálogo, painel, conteúdo, relatórios, upload, login, auditoria de exclusões, taxa de erro;
- Simular queda de banco e confirmar resposta de erro, nunca pedido concluído;
- Validar backup/restore D1 e cópia independente do R2;
- Teste final com usuário da cliente e Mercado Pago sandbox;
- Manter Supabase intacto e rollback documentado até aceite final da Anny e VIDE.

## DESVINCULAÇÃO DA VIDE
Revisar ao final GitHub, secrets, Cloudflare, Supabase, tokens, convites, links e permissões, quando a Anny já tiver controle operacional. **Não revogar enquanto houver desenvolvimento em andamento**. Checklist de entrega: https://github.com/VideDigital/Saluz/issues/13
