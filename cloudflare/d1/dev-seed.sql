-- Dados totalmente fictícios; APENAS DEV. Não executar em produção.
PRAGMA foreign_keys = ON;
INSERT OR IGNORE INTO saluz_products
(id,name,description,category,image_url,price_cents,original_price_cents,variants,is_active,is_featured)
VALUES
('90000000-0000-4000-8000-000000000001','Nécessaire de teste',
 'Item fictício para validar vitrine e estoque.','Nécessaires','',8990,NULL,
 '[{"color":"Rosa","size":"Único","stock":5,"image_url":""}]',0,0),
('90000000-0000-4000-8000-000000000002','Porta-joias de teste',
 'Item fictício para verificar ofertas.','Porta-joias','',7590,8990,
 '[{"color":"Creme","size":"Único","stock":3,"image_url":""}]',0,0);
