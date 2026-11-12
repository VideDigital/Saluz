# SALUZ — Redesign editorial da vitrine (12/11/2026)
**Escopo:** somente branch de homologação; a produção (`main`) permanece sem alterações.

## Diagnóstico
A vitrine antiga acumulava estilos de múltiplas versões, menus com "Categorias" duplicado, blocos genéricos e painéis decorativos concorrendo com os produtos. O redesign substitui a camada `saluz-moda.css` por uma única especificação visual para home, loja, categorias, produto e navegação compartilhada em todas as páginas.

## Decisões de UX e conversão
- Menu consistente: Roupas (dropdown de tipos), Bolsas, Acessórios, Todos os produtos, Sobre a SALUZ e Ajuda. Busca, favoritos e sacola sempre acessíveis.
- Home: primeiro impacto editorial e três fotos de referência; atalho por tipos; vitrines automáticas aparecem apenas com produtos de moda publicados na API.
- Catálogo: barra de busca, ordenação e filtros por categoria, subtipo, cor e tamanho; sidebar no desktop e painel recolhível no celular.
- Detalhe: fotos dos produtos reais, seleção de cor/tamanho, estoque por variação e sacola; compra ainda desativada.
- Nenhum "de/por", desconto, produto, avaliação, selo de qualidade ou condição de frete foi inventado.
- Fotos editoriais explicitamente rotuladas como ilustrativas; antes de lançar, preferir fotografia real aprovada pela Anny.

## Referências de padrões (não copiar layouts ou conteúdo de terceiros)
- C&A: navegação por departamento e categoria (https://www.cea.com.br/).
- Riachuelo: organização de coleções (https://www.riachuelo.com.br/).
- Nike: conteúdo editorial + foco em grade de produtos (https://www.nike.com.br/).

## Fotografias editoriais de referência (Unsplash License)
- Thom Bradley: arara de roupas (https://unsplash.com/photos/clothing-racks-with-neutral-toned-garments-mwa_nzFpnJw).
- Polina Kuzovkova: roupas em arara (https://unsplash.com/photos/clothes-hanging-on-a-rack-in-a-boutique-pt3EBzQcxP0).
- Irene Kredenets: bolsa em fundo neutro (https://unsplash.com/photos/brown-leather-handbag-on-white-surface-tcVH_BwHtrc).
- Planet Volumes: acessórios (https://unsplash.com/photos/a-close-up-of-a-womans-gold-jewelry--lpL_EoKMyI).

## Bloqueios comerciais mantidos
- Correios: CEP e dimensões de embalagem, endereço de remetente: AGUARDANDO ANNY (#63).
- Zero Trust: aguarda cartão de crédito da Anny.
- Mercado Pago: webhook/reconciliação em homologação pendente (#65), checkout real OFF.
- Fotos, preços, medidas, estoque e aprovação visual: AGUARDANDO ANNY.

**Segurança:** sem alterações no backend, pagamentos, banco D1, R2, credenciais, `main` ou DNS.
