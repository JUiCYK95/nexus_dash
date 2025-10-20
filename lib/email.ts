import nodemailer from 'nodemailer'

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP credentials not configured. Emails will be logged to console only.')
      return null
    }

    transporter = nodemailer.createTransport(emailConfig)
  }
  return transporter
}

export interface InvitationEmailData {
  to: string
  organizationName: string
  inviterName?: string
  role: string
  inviteUrl: string
  expiresInDays?: number
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  const {
    to,
    organizationName,
    inviterName,
    role,
    inviteUrl,
    expiresInDays = 7
  } = data

  const roleTranslations: Record<string, string> = {
    'owner': 'Besitzer',
    'admin': 'Administrator',
    'member': 'Mitglied',
    'viewer': 'Betrachter'
  }

  const roleGerman = roleTranslations[role] || role

  // Email subject
  const subject = `Einladung zu ${organizationName}`

  // Email HTML content
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team-Einladung</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Team-Einladung</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Hallo,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                ${inviterName ? `<strong>${inviterName}</strong> hat` : 'Sie wurden'} eingeladen, der Organisation <strong>${organizationName}</strong> beizutreten.
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #666666;">
                  <strong>Ihre Rolle:</strong> ${roleGerman}
                </p>
              </div>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Klicken Sie auf die Schaltfläche unten, um die Einladung anzunehmen und loszulegen:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                      Einladung annehmen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="margin: 10px 0 0 0; font-size: 13px; word-break: break-all; color: #667eea;">
                ${inviteUrl}
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; font-size: 13px; color: #999999;">
                  ⏰ Diese Einladung läuft in ${expiresInDays} Tagen ab.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #999999; text-align: center;">
                Sie haben diese E-Mail erhalten, weil Sie zu einer Organisation eingeladen wurden.
              </p>
              <p style="margin: 0; font-size: 13px; color: #999999; text-align: center;">
                Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  // Plain text version
  const text = `
Hallo,

${inviterName ? `${inviterName} hat` : 'Sie wurden'} eingeladen, der Organisation ${organizationName} beizutreten.

Ihre Rolle: ${roleGerman}

Um die Einladung anzunehmen, besuchen Sie bitte den folgenden Link:
${inviteUrl}

Diese Einladung läuft in ${expiresInDays} Tagen ab.

Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
  `

  const transporter = getTransporter()

  // If no transporter (SMTP not configured), just log to console
  if (!transporter) {
    console.log('\n=== EMAIL INVITATION (Console Only - SMTP not configured) ===')
    console.log(`📧 An: ${to}`)
    console.log(`🏢 Organisation: ${organizationName}`)
    console.log(`👤 Rolle: ${roleGerman}`)
    console.log(`🔗 Einladungslink: ${inviteUrl}`)
    console.log(`⏰ Läuft ab in: ${expiresInDays} Tagen`)
    console.log('================================================================\n')

    console.log('💡 Tipp: Um E-Mails zu versenden, konfigurieren Sie die SMTP-Einstellungen in .env.local:')
    console.log('   SMTP_HOST=smtp.gmail.com')
    console.log('   SMTP_PORT=587')
    console.log('   SMTP_USER=ihr@email.com')
    console.log('   SMTP_PASSWORD=ihr-passwort')
    console.log('   SMTP_SECURE=false\n')

    return {
      success: true,
      messageId: 'console-only',
      message: 'E-Mail wurde in der Konsole geloggt (SMTP nicht konfiguriert)'
    }
  }

  try {
    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || organizationName}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    })

    console.log('\n✅ Einladungs-E-Mail erfolgreich gesendet!')
    console.log(`📧 An: ${to}`)
    console.log(`📬 Message ID: ${info.messageId}`)

    return {
      success: true,
      messageId: info.messageId,
      message: 'E-Mail erfolgreich gesendet'
    }
  } catch (error) {
    console.error('❌ Fehler beim Senden der E-Mail:', error)

    // Fall back to console logging
    console.log('\n=== EMAIL INVITATION (Fallback - E-Mail-Versand fehlgeschlagen) ===')
    console.log(`📧 An: ${to}`)
    console.log(`🏢 Organisation: ${organizationName}`)
    console.log(`👤 Rolle: ${roleGerman}`)
    console.log(`🔗 Einladungslink: ${inviteUrl}`)
    console.log('===================================================================\n')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      message: 'E-Mail konnte nicht gesendet werden (siehe Konsole)'
    }
  }
}

// Verify SMTP connection
export async function verifyEmailConfig() {
  const transporter = getTransporter()

  if (!transporter) {
    return {
      configured: false,
      message: 'SMTP credentials not configured'
    }
  }

  try {
    await transporter.verify()
    return {
      configured: true,
      message: 'SMTP configuration is valid'
    }
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'SMTP configuration is invalid'
    }
  }
}
