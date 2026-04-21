// Modified from polito/students-app — 2026-04-13
// Paths validated against https://app.didattica.polito.it/mock/api (Prism mock server)

const BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? 'https://app.didattica.polito.it';
const API_PREFIX = '/api';

// In the browser, route through our Next.js proxy to avoid CORS.
// On the server (e.g. NextAuth authorize), hit PoliTO directly.
const isServer = typeof window === 'undefined';
const getBaseUrl = () => isServer ? `${BASE_PATH}${API_PREFIX}` : '/api/polito';

export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(`API Error ${status}`);
  }
}

class ApiClient {
  private token?: string;
  private language: string;

  constructor(token?: string, language = 'en') {
    this.token = token;
    this.language = language;
  }

  setToken(token: string | undefined) {
    this.token = token;
  }

  setLanguage(language: string) {
    this.language = language;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': this.language,
      ...(options?.headers as Record<string, string>),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      // Notify the app that the PoliTO token has expired so it can sign the user out
      if (res.status === 401 && !isServer) {
        window.dispatchEvent(new CustomEvent('polito-auth-expired'));
      }
      throw new ApiResponseError(res.status, error);
    }
    return res.json();
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  // POST /auth/login — confirmed working
  async login(dto: {
    username?: string;
    password?: string;
    uid?: string;
    key?: string;
    loginType: 'basic' | 'sso';
    preferences?: { language?: string };
  }) {
    const body = {
      ...dto,
      device: {
        platform: 'web',
        version: '1',
        model: 'browser',
        manufacturer: 'browser',
        name: 'better-polito',
        toothPicCompatible: false,
      },
      client: {
        name: 'better-polito',
        buildNumber: '1',
        appVersion: '1.0.0',
        id: 'better-polito-web',
      },
    };
    return this.request<{ data: { token: string; clientId: string; username: string; type: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // ─── Me / Student profile ────────────────────────────────────────────────
  // GET /me — confirmed in spec
  async getMe() { return this.request<{ data: unknown }>('/me'); }

  // ─── Grades ──────────────────────────────────────────────────────────────
  // GET /grades — confirmed in spec
  // GET /provisional-grades — confirmed in spec
  async getGrades() { return this.request<{ data: unknown[] }>('/grades'); }
  async getProvisionalGrades() { return this.request<{ data: unknown[] }>('/provisional-grades'); }

  // ─── Deadlines ───────────────────────────────────────────────────────────
  // GET /deadlines — confirmed in spec
  async getDeadlines(params?: { fromDate?: string; toDate?: string }) {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<{ data: unknown[] }>(`/deadlines${qs}`);
  }

  // ─── Messages ────────────────────────────────────────────────────────────
  // GET /messages — confirmed in spec
  async getMessages() { return this.request<{ data: unknown[] }>('/messages'); }
  async markMessageAsRead(messageId: number) {
    return this.request(`/messages/${messageId}/read`, { method: 'POST' });
  }
  async deleteMessage(messageId: number) {
    return this.request(`/messages/${messageId}`, { method: 'DELETE' });
  }

  // ─── Guides ──────────────────────────────────────────────────────────────
  // GET /guides — confirmed in spec
  async getGuides() { return this.request<{ data: unknown[] }>('/guides'); }

  // ─── Notifications ───────────────────────────────────────────────────────
  // GET /notifications — confirmed in spec
  async getNotifications() { return this.request<{ data: unknown[] }>('/notifications'); }
  async markNotificationAsRead(notificationId: number) {
    return this.request(`/notifications/${notificationId}/read`, { method: 'POST' });
  }
  async getNotificationPreferences() {
    return this.request<{ data: unknown }>('/notifications/preferences');
  }

  // ─── Courses ─────────────────────────────────────────────────────────────
  // GET /courses, /courses/{id}, /courses/{id}/... — all confirmed in spec
  async getCourses() { return this.request<{ data: unknown[] }>('/courses'); }
  async getCourse(courseId: number) { return this.request<{ data: unknown }>(`/courses/${courseId}`); }
  async getCourseFiles(courseId: number, year?: string) {
    const qs = year ? `?year=${encodeURIComponent(year)}` : '';
    return this.request<{ data: unknown }>(`/courses/${courseId}/files${qs}`);
  }
  async getCourseAssignments(courseId: number) { return this.request<{ data: unknown[] }>(`/courses/${courseId}/assignments`); }
  async getCourseNotices(courseId: number) { return this.request<{ data: unknown[] }>(`/courses/${courseId}/notices`); }
  async getCourseGuide(courseId: number) { return this.request<{ data: unknown }>(`/courses/${courseId}/guide`); }
  async getCourseVirtualClassrooms(courseId: number) { return this.request<{ data: unknown[] }>(`/courses/${courseId}/virtual-classrooms`); }
  async getCourseVideolectures(courseId: number) { return this.request<{ data: unknown[] }>(`/courses/${courseId}/videolectures`); }

  // ─── Exams ───────────────────────────────────────────────────────────────
  // GET /exams — confirmed in spec
  async getExams() { return this.request<{ data: unknown[] }>('/exams'); }
  async bookExam(examId: number, dto: unknown) {
    return this.request(`/exams/${examId}/booking`, { method: 'POST', body: JSON.stringify(dto) });
  }
  async cancelExamBooking(examId: number) {
    return this.request(`/exams/${examId}/booking`, { method: 'DELETE' });
  }

  // ─── Lectures ────────────────────────────────────────────────────────────
  // GET /lectures — confirmed in spec
  async getLectures(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: unknown[] }>(`/lectures${qs}`);
  }

  // ─── Bookings ────────────────────────────────────────────────────────────
  // GET /bookings — confirmed in spec. /bookings/topics GET not supported (405).
  async getBookings() { return this.request<{ data: unknown[] }>('/bookings'); }
  async createBooking(dto: unknown) {
    return this.request('/bookings', { method: 'POST', body: JSON.stringify(dto) });
  }
  async deleteBooking(bookingId: string) {
    return this.request(`/bookings/${bookingId}`, { method: 'DELETE' });
  }

  // ─── Tickets ─────────────────────────────────────────────────────────────
  // GET /tickets, /tickets/topics — confirmed in spec
  async getTickets() { return this.request<{ data: unknown[] }>('/tickets'); }
  async getTicket(ticketId: number) { return this.request<{ data: unknown }>(`/tickets/${ticketId}`); }
  async createTicket(dto: unknown) {
    return this.request('/tickets', { method: 'POST', body: JSON.stringify(dto) });
  }
  async replyToTicket(ticketId: number, dto: unknown) {
    return this.request(`/tickets/${ticketId}/replies`, { method: 'POST', body: JSON.stringify(dto) });
  }
  async getTicketTopics() { return this.request<{ data: unknown[] }>('/tickets/topics'); }

  // ─── People ──────────────────────────────────────────────────────────────
  // GET /people — confirmed in spec
  async getPeople(search: string) {
    return this.request<{ data: unknown[] }>(`/people?search=${encodeURIComponent(search)}`);
  }
  async getPerson(personId: number) { return this.request<{ data: unknown }>(`/people/${personId}`); }

  // ─── Surveys ─────────────────────────────────────────────────────────────
  // GET /surveys — confirmed in spec
  async getSurveys() { return this.request<{ data: unknown[] }>('/surveys'); }

  // ─── Offering ────────────────────────────────────────────────────────────
  // GET /offering, /offering/degrees/{id}, /offering/courses/{id}/statistics — confirmed in spec
  async getOffering() { return this.request<{ data: unknown }>('/offering'); }
  async getOfferingDegree(degreeId: string, year?: number) {
    return this.request<{ data: unknown }>(`/offering/degrees/${degreeId}${year ? `?year=${year}` : ''}`);
  }
  async getCourseStatistics(shortcode: string, teacherId?: number, year?: number) {
    const params = new URLSearchParams();
    if (teacherId) params.set('teacherId', String(teacherId));
    if (year) params.set('year', String(year));
    const qs = params.toString() ? '?' + params.toString() : '';
    return this.request<{ data: unknown }>(`/offering/courses/${shortcode}/statistics${qs}`);
  }

  // ─── News ─────────────────────────────────────────────────────────────────
  // GET /news — confirmed in spec
  async getNews() { return this.request<{ data: unknown[] }>('/news'); }
  async getNewsItem(newsItemId: number) { return this.request<{ data: unknown }>(`/news/${newsItemId}`); }

  // ─── Job Offers ──────────────────────────────────────────────────────────
  // GET /job-offers — confirmed in spec
  async getJobOffers() { return this.request<{ data: unknown[] }>('/job-offers'); }
  async getJobOffer(jobOfferId: number) { return this.request<{ data: unknown }>(`/job-offers/${jobOfferId}`); }

  // ─── ESC ─────────────────────────────────────────────────────────────────
  // GET /esc — confirmed in spec
  async escGet() { return this.request<{ data: unknown }>('/esc'); }
  async escRequest() { return this.request('/esc/request', { method: 'POST' }); }

  // ─── NOT IN SPEC (removed) ───────────────────────────────────────────────
  // ✗ /student, /student/grades, /student/messages, /student/notifications, etc.
  // ✗ /places, /places/sites, /places/buildings, /places/free-rooms
  // ✗ /announcements
  // ✗ /bookings/topics/{id}/slots
}

// Global singleton
let _client: ApiClient | null = null;

export const getApiClient = (token?: string, language?: string): ApiClient => {
  if (!_client) _client = new ApiClient();
  if (token !== undefined) _client.setToken(token);
  if (language !== undefined) _client.setLanguage(language);
  return _client;
};

export const resetApiClient = () => {
  _client = null;
};

export type { ApiClient };
export default ApiClient;
