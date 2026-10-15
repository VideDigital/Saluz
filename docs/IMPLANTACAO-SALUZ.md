# SALUZ — implantação e lançamento

> Documento de execução da Agência VIDE. **Não inserir senhas, tokens, CPF, dados bancários ou dados pessoais de compradores neste repositório.**

## Estado verificado em 14/10/2026
- Repositório: `VideDigital/Saluz` no GitHub, atualmente **público**.
- Site existente: protótipo estático HTML/CSS/JS no GitHub Pages, ainda **não é loja funcional**.
- Domínio escolhido: `usesaluz.com.br`. Compra informada pela cliente; validar titularidade, DNS e pagamento antes de alteração.
- Conta Cloudflare para a SALUZ: criada conforme informado; **conexão usada para administrar precisa ser a conta correta**.
- Valor informado para o projeto: R$ 740,00; **confirmar no orçamento o que está incluído**, considerando que o escopo de e-commerce difere de site/vitrine simples.

## Reunião SALUZ — decisões fornecidas
### Comércio
- Carrinho/bolsa, checkout com pagamento online.
- Formas desejadas: Pix, cartão de crédito e cartão de débito (confirmar disponibilidade por intermediador).
- Cliente informa dados necessários para faturamento e entrega no **checkout seguro da plataforma**, não em formulário customizado desprotegido.
- Painel de administração de produtos (ativo/inativo, preços, cores, tamanhos), estoque e pedidos.
- Confirmações automáticas de pedido e de pagamento. Verificar custos e elegibilidade das mensagens WhatsApp separadamente.
- Frete por conta do comprador, com opções conforme região e transportadora, preferencialmente PAC/SEDEX ou integração equivalente.
- Atendimento: dias úteis, 8h às 19h.
- E-mail comercial declarado: `anny.csalustiano@gmail.com`. Número WhatsApp comercial ainda não fornecido.

### Marca e catálogo
- Referência de UX: Vivara, adaptar padrões sem copiar código, layout, textos ou imagens.
- Cor dos textos informada: café `#51443B`.
- Categorias iniciais: nécessaires, porta-joias, organizadores de maquiagem/bolsa, viagem, autocuidado, acessórios femininos, kits e presentes; maquiagem como categoria futura.
- Variantes de cor citadas: branco, bege, marrom e preto. Confirmar quais SKUs realmente possuem cada variação.
- Faltam produtos reais, fotos, descrições, medidas, preços, pesos, estoque e dimensões para cálculo de envio.

## Arquitetura — decisão P0
**A arquitetura anterior (GitHub privado → Cloudflare Pages) é válida para o protótipo, mas NÃO fornece por si só checkout, administração, proteção dos dados dos compradores ou fluxo de pedidos.**

Recomenda-se escolher **plataforma de e-commerce gerenciada** para operação brasileira. Candidata inicial: Nuvemshop, com recursos de checkout, frete, pedidos, pagamentos e e-mails transacionais conforme plano. Confirmar plano, custo mensal, taxas financeiras, personalização do tema e meios de pagamento **antes** de migrar o domínio.

Se plataforma gerenciada:
- Loja e checkout residem na plataforma.
- Cloudflare pode servir como DNS/proteção, desde que compatível com DNS da plataforma.
- Repositório GitHub privado preserva protótipos, assets licenciados e documentação, não necessariamente o site de produção da loja.
- Não apontar o domínio simultaneamente para Cloudflare Pages e outra loja na raiz.

Se site customizado no Cloudflare Pages:
- Exige arquitetura segura para backend de pedidos, pagamentos, estoque, dados pessoais e integrações com frete, com mais tempo, manutenção e custo.
- Não guardar CPF/cartão/pedidos no frontend nem implementar processamento próprio de cartões.

## Sequência segura
1. **P0:** confirmar conta Cloudflare da SALUZ e titularidade do domínio, SEM compartilhar senhas.
2. **P0:** aprovar plataforma comercial + custo mensal/taxas + escopo compatível com R$740.
3. **P0:** estruturar loja teste com catálogo real e variações, definir recebedor de pagamentos, habilitar intermediador autorizado e frete.
4. **P0:** testar compra ponta a ponta em ambiente apropriado: preço, frete, pedido, pagamento, notificações, cancelamento e reembolso.
5. **P0:** criar política de privacidade, termos aplicáveis, troca/devolução (incluindo direito legal de arrependimento) e contato visível conforme operação real.
6. **P1:** aplicar identidade visual aprovada, ajustar mobile/acessibilidade e SEO sem copiar referências.
7. **P1:** somente após validar loja e preservar registros DNS necessários, conectar `usesaluz.com.br`; testar HTTPS, URLs, www/redirecionamento e e-mails.
8. **P1:** preservar backup, privatizar repositório na etapa segura, descontinuar GitHub Pages antigo se houver alternativa ativa.
9. **P1:** monitorar primeiras compras e comprovar recebimento de notificações.

## Não executado / aguardando cliente
- Definição e contratação de plataforma de e-commerce.
- Acesso autorizado à conta Cloudflare correta.
- Número comercial WhatsApp e Instagram oficial.
- Catálogo: SKU, nome, preço, variações, fotos próprias, estoque, peso, dimensões.
- Identificação do recebedor na plataforma de pagamento (diretamente em ambiente seguro).
- Endereço de origem dos envios / CEP para calcular frete (fornecer à plataforma, não publicar aqui).
- Política de trocas, devoluções, tratamento de dados e textos legais revisados.
- Limites de cadastro inicial de produtos, revisões e suporte aprovados no orçamento.
