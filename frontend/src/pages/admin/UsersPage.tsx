import React, { useState } from 'react';
import { useGetUsersQuery, useDeleteUserMutation, useUpdateUserRoleMutation, useConvertToRestaurantOwnerMutation } from '../../store/api/adminApi';
import { Trash2, Shield, User as UserIcon, Search, Edit, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EditUserModal from '../../components/admin/EditUserModal';
import type { User } from '../../types';

const UsersPage: React.FC = () => {
    const { data: users, isLoading } = useGetUsersQuery();
    const [deleteUser] = useDeleteUserMutation();
    const [updateUserRole] = useUpdateUserRoleMutation();
    const [convertToRestaurantOwner, { isLoading: isConverting }] = useConvertToRestaurantOwnerMutation();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleDelete = async (id: string) => {
        const user = users?.data?.find(candidate => candidate._id === id);
        const warning = user?.role === 'restaurant'
            ? ' This will also delete their restaurant and all of its menu items.'
            : '';
        if (window.confirm(`Are you sure you want to delete this user?${warning}`)) {
            try {
                await deleteUser(id).unwrap();
                toast.success('User deleted successfully');
            } catch (error) {
                toast.error('Failed to delete user');
            }
        }
    };

    const handleRoleUpdate = async (id: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (currentRole === 'restaurant' && !window.confirm(
            'Removing the restaurant role will also delete the linked restaurant and all of its menu items. Continue?'
        )) return;
        try {
            await updateUserRole({ id, role: newRole }).unwrap();
            toast.success(`User role updated to ${newRole}`);
        } catch (error) {
            toast.error('Failed to update user role');
        }
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleConvertToRestaurantOwner = async (user: User) => {
        if (user.role === 'restaurant') {
            toast.error('User is already a restaurant owner');
            return;
        }

        if (window.confirm(`Convert "${user.name}" to a restaurant owner? They will then be able to create their own restaurant profile.`)) {
            try {
                await convertToRestaurantOwner(user._id).unwrap();
                toast.success(`${user.name} is now a restaurant owner!`);
            } catch (error: any) {
                toast.error(error?.data?.message || 'Failed to convert user');
            }
        }
    };

    const filteredUsers = users?.data?.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return <div className="text-center py-8">Loading users...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Users Management</h1>

            <div className="card mb-8">
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredUsers?.map((user) => (
                                <tr key={user._id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                                                <span className="font-bold text-white">{user.name.charAt(0)}</span>
                                            </div>
                                            <span className="font-medium">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-white/60">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${user.role === 'admin'
                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            : user.role === 'restaurant'
                                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${user.isVerified
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}>
                                            {user.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {user.role === 'user' && (
                                                <button
                                                    onClick={() => handleConvertToRestaurantOwner(user)}
                                                    disabled={isConverting}
                                                    className="p-2 rounded-lg hover:bg-primary-500/10 text-primary-400 transition-colors disabled:opacity-50"
                                                    title="Make Restaurant Owner"
                                                >
                                                    <Store className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRoleUpdate(user._id, user.role)}
                                                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                title="Toggle Admin Role"
                                            >
                                                {user.role === 'admin' ? <UserIcon className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                title="Edit User"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user._id)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={selectedUser}
            />
        </div>
    );
};

export default UsersPage;
