-- Update handle_new_user to set profile.role from signup metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  signup_role text;
begin
  signup_role := new.raw_user_meta_data->>'signup_role';
  insert into public.profiles (user_id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case
      when signup_role = 'seller' then 'seller'::public.user_role
      else 'buyer'::public.user_role
    end
  );
  return new;
end;
$$;
