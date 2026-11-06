/**
 * SALUZ — mecanismo INTERNO de conciliação D1, sem endpoint público.
 * Somente dados reconsultados diretamente na API do provedor podem entrar aqui.
 * Não autoriza checkout, webhook público nem cobrança.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedWaiting=new Set(["checkout_criado","pendente"]);
const cents=n=>Number.isSafeInteger(n)&&n>=0&&n<=50000000;
const validInstant=n=>typeof n==="string"&&Number.isFinite(Date.parse(n));

/** A resposta do provedor deve ter sido obtida via GET autenticado, nunca do body do webhook. */
export function planPaymentTransition({local,provider,merchantId,now=new Date().toISOString(),reservations}){
 if(!local||!provider||!UUID.test(String(local.id))||!validInstant(now))
  throw Error("Dados de conciliação inválidos");
 if(local.payment_provider!=="mercado_pago"||!local.mp_order_id||
   String(provider.id)!==String(local.mp_order_id)||
   String(provider.external_reference)!==String(local.id))
  throw Error("Order não pertence ao pedido local");
 if(!merchantId||String(provider.collector_id)!==String(merchantId))
  throw Error("Recebedor Mercado Pago não confere");
 if(provider.currency_id!=="BRL"||!cents(provider.total_cents)||
   !cents(local.subtotal_cents)||!cents(local.shipping_cents)||
   provider.total_cents!==local.subtotal_cents+local.shipping_cents)
  throw Error("Valor ou moeda não conferem");
 const state=String(local.payment_state),status=String(provider.status),detail=String(provider.status_detail||"");
 if(state==="aprovado"||local.status==="pago_confirmado"||local.status==="em_preparacao"||local.status==="enviado")
  return status==="processed"&&detail==="accredited"?{action:"noop",reason:"already_paid"}:
   {action:"manual",reason:"paid_order_changed"};
 if(state==="cancelado"||state==="falhou"||state==="expirado"||state==="reembolsado")
  return status==="failed"||status==="canceled"?{action:"noop",reason:"already_closed"}:
   {action:"manual",reason:"closed_order_changed"};
 if(!allowedWaiting.has(state)||local.status!=="aguardando_pagamento")
  return {action:"manual",reason:"unexpected_local_state"};
 if(status==="created"||status==="processing"||status==="action_required")
  return {action:"hold",reason:"provider_pending"};
 if(status==="refunded"||detail==="partially_refunded")
  return {action:"manual",reason:"refund_requires_review"};
 if(status!=="processed"&&status!=="failed"&&status!=="canceled")
  return {action:"manual",reason:"unknown_provider_status"};
 if(status==="processed"&&detail!=="accredited")
  return {action:"manual",reason:"unconfirmed_accreditation"};
 if(!reservations||!Number.isSafeInteger(reservations.total)||reservations.total<1||
   reservations.released>0)
  return {action:"manual",reason:"reservation_missing_or_released"};
 if(status==="processed"){
  if(!validInstant(local.stock_reservation_expires_at)||
     Date.parse(local.stock_reservation_expires_at)<=Date.parse(now))
   return {action:"manual",reason:"late_payment_requires_review"};
  return {action:"approve",reason:"accredited"};
 }
 return {action:"cancel_release",reason:status};
}

/**
 * Chamada interna, depois de consultar a order no Mercado Pago com credenciais do servidor.
 * A escrita no D1 usa CAS + batch transacional e triggers de devolução de estoque.
 * Nenhum dado de cliente ou token é gravado no log.
 */
export async function reconcilePaymentD1({db,orderId,provider,merchantId,now=new Date().toISOString()}){
 if(!db?.prepare||!db?.batch||!UUID.test(String(orderId)))throw Error("D1 ou pedido inválido");
 const local=await db.prepare(
  "SELECT id,status,payment_provider,payment_state,mp_order_id,subtotal_cents,shipping_cents,stock_reservation_expires_at "+
  "FROM saluz_orders WHERE id=? LIMIT 1"
 ).bind(orderId).first();
 if(!local)return {action:"manual",reason:"order_not_found"};
 const res=await db.prepare(
  "SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN released_at IS NOT NULL THEN 1 ELSE 0 END),0) AS released "+
  "FROM saluz_stock_reservations WHERE order_id=?"
 ).bind(orderId).first();
 const plan=planPaymentTransition({local,provider,merchantId,now,
  reservations:{total:Number(res?.total||0),released:Number(res?.released||0)}});
 if(plan.action!=="approve"&&plan.action!=="cancel_release")return plan;
 const approved=plan.action==="approve",nextState=approved?"aprovado":plan.reason==="failed"?"falhou":"cancelado";
 const statements=[db.prepare(
  "UPDATE saluz_orders SET payment_state=?,status=?,payment_updated_at=?,payment_confirmed_at=CASE WHEN ?=1 THEN ? ELSE payment_confirmed_at END,updated_at=? "+
  "WHERE id=? AND mp_order_id=? AND payment_provider='mercado_pago' AND status='aguardando_pagamento' "+
  "AND payment_state IN ('checkout_criado','pendente') "+
  "AND EXISTS(SELECT 1 FROM saluz_stock_reservations WHERE order_id=? AND released_at IS NULL) "+
  (approved?"AND stock_reservation_expires_at>? ":"")
 ).bind(nextState,approved?"pago_confirmado":"cancelado",now,approved?1:0,now,now,
   orderId,String(provider.id),orderId,...(approved?[now]:[]))];
 if(!approved)statements.push(db.prepare(
  "UPDATE saluz_stock_reservations SET released_at=? "+
  "WHERE order_id=? AND released_at IS NULL AND EXISTS ("+
  "SELECT 1 FROM saluz_orders WHERE id=? AND status='cancelado' AND payment_state=? AND mp_order_id=?)"
 ).bind(now,orderId,orderId,nextState,String(provider.id)));
 const outcomes=await db.batch(statements);
 if(outcomes?.[0]?.meta?.changes!==1)return {action:"manual",reason:"concurrent_or_stale_update"};
 return {action:approved?"approved":"released",reason:plan.reason};
}
