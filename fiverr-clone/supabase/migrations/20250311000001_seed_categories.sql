insert into public.categories (slug, name) values
  ('design', 'Design'),
  ('development', 'Development'),
  ('marketing', 'Marketing'),
  ('writing', 'Writing'),
  ('video', 'Video'),
  ('music', 'Music')
on conflict (slug) do nothing;
