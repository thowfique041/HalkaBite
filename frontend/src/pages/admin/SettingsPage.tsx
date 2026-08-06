import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useUpdateProfileMutation, useUpdatePasswordMutation } from '../../store/api/authApi';
import { User, Lock, Save, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

const SettingsPage: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const [updateProfile, { isLoading: isProfileLoading }] = useUpdateProfileMutation();
    const [updatePassword, { isLoading: isPasswordLoading }] = useUpdatePasswordMutation();

    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: typeof user.address === 'string' ? user.address : user.address?.street || '',
            });
        }
    }, [user]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Only send name and phone, address needs proper structure
            await updateProfile({
                name: profileData.name,
                phone: profileData.phone,
            }).unwrap();
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        try {
            await updatePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            }).unwrap();
            toast.success('Password updated successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error('Failed to update password');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            <div className="grid gap-8">
                {/* Profile Settings */}
                <div className="card p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Profile Settings</h2>
                            <p className="text-white/60 text-sm">Update your personal information</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/60">Full Name</label>
                                <input
                                    type="text"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/60">Email Address</label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    disabled
                                    className="input w-full opacity-50 cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/60">Phone Number</label>
                                <input
                                    type="tel"
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                    className="input w-full"
                                    placeholder="+880..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/60">Address</label>
                            <input
                                type="text"
                                value={profileData.address || ''}
                                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                className="input w-full"
                                placeholder="Your delivery address"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isProfileLoading}
                                className="btn btn-primary"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isProfileLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Security Settings */}
                <div className="card p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-red-500/20 text-red-400">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Security</h2>
                            <p className="text-white/60 text-sm">Change your password</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/60">Current Password</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="input w-full"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/60">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/60">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="input w-full"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isPasswordLoading}
                                className="btn btn-secondary"
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                {isPasswordLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
