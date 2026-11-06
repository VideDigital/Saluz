# SALUZ — Frete Correios: decisão de origem pública e requisitos de implantação

Data: 06/11/2026. Estado: **regra comercial informada pelo responsável da Agência VIDE**, ainda não validada com CEP de postagem e embalagem.

## Requisitos informados
- Transportadora: **Correios**.
- Abrangência pretendida: **todo o Brasil**.
- Origem pública que pode ser informada no site: **estado de São Paulo (SP)**. **Não presumir capital, município nem CEP**.
- A Anny fará o preparo/expedição a partir da residência, mas **não autoriza publicar seu endereço residencial no site**. Não exibir CEP, rua, número ou bairro residencial em HTML público, telas públicas ou no GitHub.
- Esta decisão **não libera** pagamento, envio de pedidos, reserva de estoque ou emissão de etiqueta.

## O que não confundir
1. **Endereço no site:** desnecessário divulgar a residência na vitrine.
2. **CEP de origem para cotação:** deve corresponder à origem operacional/postagem adotada, não pode ser inventado e não se resume a `SP`.
3. **Identificação do remetente nas etiquetas:** os Correios exigem endereço de remetente e destinatário na etiqueta; não prometer anonimato. Definir com a Anny um endereço remetente legítimo que aceite apresentar na etiqueta, podendo ser comercial ou serviço adequado **após confirmar as regras do operador**.
4. **Preço e prazo:** Correios calculam conforme CEP origem/destino, peso e dimensões da **embalagem pronta para postagem** e serviço (por exemplo PAC/SEDEX, sujeito a disponibilidade). A página não deve inventar valor/prazo.
5. **Acesso à API:** API Preço/Prazo oficial dos Correios tem pré-requisitos de contrato e autorização de acesso; confirmar se há contrato ou se precisaremos de intermediário apto a operar Correios, ou cotação por outro fluxo legítimo antes de escolher implementação. Não raspar calculadora web.

## Pendências que bloqueiam a cotação
- [ ] CEP da **origem efetiva para postagem**, obtido e armazenado de forma privada (não publicar no GitHub), que gere tarifas reais. Validar com a Anny se é CEP da unidade/modalidade de postagem ou origem de coleta, conforme operador.
- [ ] Peso e **comprimento, largura, altura já embalados** dos produtos/pacotes; definir como agrupar múltiplos itens em uma compra e limites de volume.
- [ ] Modalidade Correios (PAC, SEDEX ou ambas), seguro, valor declarado, disponibilidade nacional e prazo de preparação/postagem.
- [ ] Acesso a tarifa oficial: verificar contrato Correios/API ou definir integrador e termos; testes sandbox/credencial de titularidade da Anny.
- [ ] Regras de endereço legítimo do remetente na etiqueta de postagem e de devolução, conforme exigências do Correios.
- [ ] Decidir política de falha: se cotação indisponível, **não criar pedido pago**; informar indisponibilidade sem frete fictício.
- [ ] Implementar cálculo em backend, total do pedido com frete validado, proteção contra reuso/adulteração, idempotência e expiração de cotação.
- [ ] Validar taxas, mudança de embalagem, cobertura por CEP, pedidos simultâneos e testes E2E antes da liberação.

## Arquitetura: não misturar com entrega local
A tabela `saluz_shipping_rules` (migration `0005_shipping_rules.sql`) da PR #61 é um protótipo **para entrega local por faixa de CEP**, não para os preços oficiais dos Correios. Ela continua vazia e a flag `SALUZ_SHIPPING_RULES_ENABLED` deve permanecer desligada. Um módulo específico para Correios precisa determinar o frete real com provedores e validar de novo no servidor. Evitar lançar tabela nacional fictícia e evitar chamar `entrega_local` de `Correios`.

## Informação exibida na homologação
- "Envios de São Paulo (SP) para todo o Brasil via Correios."
- No checkout, transparência: frete e prazo ainda **não** configurados.
- `main` e produção não devem ser modificadas até aprovação da cliente, credenciais e testes.

Fontes oficiais:
- https://www.correios.com.br/atendimento/developers/manuais/manual-api-preco-1
- https://www.correios.com.br/atendimento/developers/manuais/manual-api-prazo
- https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
