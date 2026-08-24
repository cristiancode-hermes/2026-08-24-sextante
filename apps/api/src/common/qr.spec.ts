import { makeTicketCode, qrSvg } from './qr';

describe('ticket QR', () => {
  it('is deterministic for the same code', () => {
    expect(qrSvg('SXDEMOCONF01')).toBe(qrSvg('SXDEMOCONF01'));
    expect(qrSvg('SXDEMOCONF01')).toContain('<svg');
    expect(qrSvg('AAA')).not.toBe(qrSvg('BBB'));
  });

  it('pads codes to 12 chars', () => {
    expect(makeTicketCode('ab').length).toBe(12);
  });
});
