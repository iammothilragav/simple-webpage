import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "@/db/drizzle";
import { schema } from "@/db/schema"; 
import { emailOTP } from "better-auth/plugins";
import { sendMail, EmailTemplate } from "@/lib/email";
import { env } from "@/lib/env"
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema:schema
    }),
    user: {
        additionalFields: {
            username: {
                type: "string",
                required: false,
            },
        },
    },
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [
        "http://localhost:3000",
        "https://chasteningly-tawie-lieselotte.ngrok-free.dev"
    ], 
    socialProviders: {
        google: { 
            prompt: "select_account", 
            clientId: env.GOOGLE_CLIENT_ID as string, 
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        }, 
    },
    emailAndPassword:{
        enabled:true,
        sendResetPassword: async ({ user, url }) => {
      try {
        await sendMail(user.email, EmailTemplate.PasswordResetLink, {
          username: user.name || "User",
          link: url,
          userEmail: user.email,
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw error;
      }
    },

    },
    requireEmailVerification: true,
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                try {
                    await sendMail(email, EmailTemplate.EmailOTPVerification, {
                        otp: otp,
                    });
                } catch (error) {
                    throw error;
                }
            },
        })
    ], 
});