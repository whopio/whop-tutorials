-- Link orders to the Whop checkout configuration that produced them.
--
-- The payment webhook (api/webhooks/whop) receives the payment's
-- `checkout_configuration_id` and uses it to reconcile the payment back to the
-- right order (populating whop_payments.order_id, and routing refunds/disputes
-- to the correct order). The confirm route stores this id when it creates the
-- order. The partial unique index also makes order creation idempotent, so a
-- double confirm (onComplete + the checkout/complete redirect) cannot create
-- two orders for the same checkout session.

alter table public.orders
  add column if not exists whop_checkout_config_id text;

create unique index if not exists orders_whop_checkout_config_id_key
  on public.orders (whop_checkout_config_id)
  where whop_checkout_config_id is not null;
