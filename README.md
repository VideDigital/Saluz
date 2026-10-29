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

### Homologação do painel — teste de edição confirmado em 29/10/2026
- Usuário autorizado acessou o painel de homologação e visualizou 7 produtos do catálogo D1; tela de edição do produto `produto de teste— Kit Autocuidado` exibiu campos, variação e prévia sem erro aparente.
- Foi alterada **apenas a descrição** do produto e gravada pelo painel; o usuário confirmou persistência após atualizar a página (F5).
- Consulta autenticada e **somente leitura** ao D1 de STAGING confirmou `description = "Teste de edição do produto no banco D1 da SALUZ."`, `revision = 3`. Portanto, **edição de descrição e leitura persistente estão homologadas para esse produto específico**.
- **Pendente:** restaurar a descrição de teste; verificar demais campos, upload/visualização de imagens, publicação/ocultação, concorrência e controle de acesso em testes autenticados separados.
- Não houve modificação de dados realizada diretamente pelo assistente; o teste de escrita foi efetuado pelo usuário no painel da homologação. Nenhum pagamento ou pedido foi liberado.
- Reversão confirmada em 29/10 via consulta D1 STAGING: descrição do Kit Autocuidado passou a `DESCRIÇÃO TESTE` (`revision=4`); a descrição de teste temporária foi removida. Mantido apenas em homologação.


### Homologação do upload KV — 29/10/2026
- No painel de homologação (`homologacao.saluz-admin.pages.dev`) o usuário escolheu uma imagem de teste e visualizou a prévia no formulário de produto. **Não houve confirmação de salvamento da alteração no produto.**
- Consulta autenticada **somente leitura** à conta Cloudflare da cliente confirmou novo registro `saluz_media` no D1 STAGING, com filename `Convite_City_2027_SP_Japan_1080x1080.png`, codificado em WebP com **104.936 bytes**, e chave correspondente encontrada no namespace `saluz-staging-media-kv`.
- Consulta D1 confirmou que o upload recém-feito **não está registrado como foto principal do Kit Autocuidado**. O teste deve ser cancelado sem salvar para preservar o produto.
- O arquivo de teste permanece fisicamente no KV e com metadados ativos no D1, mesmo sem associação ao produto. **Pendência P2:** planejar limpeza segura de mídia não vinculada, com revisão de referências e retenção; não excluir automaticamente.
- **Validado:** upload e gravação KV + metadados D1 + prévia no navegador. **Pendente:** associar foto a produto de teste com salvamento controlado, reabrir, carregar via API pública, conferir qualidade e variante, política de limpeza.
- Link de conversa de reunião fornecido pelo usuário: `https://chatgpt.com/share/6ae380fc-b228-83e9-98de-07897b34bc3b`; acesso ao conteúdo **não confirmado**. Não tratar ata anterior de 14/10 como conteúdo dessa reunião sem validação.

---

## ALINHAMENTO RECUPERADO — conversa de 28/10/2026 (pagamentos, painel e migração)

**Origem:** histórico textual da conversa de trabalho enviado pelo responsável VIDE em 29/10; referência compartilhada: https://chatgpt.com/share/6ae380fc-b228-83e9-98de-07897b34bc3b. Este histórico **não constitui ata de aprovação formal da Anny**. Diferenciar solicitações do responsável, propostas do assistente e implementação demonstrada no GitHub. Tarifas citadas na conversa são referências históricas, não taxas contratadas/verificadas na conta real.

### Decisões e solicitações de escopo

