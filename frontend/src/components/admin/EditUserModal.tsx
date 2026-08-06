import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUpdateUserMutation } from '../../store/api/adminApi';
import type { User } from '../../types';
import { toast } from 'react-hot-toast';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

const RoleForm: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
    const [role, setRole] = useState<User['role']>(user.role);
    const [updateUser, { isLoading }] = useUpdateUserMutation();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (user.role === 'restaurant' && role !== 'restaurant' && !window.confirm(
            'Removing the restaurant role will also delete the linked restaurant and all of its menu items. Continue?'
        )) return;
        try {
            await updateUser({ id: user._id, data: { role } }).unwrap();
            toast.success(role === user.role ? 'Role is unchanged' : 'User role updated');
            onClose();
        } catch (error: unknown) {
            const message = (error as { data?: { message?: string } })?.data?.message;
            toast.error(message || 'Failed to update user role');
        }
    };

    return <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-white/40 mb-1">Full Name</div><div className="p-3 rounded-lg bg-white/5 text-white/70">{user.name}</div></div>
            <div><div className="text-white/40 mb-1">Phone</div><div className="p-3 rounded-lg bg-white/5 text-white/70">{user.phone || 'Not provided'}</div></div>
            <div className="col-span-2"><div className="text-white/40 mb-1">Email Address</div><div className="p-3 rounded-lg bg-white/5 text-white/70">{user.email}</div></div>
            <div><div className="text-white/40 mb-1">Verification</div><div className="p-3 rounded-lg bg-white/5 text-white/70">{user.isVerified ? 'Verified' : 'Pending'}</div></div>
            <div><div className="text-white/40 mb-1">User ID</div><div className="p-3 rounded-lg bg-white/5 text-white/70 font-mono text-xs truncate">{user._id}</div></div>
        </div>
        <div><label htmlFor="admin-user-role" className="block text-sm font-medium text-white/70 mb-2">Role — only editable field</label><select id="admin-user-role" value={role} onChange={event => setRole(event.target.value as User['role'])} className="input w-full"><option value="user">Customer</option><option value="restaurant">Restaurant Owner</option><option value="delivery">Delivery Man</option><option value="admin">Admin</option></select></div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">Personal information is read-only and can only be changed by the account owner.</div>
        <div className="pt-3 border-t border-white/10 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button type="submit" disabled={isLoading || role === user.role} className="btn btn-primary">{isLoading ? 'Saving...' : 'Save Role'}</button></div>
    </form>;
};

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user }) => {
    if (!isOpen || !user) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="bg-dark-200 rounded-2xl w-full max-w-lg border border-white/10"><div className="p-6 border-b border-white/10 flex justify-between items-center"><div><h2 className="text-xl font-bold">Change User Role</h2><p className="text-xs text-white/40 mt-1">Administrative access is restricted to role changes.</p></div><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button></div><RoleForm key={user._id} user={user} onClose={onClose} /></div></div>;
};

export default EditUserModal;
