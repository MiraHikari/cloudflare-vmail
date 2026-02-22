/**
 * OTP (One-Time Password) Detection Utility
 * Detects and extracts verification codes from email content
 */

// Common OTP patterns
const OTP_PATTERNS = [
  // 6-digit codes
  /\b\d{6}\b/g,
  // 4-digit codes
  /\b\d{4}\b/g,
  // 8-digit codes
  /\b\d{8}\b/g,
  // Codes with spaces (123 456)
  /\b\d{3}\s\d{3}\b/g,
  // Codes with hyphens (123-456)
  /\b\d{3}-\d{3}\b/g,
]

// Keywords that indicate OTP context
const OTP_KEYWORDS = [
  'verification code',
  'verify',
  'otp',
  'code',
  'pin',
  'authentication',
  'confirm',
  'security code',
  '验证码',
  '确认码',
  'one-time',
  'temporary code',
]

/**
 * Extract OTP codes from text
 */
export function extractOTP(text: string | null | undefined): string[] {
  if (!text || typeof text !== 'string') return []

  const lowerText = text.toLowerCase()
  const hasOTPContext = OTP_KEYWORDS.some((keyword) => lowerText.includes(keyword))

  if (!hasOTPContext) return []

  const codes = new Set<string>()

  // Try each pattern
  OTP_PATTERNS.forEach((pattern) => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach((code) => {
        // Clean up and validate
        const cleaned = code.replace(/[\s-]/g, '')
        if (cleaned.length >= 4 && cleaned.length <= 8) {
          codes.add(cleaned)
        }
      })
    }
  })

  return Array.from(codes)
}

/**
 * Highlight OTP codes in HTML content
 */
export function highlightOTP(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return ''
  const otpCodes = extractOTP(html.replace(/<[^>]*>/g, ''))

  if (otpCodes.length === 0) return html

  let highlighted = html

  otpCodes.forEach((code) => {
    // Match the code with word boundaries
    const regex = new RegExp(`\\b${code}\\b`, 'g')
    highlighted = highlighted.replace(
      regex,
      `<mark class="otp-highlight" data-otp="${code}">${code}</mark>`
    )
  })

  return highlighted
}

/**
 * Highlight OTP codes in plain text
 */
export function highlightOTPInText(text: string | null | undefined): {
  text: string
  codes: string[]
} {
  if (!text || typeof text !== 'string') {
    return { text: '', codes: [] }
  }
  const codes = extractOTP(text)

  if (codes.length === 0) {
    return { text, codes: [] }
  }

  let highlighted = text

  codes.forEach((code) => {
    const regex = new RegExp(`\\b${code}\\b`, 'g')
    highlighted = highlighted.replace(regex, `**${code}**`)
  })

  return { text: highlighted, codes }
}
