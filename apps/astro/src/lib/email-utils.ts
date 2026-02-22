/**
 * HTML 净化工具 - 移除危险标签和属性
 */

const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'link',
  'style',
  'form',
  'input',
  'button',
  'textarea',
]
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:']

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return ''

  // 创建临时容器
  const temp = document.createElement('div')
  temp.innerHTML = html

  // 移除危险标签
  DANGEROUS_TAGS.forEach((tag) => {
    const elements = temp.querySelectorAll(tag)
    elements.forEach((el) => el.remove())
  })

  // 处理所有链接
  const links = temp.querySelectorAll('a')
  links.forEach((link) => {
    const href = link.getAttribute('href') || ''

    // 检查危险协议
    const isDangerous = DANGEROUS_PROTOCOLS.some((protocol) =>
      href.toLowerCase().startsWith(protocol)
    )

    if (isDangerous) {
      link.removeAttribute('href')
      link.style.textDecoration = 'line-through'
      link.title = 'Dangerous link removed'
    } else {
      // 添加安全属性
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer nofollow')
    }
  })

  // 移除所有 on* 事件处理器
  const allElements = temp.querySelectorAll('*')
  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name)
      }
    })
  })

  // 处理图片 - 添加懒加载
  const images = temp.querySelectorAll('img')
  images.forEach((img) => {
    const src = img.getAttribute('src') || ''

    // 检查危险协议
    const isDangerous = DANGEROUS_PROTOCOLS.some((protocol) =>
      src.toLowerCase().startsWith(protocol)
    )

    if (isDangerous) {
      img.removeAttribute('src')
      img.alt = 'Dangerous image removed'
    } else {
      img.setAttribute('loading', 'lazy')
      img.setAttribute('decoding', 'async')
      // 可选：添加referrerpolicy
      img.setAttribute('referrerpolicy', 'no-referrer')
    }
  })

  return temp.innerHTML
}

/**
 * 构建原始邮件格式（MIME）
 */
export function buildRawMime(email: {
  id?: string
  from?: { name?: string; address: string }
  messageTo?: string
  subject?: string | null
  date?: string | null
  messageId?: string
  text?: string | null
  html?: string | null
}): string {
  const lines: string[] = []

  // 基本头部
  if (email.messageId) lines.push(`Message-ID: ${email.messageId}`)
  if (email.date) lines.push(`Date: ${email.date}`)
  if (email.from) {
    const fromName = email.from.name
      ? `${email.from.name} <${email.from.address}>`
      : email.from.address
    lines.push(`From: ${fromName}`)
  }
  if (email.messageTo) lines.push(`To: ${email.messageTo}`)
  if (email.subject) lines.push(`Subject: ${email.subject}`)

  lines.push('MIME-Version: 1.0')

  // 如果同时有 HTML 和纯文本，使用 multipart
  if (email.html && email.text) {
    const boundary = `----boundary_${Date.now()}`
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    lines.push('')
    lines.push(`--${boundary}`)
    lines.push('Content-Type: text/plain; charset=utf-8')
    lines.push('')
    lines.push(email.text || '')
    lines.push('')
    lines.push(`--${boundary}`)
    lines.push('Content-Type: text/html; charset=utf-8')
    lines.push('')
    lines.push(email.html || '')
    lines.push('')
    lines.push(`--${boundary}--`)
  } else if (email.html) {
    lines.push('Content-Type: text/html; charset=utf-8')
    lines.push('')
    lines.push(email.html)
  } else {
    lines.push('Content-Type: text/plain; charset=utf-8')
    lines.push('')
    lines.push(email.text || '')
  }

  return lines.join('\n')
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string | null | undefined): Promise<boolean> {
  if (!text || typeof text !== 'string') return false

  try {
    // Try modern clipboard API first (requires secure context)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback for older browsers or non-secure contexts
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    textarea.setAttribute('aria-hidden', 'true')
    document.body.appendChild(textarea)

    try {
      textarea.focus()
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  } catch {
    return false
  }
}
