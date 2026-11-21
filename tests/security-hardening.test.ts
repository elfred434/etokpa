// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCsvContent } from '../src/utils/csvExport';
import { resolveImageUrl } from '../src/utils/imageUrl';
import { safeExternalRedirectUrl, safePaymentRedirectUrl, sanitizeImageUrl } from '../src/utils/safeUrl';
import { safeRedirect } from '../src/routes/authGuard';
import { fileToPhoto } from '../src/utils/profilePhoto';
import { fichierEnWebp } from '../src/utils/toWebp';
import { getReverbConfig } from '../src/services/realtime/echo';

function walkSrcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkSrcFiles(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('Frontend security hardening (faille.txt audit)', () => {
  it('contains zero eval, new Function, innerHTML, document.write, or dangerouslySetInnerHTML in src/', () => {
    const files = walkSrcFiles(resolve(process.cwd(), 'src'));
    const dangerousRe = /\b(?:eval\s*\(|new\s+Function\s*\(|document\.write\s*\()|dangerouslySetInnerHTML|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/;
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (dangerousRe.test(content)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('contains zero leaked tokens/keys or verbose console calls in src/', () => {
    const files = walkSrcFiles(resolve(process.cwd(), 'src'));
    const secretRe = /(github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+-----)/;
    const consoleRe = /\bconsole\.(log|debug|info|warn|error)\b/;
    const secretOffenders: string[] = [];
    const consoleOffenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (secretRe.test(content)) secretOffenders.push(file);
      if (consoleRe.test(content)) consoleOffenders.push(file);
    }
    expect(secretOffenders).toEqual([]);
    expect(consoleOffenders).toEqual([]);
  });

  it('sanitizes image URLs and rejects javascript:, vbscript:, and SVG/HTML data URIs', () => {
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('  JaVaScRiPt:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('vbscript:msgbox(1)')).toBeNull();
    expect(sanitizeImageUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull();
    expect(sanitizeImageUrl('//evil.example/a.png')).toBeNull();
    expect(resolveImageUrl('javascript:alert(1)')).toBeNull();
    expect(resolveImageUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();

    expect(sanitizeImageUrl('https://res.cloudinary.com/demo/image/upload/v1/tomate.webp')).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/tomate.webp',
    );
    expect(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(resolveImageUrl('/storage/uploads/tomate.webp', 'https://api.tokpa.bj/api')).toBe(
      'https://api.tokpa.bj/storage/uploads/tomate.webp',
    );
  });

  it('prevents open redirects on payment URLs and auth redirect targets', () => {
    expect(safePaymentRedirectUrl('https://checkout.fedapay.com/abc')).toBe('https://checkout.fedapay.com/abc');
    expect(safePaymentRedirectUrl('https://sandbox-checkout.fedapay.com/tok')).toBe('https://sandbox-checkout.fedapay.com/tok');
    expect(safePaymentRedirectUrl('/payments/sandbox/tok')).toBe('/payments/sandbox/tok');
    expect(safePaymentRedirectUrl('http://localhost:8000/payments/sandbox/tok')).toBe('http://localhost:8000/payments/sandbox/tok');

    expect(safePaymentRedirectUrl('https://evil.example/phish')).toBeNull();
    expect(safePaymentRedirectUrl('http://checkout.fedapay.com/insecure')).toBeNull();
    expect(safePaymentRedirectUrl('javascript:alert(document.cookie)')).toBeNull();
    expect(safePaymentRedirectUrl('//evil.example/phish')).toBeNull();
    expect(safeExternalRedirectUrl('data:text/html,<script>1</script>')).toBeNull();

    expect(safeRedirect('/commandes?detail=12')).toBe('/commandes?detail=12');
    expect(safeRedirect('//evil.example')).toBeNull();
    expect(safeRedirect('/\\evil.example')).toBeNull();
    expect(safeRedirect('/%2f%2fevil.example')).toBeNull();
    expect(safeRedirect('/javascript:alert(1)')).toBeNull();
    expect(safeRedirect('/commandes\r\nX-Injected: 1')).toBeNull();
  });

  it('neutralizes CSV formula injection payloads (CWE-1236)', () => {
    const csv = buildCsvContent(
      ['Nom', 'Note'],
      [
        ["=CMD|'/C calc'!A0", '+1+1'],
        ['-2+3', '@SUM(1,2)'],
        ['\t=HYPERLINK("https://evil.test")', 'Tomate'],
      ],
    );
    expect(csv).toContain('"\'=CMD|\'/C calc\'!A0";"\'+1+1"');
    expect(csv).toContain('"\'-2+3";"\'@SUM(1,2)"');
    expect(csv).toContain('"\'\t=HYPERLINK(""https://evil.test"")";"Tomate"');
  });

  it('blocks SVG and HTML uploads in profilePhoto and toWebp converters', async () => {
    const svgFile = new File(['<svg onload="alert(1)"></svg>'], 'avatar.svg', { type: 'image/svg+xml' });
    await expect(fileToPhoto(svgFile)).rejects.toThrow('type');
    await expect(fichierEnWebp(svgFile)).rejects.toThrow('format');

    const htmlFile = new File(['<html></html>'], 'page.html', { type: 'text/html' });
    await expect(fileToPhoto(htmlFile)).rejects.toThrow('type');
    await expect(fichierEnWebp(htmlFile)).rejects.toThrow('format');
  });

  it('forces wss:// WebSocket scheme when the page runs over HTTPS', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, protocol: 'https:' },
    });
    try {
      expect(getReverbConfig().scheme).toBe('wss');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('ships strict security headers, matching inline script CSP hash, and disables production sourcemaps', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');
    const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const expectedHash = `sha256-${createHash('sha256').update(scriptMatch![1]!, 'utf8').digest('base64')}`;

    const vercelRaw = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf-8');
    const vercel = JSON.parse(vercelRaw) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    const globalHeaders = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? [];
    const byKey = Object.fromEntries(globalHeaders.map((h) => [h.key, h.value]));

    expect(byKey['X-Frame-Options']).toBe('DENY');
    expect(byKey['X-Content-Type-Options']).toBe('nosniff');
    expect(byKey['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(byKey['Strict-Transport-Security']).toContain('max-age=31536000');

    const csp = byKey['Content-Security-Policy'] ?? '';
    expect(csp).toContain(`'${expectedHash}'`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");

    const nginx = readFileSync(resolve(process.cwd(), 'nginx.conf'), 'utf-8');
    expect(nginx).toContain('X-Frame-Options "DENY"');
    expect(nginx).toContain('X-Content-Type-Options "nosniff"');
    expect(nginx).toContain(expectedHash);

    const viteCfg = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf-8');
    expect(viteCfg).toContain('sourcemap: false');
  });
});
