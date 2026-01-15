'use client'

import { useState } from 'react'
import { createUser, updateUser, deleteUser } from '../actions/users'
import { Plus, Edit, Trash2, Search, X } from 'lucide-react'

export default function UserManagement({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers) // Ideally updated via revalidatePath but for optimistic UI or local state we can use this
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')

  // Form states
  const [formData, setFormData] = useState({ whatsapp: '', nim: '', password: '', profil: '' })

  const handleOpenModal = (user = null) => {
    if (user) {
        setEditingUser(user)
        setFormData({ whatsapp: user.whatsapp, nim: user.nim, password: user.password, profil: user.profil || '' })
    } else {
        setEditingUser(null)
        setFormData({ whatsapp: '', nim: '', password: '', profil: '' })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormData({ whatsapp: '', nim: '', password: '', profil: '' })
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = new FormData()
    data.append('whatsapp', formData.whatsapp)
    data.append('nim', formData.nim)
    data.append('password', formData.password)
    data.append('profil', formData.profil)
    
    if (editingUser) {
        data.append('id', editingUser.id)
        await updateUser(null, data) // In real app handle error
    } else {
        await createUser(null, data)
    }
    
    // We rely on server action revalidation, but a full page reload might not happen automatically 
    // without router.refresh() if we weren't using the server component prop directly.
    // However, revalidatePath in action should trigger a refresh of the Server Component payload.
    // But since this component takes `initialUsers` as prop, it might not update unless the parent re-renders.
    // A simplified approach for this demo:
    window.location.reload() // Force reload to fetch new data from server
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        await deleteUser(id)
        window.location.reload()
    }
  }

  const filteredUsers = (initialUsers || []).filter(user => 
    user.whatsapp.includes(searchTerm) || 
    user.nim.includes(searchTerm)
  )

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
                <Plus size={18} /> Add User
            </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4 font-semibold">ID</th>
                        <th className="px-6 py-4 font-semibold">WhatsApp</th>
                        <th className="px-6 py-4 font-semibold">NIM</th>
                        <th className="px-6 py-4 font-semibold">Profile</th>
                        <th className="px-6 py-4 font-semibold">Password</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-gray-500">#{user.id}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{user.whatsapp}</td>
                            <td className="px-6 py-4 text-gray-600 font-mono">{user.nim}</td>
                            <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{user.profil || '-'}</td>
                            <td className="px-6 py-4 text-gray-500 font-mono">••••••</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => handleOpenModal(user)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(user.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                No users found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">
                            {editingUser ? 'Edit User' : 'Add New User'}
                        </h3>
                        <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">WhatsApp Number</label>
                            <input 
                                name="whatsapp"
                                type="text"
                                required
                                value={formData.whatsapp}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="e.g. 628123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">NIM</label>
                            <input 
                                name="nim"
                                type="text"
                                required
                                value={formData.nim}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="e.g. A11.2024.12345"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Profile</label>
                            <input 
                                name="profil"
                                type="text"
                                value={formData.profil}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="Profile URL or description"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                            <input 
                                name="password"
                                type="text"
                                required={!editingUser}
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder={editingUser ? "Leave blank to keep current" : "Enter user password"}
                            />
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                type="button" 
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {editingUser ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  )
}
