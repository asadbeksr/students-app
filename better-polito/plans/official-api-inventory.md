# PoliTO Official API Inventory (from students-app)

Generated on: 2026-04-14

## Legend

| Icon | Meaning |
|---|---|
| ✅ | Official operation exists in better-polito and is currently used |
| 🟨 | Implemented in better-polito client, but currently unused |
| ⚠️ | Called by better-polito code, but missing in better-polito client (mismatch) |
| ❌ | Used by official app, but not implemented in better-polito client |

## API Coverage Table

Source of truth for official usage: students-app under src/core/queries, src/features/agenda/queries, and related feature screens.

| Area | Official operation | Path | better-polito method | Implemented in better-polito client | Used by better-polito | Status |
|---|---|---|---|---|---|---|
| Auth | login | POST /auth/login | login | Yes | Yes | ✅ |
| Auth | logout | POST /auth/logout | logout | Yes | No | 🟨 |
| Auth | switchCareer | Not confirmed in this repo | switchCareer | No | No | ❌ |
| Auth | appInfo | Not confirmed in this repo | appInfo | No | No | ❌ |
| Auth | getMailLink | Not confirmed in this repo | getMailLink | No | No | ❌ |
| Auth | getMfaStatus | Not confirmed in this repo | getMfaStatus | No | No | ❌ |
| Auth | enrolMfa | Not confirmed in this repo | enrolMfa | No | No | ❌ |
| Auth | validateMfa | Not confirmed in this repo | validateMfa | No | No | ❌ |
| Auth | fetchChallenge | Not confirmed in this repo | fetchChallenge | No | No | ❌ |
| Announcements | getAnnouncements | Not confirmed in this repo | getAnnouncements | No | No | ❌ |
| Announcements | markAnnouncementAsRead | Not confirmed in this repo | markAnnouncementAsRead | No | No | ❌ |
| Student | getStudent | GET /me (mapped) | getMe | Yes | Yes | ✅ |
| Student | getStudentGrades | GET /grades (mapped) | getGrades | Yes | Yes | ✅ |
| Student | getStudentProvisionalGrades | GET /provisional-grades (mapped) | getProvisionalGrades | Yes | Yes | ✅ |
| Student | acceptProvisionalGrade | Not confirmed in this repo | acceptProvisionalGrade | No | No | ❌ |
| Student | rejectProvisionalGrade | Not confirmed in this repo | rejectProvisionalGrade | No | No | ❌ |
| Student | getDeadlines | GET /deadlines | getDeadlines | Yes | Yes | ✅ |
| Student | updateDevicePreferences | Not confirmed in this repo | updateDevicePreferences | No | No | ❌ |
| Student | getMessages | GET /messages | getMessages | Yes | Yes | ✅ |
| Student | markMessageAsRead | POST /messages/{id}/read | markMessageAsRead | Yes | Yes | ✅ |
| Student | deleteMessage | DELETE /messages/{id} | deleteMessage | Yes | Yes | ✅ |
| Student | getGuides | GET /guides | getGuides | Yes | Yes | ✅ |
| Student | getNotifications | GET /notifications | getNotifications | Yes | Yes | ✅ |
| Student | markNotificationAsRead | POST /notifications/{id}/read | markNotificationAsRead | Yes | Yes | ✅ |
| Student | getNotificationPreferences | GET /notifications/preferences | getNotificationPreferences | Yes | No | 🟨 |
| Student | updateNotificationPreferences | Not confirmed in this repo | updateNotificationPreferences | No | No | ❌ |
| Student | getUnreadEmailsNumber | Not confirmed in this repo | getUnreadEmailsNumber | No | No | ❌ |
| Courses | getCourses | GET /courses | getCourses | Yes | Yes | ✅ |
| Courses | getCourse | GET /courses/{courseId} | getCourse | Yes | Yes | ✅ |
| Courses | getCourseFiles | GET /courses/{courseId}/files | getCourseFiles | Yes | Yes | ✅ |
| Courses | getCourseAssignments | GET /courses/{courseId}/assignments | getCourseAssignments | Yes | Yes | ✅ |
| Courses | uploadCourseAssignment | Not confirmed in this repo | uploadCourseAssignment | No | No | ❌ |
| Courses | getCourseGuide | GET /courses/{courseId}/guide | getCourseGuide | Yes | Yes | ✅ |
| Courses | getCourseNotices | GET /courses/{courseId}/notices | getCourseNotices | Yes | Yes | ✅ |
| Courses | getCourseVirtualClassrooms | GET /courses/{courseId}/virtual-classrooms | getCourseVirtualClassrooms | Yes | Yes | ✅ |
| Courses | getCourseVideolectures | GET /courses/{courseId}/videolectures | getCourseVideolectures | Yes | Yes | ✅ |
| Courses | getNextLecture | Not confirmed in this repo | getNextLecture | No | No | ❌ |
| Courses | updateCoursePreferences | Not confirmed in this repo | updateCoursePreferences | No | No | ❌ |
| Lectures | getLectures | GET /lectures | getLectures | Yes | Yes | ✅ |
| Exams | getExams | GET /exams | getExams | Yes | Yes | ✅ |
| Exams | bookExam | POST /exams/{examId}/booking | bookExam | Yes | Yes | ✅ |
| Exams | deleteExamBookingById | DELETE /exams/{examId}/booking | cancelExamBooking | Yes | Yes | ✅ |
| Exams | rescheduleExam | Not confirmed in this repo | rescheduleExam | No | No | ❌ |
| Bookings | getBookings | GET /bookings | getBookings | Yes | Yes | ✅ |
| Bookings | getBookingTopics | Not confirmed in this repo | getBookingTopics | No | No | ❌ |
| Bookings | getBookingSlots | Not confirmed in this repo | getBookingSlots | No | No | ❌ |
| Bookings | getBookingSeats | Not confirmed in this repo | getBookingSeats | No | No | ❌ |
| Bookings | updateBooking | Not confirmed in this repo | updateBooking | No | No | ❌ |
| Bookings | createBooking | POST /bookings | createBooking | Yes | Yes | ✅ |
| Bookings | deleteBookingRaw | DELETE /bookings/{bookingId} | deleteBooking | Yes | Yes | ✅ |
| Tickets | getTickets | GET /tickets | getTickets | Yes | Yes | ✅ |
| Tickets | getTicket | GET /tickets/{ticketId} | getTicket | Yes | Yes | ✅ |
| Tickets | createTicket | POST /tickets | createTicket | Yes | Yes | ✅ |
| Tickets | replyToTicket | POST /tickets/{ticketId}/replies | replyToTicket | Yes | Yes | ✅ |
| Tickets | markTicketAsClosed | Not confirmed in this repo | markTicketAsClosed | No | Yes | ⚠️ |
| Tickets | markTicketAsRead | Not confirmed in this repo | markTicketAsRead | No | No | ❌ |
| Tickets | getTicketTopics | GET /tickets/topics | getTicketTopics | Yes | Yes | ✅ |
| Tickets | searchTicketFAQs | Not confirmed in this repo | searchTicketFaqs | No | Yes | ⚠️ |
| Tickets | setTicketReplyFeedback | Not confirmed in this repo | setTicketReplyFeedback | No | No | ❌ |
| Tickets | getTicketAttachment | GET /tickets/{ticketId}/attachments/{attachmentId} | getTicketAttachment | No | No | ❌ |
| Tickets | getTicketReplyAttachment | GET /tickets/{ticketId}/replies/{replyId}/attachments/{attachmentId} | getTicketReplyAttachment | No | No | ❌ |
| People | getPeople | GET /people?search=... | getPeople | Yes | Yes | ✅ |
| People | getPerson | GET /people/{personId} | getPerson | Yes | Yes | ✅ |
| Places | getSites | Path not explicitly mapped here | getSites | Yes | Yes | ✅ |
| Places | getBuildings | Path not explicitly mapped here | getBuildings | Yes | Yes | ✅ |
| Places | getPlaces | Path not explicitly mapped here | getPlaces | Yes | Yes | ✅ |
| Places | getFreeRooms | Path not explicitly mapped here | getFreeRooms | Yes | Yes | ✅ |
| Places | getPlaceCategories | Path not explicitly mapped here | getPlaceCategories | Yes | Yes | ✅ |
| Places | getPlace | Path not explicitly mapped here | getPlace | Yes | Yes | ✅ |
| Surveys | getSurveys | GET /surveys | getSurveys | Yes | Yes | ✅ |
| Offering | getOffering | GET /offering | getOffering | Yes | Yes | ✅ |
| Offering | getOfferingDegree | GET /offering/degrees/{degreeId} | getOfferingDegree | Yes | Yes | ✅ |
| Offering | getOfferingCourse | Not confirmed in this repo | getOfferingCourse | No | No | ❌ |
| Offering | getCourseStatistics | GET /offering/courses/{shortcode}/statistics | getCourseStatistics | Yes | Yes | ✅ |
| News | getNews | GET /news | getNews | Yes | Yes | ✅ |
| News | getNewsItem | GET /news/{newsItemId} | getNewsItem | Yes | Yes | ✅ |
| JobOffers | getJobOffers | GET /job-offers | getJobOffers | Yes | Yes | ✅ |
| JobOffers | getJobOffer | GET /job-offers/{jobOfferId} | getJobOffer | Yes | Yes | ✅ |
| ESC | escGet | GET /esc | escGet | Yes | Yes | ✅ |
| ESC | escRequest | POST /esc/request | escRequest | Yes | Yes | ✅ |
| ESC | escDelete | Not confirmed in this repo | escDelete | No | No | ❌ |

