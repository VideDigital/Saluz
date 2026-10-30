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


## Checkup do painel administrativo — 30/10/2026

**Cenário:** a loja pública é \`https://usesaluz.com.br/\` (Cloudflare Pages \`saluz-loja\`) e o painel possui domínio próprio \`https://admin.usesaluz.com.br/\` (Pages \`saluz-admin\`). A versão de testes usa \`https://homologacao.saluz-admin.pages.dev/\`. Não confundir os projetos.

**Problema identificado no código:** o builder do projeto \`saluz-admin\` copiava a home \`index.html\` da loja para o artefato do painel. Isso fazia a raiz do projeto administrativo poder servir a vitrine, em vez do login de gestão.

**Correção preparada em homologação:**
- O build coloca o conteúdo de \`admin.html\` como \`index.html\` do **pacote de deploy administrativo**, sem alterar a home original da loja no GitHub.
- Camada \`saluz-admin-polish.css\` unifica cabeçalho, menu, botões, formulário, foco acessível e responsividade, sem alterar APIs, banco, preços, estoque nem autenticação.
- Teste automatizado confirma que o pacote usa o login administrativo na raiz, preserva a API e carrega o CSS; smoke da Cloudflare verifica a rota \`/\` e o arquivo CSS na versão implantada.
- A URL para avaliação após a implantação é \`https://homologacao.saluz-admin.pages.dev/\`. O editor simplificado de campanhas só funciona no hostname de homologação (modo D1).
- O domínio oficial \`admin.usesaluz.com.br\` **não será promovido** até validação do fluxo de login, navegação, edição de banner, upload, rascunho/publicação e mobile.

**Situação:** alterações de código para homologação; confirmar resultado do workflow e o visual autenticado antes de considerar concluído. Checkout, pagamentos e captação real de dados continuam sujeitos à liberação e validação separadas. Não guardar credenciais no repositório.

## Checkup de UX — reformulação minimalista (30/10/2026)

**Objetivo:** deixar todas as áreas do painel simples de operar, sem modificar banco, autenticação, catálogo, pagamentos, estoque, URLs de API ou regras de publicação.

**Escopo de código:** `saluz-minimal.css` + `saluz-minimal.js` carregados ao final de `admin.html`. O JavaScript só executa em `homologacao.saluz-admin.pages.dev` e apenas quando a composição v3 estiver ativa. O arquivo de build do admin já copia todos os arquivos .css e .js da raiz. **Produção não recebe a reformulação.**

**Entregas da interface:**
- Menu branco enxuto, menos divisórias, cabeçalho mais leve, paleta discreta vinho/cinza e estados focados.
- Início com ações rápidas, indicadores reais e pendências; ajuda explicativa sob demanda.
- Produtos, pedidos e clientes sem coluna permanente de ajuda; formulários, filtros e regras originais preservados.
- Cadastro de produtos com link de foto e prévia recolhidos; upload e variações permanecem disponíveis.
- Campanhas com botão de salvar banner e publicação visíveis; duplicação, exclusão, reorganização da lista e descarte agrupados em menus expansíveis. **Salvar banner e publicar na loja são ações diferentes.**
- Visual da loja com edição guiada e links de imagens opcionais recolhidos; rascunho e publicação permanecem separados.
- Simulador de taxas prioriza o cálculo; diagnóstico de Mercado Pago fica em opções técnicas.
- Ajustes responsivos para celular, foco visível, uso de `details/summary` e suporte a movimento reduzido.

**Verificação manual obrigatória após o deploy (não substituída pela revisão de código):**
1. Entrar e sair com conta autorizada; testar sessão expirada e acesso negado.
2. Percorrer as 8 abas no computador e no celular; abrir todos os menus de ajuda e opções adicionais.
3. Criar/editar produto de teste; escolher imagem, usar URL opcional, alterar variação/estoque, conferir prévia e salvar; verificar listagem.
4. Criar banner de teste, fazer upload, salvar rascunho e verificar que **não está publicado**. Depois revisar o conjunto de mudanças e testar publicação controlada no ambiente de homologação.
5. Testar o reordenamento de banners e o botão 'Salvar a ordem' dentro de 'Organizar ou desfazer alterações'.
6. Em Visual da loja, alterar texto de teste, salvar rascunho, verificar prévia, publicar apenas no staging e testar desfazer.
7. Validar filtros de pedidos e clientes, exportação de catálogo, simulador de taxas e navegação mobile.
8. Confirmar que nada mudou em `admin.usesaluz.com.br` e `usesaluz.com.br`.

**Condição para promoção:** aprovação visual e funcional da cliente/Agência Vide, autenticação e operações D1 testadas, comportamento de rascunho vs. publicação validado. Não ativar checkout ou pagamentos reais neste trabalho.

**Rollback imediato:** remover de `admin.html` os links `saluz-minimal.css` e `saluz-minimal.js` e executar deploy da homologação. Os módulos originais continuam intactos.

**Pendências P1:** validação autenticada/mobile no staging; confirmar persistência de produtos, banners e conteúdo D1; revisão de termos/privacidade, checkout e integração de pagamentos antes de operação real.

## Focus V4 — 30/10/2026 (simplificação estrutural)

**Motivo:** a versão minimal anterior reduziu cores e bordas, mas mantinha informação duplicada e editores exibidos junto com listas, dificultando as tarefas mais usadas.

**Mudança de UX:** sem duplicar interfaces nem criar endpoints, a nova versão compacta o menu (cinco funções principais + Mais opções); transforma a Home em ações rápidas, indicadores reais e pendências; remove títulos repetidos; compacta listagens e reserva botões de baixa frequência para menus de contexto.

**Campanhas:** tela inicial lista apenas banners; o editor abre depois do clique em Criar/Selecionar. Ordenação tem modo próprio com Salvar ordem; publicação continua separada de Salvar banner e respeita o estado global do rascunho de aparência.

**Editor da loja:** edição com uma área por vez, prévia opcional e rascunho/publicação independentes. **Taxas:** calculadora vem primeiro; cadastro/edição fica recolhido e abre ao editar uma taxa. Controles existentes preservados.

**Restrições:** scripts de experiência só atuam no hostname `homologacao.saluz-admin.pages.dev`; nenhuma alteração de tabelas, APIs, autenticação, pagamentos ou checkout. Demais ambientes mantêm o CSS padrão sem `saluz-focus`.

**Testes obrigatórios:** validar login e navegação, rodar testes Node e build admin, conferir no navegador desktop/mobile, testando: edição e listagem de produtos; banner novo, edição, reordenação, salvar rascunho e publicar somente no staging; edição de conteúdo e prévia; simulação e edição de taxas; links e filtros. Conferir isolamento entre homologação/produção. **Sem aprovação visual autenticada, não promover para produção.**

**Reversão:** reverter as alterações Focus V4 de `saluz-minimal.js`, `saluz-minimal.css` e os querystrings do `admin.html`; os módulos e dados não foram alterados.
