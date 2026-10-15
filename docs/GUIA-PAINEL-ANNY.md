# SALUZ — Guia de operação do painel da Anny

**Status:** material de homologação preparado em 15/10/2026. A loja ainda não recebe pedidos nem pagamentos. O ambiente Cloudflare da cliente aguarda a credencial privada e a implantação atualizada. Este documento não contém senhas, tokens nem dados pessoais de compradores.

## 1. Acesso

Depois que a Agência Vide confirmar que a versão atual do site foi implantada no **Cloudflare Pages da SALUZ** e que a credencial foi cadastrada como Secret, abra a página `/admin.html` do domínio de testes da cliente.

Entre com a conta autorizada pela própria SALUZ. Se aparecer uma mensagem de "Painel em configuração", não tente cadastrar dados: a integração com o Supabase ainda precisa ser concluída. Não compartilhe senha nem o código de verificação por mensagem.

## 2. Cadastre o primeiro produto

1. Abra **Produtos** → **Novo produto**.
2. Digite o **nome real**, escolha uma das categorias disponíveis e informe o **preço correto em reais**.
3. Envie uma imagem real do item (JPG, PNG ou WebP; até **5 MB**).
4. Insira descrição factual, sem promessas não verificadas.
5. Cadastre as variações de **cor**, **tamanho** e **estoque**. Cada combinação é única. Mesmo produtos de tamanho único precisam de uma variação identificada.
6. Confira o cartão de **prévia** e a seção **Conferência antes de publicar**. Ela apresenta os itens que ainda faltam.
7. Inicialmente, **deixe Produto ativo desmarcado**. Salve e revise.
8. Quando fotos, valores e estoque estiverem conferidos, edite o item, marque **Produto ativo na loja** e salve.

Nunca use imagens ou estoques fictícios em um produto público. O painel recusa combinações duplicadas e um produto ativo sem foto.

## 3. Vitrine da página inicial

- **Novidades:** aparecem automaticamente com base na data de cadastro dos produtos ativos.
- **Destaques:** marque `Destacar na página inicial` no formulário, ou use o botão de destaque na lista de produtos ativos.
- Produtos ocultos não aparecem ao público, mesmo quando estavam marcados como destaque.
- A Home evita repetir o mesmo produto nos blocos de destaques e novidades.

Se a página inicial mostrar "Seleção em preparação", confira se existem produtos ativos e se a API está conectada. Não substitua por cards com produtos inventados.

## 4. Verificação de cada item publicado

Abra a vitrine pelo mesmo domínio de testes que está conectado ao Supabase. Confira:

- A foto correta carrega e mantém proporção em computador e celular.
- Nome, descrição, preço e categoria estão corretos.
- O link **Ver produto** abre a página individual.
- A escolha de cor e tamanho altera as imagens e respeita o estoque.
- A sacola mostra a quantidade selecionada, sem ultrapassar o estoque.
- O botão **Favoritos** funciona. A lista é individual por **navegador/perfil**, não por conta ou dispositivo.
- A busca encontra o nome do produto mesmo quando o visitante não digita acentos.

Em testes com valores incorretos, corrija no painel antes de divulgar a loja.

## 5. O que não está liberado

- **Pedidos e checkout:** manter `CHECKOUT_ENABLED=false`; sacola é somente preparação de compra.
- **Pagamento e frete:** nenhum processador ou cálculo automático foi contratado/integrado.
- **Privacidade e políticas:** validar documentos finais, condições comerciais, controle de acesso, retenção de dados e responsabilidades da empresa.
- **Domínio oficial:** manter sem alterações até a aprovação escrita da cliente e testes de ponta a ponta.
- **Estoque em pedidos concorrentes:** a implementação ainda não reserva estoque em uma transação de banco; não ativar pedidos sem resolver isso.
- **GitHub Pages:** é prévia estática, não testa cadastro/login real.
- **Cloudflare:** projeto `saluz-loja` é Direct Upload e não atualiza automaticamente pelo GitHub.

## 6. Checklist para a VIDE ativar somente o painel (sem vendas)

- [ ] Usar a conta Cloudflare da **Anny**, nunca a Cloudflare da VIDE.
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` como **Secret** diretamente no Pages da SALUZ, sem copiar para chat, repositório ou navegador.
- [ ] Publicar **a versão atual** do código e das Functions no Pages da cliente; não basta o deploy do GitHub Pages.
- [ ] Confirmar `/api/status` com `configured:true` e `checkout_enabled:false`.
- [ ] Confirmar que uma pessoa sem sessão recebe acesso negado nas rotas administrativas.
- [ ] Entrar com a conta administrativa autorizada da Anny.
- [ ] Cadastrar um produto de teste interno inicialmente **oculto**; validar upload, edição, variações e destaque.
- [ ] Conferir o produto publicado em um navegador anônimo, apenas após aprovação da Anny para a publicação de testes.
- [ ] Fazer revisão mobile, links, acessibilidade básica e integridade do catálogo.
- [ ] Registrar aceite da cliente e eventuais ajustes necessários.

**A ativação do painel não equivale ao lançamento da loja para receber vendas.** A ativação de pedidos será uma decisão posterior, sujeita às condições comerciais, técnicas e legais.