## Practical Response Fields Table (observed in official app)

| Resource | Key fields observed in UI/business logic |
|---|---|
| Student profile (/me) | username, firstName, lastName, degreeName, degreeLevel, degreeId, firstEnrollmentYear, status, allCareerIds, smartCardPicture, europeanStudentCard.canBeRequested, totalCredits, totalAttendedCredits, isCurrentlyEnrolled |
| Messages | id, title, sentAt, isRead, type, message/body content |
| Notifications | id, scope-based grouping keys, transaction metadata (for push handling) |
| Courses overview/detail | id, name, shortcode, year, teachingPeriod, cfu, modules[].id, modules[].previousEditions[], previousEditions[].id/year, staff[].id/role, vcPreviousYears[], vcOtherCourses[] |
| Course files/directories | type, id, name, files[]; for files: id, name, mimeType, sizeInKiloBytes, createdAt, checksum |
| Course assignments | id, description, url, mimeType, sizeInKiloBytes, uploadedAt, deletedAt |
| Course notices | id, content, publishedAt |
| Course guide | sections[].title, sections[].content |
| Course lectures/VC/video | id, title, teacherId, createdAt, courseId, duration (video/recorded VC), startsAt, endsAt, place, virtualClassrooms, description |
| Exams | id, courseName, courseShortcode, moduleNumber, examStartsAt, examEndsAt, status, places[].name, teacherId |
| Recorded grades | courseName, date, credits, grade |
| Provisional grades | id, courseName, state, canBeRejected, rejectingExpiresAt, rejectedAt |
| Bookings | id, startsAt, endsAt, cancelableUntil, topic.title |
| Tickets | overview: id, subject, message, status, unreadCount, hasAttachments, updatedAt; replies: id, createdAt, isFromAgent, needsFeedback; attachments: id, filename, sizeInKiloBytes, mimeType |
| People | id, firstName, lastName, contact fields, teaching/course relations |
| Places | id, name, latitude, longitude, site.id/siteId, category.id/name, category.subCategory.id, room.name, floor.level |
| News | id, title, shortDescription, createdAt |
| Job offers | id, title, location, companyName, endsAtDate |
| Surveys | id, title, subtitle, url, isMandatory, isCompiled, startsAt, category.id/name, type.id/name |
| Offering statistics | year, years[], teachers[].id/firstName/lastName, totalSucceeded, totalFailed, previousYearsToCompare[].year/succeeded/failed, firstYear.succeeded/failed, otherYears.succeeded/failed |
| ESC | ESC details object fields + european student card status enum values used in UI |

## Priority Fixes

1. Fix mismatches first: add client methods for markTicketAsClosed and searchTicketFaqs (or rename hooks to existing methods if intended).
2. Then implement missing booking/ticket workflow operations (booking topics/slots/seats/update, ticket mark-as-read/feedback).
3. Then implement auth/MFA, announcements, and remaining parity endpoints.
