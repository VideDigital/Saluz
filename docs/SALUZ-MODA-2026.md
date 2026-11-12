# SALUZ | Nova fase: moda, bolsas e acessórios
Decisão informada pela Agência VIDE em 12/11/2026. **Não publicar em `main` sem revisão.**

## Escopo confirmado
- A SALUZ passará a trabalhar com **Roupas, Bolsas e Acessórios**.
- Manter as **cores e tipografia** da identidade atual: café `#51443B`, creme `#F7F4EF`, areia `#DCC8B8`, papel `#FFFDF9`.
- O painel deve poder cadastrar o tipo do produto, foto, descrição, cor, tamanho, preço, estoque por combinação de cor/tamanho e destaque. O painel já tinha a estrutura de variações.
- Não cadastrar preços, fotos, quantidades ou produtos fictícios no banco. A nova vitrine de moda deve exibir somente os produtos das categorias novas; manter os itens antigos salvos no D1 para revisão, **sem apagar e sem recategorizar automaticamente**.
- Novas linhas de produtos ou criações da Anny no futuro são **fora deste escopo** e poderão exigir orçamento adicional conforme acordado.

## Taxonomia de trabalho (proposta; confirmar os tipos que ela realmente venderá)
1. **Roupas:** Blusas; Camisas; Camisetas e regatas; Croppeds; Calças; Shorts; Saias; Vestidos; Conjuntos; Casacos e jaquetas.
2. **Bolsas:** Transversais; De ombro; Tote e shopper; Mochilas; Carteiras.
3. **Acessórios:** Bijuterias; Cintos; Lenços e echarpes; Óculos; Acessórios de cabelo.

Armazenamento sem migração: coluna `category` já existente recebe texto na forma `Roupas / Blusas`, `Bolsas / Transversais` e `Acessórios / Bijuterias`. A função de catálogo interpreta o prefixo e fornece navegação por grupos.

## Frontend
- Home com hierarquia editorial, hero e três categorias; coleção por tipo com links diretos.
- Catálogo com filtros para grupo, tipo, cor e tamanho; preços e fotos sempre vindos dos produtos cadastrados.
- Página de produto com orientação de tamanho, **sem tabela de medidas inventada**; as medidas, tecido e caimento precisam ser cadastrados na descrição real.
- Fotografia editorial de referência: Thom Bradley, [Unsplash](https://unsplash.com/photos/clothing-racks-with-neutral-toned-garments-mwa_nzFpnJw), gratuita sob a licença Unsplash, **não é produto SALUZ**; a vitrine exibe identificação da imagem ilustrativa. Trocar por fotos autorizadas da Anny antes do lançamento.
- Nada de promoções, avaliações, números de vendas ou promessas inventadas.

## Painel
- Novos grupos/optgroups no cadastro; categorias antigas ficam disponíveis no bloco “Catálogo anterior (para migrar)”, permitindo correção individual posterior.
- Sugestões de tamanho PP/P/M/G/GG/XG, numéricos 34–46 e Único; **não obrigar todos os produtos a usar o mesmo padrão**.
- Regras backend: categorização validada em homologação. Não alterar `main`.

## Pendências
**AGUARDANDO ANNY**
- Fotos reais e autorização de uso, nomes, descrições, tecido, medidas, preços e estoque por tamanho/cor.
- Quais subtipos de Roupas/Bolsas/Acessórios terão produtos no lançamento.
- Frete Correios (#63): CEP/embalagens/endereço de remetente; Zero Trust: cartão de crédito para tentar ativação.
- Aprovação visual da nova loja.

**VIDE**
- Revisão de UX mobile e teste real no navegador antes de publicação.
- Conferir cadastro/edição e publicação de produtos por variação no D1.
- Revisar necessidade de campos estruturados de composição e medidas e ajustes de SEO/privacidade.
- Webhook Mercado Pago pendente (#65); pagamentos seguem desativados.
