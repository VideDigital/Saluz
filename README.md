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
