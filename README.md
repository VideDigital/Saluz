# SALUZ — Loja virtual personalizada

**Status: implementação em andamento / NÃO habilitada para receber pagamentos ou cadastros reais.**

Repositório da Agência Vide para o projeto SALUZ, domínio previsto: \`usesaluz.com.br\`. A referência de navegação é a Vivara, sem copiar design ou conteúdo. Tipografia café \`#51443B\`.

## Arquivos

| Arquivo | Função |
|---|---|
| \`index.html\`, \`styles.css\`, \`script.js\` | Home/conceito original |
| \`loja.html\`, \`loja.css\`, \`loja.js\` | Catálogo dinâmico, cores/tamanhos, sacola e formulário de dados do pedido |
| \`admin.html\`, \`admin.css\`, \`admin.js\` | Acesso administrativo, catálogo, pedidos, gráficos de visitas e cliques |
| \`analytics-home.js\` | Métricas agregadas com consentimento na home |
| \`privacidade.html\` | Texto preliminar de privacidade; validar antes da publicação |
| \`functions/api/[[path]].js\` | API Cloudflare Pages Functions com credenciais secretas no backend |
| \`supabase/schema.sql\` | Tabelas com RLS restritiva, indexação e agregação de analytics |
| \`docs/CONFIGURACAO.md\` | Procedimento técnico de implantação |

## Estado funcional e restrições

- Nenhum produto, foto, preço, estoque, CPF ou endereço fictício é publicado no banco.
- A sacola persiste somente as opções de produto no navegador; os dados pessoais **não** são guardados no navegador.
- Cadastro de pedidos permanece **desligado por padrão**: exige a variável de servidor \`CHECKOUT_ENABLED=true\` após avaliação de privacidade e testes.
- Pedido cadastrado é **solicitação de compra**, não pagamento confirmado. Frete, Pix, crédito e débito ainda não estão integrados.
- O painel só retorna dados a usuários Supabase Auth presentes na tabela \`saluz_admins\`.
- Relatórios usam apenas visitas e cliques consentidos, não contagem exata de toda a audiência.
- A página no GitHub Pages atual **não executa Cloudflare Pages Functions**. APIs, catálogo remoto, login e envio de formulários não funcionam ali; aguarde deploy na Cloudflare correta.
- No Cloudflare Free, configurar proteções contra abuso, backup e monitoramento antes de aceitar pedidos reais.

Não adicionar senhas, tokens, chaves Mercado Pago ou dados reais de clientes ao GitHub.

## Prioridades

1. Aprovar o escopo da loja personalizada e regularizar os termos com a cliente.
2. Separar contas **da SALUZ** Cloudflare + Supabase; não reutilizar os bancos da Vide.
3. Configurar SQL e secrets; criar administradora no Supabase Auth e autorizar usuário.
4. Testar armazenamento de solicitação de pedido e relatório com dados de teste, sem pagamentos.
5. Revisar frete, política de privacidade, troca/devolução, disponibilidade, consentimento e segurança.
6. Escolher futuro provedor de pagamento; integrar e testar em sandbox.
7. Só então configurar domínio oficial, indexação e ativação comercial.

**Contato informado:** anny.csalustiano@gmail.com; WhatsApp e Instagram ainda aguardam definição.

---

## CHECK-UP OPERACIONAL — 29/10/2026 (Agência VIDE)

> Este diagnóstico registra evidências de repositório, PRs, GitHub Actions e leitura autenticada da conta Cloudflare SALUZ em 29/10/2026. Não equivale a homologação funcional completa no navegador, autorização da cliente nem liberação de cobrança. As informações históricas acima podem estar desatualizadas; usar esta seção como referência de acompanhamento.

### Referências e ambientes
- Repositório: https://github.com/VideDigital/Saluz (público). Branch `main`: produção; `homologacao`: desenvolvimento/validação da migração. **As branches divergiram**; não fazer merge geral sem revisão de cada mudança.
- Cloudflare conectada da cliente: dois Pages `saluz-loja` (domínio associado `usesaluz.com.br`) e `saluz-admin` (domínio associado `admin.usesaluz.com.br`). A consulta API confirma os projetos e domínios cadastrados, **não** substitui teste de acesso público, DNS, SSL e funcionamento das Functions.
- Cloudflare D1: `saluz-dev-db` e `saluz-staging-db` existentes; KV: `saluz-dev-media-kv` e `saluz-staging-media-kv` existentes. **Não foi confirmado banco D1 de produção nem migração de dados reais.**
- Últimas prévias listadas nos dois projetos Pages estavam marcadas como `success` pela Cloudflare; isso confirma registro de deploy, não as jornadas de compra/painel.
- Fluxo administrativo atual continua dependente do Supabase Auth; não desativar Supabase até substituição segura, migração validada e aceite.
- Checklist de desvinculação final da VIDE: https://github.com/VideDigital/Saluz/issues/13 — executar somente após entrega final e teste de autonomia da cliente.

### Implementações constatadas no código/PRs (não confundir com homologação de produção)
- Páginas da loja, home, coleções, produto, favoritos, sacola, campanhas e painel administrativo existem no repositório.
- Integração de catálogo e conteúdo D1/KV em homologação: PRs #15–#25, com correções de publicação de produtos, coleções, alteração de timestamps e origem de catálogo. Evidência: código e CI; validar jornada real no staging.
- Base Mercado Pago Orders API e checkout de visualização em homologação: PRs #11 e #14; sem autorização para pagamentos.
- PR #28: runtime Cloudflare retornou `AUTH_KDF_CAPABILITY={supported:false,reason:'not_supported'}` para PBKDF2 configurado; setup de senha D1 foi bloqueado com segurança. **Manter login atual, não reduzir força do hash.** Avaliar autenticação compatível (ex.: Cloudflare Access/identidade da cliente), sessões e autorização servidor.
- PR #29 (29/10): cotação via D1 somente na homologação e `0004_stock_reservations.sql` com triggers SQLite/auxiliar transacional contra estoque negativo, preço desatualizado e rollback multi-item. **Consulta D1 de 29/10 confirmou tabela de reservas e os quatro gatilhos tanto em DEV quanto em STAGING; ainda faltam testes de transações reais/concorrência. `reserveOrderD1` não foi exposta em API pública.** Sem frete confirmado e sem pagamentos.
- GitHub Actions de migração do PR #29 passou no último run observado, após uma tentativa falha; testes automatizados **não** comprovam funcionamento real das Functions, autenticação, pedidos e arquivos no ambiente da Anny.

### Checklist priorizado

#### P0 — Bloqueios técnicos/comerciais
- [ ] Executar e documentar smoke test autenticado de site e painel **em homologação**, incluindo catálogo D1, nova edição de produto, fotos KV, coleções e acesso anônimo negado nas APIs privadas.
- [ ] Resolver estratégia definitiva de autenticação administrativa na migração D1 sem downgrade criptográfico; testar sessão, recuperação e revogação. Supabase Auth deve permanecer ativo até corte aprovado.
- [x] Confirmar a existência da tabela e dos quatro triggers de `0004_stock_reservations.sql` em DEV/STAGING (consulta D1 29/10).
- [ ] Validar com backup e rollback documentados os fluxos de reserva, oversell, reversão, concorrência e idempotência na Cloudflare real.
- [ ] Definir e validar regras reais de frete e entrega; sem frete verificado no servidor não liberar pedido ou pagamento.
- [ ] Completar integração de pagamentos em ambiente de teste: credenciais próprias da cliente como secrets, webhook autenticado, conciliação de valor/recebedor, idempotência, reserva, expiração, cancelamento e reembolso. **Manter CHECKOUT_ENABLED=false e flags Mercado Pago desativadas.**
- [ ] Testar backup e restauração de banco e imagens; definir alertas, limites de upload e monitoramento.
- [ ] Validar termos, privacidade/LGPD, devolução, prazos e fluxo comercial com Anny, antes de coletar dados pessoais e abrir vendas.

#### P1 — Experiência, autonomia e lançamento
- [ ] Fazer teste E2E em desktop/mobile: home → categoria → produto → variação → sacola → cotação; incluindo indisponibilidade e estoque.
- [ ] Testar painel da Anny: login, adicionar/editar/ocultar produto, upload e exclusão segura de mídia, atualizar banners e conteúdo sem a VIDE, consultar relatórios.
- [ ] Confirmar catálogo e materiais reais aprovados: fotos, preços, estoques, tamanhos/cores, identidade, textos e prioridades de categorias.
- [ ] Revisar e validar integração de WhatsApp, política de orçamento, links, CTAs e processo de atendimento.
- [ ] Verificar domínio público e subdomínio admin, DNS/HTTPS, robots, sitemap, Search Console e SEO — **somente liberar indexação/pagamento quando a operação estiver aprovada**.
- [ ] Revisar tracking de visitas, buscas, cliques, carrinho, intenção de compra e compras confirmadas; não tratar clique como venda.
- [ ] Revisar qual branch/commit cada Pages deploy serve; exigir testes de homologação antes de alterações de produção.

#### P2 — Entrega e manutenção
- [ ] Atualizar documentação de arquitetura e retirar inconsistências legadas (README original referencia Supabase e projeto ainda não migrado); preservar histórico.
- [ ] Treinar Anny e conferir autonomia sem intervenção da VIDE.
- [ ] Planejar transferência de repositório, pipelines, secrets e revogação completa de acessos VIDE somente após aceite final (issue #13).
- [ ] Monitorar erros, estoque, mídia, cotas Cloudflare e pedidos após o lançamento.

### Status comercial e decisões
- **Não liberado:** pagamentos, pedidos reais, migração final de dados e desvinculação de acessos.
- **Confirmado por consulta:** Pages da cliente, domínios associados a Pages, D1/KV de DEV/STAGING, PRs e testes registrados.
- **Implementado mas não validado ponta a ponta:** fluxo D1 para painel/catálogo, cotação/reservas, upload KV e integração de pagamentos.
- **Próximo marco:** reproduzir a jornada completa em homologação com produto de teste, sem dados pessoais nem cobrança. Resolver o método de autenticação D1 e validar o comportamento transacional de reservas antes de planejar corte de backend.

### Referências principais
- https://github.com/VideDigital/Saluz/pull/29
- https://github.com/VideDigital/Saluz/pull/28
- https://github.com/VideDigital/Saluz/pull/4
- https://github.com/VideDigital/Saluz/issues/13
- `cloudflare/README-migration.md` (branch `homologacao`)
- `docs/REVISAO-PRE-LANCAMENTO.md`
- `docs/MERCADO-PAGO-INTEGRACAO.md`

### Histórico do check-up
- 29/10/2026 — Auditoria de código, PRs, Actions e recursos Cloudflare; atualizado estado de migração, segurança, checkout e próximas prioridades. Nenhum pagamento, segredo, banco ou deploy foi alterado por esta atualização documental.


### Atualização de homologação — 29/10/2026 (auditoria complementar)

**Evidência direta na Cloudflare da SALUZ:**
- Loja preview: `homologacao.saluz-loja.pages.dev`; painel preview: `homologacao.saluz-admin.pages.dev`. Deploys da branch `homologacao` em 29/10 com status Cloudflare `success`.
- Loja, ambiente preview: bindings `SALUZ_D1_PREVIEW` e `SALUZ_MEDIA_PREVIEW`; produção sem esses dois bindings. O proxy do painel preview aponta para `https://homologacao.saluz-loja.pages.dev`; o de produção para `https://usesaluz.com.br`.
- Flag `CHECKOUT_ENABLED=false` confirmada nas configurações preview e produção da loja; não alterada.
- DEV: **2 produtos, 0 ativos, 0 pedidos, 0 metadados de mídia e 0 reservas**.
- STAGING: **7 produtos, 7 ativos, 0 pedidos, 2 metadados de mídia, 0 reservas**.
- No STAGING, os sete produtos ativos têm pelo menos uma variação, foto principal HTTPS e preço positivo (checagem agregada no D1). **Isso não valida download/renderização real de cada foto, qualidade visual nem veracidade comercial dos dados.**
- Tabela `saluz_stock_reservations` e triggers `saluz_reservation_validate`, `saluz_reservation_deduct`, `saluz_reservation_release_guard` e `saluz_reservation_release` presentes em DEV e STAGING. **Não executar `0004_stock_reservations.sql` novamente por supor que esteja pendente.**

