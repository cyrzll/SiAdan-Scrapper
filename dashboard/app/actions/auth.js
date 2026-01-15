'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(formData) {
  const username = formData.get('username')
  const password = formData.get('password')

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { error: data.error || 'Login failed' }
    }

    // Set a cookie for the session
    const cookieStore = await cookies()
    cookieStore.set('admin_session', JSON.stringify({
        id: data.adminId, 
        username: data.username
    }), { secure: true })

  } catch (error) {
    console.error('Login error:', error)
    return { error: 'Failed to connect to server' }
  }
  
  redirect('/dashboard')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  redirect('/')
}
