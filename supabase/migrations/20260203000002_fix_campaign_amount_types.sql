-- Change reward_amount and stake_amount to NUMERIC to support ETH precision and large values
ALTER TABLE public.campaigns 
ALTER COLUMN reward_amount TYPE NUMERIC USING reward_amount::NUMERIC,
ALTER COLUMN stake_amount TYPE NUMERIC USING stake_amount::NUMERIC;
