import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useRole, type Role } from '@/contexts/RoleContext'

const roleOptions = [
  { value: 'SYSTEM ADMIN', title: 'SYSTEM ADMIN' },
  { value: 'CURRICULUM COMMITTEE', title: 'CURRICULUM COMMITTEE' },
  { value: 'DEPARTMENT CHAIR', title: 'DEPARTMENT CHAIR' },
  { value: 'REGISTRAR', title: 'REGISTRAR' },
] as const

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}


function normalizeRole(role?: string): Role {
  if (!role) return 'Admin'
  // Map backend roles (with spaces) to frontend Role type
  if (role === 'SYSTEM ADMIN') return 'Admin'
  if (role === 'CURRICULUM COMMITTEE') return 'Curriculum Committee'
  if (role === 'DEPARTMENT CHAIR') return 'Department Chair'
  if (role === 'REGISTRAR') return 'Registrar'
  return role as Role
}

export function LoginPage() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('SYSTEM ADMIN')
  const [pendingCredential, setPendingCredential] = useState<string | null>(null)
  const navigate = useNavigate()
  const { googleLogin } = useAuth()
  const { setRole } = useRole()
  const googleButtonRef = useRef<HTMLDivElement>(null)

  // Complete sign-in with role (for new users)
  const completeSignUpWithRole = async () => {
    if (!pendingCredential) return
    
    setIsGoogleLoading(true)
    try {
      const result = await googleLogin(pendingCredential, selectedRole)

      if (!result.success) {
        toast.error(result.error || 'Failed to create account')
        return
      }

      setRole(normalizeRole(result.user.role))
      toast.success(`Welcome, ${result.user.name}! Account created successfully.`)
      navigate('/dashboard')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      toast.error(`Sign-up failed: ${errorMessage}`)
    } finally {
      setIsGoogleLoading(false)
      setPendingCredential(null)
      setShowRoleSelection(false)
    }
  }

  // Handle Google Sign-In
  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    setIsGoogleLoading(true)
    try {
      console.log('Google credential received, attempting sign-in...')
      
      // First, try to sign in without role (for existing users)
      const result = await googleLogin(response.credential)

      if (result.success) {
        // Existing user - sign in successful
        setRole(normalizeRole(result.user.role))
        toast.success(`Welcome back, ${result.user.name}!`)
        navigate('/dashboard')
        return
      }

      // Check if error is about role being required (new user)
      if (result.error?.toLowerCase().includes('role is required') || 
          result.error?.toLowerCase().includes('role required')) {
        console.log('New user detected, showing role selection...')
        setPendingCredential(response.credential)
        setShowRoleSelection(true)
        return
      }

      // Other error
      console.error('Login failed:', result.error)
      toast.error(result.error || 'Google sign-in failed')
    } catch (error) {
      console.error('Google sign-in error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to server'
      toast.error(`Sign-in failed: ${errorMessage}`)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // Initialize Google Sign-In
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured')
      return
    }

    // Load Google Identity Services script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 280,
        })
      }
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup script
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existingScript) {
        document.body.removeChild(existingScript)
      }
    }
  }, []) // Initialize once on mount

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#081a66] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(10,35,120,0.65),_transparent_38%),linear-gradient(180deg,_#06143f_0%,_#081a66_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_70px] opacity-20" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-[340px] rounded-[2rem] bg-[#0f2147] px-8 py-10 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#ffd233] text-[#0a192f] shadow-[0_12px_30px_rgba(255,210,51,0.22)]">
              <KeyRound className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-2xl font-black italic tracking-[-0.04em] text-white">
              SIGN IN
            </h2>
            <p className="mt-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-white/35">
              Continue with Google to access the system
            </p>
          </div>

          {!showRoleSelection ? (
            <div className="mt-10">
              {/* Google Sign-In Button Container */}
              <div 
                ref={googleButtonRef} 
                className={`flex justify-center ${isGoogleLoading ? 'opacity-50' : ''}`}
                style={{ height: '48px' }}
              >
                {isGoogleLoading && (
                  <div className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#1a2d5a] text-xs font-black uppercase tracking-[0.15em] text-white">
                    <GoogleIcon className="h-5 w-5 animate-spin" />
                    Loading...
                  </div>
                )}
              </div>
              
              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <p className="mt-4 text-center text-[0.65rem] text-white/40">
                  Google sign-in not configured.<br />
                  Please set VITE_GOOGLE_CLIENT_ID in your .env file.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd233]/20 text-[#ffd233]">
                    <User className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[0.75rem] font-medium text-white/70 mb-1">
                  New Account Detected
                </p>
                <p className="text-[0.65rem] text-white/40">
                  Please select your role to continue
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[0.62rem] font-black uppercase tracking-[0.28em] text-[#ffd233]">
                  Assigned Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#ffd233]/40 focus:bg-white/10 [&>option]:bg-[#0f2147]"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={completeSignUpWithRole}
                disabled={isGoogleLoading}
                className="mt-4 h-12 w-full rounded-2xl bg-[#ffd233] text-xs font-black uppercase tracking-[0.28em] text-[#0a192f] shadow-[0_14px_34px_rgba(255,210,51,0.22)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGoogleLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRoleSelection(false)
                  setPendingCredential(null)
                }}
                className="w-full text-[0.65rem] font-black uppercase tracking-[0.25em] text-white/50 transition-colors hover:text-white/70"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[0.58rem] font-black uppercase tracking-[0.35em] text-white/20 transition-colors hover:text-white/50"
            >
              Back to welcome
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="sr-only"
          >
            <ArrowLeft />
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage