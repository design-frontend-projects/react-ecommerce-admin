-- Add branch_id to profiles table for user-branch assignment
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Add foreign key constraint
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id)
  ON UPDATE NO ACTION;

-- Add index for efficient branch lookups
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id
  ON public.profiles (branch_id);
