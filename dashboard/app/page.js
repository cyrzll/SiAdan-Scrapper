'use client'

import { useState } from 'react'
import { login } from './actions/auth'
import { User, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData) {
    setLoading(true)
    setError('')
    
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // redirect is handled in server action
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
          <p className="text-gray-600">Enter your credentials to access the dashboard</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form action={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <User size={20} />
              </span>
              <input 
                name="username"
                type="text" 
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock size={20} />
              </span>
              <input 
                name="password"
                type="password" 
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
