'use server'

import { revalidatePath } from 'next/cache'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/users`

export async function getUsers() {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch users')
    return await res.json()
  } catch (error) {
    console.error(error)
    return { users: [] }
  }
}

export async function createUser(prevState, formData) {
  const whatsapp = formData.get('whatsapp')
  const nim = formData.get('nim')
  const password = formData.get('password')
  const profil = formData.get('profil')

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp, nim, password, profil }),
    })
    
    
    if (!res.ok) {
        const errorData = await res.json()
        return { error: errorData.error || 'Failed to create user' }
    }
    
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to connect to server' }
  }
}

export async function updateUser(prevState, formData) {
  const id = formData.get('id')
  const whatsapp = formData.get('whatsapp')
  const nim = formData.get('nim')
  const password = formData.get('password')
  const profil = formData.get('profil')

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp, nim, password, profil }),
    })

    if (!res.ok) {
        const errorData = await res.json()
        return { error: errorData.error || 'Failed to update user' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to connect to server' }
  }
}

export async function deleteUser(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
         const errorData = await res.json()
         throw new Error(errorData.error || 'Failed to delete user')
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { error: error.message }
  }
}
