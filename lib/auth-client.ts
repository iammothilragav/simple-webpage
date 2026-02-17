import { createAuthClient} from "better-auth/react"
import { emailOTPClient } from "better-auth/client/plugins"
import { redirect } from "next/navigation"
import { env } from "./env"

export const authClient = createAuthClient({
    baseURL: typeof window !== 'undefined' 
        ? window.location.origin 
        : env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [
        emailOTPClient()
    ]
})



type SignUpCredentialProps = {
  email: string
  password: string
  name?: string
  username?: string
}

type LoginCredentialProps = {
  email: string
  password: string
}

export const {useSession} = authClient

export async function googleSignIn() {
  await authClient.signIn.social({
    provider: 'google',
    callbackURL: '/dashboard',
  })
}

export async function emailSignup({ email, password, name }: SignUpCredentialProps) {
  const { data, error } = await authClient.signUp.email({
    email: email,
    password: password,
    name: name || '',
    callbackURL: '/dashboard',
  })
  return { data, error }
}

export async function emailLogin({ email, password }: LoginCredentialProps) {
  const { data, error } = await authClient.signIn.email({
    email: email,
    password: password,
  })
  return { data, error }
}

export async function logout() {
  await authClient.signOut()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  } else {
    redirect('/login')
  }
}