| Tema | Origem / decisão | Situação verificada em 29/10 |
| --- | --- | --- |
| Provedor principal | **Recomendação técnica VIDE:** Mercado Pago Checkout Pro direto no site próprio; não contratar Nuvemshop somente por pagamentos; não integrar simultaneamente três provedores | Adaptador inicial da Orders API presente em homologação; checkout e cobranças reais permanecem **desativados** |
| Pagamentos online | Planejamento: Pix + cartão de crédito na primeira fase; débito tradicional de múltiplos bancos exige validação específica antes de qualquer promessa | **Pendente** confirmar com Anny a cobertura obrigatória de débito, modalidades/operadoras, taxas da sua conta e testes do provedor. PicPay/PagBank são alternativas, não integrações aprovadas |
| Taxas | A conversa apresentou valores de referência e simulações; taxas variam conforme contrato, meio e prazo, além de custos de parcelamento | **Não fixar números na aplicação nem tratar valores da conversa como vigentes/contratados.** Validar tabela efetiva na conta da Anny |
| Simulador financeiro | **Solicitação expressa VIDE:** calculadora no painel com valor bruto, provedor, Pix/crédito/débito, parcelas, prazo, desconto e líquido; taxas editáveis | **Implementado no código** `admin.html` + `saluz-admin-extras.js` em `main` e `homologacao`: aba `Simular taxas`, perfis configuráveis, comparação, percentual e valor fixo. Perfis salvos **somente no navegador (localStorage)**; funcionamento real, UX mobile e persistência não homologados. Não sincroniza taxas do Mercado Pago |
| Profissionalização do painel | **Solicitação expressa VIDE:** melhorar layout, dashboard, dados de clientes, pedidos, financeiro e relatórios | Estruturas e abas existentes no código; **não homologado como gestão completa D1**. Clientes são derivados de pedidos; não afirmar CRM persistente separado, faturamento real ou métricas de vendas reais |
| Acesso administrativo | Histórico relatou erro intermitente e correção de confirmação de sessão; usuário posteriormente conseguiu acessar e editar no painel | Login legado continua no Supabase Auth; homologar sessões e planejar alternativa segura (Cloudflare Access com validação de autorização no backend). Não copiar senhas para D1 ou enfraquecer hash |
| Pedidos/estoque | Base transacional D1: cotação com preço consultado no servidor, reserva atômica por variação e rollback | Código e triggers de `0004_stock_reservations.sql` identificados; DEV/STAGING confirmados; **não liberado para checkout** e sem validação E2E de compra |
| Busca orgânica | **Escopo técnico já registrado antes desta conversa**, não explicitamente discutido no histórico colado: Search Console, sitemap, robots, SEO básico | Pendente de configuração/verificação; não informar como decisão tomada na conversa de 28/10 |

### Critérios para implementação de Mercado Pago
- Conta recebedora, titularidade, tokens e webhooks da **SALUZ/Anny**, exclusivamente em secrets Cloudflare (nunca no GitHub); não armazenar PAN/CVV.
- Checkout deve calcular preço e frete no servidor, confirmar estoque com reserva transacional e ser idempotente.
- Verificar autenticidade do webhook, reconsultar o pagamento no provedor e reconciliar valor, moeda, recebedor, pedido e status antes de marcar como pago.
- Não publicar débito para **qualquer** banco ou bandeira sem testes contratuais. Pix não é tecnicamente sinônimo de cartão de débito.
- Confirmar frete, política comercial, privacidade, reembolsos, validade da reserva, monitoramento, backup e aceite final.
- **Não alterar** `CHECKOUT_ENABLED=false`, flags de cobrança, credenciais ou endpoints comerciais com base apenas neste alinhamento.

### Ordem de execução ajustada
1. **P0 — Homologação:** terminar teste de edição, upload e associação de foto a produto de teste no D1/KV, com limpeza segura e reversão. Já houve validação parcial de login, catálogo, edição de descrição e upload com prévia; falta associar e verificar foto persistente.
2. **P0 — Segurança/infra:** autenticação administrativa definitiva, restauração/backup e reserva D1 testada em cenários reais de concorrência/rollback.
3. **P0 — Venda:** decidir com Anny débito obrigatório versus Pix, políticas de frete e prazo; integrar Mercado Pago sandbox e webhooks, depois testar jornada completa sem cobranças reais.
4. **P1 — Painel:** testar `Simular taxas`; melhorar dashboard, clientes/pedidos, relatórios e experiência mobile sem inventar receita histórica.
5. **P1 — Aquisição:** validar Search Console, sitemap, robots, metatags, eventos e indexação somente após liberação operacional.

**Registro documental:** 29/10/2026, alinhamento cruzado com arquivos das branches `main` e `homologacao`. Nenhum produto, banco, segredo, deploy ou pagamento modificado por esta documentação.


### Diagnóstico adicional — falha 401 no cadastro oculto (29/10/2026)
- Painel de homologação D1 retornou `Acesso administrativo necessário` durante `Salvar produto` (rascunho `teste 1`, sem foto, inativo).
- Query somente leitura ao STAGING confirmou **7 produtos**, nenhum `teste 1` cadastrado; a gravação não ocorreu.
- O erro é devolvido por `isAdmin` na API protegida, antes de validar o cadastro; ausência de imagem em rascunho oculto não é a causa do 401.
- A autenticação atual usa cookie HTTPOnly com JWT Supabase, expiração limitada ao prazo do token (máximo 3600 segundos) e sem refresh automático implementado no painel. **Possível expiração de sessão, ainda não comprovada**; outras hipóteses são cookie não encaminhado/persistido, revogação ou falha de autorização.
- **Mitigação em teste:** abrir uma nova aba do mesmo domínio de homologação para login, mantendo aberta a aba com formulário, depois repetir Salvar; caso falhe, coletar status de `GET /api/auth/me`, sem enviar credenciais.
- **Pendência P0:** UX de 401 com preservação do formulário, opção de reautenticar e proteção contra reenvio duplicado. **Issue:** https://github.com/VideDigital/Saluz/issues/31. Não desativar autorização para contornar o problema.

