
-- Fix PUBLIC_DATA_EXPOSURE: Restrict v2_courses SELECT to creator/members only
DROP POLICY IF EXISTS "v2_courses_select" ON public.v2_courses;
CREATE POLICY "v2_courses_select" ON public.v2_courses
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.v2_course_members
      WHERE course_id = v2_courses.id AND user_id = auth.uid()
    )
  );

-- Fix v2_course_members SELECT to members of same course only
DROP POLICY IF EXISTS "v2_course_members_select" ON public.v2_course_members;
CREATE POLICY "v2_course_members_select" ON public.v2_course_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.v2_course_members cm
      WHERE cm.course_id = v2_course_members.course_id
      AND cm.user_id = auth.uid()
    )
  );

-- Fix v2_timetable_slots SELECT to course members only
DROP POLICY IF EXISTS "v2_slots_select" ON public.v2_timetable_slots;
CREATE POLICY "v2_slots_select" ON public.v2_timetable_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.v2_course_members
      WHERE course_id = v2_timetable_slots.course_id
      AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.v2_courses
      WHERE id = v2_timetable_slots.course_id
      AND created_by = auth.uid()
    )
  );
