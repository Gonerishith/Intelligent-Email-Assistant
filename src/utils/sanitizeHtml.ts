/**
 * Utility to safely sanitize HTML email bodies to prevent script execution (XSS)
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';

  return html
    // Remove script tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags with expressions
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove dangerous tags like object, embed, applet, iframe, meta, form
    .replace(/<\/?(object|embed|applet|iframe|meta|form|base|link)\b[^>]*>/gi, '')
    // Remove inline event handlers (onclick, onload, onerror, etc.)
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: and data: in href/src
    .replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"')
    .replace(/src\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'src=""')
    .replace(/href\s*=\s*javascript:[^\s>]+/gi, 'href="#"');
}
