import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

import VerifyOTPForm from './verify-otp-form'

export default async function VerifyOTPPage() {
  try {
    const sessionInfo = await auth.api.getSession({
      headers: await headers(),
    })

    // If no session, redirect to login
    if (!sessionInfo?.user) {
      console.log('No session found in verify-email, redirecting to login')
      redirect('/login')
    }

    // If email is already verified, redirect to dashboard
    if (sessionInfo.user.emailVerified) {
      console.log('Email already verified, redirecting to dashboard')
      redirect('/')
    }

    // If all checks pass, show verification form
    return <VerifyOTPForm />
  } catch (error) {
    console.error('Error in VerifyOTPPage:', error)

    // If it's a redirect error, let it propagate
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, redirect to login
    redirect('/login')
  }
}