**Smoke HTTP publicado (GitHub Actions, 29/10):**
- PR de testes em rascunho: https://github.com/VideDigital/Saluz/pull/30 (branch `test/saluz-staging-smoke-20261029`, destino `homologacao`).
- Run concluído com sucesso: https://github.com/VideDigital/Saluz/actions/runs/40923371359.
- **12 verificações HTTP passaram**: HTML da loja e painel (200), status (200 e checkout bloqueado), catálogo D1 (200), vitrine Home (200), conteúdo D1 (200), filtro inválido (400), produto inválido (404), três verificações de API administrativa sem sessão (401), mídia inválida (404). As checagens HTTP são exclusivamente GET, sem dados pessoais ou escrita.
- Testes locais/CI de sintaxe, adaptadores, reservas SQLite e seed também passaram no mesmo run.
- **Limite:** smoke acessa o deploy já publicado, não executa login real, não valida interação visual, publicação/edição pelo painel, uploads efetivos nem reserva em Cloudflare sob concorrência. O PR não foi mesclado e nenhum redeploy foi feito por ele.

**Próximas ações ainda obrigatórias (P0):**
1. Testar login real autorizado da Anny, edição e criação de produto **oculto** em homologação, publicação/ocultação, foto compactada KV e leitura no navegador, com possibilidade de rollback; não usar dados da produção.
2. Confirmar autorização e segurança da autenticação definitiva; a implementação D1 bloqueou PBKDF2 não suportado — não reduzir segurança criptográfica.
3. Testar reserva/soltura/concorrência no D1 com dados de teste e backup, sem expor API de pedido real.
4. Frete, Mercado Pago sandbox e webhook; manter checkout desabilitado até regras comerciais e aceite da cliente.

**Registro:** atualização documental da `main`, sem alterar banco, mídia, secrets, DNS ou pagamento.
