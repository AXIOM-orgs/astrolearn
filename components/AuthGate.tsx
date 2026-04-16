"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, loading, isRestoringSession } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    // Routes yang tidak memerlukan authentication
    const publicRoutes = ["/login"];
    const isPublic = publicRoutes.includes(pathname) || /^\/join\/[A-Z0-9]+$/i.test(pathname);

    // Check if this is an OAuth callback (e.g., Google login redirect)
    const isOAuthCallback =
        typeof window !== "undefined" && window.location.hash.includes("access_token")

    useEffect(() => {
        if (!loading && !isRestoringSession && !isPublic && !user && !isOAuthCallback) {
            router.replace("/login")
        }
    }, [loading, isRestoringSession, user, pathname, router, isPublic, isOAuthCallback])

    // Public routes: render langsung
    if (isPublic) {
        return <>{children}</>;
    }

    // Loading state: tampilkan loading indicator
    if (loading || isRestoringSession) {
        return (
            <div className="screen center" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh'
            }}>
                <div className="loading-spinner" style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--primary-color, #00f0ff)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        )
    }

    // While redirect is in progress for unauthenticated user on private route,
    // keep showing loading to prevent flash of protected content
    if (!user && !isOAuthCallback) {
        return (
            <div className="screen center" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh'
            }}>
                <div className="loading-spinner" style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--primary-color, #00f0ff)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        )
    }

    return <>{children}</>
}
