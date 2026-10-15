# SALUZ — Publicar homologação na Cloudflare da Anny

## Estado verificado
- Conta Cloudflare correta: Anny, projeto `saluz-loja`; projeto criado em modo **Direct Upload**.
- `SUPABASE_SERVICE_ROLE_KEY` e `LOGIN_RATE_SECRET` aparecem como **secret_text** na configuração production.
- API de envio de arquivos via conexão do ChatGPT retorna **403 Authorization failed**. Não confundir permissão para ler projeto com permissão para publicar.
- Repositório `VideDigital/Saluz` não está conectado ao Cloudflare Pages. Publicação no GitHub Pages não atualiza esse projeto.
- Código SQL e credenciais não entram no artefato: o workflow de homologação seleciona somente arquivos estáticos na raiz e detecta `functions/` via Wrangler.
- `CHECKOUT_ENABLED=false`; checkout está também bloqueado no backend atual.

## Para autorizar a publicação sem compartilhar tokens em chat
1. A administradora da Cloudflare da SALUZ acessa **My Profile → API Tokens → Create Token**.
2. Criar um token de escopo mínimo para **Cloudflare Pages → Edit**, restrito **à conta SALUZ**. Copiar uma única vez e guardá-lo em local seguro. Não usar token global.
3. No GitHub `VideDigital/Saluz`, abrir **Settings → Environments** e criar `saluz-homologacao`. Restringir implantação manual a mantenedores autorizados (se o plano permitir).
4. Em **Environment secrets** desse ambiente, criar o segredo `CLOUDFLARE_API_TOKEN` com o token da Cloudflare. Não enviar o valor para o ChatGPT.
5. No GitHub, abrir **Actions → SALUZ | Implantar homologação Cloudflare → Run workflow**, branch `main`.
6. Conferir logs: testes Node completos, preparação dos ativos sem arquivos privados e execução do Wrangler. **Se o deploy falhar, não altere DNS e não ative pedidos.**
7. Na Cloudflare, confirmar o último deployment do `saluz-loja` e Functions no próprio projeto.

## Testes sem gerar dados pessoais
- `https://saluz-loja.pages.dev/api/status` deve retornar `configured: true`, `checkout_enabled:false` e `orders_locked:true`.
- `/api/products?page=1&limit=24` deve retornar apenas produtos ativos (atualmente catálogo vazio). Não criar produtos reais sem autorização da Anny.
- Requisição anônima a `/api/admin/products` deve responder **401**. Um painel estático ou página de login isolada não comprova que a API está operacional.
- `/admin.html` deve abrir e oferecer login; **o teste de login real deve ser feito pela Anny em sua própria sessão**, nunca passando senha por chat.
- Login sob limite de 8 tentativas por janela de 15 minutos no identificador de origem. Em caso de 429, aguardar.
- Upload de fotos e publicação de destaque precisam ser validados com produto real oculto, sem coleta de CPF nem pedidos.
- Se algum teste falhar, manter projeto como homologação, corrigir e repetir.

## Antes do domínio oficial
Confirmar políticas da loja, processamento de pedidos, pagamento, frete, segurança, concorrência de estoque, consentimento e suporte. **Não habilitar pedidos com a implementação atual.**

### Observação
Se a criação de token for negada, pedir à administradora da conta SALUZ as permissões de edição do Pages. Evitar conceder acesso a outros projetos ou à conta VIDE.
