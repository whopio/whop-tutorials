-- Add 'requires_modification' to gig_status enum so gigs can move between all tab states:
-- ACTIVE (published) | PENDING APPROVAL (review) | REQUIRES MODIFICATION | DRAFT | DENIED (rejected) | PAUSED
do $$ begin
  alter type public.gig_status add value 'requires_modification';
exception when duplicate_object then null;
end $$;
