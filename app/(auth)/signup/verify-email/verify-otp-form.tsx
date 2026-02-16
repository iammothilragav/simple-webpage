'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Logo } from '@/components/ui/logo'
import { RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InputOTP } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { authClient, useSession } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error'
type ResendStatus = 'idle' | 'sending' | 'success' | 'error'

function usePrevious<T>(value: T) {
  const ref = React.useRef<T>(value)
  React.useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export default function OTPForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user
  const [otp, setOtp] = React.useState('')
  const [status, setStatus] = React.useState<VerificationStatus>('idle')
  const [resendStatus, setResendStatus] = React.useState<ResendStatus>('idle')
  const [timeLeft, setTimeLeft] = React.useState(60)

  const inputContainerRef = React.useRef<HTMLDivElement>(null)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)
  const prevStatus = usePrevious(status)

  const focusFirstInput = () => {
    inputContainerRef.current?.querySelector('input')?.focus()
  }

  const verifyEmail = async (otpCode: string) => {
    try {
      const { data, error } = await authClient.emailOtp.verifyEmail({
        email: user?.email || '',
        otp: otpCode,
      })

      if (error) {
        return { success: false, error: error.message || 'Verification failed' }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Verify OTP error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const resendOTP = async () => {
    try {
      const { data, error } = await authClient.emailOtp.sendVerificationOtp({
        email: user?.email || '',
        type: 'email-verification',
      })

      if (error) {
        console.error('Resend OTP error:', error)
        return {
          success: false,
          error: error.message || 'Failed to resend code',
        }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Resend OTP error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  React.useEffect(() => {
    if (prevStatus === 'verifying' && status === 'error') {
      focusFirstInput()
    }
  }, [status, prevStatus])

  const startTimer = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeLeft(60)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  React.useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current!)
  }, [startTimer])

  // Send OTP automatically when page loads for the first time
  React.useEffect(() => {
    const sendInitialOTP = async () => {
      if (!user?.email) return
      
      console.log('📧 Sending initial OTP to:', user.email)
      
      try {
        const { data, error } = await authClient.emailOtp.sendVerificationOtp({
          email: user.email,
          type: 'email-verification',
        })

        if (error) {
          console.error('Failed to send initial OTP:', error)
        } else {
          console.log('✅ Initial OTP sent successfully')
        }
      } catch (error) {
        console.error('Error sending initial OTP:', error)
      }
    }

    sendInitialOTP()
  }, [user?.email]) // Only run once when user is loaded

  const handleVerify = async (code: string) => {
    if (!code || code.length < 6) return
    setStatus('verifying')

    const result = await verifyEmail(code)

    if (result.success) {
      setStatus('success')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } else {
      setStatus('error')
      setOtp('')
    }
  }

  const handleResend = async () => {
    setResendStatus('sending')
    const result = await resendOTP()

    if (result.success) {
      setOtp('')
      setResendStatus('success')
      startTimer()
      focusFirstInput()
      setTimeout(() => {
        setResendStatus('idle')
      }, 2000)
    } else {
      setResendStatus('error')
      console.error('Resend failed:', result.error)
      setTimeout(() => {
        setResendStatus('idle')
      }, 3000)
    }
  }

  const handleClear = () => {
    setOtp('')
    setStatus('idle')
    focusFirstInput()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-4'>
      <div className='w-full max-w-lg space-y-4'>
        <Card className='border-border/80'>
          <CardHeader className='items-center text-center'>
            <div className='flex items-center justify-center'>
              <Logo className='mb-6' />
            </div>
            <CardTitle className='mb-2'>Enter Verification Code</CardTitle>
            <CardDescription className='leading-relaxed'>
              We{"'"}ve sent a 6-digit code to your email
              <br />
              <span className='font-bold text-foreground'>{user?.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div ref={inputContainerRef} className='flex justify-center'>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(newOtp) => {
                  setOtp(newOtp)
                  if (status === 'error') setStatus('idle')
                }}
                onComplete={handleVerify}
                containerClassName={cn(
                  'flex items-center gap-3',
                  status === 'error' && 'animate-shake'
                )}
                disabled={status === 'verifying' || status === 'success'}
                render={({ slots }) => (
                  <>
                    {slots.map((slot, index) => (
                      <div
                        key={index}
                        className={cn(
                          'relative flex h-12 w-10 items-center justify-center rounded-md border text-base transition-all sm:h-14 sm:w-12 sm:text-lg',
                          'border-input bg-transparent text-foreground',
                          {
                            'border-blue-500 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-background':
                              slot.isActive,
                          },
                          status === 'error' && 'border-red-500/80',
                          status === 'success' &&
                            'border-green-500 text-muted-foreground'
                        )}>
                        {slot.char}
                        {slot.hasFakeCaret && (
                          <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                            <div className='h-4 w-px animate-caret-blink bg-foreground duration-1000' />
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              />
            </div>

            {/* Unified feedback logic: only one message at a time */}
            <div className='text-center text-sm min-h-[40px] flex items-center justify-center'>
              {status === 'verifying' ? (
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Spinner className='h-4 w-4 animate-spin' />
                  Verifying...
                </div>
              ) : resendStatus === 'sending' ? (
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Spinner className='h-4 w-4 animate-spin' />
                  Sending new code...
                </div>
              ) : status === 'error' ? (
                <div className='rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 font-medium text-red-500'>
                  Invalid code. Please try again.
                </div>
              ) : resendStatus === 'error' ? (
                <div className='rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 font-medium text-red-500'>
                  Failed to send new code. Please try again.
                </div>
              ) : resendStatus === 'success' ? (
                <div className='rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2 font-medium text-green-600 dark:text-green-400'>
                  New code sent successfully!
                </div>
              ) : status === 'success' ? (
                <p className='rounded-md border border-green-500/50 bg-green-100/50 p-2 dark:border-green-500/30 dark:bg-green-500/10'>
                  Verification successful! Redirecting to Dashboard...
                </p>
              ) : null}
            </div>

            <div className='flex w-full items-center justify-center gap-4'>
              <Button
                variant='secondary'
                size='sm'
                onClick={handleClear}
                disabled={
                  !otp || status === 'verifying' || status === 'success'
                }
                className='bg-muted/70 hover:bg-muted/90'>
                Clear
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={handleResend}
                disabled={
                  timeLeft > 0 ||
                  status === 'verifying' ||
                  resendStatus === 'sending'
                }
                className='flex items-center text-muted-foreground'>
                <RotateCcwIcon className='mr-2 h-4 w-4' />
                {resendStatus === 'sending' ? 'Sending...' : 'Resend Code'}
              </Button>

              <div className='w-28 text-left text-sm text-muted-foreground'>
                {timeLeft > 0 && `Resend in ${formatTime(timeLeft)}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}