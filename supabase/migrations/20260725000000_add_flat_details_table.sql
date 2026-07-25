-- Owner-only flat details, split out of profile_core so flat photos can carry
-- persisted per-photo room labels (kitchen, living room, ...) instead of the
-- positional UI-only hints used before. profile_core.flat_type is left
-- untouched — it's wired into feed matching (lib/prefs.js) and onboarding.

CREATE TABLE public.flat_details (
    profile_id  text PRIMARY KEY REFERENCES public.profile_core(id) ON DELETE CASCADE,
    description text,
    -- Array of up to 6 {label, url} objects, positionally keyed to the fixed
    -- FLAT_ROOM_LABELS list in lib/photos.js (index 0 = "Living Room", etc).
    photos      jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at  timestamp with time zone NOT NULL DEFAULT now(),
    updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_flat_details_updated_at BEFORE UPDATE ON public.flat_details
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.flat_details ENABLE ROW LEVEL SECURITY;

-- Same read/write shape as profile_lifestyle / profile_preferences: any
-- authenticated user can view (shown on other users' profiles), only the
-- owner can write their own row.
CREATE POLICY flat_details_select ON public.flat_details FOR SELECT USING ((auth.jwt() ->> 'sub') IS NOT NULL);
CREATE POLICY flat_details_insert_own ON public.flat_details FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = profile_id);
CREATE POLICY flat_details_update_own ON public.flat_details FOR UPDATE USING ((auth.jwt() ->> 'sub') = profile_id) WITH CHECK ((auth.jwt() ->> 'sub') = profile_id);
CREATE POLICY flat_details_delete_own ON public.flat_details FOR DELETE USING ((auth.jwt() ->> 'sub') = profile_id);

GRANT ALL ON TABLE public.flat_details TO anon, authenticated, service_role;
