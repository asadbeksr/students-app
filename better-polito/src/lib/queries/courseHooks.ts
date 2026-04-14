// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const COURSES_QUERY_KEY = ['courses'];
export const COURSE_QUERY_PREFIX = 'course';

export const useGetCourses = () => useQuery({
  queryKey: COURSES_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getCourses().then((r: any) => r.data),
});

export const useGetCourse = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId],
  queryFn: () => (getApiClient() as any).getCourse(courseId).then((r: any) => r.data),
  enabled: !!courseId,
});

export const useGetCourseFiles = (courseId: number, year?: string) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'files', year],
  queryFn: () => (getApiClient() as any).getCourseFiles(courseId, year).then((r: any) => r.data),
  enabled: !!courseId,
  placeholderData: (prev: any) => prev,
});

export const useGetCourseAssignments = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'assignments'],
  queryFn: () => (getApiClient() as any).getCourseAssignments(courseId).then((r: any) => r.data),
  enabled: !!courseId,
});

export const useGetCourseNotices = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'notices'],
  queryFn: () => (getApiClient() as any).getCourseNotices(courseId).then((r: any) => r.data),
  enabled: !!courseId,
});

export const useGetCourseGuide = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'guide'],
  queryFn: () => (getApiClient() as any).getCourseGuide(courseId).then((r: any) => r.data),
  enabled: !!courseId,
});

export const useGetCourseVirtualClassrooms = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'virtualClassrooms'],
  queryFn: () => (getApiClient() as any).getCourseVirtualClassrooms(courseId).then((r: any) => r.data),
  enabled: !!courseId,
});

export const useGetCourseVideolectures = (courseId: number) => useQuery({
  queryKey: [COURSE_QUERY_PREFIX, courseId, 'videolectures'],
  queryFn: () => (getApiClient() as any).getCourseVideolectures(courseId).then((r: any) => r.data),
  enabled: !!courseId,
});
