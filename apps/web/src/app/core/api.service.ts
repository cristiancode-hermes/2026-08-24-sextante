import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type {
  Booking,
  BookingDetailResponse,
  CelestialObject,
  Instrument,
  MenuItem,
  Review,
  Sky,
  Slot,
  StaffStats,
  VisibleObject,
} from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  featured(date?: string) {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<{ items: Instrument[]; freeSlotsToday: number }>(
      `${API}/instruments/featured`,
      { params },
    );
  }

  instruments(q?: { q?: string; type?: string; date?: string }) {
    let params = new HttpParams();
    if (q?.q) params = params.set('q', q.q);
    if (q?.type) params = params.set('type', q.type);
    if (q?.date) params = params.set('date', q.date);
    return this.http.get<{ items: Instrument[]; total: number; freeSlotsToday: number }>(
      `${API}/instruments`,
      { params },
    );
  }

  instrument(id: string) {
    return this.http.get<{ instrument: Instrument; ratingAvg: number; ratingCount: number }>(
      `${API}/instruments/${id}`,
    );
  }

  createInstrument(body: Partial<Instrument>) {
    return this.http.post<{ instrument: Instrument }>(`${API}/instruments`, body);
  }

  updateInstrument(id: string, body: Partial<Instrument>) {
    return this.http.patch<{ instrument: Instrument }>(`${API}/instruments/${id}`, body);
  }

  deleteInstrument(id: string) {
    return this.http.delete<{ ok: boolean }>(`${API}/instruments/${id}`);
  }

  slots(instrumentId: string, date: string) {
    return this.http.get<{ slots: Slot[]; sky: Sky }>(
      `${API}/instruments/${instrumentId}/slots`,
      { params: new HttpParams().set('date', date) },
    );
  }

  slot(id: string) {
    return this.http.get<{ slot: Slot; instrument: Instrument; sky: Sky; taken: boolean }>(
      `${API}/slots/${id}`,
    );
  }

  generateSlots(instrumentId: string, date: string, times?: string[]) {
    return this.http.post<{ created: number }>(
      `${API}/instruments/${instrumentId}/slots/generate`,
      { date, times },
    );
  }

  blockSlot(id: string, blocked: boolean) {
    return this.http.patch<{ slot: Slot }>(`${API}/slots/${id}/block`, { blocked });
  }

  objects(q?: { date?: string; slotId?: string }) {
    let params = new HttpParams();
    if (q?.date) params = params.set('date', q.date);
    if (q?.slotId) params = params.set('slotId', q.slotId);
    return this.http.get<{ items: VisibleObject[]; date: string }>(`${API}/objects`, { params });
  }

  object(id: string) {
    return this.http.get<{ object: CelestialObject }>(`${API}/objects/${id}`);
  }

  createObject(body: Partial<CelestialObject>) {
    return this.http.post<{ object: CelestialObject }>(`${API}/objects`, body);
  }

  updateObject(id: string, body: Partial<CelestialObject>) {
    return this.http.patch<{ object: CelestialObject }>(`${API}/objects/${id}`, body);
  }

  sky(date?: string) {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<{ sky: Sky }>(`${API}/sky`, { params });
  }

  putSky(date: string, body: { status: string; note: string }) {
    return this.http.put<{ sky: Sky }>(`${API}/staff/sky/${date}`, body);
  }

  menu() {
    return this.http.get<{ items: MenuItem[] }>(`${API}/menu`);
  }

  hold(body: { slotId: string; partySize: number; objectIds: string[]; addonIds?: string[] }) {
    return this.http.post<BookingDetailResponse>(`${API}/bookings/hold`, body);
  }

  patchHold(id: string, body: { partySize?: number; objectIds?: string[]; addonIds?: string[] }) {
    return this.http.patch<BookingDetailResponse>(`${API}/bookings/${id}`, body);
  }

  confirm(id: string, paymentNonce = 'demo') {
    return this.http.post<BookingDetailResponse>(`${API}/bookings/${id}/confirm`, { paymentNonce });
  }

  bookings(status?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ items: Booking[]; total: number }>(`${API}/bookings`, { params });
  }

  booking(id: string) {
    return this.http.get<BookingDetailResponse>(`${API}/bookings/${id}`);
  }

  cancel(id: string) {
    return this.http.post<BookingDetailResponse>(`${API}/bookings/${id}/cancel`, {});
  }

  complete(id: string) {
    return this.http.post<{ booking: Booking; pointsAwarded: number }>(
      `${API}/bookings/${id}/complete`,
      {},
    );
  }

  queue(id: string) {
    return this.http.get<{ entries: import('../shared/models').QueueEntry[] }>(
      `${API}/bookings/${id}/queue`,
    );
  }

  reorderQueue(id: string, orderedIds: string[]) {
    return this.http.patch<{ entries: import('../shared/models').QueueEntry[] }>(
      `${API}/bookings/${id}/queue`,
      { orderedIds },
    );
  }

  advanceQueue(id: string) {
    return this.http.post<{ entries: import('../shared/models').QueueEntry[] }>(
      `${API}/bookings/${id}/queue/advance`,
      {},
    );
  }

  reviews(instrumentId: string) {
    return this.http.get<{ items: Review[]; avg: number }>(
      `${API}/instruments/${instrumentId}/reviews`,
    );
  }

  createReview(body: { bookingId: string; rating: number; comment?: string }) {
    return this.http.post<{ review: Review }>(`${API}/reviews`, body);
  }

  favorites() {
    return this.http.get<{ items: { instrumentId: string }[] }>(`${API}/favorites`);
  }

  addFavorite(instrumentId: string) {
    return this.http.post(`${API}/favorites`, { instrumentId });
  }

  removeFavorite(instrumentId: string) {
    return this.http.delete(`${API}/favorites/${instrumentId}`);
  }

  emails() {
    return this.http.get<{ items: { id: string; kind: string; toEmail: string; body: string; createdAt: string }[] }>(
      `${API}/account/emails`,
    );
  }

  staffStats(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<StaffStats>(`${API}/staff/stats`, { params });
  }

  checkIn(code: string) {
    return this.http.post<{ booking: Booking; checkIn: unknown }>(`${API}/staff/check-in`, { code });
  }

  checkIns(date?: string) {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<{ items: unknown[] }>(`${API}/staff/check-ins`, { params });
  }
}
