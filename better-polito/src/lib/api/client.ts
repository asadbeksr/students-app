// Modified from polito/students-app — 2026-04-13
// This file provides a web-compatible API client for the PoliTO student portal API.

const BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? 'https://app.didattica.polito.it';

export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(`API Error ${status}`);
  }
}

class ApiClient {
  private baseUrl: string;
  private token?: string;
  private language: string;

  constructor(baseUrl = BASE_PATH, token?: string, language = 'en') {
    this.baseUrl = baseUrl;
    this.token = token;
    this.language = language;
  }

  setToken(token: string | undefined) {
    this.token = token;
  }

  setLanguage(language: string) {
    this.language = language;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': this.language,
      ...(options?.headers as Record<string, string>),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiResponseError(res.status, error);
    }
    return res.json();
  }

  // Auth
  async login(dto: { username: string; password: string; language?: string; preferences?: unknown }) {
    return this.request<{ data: { token: string; clientId: string; username: string; type: string } }>('/v2.0/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async logout() {
    return this.request('/v2.0/auth/logout', { method: 'POST' });
  }

  // Student
  async getStudent() { return this.request<{ data: unknown }>('/v2.0/student'); }
  async getGrades() { return this.request<{ data: unknown[] }>('/v2.0/student/grades'); }
  async getProvisionalGrades() { return this.request<{ data: unknown[] }>('/v2.0/student/provisional-grades'); }
  async getDeadlines(since: string) { return this.request<{ data: unknown[] }>(`/v2.0/student/deadlines?since=${since}`); }
  async getMessages() { return this.request<{ data: unknown[] }>('/v2.0/student/messages'); }
  async getGuides() { return this.request<{ data: unknown[] }>('/v2.0/student/guides'); }
  async getNotifications() { return this.request<{ data: unknown[] }>('/v2.0/student/notifications'); }

  // Courses
  async getCourses() { return this.request<{ data: unknown[] }>('/v2.0/courses'); }
  async getCourse(courseId: number) { return this.request<{ data: unknown }>(`/v2.0/courses/${courseId}`); }
  async getCourseFiles(courseId: number) { return this.request<{ data: unknown }>(`/v2.0/courses/${courseId}/files`); }
  async getCourseAssignments(courseId: number) { return this.request<{ data: unknown[] }>(`/v2.0/courses/${courseId}/assignments`); }
  async getCourseNotices(courseId: number) { return this.request<{ data: unknown[] }>(`/v2.0/courses/${courseId}/notices`); }
  async getCourseGuide(courseId: number) { return this.request<{ data: unknown }>(`/v2.0/courses/${courseId}/guide`); }
  async getCourseVirtualClassrooms(courseId: number) { return this.request<{ data: unknown[] }>(`/v2.0/courses/${courseId}/virtual-classrooms`); }

  // Exams
  async getExams() { return this.request<{ data: unknown[] }>('/v2.0/exams'); }
  async bookExam(examId: number, dto: unknown) {
    return this.request(`/v2.0/exams/${examId}/booking`, { method: 'POST', body: JSON.stringify(dto) });
  }
  async cancelExamBooking(examId: number) {
    return this.request(`/v2.0/exams/${examId}/booking`, { method: 'DELETE' });
  }

  // Bookings
  async getBookings() { return this.request<{ data: unknown[] }>('/v2.0/bookings'); }
  async getBookingTopics() { return this.request<{ data: unknown[] }>('/v2.0/bookings/topics'); }
  async getBookingSlots(topicId: string, from: string, to: string) {
    return this.request<{ data: unknown[] }>(`/v2.0/bookings/topics/${topicId}/slots?from=${from}&to=${to}`);
  }
  async getBookingSeats(topicId: string, slotId: string) {
    return this.request<{ data: unknown[] }>(`/v2.0/bookings/topics/${topicId}/slots/${slotId}/seats`);
  }
  async createBooking(dto: unknown) {
    return this.request('/v2.0/bookings', { method: 'POST', body: JSON.stringify(dto) });
  }
  async deleteBooking(bookingId: string) {
    return this.request(`/v2.0/bookings/${bookingId}`, { method: 'DELETE' });
  }

  // Places
  async getSites() { return this.request<{ data: unknown[] }>('/v2.0/places/sites'); }
  async getBuildings(siteId?: string) {
    return this.request<{ data: unknown[] }>(`/v2.0/places/buildings${siteId ? `?siteId=${siteId}` : ''}`);
  }
  async getPlaces(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: unknown[] }>(`/v2.0/places${qs}`);
  }
  async getPlace(placeId: string) { return this.request<{ data: unknown }>(`/v2.0/places/${placeId}`); }
  async getPlaceCategories() { return this.request<{ data: unknown[] }>('/v2.0/places/categories'); }
  async getFreeRooms(params: Record<string, string>) {
    const qs = '?' + new URLSearchParams(params).toString();
    return this.request<{ data: unknown[] }>(`/v2.0/places/free-rooms${qs}`);
  }

  // People
  async getPeople(search: string) {
    return this.request<{ data: unknown[] }>(`/v2.0/people?search=${encodeURIComponent(search)}`);
  }
  async getPerson(personId: number) { return this.request<{ data: unknown }>(`/v2.0/people/${personId}`); }

  // Tickets
  async getTickets() { return this.request<{ data: unknown[] }>('/v2.0/tickets'); }
  async getTicket(ticketId: number) { return this.request<{ data: unknown }>(`/v2.0/tickets/${ticketId}`); }
  async createTicket(dto: unknown) {
    return this.request('/v2.0/tickets', { method: 'POST', body: JSON.stringify(dto) });
  }
  async replyToTicket(ticketId: number, dto: unknown) {
    return this.request(`/v2.0/tickets/${ticketId}/replies`, { method: 'POST', body: JSON.stringify(dto) });
  }
  async getTicketTopics() { return this.request<{ data: unknown[] }>('/v2.0/tickets/topics'); }
  async searchTicketFaqs(search: string) {
    return this.request<{ data: unknown[] }>(`/v2.0/tickets/faqs?search=${encodeURIComponent(search)}`);
  }
  async markTicketAsClosed(ticketId: number) {
    return this.request(`/v2.0/tickets/${ticketId}/close`, { method: 'POST' });
  }

  // Surveys
  async getSurveys() { return this.request<{ data: unknown[] }>('/v2.0/surveys'); }

  // Offering
  async getOffering() { return this.request<{ data: unknown }>('/v2.0/offering'); }
  async getOfferingDegree(degreeId: string, year?: number) {
    return this.request<{ data: unknown }>(`/v2.0/offering/degrees/${degreeId}${year ? `?year=${year}` : ''}`);
  }
  async getCourseStatistics(shortcode: string, teacherId?: number, year?: number) {
    const params = new URLSearchParams();
    if (teacherId) params.set('teacherId', String(teacherId));
    if (year) params.set('year', String(year));
    const qs = params.toString() ? '?' + params.toString() : '';
    return this.request<{ data: unknown }>(`/v2.0/offering/courses/${shortcode}/statistics${qs}`);
  }

  // News
  async getNews() { return this.request<{ data: unknown[] }>('/v2.0/news'); }
  async getNewsItem(newsItemId: number) { return this.request<{ data: unknown }>(`/v2.0/news/${newsItemId}`); }

  // Job Offers
  async getJobOffers() { return this.request<{ data: unknown[] }>('/v2.0/job-offers'); }
  async getJobOffer(jobOfferId: number) { return this.request<{ data: unknown }>(`/v2.0/job-offers/${jobOfferId}`); }

  // ESC
  async escGet() { return this.request<{ data: unknown }>('/v2.0/esc'); }
  async escRequest() { return this.request('/v2.0/esc/request', { method: 'POST' }); }

  // Announcements
  async getAnnouncements(params?: { _new?: boolean }) {
    const qs = params?._new !== undefined ? `?_new=${params._new}` : '';
    return this.request<{ data: unknown[] }>(`/v2.0/announcements${qs}`);
  }
}

// Global singleton
let _client: ApiClient | null = null;

export const getApiClient = (token?: string, language?: string): ApiClient => {
  if (!_client) _client = new ApiClient(BASE_PATH);
  if (token !== undefined) _client.setToken(token);
  if (language !== undefined) _client.setLanguage(language);
  return _client;
};

export const resetApiClient = () => {
  _client = null;
};

export type { ApiClient };
export default ApiClient;
