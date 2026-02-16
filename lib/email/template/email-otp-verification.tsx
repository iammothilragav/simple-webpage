import { Logo } from '@/components/ui/logo';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

// const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface EmailOTPVerificationProps {
  otp: string
}

export const EmailOTPVerificationTemplate = ({
  otp,
}: EmailOTPVerificationProps) => {
  return (
    <Html>
      <Tailwind>
        <Head>
          <title>Verify your email - Bobo</title>
        </Head>

        <Preview>Your OTP for Bobo is {otp}</Preview>

        <Body className='bg-slate-100 font-sans py-12'>
          <Container className='max-w-xl mx-auto p-8 bg-white border border-solid border-slate-200'>
            <Section className='text-center'>
              <Logo/>
              <Heading as='h1' className='text-2xl font-bold text-gray-800'>
                Confirm Your Identity
              </Heading>
              <Text className='text-gray-600 mt-2'>
                Enter the following code to complete your verification.
              </Text>
            </Section>

            <Section className='my-8 text-center bg-slate-100 p-4'>
              <Text className='text-3xl font-bold tracking-widest text-blue-600'>
                {otp}
              </Text>
            </Section>

            <Text className='text-center text-gray-500 text-sm'>
              This code will expire in 10 minutes. If you did not request this,
              please disregard this email.
            </Text>

            <Hr className='border-slate-200 my-8' />

            <Section className='text-center text-xs text-gray-400 mb-4'>
              <Text>
                © {new Date().getFullYear()} Bobo. All Rights Reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default EmailOTPVerificationTemplate