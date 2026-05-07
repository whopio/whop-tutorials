-- Allow sellers to create conversations (when initiating chat with buyer)
create policy "conversations insert seller"
  on public.conversations for insert
  with check (auth.uid() = seller_user_id);
