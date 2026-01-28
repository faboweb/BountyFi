-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('submission-photos', 'submission-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Seed a test campaign
INSERT INTO campaigns (title, rules, prize_pool, deadline, checkpoints)
VALUES (
  'Clean Up Central Park',
  'Take photos of trash collected. Must include the daily code.',
  500,
  NOW() + INTERVAL '7 days',
  '[
    {"name": "North Gate", "lat": 40.7968, "lng": -73.9580, "radius": 50},
    {"name": "Bethesda Fountain", "lat": 40.7738, "lng": -73.9708, "radius": 50},
    {"name": "Sheep Meadow", "lat": 40.7709, "lng": -73.9746, "radius": 50}
  ]'::jsonb
);
