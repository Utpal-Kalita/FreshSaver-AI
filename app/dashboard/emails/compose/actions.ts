'use server'

export async function sendCustomBrevoEmail(formData: FormData) {
  const toEmail = formData.get('to') as string
  const subject = formData.get('subject') as string
  const htmlContent = formData.get('message') as string

  if (!toEmail || !subject || !htmlContent) {
    return { success: false, error: 'All fields are required.' }
  }

  // Pure HTML content format avoiding template ID completely.
  // Using only sender email, name, and api key from ENV variables.
  const payload = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@freshsaver.app',
      name: process.env.BREVO_SENDER_NAME || 'FreshSaver Deals',
    },
    to: [{ email: toEmail }],
    subject: subject,
    htmlContent: htmlContent, 
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY || '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text()
      return { success: false, error: `Brevo Error (${res.status}): ${body}` }
    }

    const data = await res.json()
    return { success: true, messageId: data.messageId }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unable to send email' }
  }
}
