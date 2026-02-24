
-- Fix v2_course_members SELECT policy (self-referencing = infinite recursion)
DROP POLICY IF EXISTS "v2_course_members_select" ON public.v2_course_members;
CREATE POLICY "v2_course_members_select" ON public.v2_course_members
  FOR SELECT USING (auth.uid() = user_id);

-- Fix v2_courses SELECT: use security definer function to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_v2_course_member(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.v2_course_members
    WHERE course_id = _course_id AND user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "v2_courses_select" ON public.v2_courses;
CREATE POLICY "v2_courses_select" ON public.v2_courses
  FOR SELECT USING (
    auth.uid() = created_by OR public.is_v2_course_member(id, auth.uid())
  );

-- Fix v2_timetable_slots SELECT: use the same helper function
DROP POLICY IF EXISTS "v2_slots_select" ON public.v2_timetable_slots;
CREATE POLICY "v2_slots_select" ON public.v2_timetable_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.v2_courses
      WHERE v2_courses.id = v2_timetable_slots.course_id AND v2_courses.created_by = auth.uid()
    )
    OR public.is_v2_course_member(course_id, auth.uid())
  );
