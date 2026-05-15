/**
 * Legacy local stubs for older recruiter pages (InterviewRounds, OfferRelease, OfferTracking).
 * Prefer `recruiterService` + API for new code.
 */

export function createInterview(payload: Record<string, unknown>): void {
  console.warn("[recruiterStorage] createInterview is a stub; use recruiterService.scheduleInterview", payload);
}

export function createOffer(payload: Record<string, unknown>): void {
  console.warn("[recruiterStorage] createOffer is a stub; use recruiterService.createOffer", payload);
}

export function getOffers(): unknown[] {
  return [];
}

export function updateOfferStatus(_offerId: string, _status: string): void {
  console.warn("[recruiterStorage] updateOfferStatus is a stub; use recruiterService.updateOfferStatus");
}

export function convertToEmployee(_candidateId: string): void {
  console.warn("[recruiterStorage] convertToEmployee is a stub");
}
