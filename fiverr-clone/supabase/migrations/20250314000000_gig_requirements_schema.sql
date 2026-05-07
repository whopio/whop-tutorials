-- Gig-level requirements: questions the buyer must answer before the seller starts work
alter table public.gigs add column if not exists requirements_schema jsonb not null default '[]'::jsonb;

comment on column public.gigs.requirements_schema is 'Schema for buyer requirement questions: [{ "id": "req_1", "type": "text"|"textarea"|"file", "question": "What is your brand name?", "required": true }]';
