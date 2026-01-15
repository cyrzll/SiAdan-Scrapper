import { getUsers } from '../actions/users'
import UserManagement from './UserManagement'
import { logout } from '../actions/auth'
import { LogOut } from 'lucide-react'

export default async function DashboardPage() {
  const data = await getUsers()
  const users = data.users || []

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                <form action={logout}>
                    <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <LogOut size={18} />
                        Logout
                    </button>
                </form>
            </div>
            
            <UserManagement initialUsers={users} />
        </div>
    </div>
  )
}
