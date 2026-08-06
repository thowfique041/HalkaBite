import React, { useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateRestaurantMutation } from '../../store/api/restaurantApi';
import { useUploadImageMutation } from '../../store/api/uploadApi';
import toast from 'react-hot-toast';

interface AddRestaurantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddRestaurantModal: React.FC<AddRestaurantModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cuisine: '',
        phone: '',
        email: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'Bangladesh'
        },
        deliveryTime: '',
        deliveryFee: 0,
        minimumOrder: 0,
        image: ''
    });

    const [createRestaurant, { isLoading }] = useCreateRestaurantMutation();
    const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation();

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await uploadImage(formData).unwrap();
            setFormData(prev => ({ ...prev, image: res.filePath }));
            toast.success('Image uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRestaurant({
                ...formData,
                cuisine: formData.cuisine.split(',').map(c => c.trim())
            }).unwrap();
            toast.success('Restaurant created successfully');
            onClose();
            setFormData({
                name: '',
                description: '',
                cuisine: '',
                phone: '',
                email: '',
                address: { street: '', city: '', state: '', zipCode: '', country: 'Bangladesh' },
                deliveryTime: '',
                deliveryFee: 0,
                minimumOrder: 0,
                image: ''
            });
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create restaurant');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    >
                        <div className="bg-dark-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-dark-200 z-10">
                                <h2 className="text-xl font-bold">Add New Restaurant</h2>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">Restaurant Image</label>
                                    <div className="flex items-center gap-4">
                                        {formData.image ? (
                                            <img src={formData.image} alt="Preview" className="w-24 h-24 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-24 h-24 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 border-dashed">
                                                <Upload className="w-6 h-6 text-white/40" />
                                            </div>
                                        )}
                                        <label className="btn btn-outline cursor-pointer">
                                            {isUploading ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                            Upload Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">Restaurant Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">Cuisine Types (comma separated)</label>
                                        <input
                                            type="text"
                                            value={formData.cuisine}
                                            onChange={e => setFormData({ ...formData, cuisine: e.target.value })}
                                            placeholder="Italian, Mexican, Burgers"
                                            className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">Phone</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500 h-24"
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-medium text-white/80 border-b border-white/10 pb-2">Address</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-white/60 mb-2">Street Address</label>
                                            <input
                                                type="text"
                                                value={formData.address.street}
                                                onChange={e => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                                                className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/60 mb-2">City</label>
                                            <input
                                                type="text"
                                                value={formData.address.city}
                                                onChange={e => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                                                className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/60 mb-2">State/Division</label>
                                            <input
                                                type="text"
                                                value={formData.address.state}
                                                onChange={e => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                                                className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/60 mb-2">Zip Code</label>
                                            <input
                                                type="text"
                                                value={formData.address.zipCode}
                                                onChange={e => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                                                className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/60 mb-2">Country</label>
                                            <input
                                                type="text"
                                                value={formData.address.country}
                                                onChange={e => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                                                className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">Delivery Time (e.g. 30-40 min)</label>
                                        <input
                                            type="text"
                                            value={formData.deliveryTime}
                                            onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                                            className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">Delivery Fee (৳)</label>
                                        <input
                                            type="number"
                                            value={formData.deliveryFee}
                                            onChange={e => setFormData({ ...formData, deliveryFee: Number(e.target.value) })}
                                            className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">Min Order (৳)</label>
                                        <input
                                            type="number"
                                            value={formData.minimumOrder}
                                            onChange={e => setFormData({ ...formData, minimumOrder: Number(e.target.value) })}
                                            className="w-full bg-dark-100 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="btn btn-ghost"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || isUploading}
                                        className="btn btn-primary"
                                    >
                                        {isLoading ? 'Creating...' : 'Create Restaurant'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AddRestaurantModal;