### Atualização P0 — sessão expirada no painel (29/10/2026)
- O usuário confirmou que abrir uma nova aba, autenticar novamente e voltar à aba anterior permitiu salvar o rascunho `teste 1`. Isso é **compatível com sessão expirada**, mas não prova unicamente a causa.
- Consulta ao D1 STAGING confirmou **8 produtos**, incluindo `teste 1` com preço **R$ 13,29**, `is_active=0` e **sem imagem**. O rascunho foi salvo e permanece oculto da vitrine.
- Correção de segurança/UX implementada e mesclada **somente em `homologacao`**, PR #32: https://github.com/VideDigital/Saluz/pull/32 ; merge `5b7fd7b68f07233788b5f2e76fd20e9e5fbd1c7f`.
- **Comportamento previsto após publicação:** em HTTP 401 ou `auth/me` não autorizado com painel aberto, encerrar sessão, solicitar ao servidor que limpe o cookie HttpOnly, fechar modal/painel e redirecionar visualmente ao formulário de login. Sem reenvio automático de POST. Verificar sessão quando a aba fica visível e periodicamente enquanto o painel está aberto. Erro de senha no login e falha temporária de rede não devem provocar logout indevido.
- O encerramento descarta informações não salvas do formulário; pedido de preservação de rascunho pode ser tratado separadamente sem enfraquecer segurança.
- GitHub Actions da correção **aprovado**: https://github.com/VideDigital/Saluz/actions/runs/40939796142 (171 testes Node e demais verificações no CI).
- **PUBLICAÇÃO CONCLUÍDA somente na homologação do painel (29/10):** workflow dedicado GitHub `SALUZ | Publicar painel na homologação (somente admin)`, criado no PR #33, efetuou deploy do proxy admin e arquivos públicos em `saluz-admin` branch `homologacao`. Cloudflare confirmou deployment `0cc1b0cb-7c06-4ffb-8da7-9b9a5575ea01`, status `success`, alias `https://homologacao.saluz-admin.pages.dev`. O workflow confirmou que HTML e JS novos estão disponíveis por HTTP. **Ainda falta testar o logout por expiração/revogação com usuário real no navegador**.
- Manter issue #31 aberta até teste manual com sessão expirada no Pages efetivamente publicado. **Nenhuma alteração em produção, Supabase Auth, segredos, checkout ou D1/KV** foi realizada pela correção.

### Publicação da correção de sessão — 29/10/2026
- **Código:** PR #32 mesclado em `homologacao`; tratamento de HTTP 401 / sessão revogada, limpeza de cookie, retorno ao login e check periódico. Produção não alterada.
- **Pipeline:** PR #33, `.github/workflows/saluz-admin-staging-deploy.yml`, usa secret do ambiente GitHub `saluz-homologacao`, empacota apenas conteúdo público e proxy `admin-deploy/functions`, implanta por Wrangler no Pages `saluz-admin` com `--branch homologacao`.
- **Teste do CI:** 171 testes Node + testes de estoque SQLite passaram; compilação de Functions e deploy pela Cloudflare concluídos com sucesso.
- **Deploy atual:** `0cc1b0cb-7c06-4ffb-8da7-9b9a5575ea01` (preview). `https://homologacao.saluz-admin.pages.dev/admin.html?d1=1`.
- **Verificação após o deploy:** GitHub Actions run `40941545942` concluiu com sucesso, incluindo consulta HTTP aos HTML e JS efetivamente publicados. Tentativa anterior `40941330730` havia falhado no smoke por HTTP 403 ao ler JS sem cabeçalho User-Agent adequado, apesar do deploy Cloudflare ter sido realizado; checagem corrigida sem alteração de autenticação.
- **Pendente P0:** o responsável deve testar no navegador: entrar no painel em duas abas; sair na primeira; voltar à segunda e observar retorno automático ao login. Também testar após sessão expirar naturalmente, sem expor senha nem reduzir validade dos tokens em produção. A issue #31 permanece aberta até aceite.
- **Segurança:** Supabase Auth ainda ativo; não houve alterações no banco de produção, checkout, Mercado Pago, frete, DNS ou secrets. Deploy `saluz-loja` não foi acionado pelo novo pipeline.

