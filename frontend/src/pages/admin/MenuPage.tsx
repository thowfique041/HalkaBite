import React, { useState } from 'react';
import { useGetFoodItemsQuery, useDeleteFoodItemMutation } from '../../store/api/foodApi';
import { Plus, Search, Trash2, Filter, X } from 'lucide-react';
import { useCreateCategoryMutation } from '../../store/api/categoryApi';
import { toast } from 'react-hot-toast';

const MenuPage: React.FC = () => {
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const [categoryDescription, setCategoryDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { data, isLoading } = useGetFoodItemsQuery({ search: searchTerm });
    const [deleteFoodItem] = useDeleteFoodItemMutation();
    const [createCategory, { isLoading: isCreatingCategory }] = useCreateCategoryMutation();

    const handleCreateCategory = async (event: React.FormEvent) => {
        event.preventDefault();

        try {
            await createCategory({
                name: categoryName.trim(),
                description: categoryDescription.trim() || undefined,
            }).unwrap();
            toast.success('Category added successfully');
            setCategoryName('');
            setCategoryDescription('');
            setIsCategoryModalOpen(false);
        } catch (error) {
            toast.error('Failed to add category');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await deleteFoodItem(id).unwrap();
                toast.success('Item deleted successfully');
            } catch (error) {
                toast.error('Failed to delete item');
            }
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading menu...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">Menu Management</h1>
                <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="btn btn-primary"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Category
                </button>
            </div>

            <div className="card mb-8">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                    <button className="btn btn-secondary">
                        <Filter className="w-5 h-5 mr-2" />
                        Filters
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.data?.foodItems.map((item) => (
                    <div key={item._id} className="card group">
                        <div className="aspect-video relative overflow-hidden">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => handleDelete(item._id)}
                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg backdrop-blur-sm transition-colors"
                                    title="Delete item"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-xs font-bold">
                                ৳{item.price}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg truncate pr-4">{item.name}</h3>
                                <div className="flex gap-1">
                                    {item.isVegetarian && (
                                        <span className="w-2 h-2 rounded-full bg-green-500" title="Vegetarian" />
                                    )}
                                    {item.isSpicy && (
                                        <span className="w-2 h-2 rounded-full bg-red-500" title="Spicy" />
                                    )}
                                </div>
                            </div>
                            <p className="text-white/60 text-sm line-clamp-2 mb-4">{item.description}</p>
                            <div className="flex items-center justify-between text-sm text-white/40">
                                <span>{typeof item.category === 'string' ? item.category : item.category.name}</span>
                                <span>{item.preparationTime} mins</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-dark-200 rounded-2xl w-full max-w-lg border border-white/10">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Add Category</h2>
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCategory} className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="category-name" className="text-sm font-medium text-white/60">Name</label>
                                <input
                                    id="category-name"
                                    value={categoryName}
                                    onChange={(event) => setCategoryName(event.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. Burgers"
                                    maxLength={50}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="category-description" className="text-sm font-medium text-white/60">Description (optional)</label>
                                <textarea
                                    id="category-description"
                                    value={categoryDescription}
                                    onChange={(event) => setCategoryDescription(event.target.value)}
                                    className="input w-full h-24 resize-none"
                                    maxLength={200}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="btn btn-ghost">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isCreatingCategory || !categoryName.trim()} className="btn btn-primary">
                                    {isCreatingCategory ? 'Adding...' : 'Add Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuPage;
