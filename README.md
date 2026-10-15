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
