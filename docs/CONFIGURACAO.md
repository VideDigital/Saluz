# SALUZ — Configuração segura do ambiente

## 0. Escopo atual (15/10/2026)

Site personalizado, cadastro de produtos e variações, sacola, solicitação de pedido antes de pagamento, painel protegido para dados de clientes e métricas opt-in de visitas e cliques. **Nenhum pagamento ou cálculo de frete automático está integrado.** Pedido registrado != pagamento confirmado.

## 1. Contas e titularidade

- Cloudflare precisa ser a **conta SALUZ**, não a sessão Cloudflare pessoal da Vide que atualmente aparece conectada.
- Supabase precisa ter **projeto próprio SALUZ**. Os projetos atualmente visíveis no conector da Vide (\`central-os\` e \`vide-workspace-test\`) NÃO devem ser alterados para esta loja.
- GitHub permanece público até o novo deploy ser verificado; preferencialmente privatizar depois de desvincular GitHub Pages antigo.
- Domínio \`usesaluz.com.br\` comprado conforme declaração da cliente, não foi configurado por esta implementação.
- Não armazenar credenciais em repositório ou WhatsApp. Configurar e manter 2FA de administradoras e backups.

## 2. Supabase

1. Criar novo projeto *SALUZ*, de preferência em organização sob titularidade da SALUZ. **Verificar limite de projetos gratuitos antes.**
2. SQL Editor → executar \`supabase/schema.sql\`. Auditar a estrutura e tabelas criadas antes de produção.
3. Authentication → Users → criar/convidar usuário administrador real com e-mail verificado e senha forte.
4. Copiar UUID desse usuário para o comando SQL abaixo e executar no projeto **SALUZ**:
   \`\`\`sql
   insert into public.saluz_admins (user_id)
   values ('UUID-DO-USUARIO-ADMIN')
   on conflict (user_id) do nothing;
   \`\`\`
5. Separar URL do projeto, chave pública anon/publishable compatível com Auth e **service_role secret**, mantendo a última apenas em segredo no backend.

As políticas RLS bloqueiam os visitantes de acessar pedidos ou eventos diretamente no Supabase. A API Cloudflare utiliza a chave secreta para operações validando dados. Nunca colocar service_role no HTML nem no JS do navegador.

## 3. Cloudflare Pages — projeto de testes

1. Conectar à conta Cloudflare proprietária da SALUZ.
2. Workers & Pages → criar projeto Pages conectado ao repositório \`VideDigital/Saluz\`, branch \`main\`.
3. Site estático sem framework: saída na raiz \`.\`. Quando exigido pelo UI, build command \`exit 0\`. Verificar se Cloudflare reconheceu \`functions/api/[[path]].js\` como Pages Functions.
4. Em projeto → Settings → Variables and Secrets configurar:
   - \`SUPABASE_URL\`: URL pública do projeto Supabase SALUZ.
   - \`SUPABASE_ANON_KEY\`: chave pública legacy anon compatível com Supabase Auth.
   - \`SUPABASE_SERVICE_ROLE_KEY\`: **encrypted secret, nunca variável de texto público**.
   - \`CHECKOUT_ENABLED\`: \`false\` (somente \`true\` após privacidade aprovada, tests e segurança).
5. Aplicar configurações em ambiente de **production e preview** conforme necessário sem publicar segredos nos logs. Iniciar redeploy.
6. Testar \`https://<projeto>.pages.dev/api/status\` esperando \`configured:true\` e \`checkout_enabled:false\`.
7. Testar \`/api/products\` vazio e \`/admin.html\` com usuário autorizado. Requisições sem auth a \`/api/admin/orders\` devem retornar 401.
8. Testar cadastro de produto **real ou exemplo interno em staging**, primeiro \`is_active:false\`. Conferir variações/preço e opção de ativação.
9. Testar os eventos de analytics somente depois de dar consentimento e verificar gráfico administrativo. Não usar eventos fictícios na base real.
10. Antes de ativar \`CHECKOUT_ENABLED=true\`, validar política LGPD, identificação do controlador, suporte, privacidade, disponibilidade/estoque, backup, limite anti-bot/rate limiting, retenção e processo seguro de resposta a incidentes. Na ativação, o formulário só registra **solicitação**, não confirma compra, não cobra cartão e não calcula frete.

A CSP definida no arquivo \`_headers\` será aplicada no Cloudflare Pages; GitHub Pages não interpreta esse arquivo como cabeçalhos.

## 4. Pagamentos e frete (fora do escopo de integração atual)

A cliente ainda decidirá intermediador Pix/cartões. Não cadastrar número de cartão/CVV em formulário próprio. Nunca confirmar Pix somente por CPF/e-mail/comprovante, mas apenas por consulta ao recebedor/extrato e conciliação segura. 
Atualmente o status \`pago_confirmado\` depende de confirmação explícita pela administradora; **não há prova bancária automática**.

Antes de prometer uma compra completa, escolher e integrar modalidade de pagamento, cálculo real de frete (origem/peso/dimensões), confirmação de pagamento via webhook verificado, reserva de estoque, estorno, confirmação de pedido, envio e política de devolução.

## 5. Métricas

A loja e a home podem registrar page_view, product_view, add_to_cart, checkout_start, checkout_submit e contact_click; são persistidas em \`saluz_events\` sem CPF/e-mail/telefone e **apenas se o visitante aceitar**. Gráfico apresenta 7 ou 30 dias; não é total exato de todos os acessos e pode conter tráfego automatizado ou eventos perdidos.

Antes de produção, revisar anti-bot, retenção e política, e instalar monitoramento de errors/uptime. Prever rotina de backup externo do Supabase Free e teste de restauração.

## 6. Publicação final e GitHub

Após testes sem dados reais e aprovação da responsável:
- Vincular \`usesaluz.com.br\` ao Pages na conta Cloudflare SALUZ.
- Preservar registros DNS necessários para e-mail e verificar nameservers recebidos da conta.
- Confirmar funcionamento de raiz/www, HTTPS, busca, sacola, pedido, painel, contatos, dados e consentimento em mobile.
- Desativar GitHub Pages legado e privatizar repositório em momento seguro.
- Remover meta \`noindex,nofollow\` apenas das páginas públicas quando prontas; manter \`admin.html\` sem indexação.
- Rever políticas de privacidade, troca, devoluções, frete e informação legal antes de divulgar.

## 7. Limitações atuais a solucionar antes de produção comercial

- O checkout não oferece pagamento; não apresentar como venda concluída.
- Frete é informado apenas como 'a confirmar'; sem integração com Correios.
- O admin pode mudar status manualmente, mas ainda não há registro auditável imutável dessa mudança.
- O projeto ainda não inclui testes automáticos de carga/abuso, limites antispam por IP, nem programa operacional de backup.
- O formulário de CPF e endereço só pode ser habilitado após aprovação da política de dados da SALUZ.
- A proteção real do painel depende de HTTPS e das credenciais Supabase configuradas corretamente; a mera existência da página \`admin.html\` pública não autoriza acessar dados privados.
