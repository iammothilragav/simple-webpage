import { ComponentProps } from 'react'
import { env } from '@/lib/env'
import { render } from '@react-email/components'
import type { Transporter, SentMessageInfo, TransportOptions } from 'nodemailer'


import EmailOTPVerificationTemplate from './template/email-otp-verification'
import PasswordResetLinkTemplate from './template/password-reset-link'

export enum EmailTemplate {
  EmailOTPVerification = 'EmailOTPVerification',
  PasswordResetLink = 'PasswordResetLink',
}

export type PropsMap = {
  [EmailTemplate.EmailOTPVerification]: ComponentProps<
    typeof EmailOTPVerificationTemplate
  >
  [EmailTemplate.PasswordResetLink]: ComponentProps<
    typeof PasswordResetLinkTemplate
  >
}

// Cache rendered templates to avoid re-rendering
const templateCache = new Map<string, string>()

// Email queue for better performance
interface EmailJob {
  id: string
  to: string
  template: EmailTemplate
  props: PropsMap[EmailTemplate]
  retries: number
  createdAt: Date
}

const emailQueue: EmailJob[] = []
let isProcessing = false
const MAX_RETRIES = 3
const QUEUE_PROCESSING_INTERVAL = 1000 // 1 second

const getEmailTemplate = async <T extends EmailTemplate>(
  template: T,
  props: PropsMap[T]
) => {
  // Create cache key from template and props
  const cacheKey = `${template}-${JSON.stringify(props)}`

  // Check cache first
  if (templateCache.has(cacheKey)) {
    const cached = templateCache.get(cacheKey)!
    return {
      subject:
        template === EmailTemplate.EmailOTPVerification
          ? 'Verify your email'
          : template === EmailTemplate.PasswordResetLink
            ? 'Reset your password'
            : 'Invitation to join BoBo',
      body: cached,
    }
  }

  let body: string
  switch (template) {
    case EmailTemplate.EmailOTPVerification:
      body = await render(
        EmailOTPVerificationTemplate(
          props as PropsMap[EmailTemplate.EmailOTPVerification]
        )
      )
      break
    case EmailTemplate.PasswordResetLink:
      body = await render(
        PasswordResetLinkTemplate(
          props as PropsMap[EmailTemplate.PasswordResetLink]
        )
      )
      break
    default:
      throw new Error(`Unknown email template: ${template}`)
  }

  // Cache the rendered template
  templateCache.set(cacheKey, body)

  return {
    subject:
      template === EmailTemplate.EmailOTPVerification
        ? 'Verify your email'
        : template === EmailTemplate.PasswordResetLink
          ? 'Reset your password'
          : 'Invitation to join BoBo',
    body,
  }
}

const getSmtpConfig = () => {
  const port = parseInt(env.SMTP_PORT || '587', 10)
  return {
    host: env.SMTP_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  }

}

// Lazy transporter initialization with connection pooling
let transporter: Transporter | null = null
let transporterReady: Promise<void> | null = null

const getTransporter = async () => {
  if (!transporter) {
    const nodemailer = (await import('nodemailer')).default
    const smtpConfig = getSmtpConfig()
    transporter = nodemailer.createTransport(smtpConfig as TransportOptions)

    // Verify connection before returning
    transporterReady = new Promise<void>((resolve, reject) => {
      transporter!.verify((error) => {
        if (error) {
          console.error('SMTP connection error:', error)
          reject(error)
        } else {
          console.log('SMTP server is ready to send emails')
          resolve()
        }
      })
    })
  }
  
  // Wait for transporter to be verified
  if (transporterReady) {
    await transporterReady
  }
  
  return transporter
}

// Process email queue
const processEmailQueue = async () => {
  if (isProcessing || emailQueue.length === 0) return

  isProcessing = true
  let job: EmailJob | undefined
  let startTime: number = 0

  try {
    job = emailQueue.shift()
    if (!job) return

    startTime = Date.now()
    const mailTransporter = await getTransporter()

    // Get template asynchronously
    const { subject, body } = await getEmailTemplate(job.template, job.props)

    // Send email with timeout
    const info = (await Promise.race([
      mailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: job.to,
        subject,
        html: body,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), 15000)
      ),
    ])) as SentMessageInfo

    const duration = Date.now() - startTime
    console.log(`Email sent successfully in ${duration}ms:`, info.messageId)
  } catch (error) {
    if (job && startTime) {
      const duration = Date.now() - startTime
      console.error(`Email send failed after ${duration}ms:`, error)

      // Retry logic
      if (job.retries < MAX_RETRIES) {
        job.retries++
        emailQueue.push(job)
        console.log(`Retrying email job ${job.id}, attempt ${job.retries}`)
      } else {
        console.error(`Email job ${job.id} failed after ${MAX_RETRIES} retries`)
      }
    } else {
      console.error('Email send failed:', error)
    }
  } finally {
    isProcessing = false

    // Continue processing if there are more emails (including retries)
    if (emailQueue.length > 0) {
      // Immediately process next email instead of waiting
      setTimeout(() => processEmailQueue(), 0)
    }
  }
}

export const sendMail = async <T extends EmailTemplate>(
  to: string,
  template: T,
  props: PropsMap[NoInfer<T>]
) => {
  const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add to queue
  emailQueue.push({
    id: jobId,
    to,
    template,
    props,
    retries: 0,
    createdAt: new Date(),
  })

  console.log(`Email queued for ${to}: ${template}`)

  // Trigger immediate processing
  if (!isProcessing) {
    // Process immediately instead of waiting 100ms
    processEmailQueue()
  }

  return true
}

// Clean up cache periodically to prevent memory leaks
setInterval(
  () => {
    templateCache.clear()
    console.log('Email template cache cleared')
  },
  1000 * 60 * 60
) // Clear every hour

export { EmailOTPVerificationTemplate, PasswordResetLinkTemplate };