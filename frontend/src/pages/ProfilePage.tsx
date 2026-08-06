import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin, Edit2, Save, Plus, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../store/hooks';
import { useUpdateProfileMutation } from '../store/api/authApi';
import { useUploadImageMutation } from '../store/api/uploadApi';
import { toast } from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { user: authUser } = useAppSelector((state) => state.auth);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  });

  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Bangladesh'
  });

  // Helper to get full image URL
  const getImageUrl = (path: string) => {
    if (!path) return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop';
    if (path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL?.replace('/api', '')}${path}`;
  };

  // Initialize user data from auth state
  useEffect(() => {
    if (authUser) {
      setFormData({
        name: authUser.name || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
        avatar: authUser.avatar || '',
      });

      if (authUser.address) {
        setAddressData({
          street: authUser.address.street || '',
          city: authUser.address.city || '',
          state: authUser.address.state || '',
          zipCode: authUser.address.zipCode || '',
          country: authUser.address.country || 'Bangladesh'
        });
      }
    }
  }, [authUser]);

  // Construct address string from address object
  const getFormattedAddress = () => {
    if (!authUser?.address) return null;
    const { street, city, state, zipCode, country } = authUser.address;
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
  };

  const formattedAddress = getFormattedAddress();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      try {
        const res = await uploadImage(uploadFormData).unwrap();
        setFormData(prev => ({ ...prev, avatar: res.filePath }));

        // Auto save profile with new avatar
        await updateProfile({
          avatar: res.filePath
        }).unwrap();

        toast.success('Profile picture updated successfully');
      } catch (err) {
        toast.error('Failed to upload image');
        console.error(err);
      }
    }
  };

  const handleProfileSave = async () => {
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        avatar: formData.avatar,
      }).unwrap();
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleAddressSave = async () => {
    try {
      await updateProfile({
        address: addressData
      }).unwrap();
      toast.success('Address updated successfully');
      setIsAddingAddress(false);
    } catch (error) {
      toast.error('Failed to update address');
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Please log in</h2>
          <p className="text-white/60">You need to be logged in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-white/60">Manage your account settings and preferences</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1"
          >
            <div className="card p-6 text-center">
              <div className="relative w-32 h-32 mx-auto mb-4 group">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 blur-lg opacity-50" />
                <img
                  src={getImageUrl(formData.avatar)}
                  alt={formData.name}
                  className="relative w-full h-full object-cover rounded-full border-4 border-dark-200"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full text-white hover:bg-primary-600 transition-colors z-10"
                >
                  {isUploading ? <Loader className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </div>
              <h2 className="text-xl font-bold mb-1">{formData.name}</h2>
              <p className="text-white/60 text-sm mb-4">Foodie Member</p>

              <div className="flex justify-center gap-2">
                <div className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-medium border border-primary-500/20">
                  {authUser.role === 'admin' ? 'Admin' : 'Gold Tier'}
                </div>
                {authUser.isVerified && (
                  <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                    Verified
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Details Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 space-y-6"
          >
            {/* Personal Info */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-500" />
                  Personal Information
                </h3>
                <button
                  onClick={() => isEditing ? handleProfileSave() : setIsEditing(true)}
                  disabled={isLoading}
                  className={`btn ${isEditing ? 'btn-primary' : 'btn-outline'} px-4 py-2 text-sm`}
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4 mr-2" /> {isLoading ? 'Saving...' : 'Save Changes'}
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                        className="w-full bg-dark-100 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full bg-dark-100 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-primary-500 opacity-50 cursor-not-allowed transition-colors"
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/60 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        className="w-full bg-dark-100 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        placeholder={isEditing ? "Enter phone number" : "No phone number added"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Book */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  Address Book
                </h3>
                {!isAddingAddress && !formattedAddress && (
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="btn btn-outline px-4 py-2 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add New
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {isAddingAddress ? (
                  <div className="p-4 rounded-xl bg-dark-100 border border-white/10 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-white/60 mb-1">Street Address</label>
                        <input
                          type="text"
                          value={addressData.street}
                          onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                          className="input w-full"
                          placeholder="123, Road 4, Block B"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-1">City</label>
                        <input
                          type="text"
                          value={addressData.city}
                          onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                          className="input w-full"
                          placeholder="Dhaka"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-1">State/Area</label>
                        <input
                          type="text"
                          value={addressData.state}
                          onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                          className="input w-full"
                          placeholder="Banani"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-1">Zip Code</label>
                        <input
                          type="text"
                          value={addressData.zipCode}
                          onChange={(e) => setAddressData({ ...addressData, zipCode: e.target.value })}
                          className="input w-full"
                          placeholder="1213"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-1">Country</label>
                        <input
                          type="text"
                          value={addressData.country}
                          disabled
                          className="input w-full opacity-50 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setIsAddingAddress(false)}
                        className="btn btn-ghost px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddressSave}
                        disabled={isLoading}
                        className="btn btn-primary px-4 py-2 text-sm"
                      >
                        Save Address
                      </button>
                    </div>
                  </div>
                ) : formattedAddress ? (
                  <div className="p-4 rounded-xl bg-dark-100 border border-white/5 flex justify-between items-center group hover:border-primary-500/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          Home
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/20">
                            Default
                          </span>
                        </div>
                        <div className="text-sm text-white/60 mt-1">{formattedAddress}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setIsAddingAddress(true)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/40">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No addresses added yet.</p>
                    <button
                      onClick={() => setIsAddingAddress(true)}
                      className="mt-4 text-primary-400 hover:text-primary-300 text-sm font-medium"
                    >
                      + Add your first address
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
