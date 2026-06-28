// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const COURSES_QUERY_KEY = ['courses'];
export const COURSE_QUERY_PREFIX = 'course';

export const useGetCourses = () => useQuery({
  queryKey: COURSES_QUERY_KEY,
  queryFn: () => getApiClient().getCourses().then((r) => r.data),
});

export const useGetCourse = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId],
  queryFn: () => getApiClient().getCourse(courseId).then((r) => r.data),
  enabled: !!courseId,
});

export const useGetCourseFiles = (courseId: number, year?: string) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'files', year],
  queryFn: () => getApiClient().getCourseFiles(courseId, year).then((r) => r.data),
  enabled: !!courseId,
});

export const useGetCourseAssignments = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'assignments'],
  queryFn: () => getApiClient().getCourseAssignments(courseId).then((r) => r.data),
  enabled: !!courseId,
});

export const useGetCourseNotices = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'notices'],
  queryFn: () => getApiClient().getCourseNotices(courseId).then((r) => r.data),
  enabled: !!courseId,
});

export const useGetCourseGuide = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'guide'],
  queryFn: () => getApiClient().getCourseGuide(courseId).then((r) => r.data),
  enabled: !!courseId,
});

export const useGetCourseVirtualClassrooms = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'virtualClassrooms'],
  queryFn: () => getApiClient().getCourseVirtualClassrooms(courseId).then((r) => r.data),
  enabled: !!courseId,
});

export const useGetCourseVideolectures = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'videolectures'],
  queryFn: () => getApiClient().getCourseVideolectures(courseId).then((r) => r.data),
  enabled: !!courseId,
});
