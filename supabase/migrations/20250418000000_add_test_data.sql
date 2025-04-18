
-- Insert test profile for Miller
INSERT INTO public.profiles (id, email, has_purchased, purchase_date)
VALUES 
  ('test-user-id', 'millerdjonathan@gmail.com', true, NOW())
ON CONFLICT (id) DO UPDATE
SET has_purchased = true,
    purchase_date = NOW();

-- Insert test conversation/mystery data
INSERT INTO public.conversations (id, user_id, title, mystery_data)
VALUES (
  'test-mystery-id',
  'test-user-id',
  'A 1920s Speakeasy Murder',
  jsonb_build_object(
    'theme', '1920s Speakeasy',
    'playerCount', 8,
    'hasAccomplice', true,
    'premise', 'In the heart of Chicago''s underground speakeasy scene, a prominent mobster is found dead during a private poker game. With the shadows of prohibition looming and tensions high, everyone from the jazz singer to the bootlegger could be the killer.'
  )
)
ON CONFLICT (id) DO NOTHING;