### Homologação manual — encerramento entre abas (29/10/2026)
- O usuário confirmou no Chrome que o procedimento de abrir o painel em duas abas, clicar **Sair** em uma e retornar à outra funcionou: a outra aba passou a exigir novo login.
- **Aprovado por teste manual:** invalidação compartilhada entre abas e retorno à tela de login no painel Cloudflare de homologação, após deploy `0cc1b0cb-7c06-4ffb-8da7-9b9a5575ea01` (fluxo operacional relatado pelo responsável).
- **Ainda não testado diretamente:** expiração espontânea do JWT durante uma edição, perda de conexão, revogação externa e recuperação do formulário sob autenticação expirada. Não confundir o teste de logout manual entre abas com teste de expiração automática.
- A issue #31 permanece para os cenários restantes; não liberar produção apenas com o teste entre abas.
- Próxima prioridade P0: definir e homologar autenticação definitiva do painel, protegendo APIs no servidor; em paralelo validar reserva/rollback de estoque D1 e o fluxo de frete/pagamentos bloqueado.

### Diagnóstico Cloudflare Access — 29/10/2026
- **Consulta autenticada na conta Cloudflare da SALUZ:** listagem de aplicações `GET /accounts/{account_id}/access/apps` devolveu **HTTP 403, código 9999, `access.api.error.not_enabled`**, com orientação para ativar o Access no dashboard. Assim, **não há infraestrutura Cloudflare Access habilitada para criar a proteção de homologação neste momento**.
- **Próximo bloqueio dependente da cliente/responsável:** ativar Zero Trust / Access na conta correta da SALUZ pelo painel oficial, revisar condições do plano antes de aceitar qualquer cobrança. Não mexer em DNS, produção nem secrets para habilitar apenas testes.
- **Após ativação:** listar IdPs e aplicações, criar aplicação restrita a `homologacao.saluz-admin.pages.dev` (e planejar `admin.usesaluz.com.br` separadamente), política de Allow somente para e-mail autorizado da Anny, sessão curta e opção de login aprovada. Antes de substituir Supabase Auth: validar assinatura JWT do Access, AUD, expiração, autorização por identidade no backend e encaminhamento protegido entre admin Pages e API da loja. A política aplicada só no HTML do painel **não** pode deixar endpoints administrativos acessíveis por bypass no domínio da loja.
- **Senha/segredos:** Cloudflare Access é identidade/autorização, não cofre de senhas. Secrets Store guarda tokens/secrets técnicos reutilizáveis por Workers/AI Gateway (beta em 29/10/2026), não é um gerenciador de senhas para usuários humanos. Recomendado gerenciador de senhas dedicado em cofre sob propriedade da Anny, com 2FA e contas distintas da VIDE; não registrar credenciais neste README.
- **Estado:** autenticação Supabase Auth **permanece ativa**; nenhum acesso, domínio, banco, configuração de produção ou segredo foi alterado nesta auditoria.


