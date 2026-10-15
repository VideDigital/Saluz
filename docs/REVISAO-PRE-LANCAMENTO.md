# SALUZ — Revisão de qualidade e preparação para lançamento

Atualização: 15/10/2026. **Não é autorização para liberar pedidos, pagamentos ou domínio oficial.**

## Escopo implementado no código
- Home inteligente: `home-vitrine.js` exibe até 8 produtos em destaque, escolhidos no painel, e até 8 novidades reais por data de cadastro. Ambos os blocos mostram apenas produtos ativos; se a API estiver indisponível, exibem estado de preparação sem produtos fictícios.
- Painel da Anny: `is_featured` por produto, filtro de destaques, indicação na prévia e botão rápido para destacar/remover.
- Banco: migração `supabase/migrations/20261015_saluz_featured.sql` aplicada exclusivamente ao projeto SALUZ, São Paulo. Valor padrão `false` e índices parciais para itens públicos.
- API `GET /api/products/home`: consulta produtos ativos, destaques e novidades, sem aceitar seleção administrativa pública.


- Site institucional/comercial multipágina, menu responsivo e categorias.
- Página individual por produto (`produto.html?id=UUID`) e prévia visual sem produtos reais (`produto.html?preview=1`).
- Vitrine de categorias com produtos cadastrados no Supabase.
- Sacola no navegador apenas com ID, cor, tamanho e quantidade; sem informações pessoais salvas localmente.
- Painel autenticado: cadastro/edição e visibilidade dos produtos, estoque por variação, fotos e relatórios.
- Painel: busca, filtro (visível/oculto/sem estoque), resumo de catálogo e prévia do cadastro.
- Back-end: validação de cor/tamanho, prevenção de duplicatas de variação no pedido, limite de envio de fotos.
- Página de produto: fotos vinculadas à combinação de cor/tamanho, consulta específica por UUID, produtos relacionados da mesma coleção (somente produtos ativos).
- Sacola unificada em `sacola.js` entre vitrine e produto, com validação de UUID, limite por SKU, saneamento de dados locais e sincronização de contagem entre abas.
- Favoritos implementados em `favoritos.js`, `favoritos.html` e `favoritos-pagina.js`: salvam só IDs no navegador, não exigem conta, oferecem botões acessíveis na vitrine, categorias e produto, e mostram apenas itens publicados.
- API pública `/api/products/favorites?ids=...`: aceita até 60 UUIDs válidos; não retorna produtos ocultos. Pesquisa acentuada/desacentuada e botão Buscar do cabeçalho levam ao campo do catálogo.
- Pesquisas da Home sugerem categorias existentes e permitem buscar o termo no catálogo, sem apresentar kits não cadastrados como produtos disponíveis.
- Testes automatizados de sacola em `tests/sacola.test.mjs`: adição, agrupamento de variações, estoque, remoção, dados locais adulterados, indisponibilidade de armazenamento e ausência de dados pessoais.
- Testes automatizados de favoritos em `tests/favoritos.test.mjs`: IDs válidos, remoção, privacidade, sincronização e referências HTML; smoke test verifica filtragem no servidor.
- Vitrine e páginas de coleção: links para páginas individuais, consulta de categoria filtrada no servidor e limite de catálogo elevado para 300 itens por requisição.
- Testes automatizados no GitHub Actions (arquivos `tests/smoke.test.mjs` e `tests/sacola.test.mjs`) verificam páginas, rotas protegidas, configuração, checkout desativado e consulta de categoria.
- **Limitação conhecida:** catálogos com mais de 300 itens exigirão paginação para garantir acesso integral a todos os produtos. Não considerar essa escala homologada.


## Testes estáticos realizados

