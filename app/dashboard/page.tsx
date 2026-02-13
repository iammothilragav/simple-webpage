"use client";
import React from 'react'
import { logout, authClient } from "@/lib/auth-client"

export default function DashboardPage() {
    const { data: session } = authClient.useSession();
    const user = session?.user;
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-black bg-zinc-50 dark:bg-zinc-950 p-4">
            <h1 className="text-4xl font-bold mb-4">Hi {user?.name}! Welcome to your dashboard</h1>
            <button 
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                onClick={async () => {
                    await logout();
                }}
            >
                Sign Out
            </button>
        </div>
    )
}