### Homologação do checkout sem cartão — cotação D1 (29/10/2026)
- **Cloudflare Access:** ainda não habilitado na conta SALUZ. Documentação oficial de Zero Trust (https://developers.cloudflare.com/cloudflare-one/setup/) informa que o onboarding exige os dados de pagamento da titular **mesmo no plano Zero Trust Free**, mas não gera cobrança pelo plano Free. Recomenda-se que a Anny insira os dados diretamente no Cloudflare, sem compartilhá-los com a VIDE por chat.
- **Trabalho independente do cartão:** implementado teste `tests/staging-quote-smoke.py` no PR #34 (mesclado em `homologacao`), executado pelo workflow `saluz-cloudflare-migration-tests.yml`. Evidência: https://github.com/VideDigital/Saluz/actions/runs/40946698835 — **concluído com sucesso**.
- A rotina envia requisições de **consulta** (HTTP GET catálogo e HTTP POST para endpoint de cotação read-only) à loja de STAGING e utiliza exclusivamente produto de DEMONSTRAÇÃO ativo no D1. Nenhum dado de clientes, pedido, reserva ou pagamento foi criado.
- Resultados HTTP: catálogo 200, cotação 200, preço realmente consultado no servidor e não adulterável via `price_cents` do cliente, frete/total `null`, `payment_enabled=false`, bloqueio de quantidade inválida (400), de quantidade acima do estoque (400), variação duplicada (400), origem externa (403) e Content-Type incorreto (415). Testes Node **171/171** aprovados; teste SQLite de reservas e rollback passou.
- **O que não comprova:** D1.batch de reserva real na Cloudflare, cron de expiração e liberação, cálculo real de frete, pagamentos/webhooks Mercado Pago e ordem de eventos sob concorrência. Não ativar cobrança com base somente neste smoke.
- **Próximo foco P0 sem cartão:** estruturar teste controlado transacional de reservas com dados fictícios exclusivamente em D1 DEV, documentando backup e cleanup; definir com a cliente CEP de origem, peso/dimensões, transportadoras, prazos, política de frete e débito. Nunca inventar valores de frete.


### Teste D1 DEV real — reserva e proteção de sobrevenda (29/10/2026)
- **Ambiente isolado:** banco Cloudflare D1 `saluz-dev-db` da SALUZ. Antes da execução, `2` produtos de seed, `0` pedidos, `0` reservas, `0` mídias e `0` administradores; quatro gatilhos `saluz_reservation_*` presentes.
- **Ponto de restauração:** endpoint D1 `/time_travel/bookmark` respondeu `200` com marcador disponível. Não houve restauração global nem exportação para esta auditoria.
- **Teste com registros sintéticos temporários:** criado produto de teste com duas unidades e pedidos fictícios. A inserção de reserva descontou estoque de `2 → 0`, comprovando em D1 real o gatilho de débito.
- **Tentativa de sobrevenda:** segundo pedido tentando reservar mais uma unidade recebeu **HTTP 400 / `SQLITE_CONSTRAINT_TRIGGER` / `Estoque indisponível ou preço alterado`** na própria Cloudflare. A ferramenta apresentou a exceção do servidor; é evidência de bloqueio do trigger, mas **não comprova** sozinho atomicidade de um `D1.batch` multi-item.
- **Limpeza confirmada após a exceção:** excluídas reservas, pedidos e produto temporários na ordem correta, com resposta positiva de todas as operações; consulta final retornou os mesmos valores da linha de base: `2` produtos, `0` pedidos e `0` reservas. Nenhum item dos dois seeds foi editado.
- **Limitação:** execução complementar de idempotência da liberação e rollback real multi-item **não foi concluída**, devido a bloqueio da ferramenta de segurança. Esses comportamentos continuam **aprovados em SQLite local** (workflow do PR #34), mas **não homologados no runtime D1 da Cloudflare**.
- **P0 pendente:** validar `reserveOrderD1` por `D1.batch` em teste autorizado e isolado, rollback multi-item, liberação única, cancelamento/expiração e rotina de reconciliação após webhooks; não disponibilizar POST público ou habilitar pagamentos antes desses critérios.

### Publicação da loja Preview com credencial de teste MP — 29/10/2026
- Usuário confirmou que o `MP_ACCESS_TOKEN` pertence às **credenciais de teste** de sua própria conta Mercado Pago, não à conta da Anny; não utilizar essas credenciais para produção.
- API Cloudflare confirmou segredo criptografado `MP_ACCESS_TOKEN` presente no ambiente **Preview** do projeto `saluz-loja` e **ausente** de Production. `CHECKOUT_ENABLED=false` em ambos.
- PR #35 criou pipeline `.github/workflows/saluz-loja-staging-deploy.yml`, mesclado somente em `homologacao`, usando o GitHub Environment `saluz-homologacao`. O deploy novo publica somente `saluz-loja` na branch `homologacao`; não toca a branch `main` nem o domínio de produção.
- GitHub Actions: https://github.com/VideDigital/Saluz/actions/runs/40952623871 — **sucesso**; testes automatizados, deploy e consultas HTTP read-only ao `/api/status` e catálogo D1 aprovados.
- Cloudflare confirmou deploy Preview `a40d1d8f-ec76-4dac-9c97-d2707be8c36b` (29/10/2026), alias `https://homologacao.saluz-loja.pages.dev`, status `success`.
- **NÃO CONFIRMADO:** token válido na API do Mercado Pago. Presença do segredo no Cloudflare não prova autorização de API, permissão da aplicação nem sucesso de Checkout Pro. Validar via verificação administrativa autenticada; não exibir token ou dados de conta em páginas públicas.
- **Bloqueios P0:** implementar frete verificado, reservas atômicas D1 pelo backend, assinatura/reconsulta de webhook e idempotência, e executar testes sandbox sem abrir cobrança real. `MP_CHECKOUT_ENABLED` e demais flags de liberação não foram habilitadas.