- JavaScript da loja, painel, página de produto e API: parse de sintaxe sem erros.
- Todas as páginas HTML do diretório raiz: sem arquivos relativos faltando nem IDs repetidos na checagem efetuada.
- CSS do layout: chaves balanceadas na checagem efetuada.
- Testes automatizados de integração simulada da API, sem credenciais reais: execução de 15/10/2026 confirmada como sucesso no GitHub Actions.
- Isso **não substitui** testes funcionais no navegador, em Cloudflare Pages ou com o Supabase real.
- Não testamos autenticação, gravação no banco, upload de fotos nem publicação final de páginas na Cloudflare após estas mudanças.

## Testes funcionais obrigatórios — pendentes

### [P0] Infraestrutura e segurança

- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` exclusivamente como **Secret** em **Cloudflare Pages SALUZ da Anny**, nunca no GitHub/cliente.
- [ ] Confirmar `CHECKOUT_ENABLED=false` em produção e preview até liberação expressa.
- [ ] Verificar e proteger rotas públicas contra abuso (rate limits, bot protection, monitoramento de login/eventos/pedidos).
- [ ] Estabelecer processo de backup e restauração do banco e das imagens; executar teste de restauração.
- [ ] Revisar privacidade/LGPD: controlador, finalidade, retenção, direitos, contato e termos aplicáveis.
- [ ] Revisar regras de entrega, devolução, pagamento e suporte com a cliente; não inventar condições.
- [ ] Confirmar comportamento do estoque sob pedidos concorrentes; checagem atual não reserva estoque em transação.
- [ ] Testar recuperação de acesso administrativo e expiração da sessão.
- [ ] Auditar CORS, CSRF, RLS, armazenamento, tamanhos de upload e cabeçalhos CSP no domínio publicado.

### [P1] Loja e conversão

- [ ] Navegação desktop/mobile no navegador real, inclusive menu suspenso de categorias e links do rodapé.
- [ ] Acesso individual de produto pela vitrine e pela categoria.
- [ ] Alternância das fotos ao mudar cor/tamanho, com produtos reais.
- [ ] Bloquear acréscimo acima do estoque, inclusive itens já na sacola.
- [ ] Consistência de preços e estoque entre vitrine, produto, sacola e servidor.
- [ ] Catálogo vazio, sem rede, imagem com erro, produto inativo ou sem estoque.
- [ ] Contraste, fonte, botões, foco, toque, teclado e redução de movimento.
- [ ] Testar em largura móvel de 320 a 430 px, tablet e desktop.
- [ ] Realizar pedido **somente em ambiente controlado** após privacidade, backups e proteções concluídos.

### [P1] Painel da Anny

- [ ] Login real somente para `saluz_admins`, negar usuário sem autorização.
- [ ] Cadastrar produto de teste **oculto**, editar informações e variações.
- [ ] Subir imagens JPG/PNG/WebP válidas e rejeitar arquivos inválidos ou acima de 5 MB.
- [ ] Publicar/ocultar e confirmar que o catálogo público responde corretamente.
- [ ] Filtrar por nome, visibilidade e estoque; conferir atualização do resumo e da prévia.
- [ ] Verificar relatórios consentidos sem acesso público a dados pessoais.
- [ ] Conferir status de pedidos sem associar automaticamente a pagamento.

## Ambientes separados

- Código: GitHub `VideDigital/Saluz`. Prévia estática do GitHub Pages não executa Functions e não acessa produtos reais.
- Cloudflare Pages da cliente: `saluz-loja`, Direct Upload. Deploy não é automático pelo GitHub.
- Supabase da cliente: região São Paulo, projeto SALUZ; não compartilhar com bancos da Vide.
- Domínio `usesaluz.com.br`: **não apontar** antes de homologação e aprovação.

## Aguardando cliente / acessos

- Verificação de acesso à Cloudflare da Anny para concluir Secret backend.
- Fotos, nomes, preços, estoques e variações reais.
- Definição do WhatsApp, condições comerciais e documento de privacidade aprovado.

## Critérios de lançamento

**Não** habilitar `CHECKOUT_ENABLED=true` por conveniência. Somente após checklist P0 concluído, testes de ponta a ponta, aceite da cliente, backup e monitoramento. A SALUZ não processa pagamento automaticamente nesta fase.
