-- Migration 00010: Add YouTube URLs for exercises added in migration 00008
-- These exercises were missing youtube_url values.
-- Replace any NULL placeholders below with actual YouTube Shorts URLs.

UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/0tn5K8NqbTY' WHERE name = 'Incline Smith Press' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/8fXfwG4ftaQ' WHERE name = 'Low Incline DB Chest Press' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/Z57CtFmRMxI' WHERE name = 'Pec Dec Fly' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/Kl3LEzQ5Zqs' WHERE name = 'Cable Crucifix Lateral Raise' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/CrbTqNOlFgE' WHERE name = 'Bayesian Curl' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/Rc7-euA8FDI' WHERE name = 'Tricep Rope Extension' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/phVtqawIgbk' WHERE name = 'Barbell Seal Row' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/qD1WZ5pSuvk' WHERE name = 'Chest Supported Bi-Lateral Prone Row' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/LsT-bR_zxLo' WHERE name = 'Single Arm Reverse Pec Dec' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/Htw-s61mOw0' WHERE name = 'Pin Loaded Preacher Curl' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/b_r_LW4HEcM' WHERE name = 'Triceps Katana Extension' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/5rIqP63yWFg' WHERE name = 'Barbell Stiff Leg Deadlift' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/1cS-6KsJW9g' WHERE name = 'Barbell Walking Lunge' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/uODWo4YqbT8' WHERE name = 'Sissy Squat' AND youtube_url IS NULL;
UPDATE public.exercises SET youtube_url = 'https://www.youtube.com/shorts/a-x_NR-ibos' WHERE name = 'Standing Calf Raise' AND youtube_url IS NULL;
