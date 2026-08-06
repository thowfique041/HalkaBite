import React, { useState } from 'react';
import { useGetRestaurantsQuery, useDeleteRestaurantMutation } from '../../store/api/restaurantApi';
import { useApproveRestaurantMutation } from '../../store/api/adminApi';
import { Edit, Trash2, Power, Megaphone, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSendRestaurantAnnouncementMutation } from '../../store/api/notificationApi';

const RestaurantsPage: React.FC = () => {
    const { data: restaurants, isLoading } = useGetRestaurantsQuery({});
    const [approveRestaurant] = useApproveRestaurantMutation();
    const [deleteRestaurant, { isLoading: isDeleting }] = useDeleteRestaurantMutation();
    const [sendAnnouncement, { isLoading: isSending }] = useSendRestaurantAnnouncementMutation();
    const [announcement, setAnnouncement] = useState<{ restaurantId: string; restaurantName: string; title: string; message: string } | null>(null);

    const handleToggleStatus = async (id: string) => {
        try {
            await approveRestaurant(id).unwrap();
            toast.success('Restaurant status updated');
        } catch (error) {
            toast.error('Failed to update restaurant status');
        }
    };

    const handleAnnouncement = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!announcement?.message.trim()) return;
        try {
            await sendAnnouncement({ restaurantId: announcement.restaurantId, title: announcement.title, message: announcement.message }).unwrap();
            toast.success('Announcement sent in real time'); setAnnouncement(null);
        } catch (error: any) { toast.error(error?.data?.message || 'Failed to send announcement'); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete "${name}"? This will also delete all its food items.`)) {
            try {
                await deleteRestaurant(id).unwrap();
                toast.success('Restaurant deleted successfully');
            } catch (error) {
                toast.error('Failed to delete restaurant');
            }
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading restaurants...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Restaurants Management</h1>
            </div>

            <div className="grid gap-6">
                {restaurants?.data?.restaurants?.map((restaurant) => (
                    <div key={restaurant._id} className="card p-6 flex items-center gap-6">
                        <img
                            src={restaurant.image || 'https://via.placeholder.com/100'}
                            alt={restaurant.name}
                            className="w-24 h-24 rounded-xl object-cover bg-white/5"
                        />

                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xl font-bold">{restaurant.name}</h3>
                                    <p className="text-white/60 text-sm">{restaurant.address.street}, {restaurant.address.city}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${restaurant.isActive
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {restaurant.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm text-white/60">
                                <div>Rating: <span className="text-yellow-400 font-bold">{restaurant.rating}</span> ({restaurant.reviewCount} reviews)</div>
                                <div>Delivery: {restaurant.deliveryTime}</div>
                                <div>Min Order: ৳{restaurant.minimumOrder}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                            <button onClick={() => setAnnouncement({ restaurantId: restaurant._id, restaurantName: restaurant.name, title: 'Admin Announcement', message: '' })} className="p-2 rounded-lg hover:bg-primary-500/10 text-primary-400 transition-colors" title="Send announcement"><Megaphone className="w-5 h-5" /></button>
                            <button
                                onClick={() => handleToggleStatus(restaurant._id)}
                                className={`p-2 rounded-lg transition-colors ${restaurant.isActive
                                    ? 'hover:bg-red-500/10 text-red-400'
                                    : 'hover:bg-green-500/10 text-green-400'
                                    }`}
                                title={restaurant.isActive ? 'Deactivate' : 'Activate'}
                            >
                                <Power className="w-5 h-5" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleDelete(restaurant._id, restaurant.name)}
                                disabled={isDeleting}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-50"
                                title="Delete restaurant"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {announcement && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onMouseDown={() => setAnnouncement(null)}><form onSubmit={handleAnnouncement} onMouseDown={event => event.stopPropagation()} className="card w-full max-w-lg p-6 space-y-5"><div className="flex justify-between gap-4"><div><h2 className="text-xl font-bold">Send Announcement</h2><p className="text-sm text-white/50 mt-1">To {announcement.restaurantName}</p></div><button type="button" onClick={() => setAnnouncement(null)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button></div><label className="block"><span className="text-sm text-white/60">Title</span><input className="input mt-2" maxLength={120} value={announcement.title} onChange={e => setAnnouncement({ ...announcement, title: e.target.value })} required /></label><label className="block"><span className="text-sm text-white/60">Message</span><textarea className="input mt-2 min-h-32 resize-y" maxLength={1000} value={announcement.message} onChange={e => setAnnouncement({ ...announcement, message: e.target.value })} placeholder="Write the announcement…" required /></label><button disabled={isSending} className="btn btn-primary w-full"><Megaphone className="w-4 h-4 mr-2" />{isSending ? 'Sending…' : 'Send Announcement'}</button></form></div>}
        </div>
    );
};

export default RestaurantsPage;
