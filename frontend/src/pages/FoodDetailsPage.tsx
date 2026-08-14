import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FoodModal from '../components/food/FoodModal';
import { useGetFoodItemQuery } from '../store/api/foodApi';

const FoodDetailsPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetFoodItemQuery(id, { skip: !id });
  const close = () => window.history.length > 1 ? navigate(-1) : navigate('/menu');

  if (isLoading) return <main className="min-h-screen pt-28"><div className="skeleton mx-auto h-[70vh] max-w-2xl rounded-2xl" /></main>;
  if (error || !data?.data) return <main className="grid min-h-screen place-items-center px-4 text-center"><div><span className="text-5xl">🍽️</span><h1 className="mt-4 text-2xl font-bold">This food is no longer available.</h1><button onClick={() => navigate('/menu')} className="btn btn-primary mt-6">Browse All Foods</button></div></main>;

  return <main className="min-h-screen"><FoodModal food={data.data} isOpen onClose={close} /></main>;
};

export default FoodDetailsPage;
