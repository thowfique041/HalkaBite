import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { Layout } from './components/layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import MenuPage from './pages/MenuPage';
import RestaurantsPage from './pages/RestaurantsPage';
import ProfilePage from './pages/ProfilePage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrdersPage from './pages/OrdersPage';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UsersPage from './pages/admin/UsersPage';
import AdminMenuPage from './pages/admin/MenuPage';
import AdminRestaurantsPage from './pages/admin/RestaurantsPage';
import AdminOrdersPage from './pages/admin/OrdersPage';
import SettingsPage from './pages/admin/SettingsPage';
import AuthInitializer from './components/auth/AuthInitializer';
import RestaurantLayout from './components/layout/RestaurantLayout';
import RestaurantDashboardPage from './pages/restaurant/RestaurantDashboardPage';
import RestaurantOrdersPage from './pages/restaurant/RestaurantOrdersPage';
import RestaurantMenuPage from './pages/restaurant/RestaurantMenuPage';
import DeliveryDashboardPage from './pages/delivery/DeliveryDashboardPage';
import OrderSyncInitializer from './components/orders/OrderSyncInitializer';
import AdminReviewsPage from './pages/admin/ReviewsPage';
import DeliveryManagementPage from './pages/admin/DeliveryManagementPage';
import RestaurantNotificationsPage from './pages/restaurant/RestaurantNotificationsPage';
import RestaurantReviewsPage from './pages/restaurant/RestaurantReviewsPage';
import FoodReviewAnalyticsPage from './pages/restaurant/FoodReviewAnalyticsPage';
import RestaurantSettingsPage from './pages/restaurant/RestaurantSettingsPage';
import RestaurantAnalyticsPage from './pages/restaurant/RestaurantAnalyticsPage';
import RestaurantEarningsPage from './pages/restaurant/RestaurantEarningsPage';
import RestaurantCampaignsPage from './pages/restaurant/RestaurantCampaignsPage';
import AdminCampaignsPage from './pages/admin/CampaignsPage';
import RestaurantNameChangeRequestsPage from './pages/admin/RestaurantNameChangeRequestsPage';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e1e2e',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: {
              iconTheme: {
                primary: '#f97316',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AuthInitializer />
        <OrderSyncInitializer />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="restaurants" element={<RestaurantsPage />} />
            <Route path="login" element={<AuthPage mode="login" />} />
            <Route path="register" element={<AuthPage mode="register" />} />
            <Route path="profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="checkout" element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            } />
            <Route path="order-success" element={
              <ProtectedRoute>
                <OrderSuccessPage />
              </ProtectedRoute>
            } />
            <Route path="orders" element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Restaurant Dashboard Routes */}
          <Route path="/restaurant-dashboard" element={
            <ProtectedRoute allowedRoles={['restaurant']}>
              <RestaurantLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RestaurantDashboardPage />} />
            <Route path="orders" element={<RestaurantOrdersPage />} />
            <Route path="menu" element={<RestaurantMenuPage />} />
            <Route path="reviews" element={<RestaurantReviewsPage />} />
            <Route path="reviews/food/:foodId" element={<FoodReviewAnalyticsPage />} />
            <Route path="notifications" element={<RestaurantNotificationsPage />} />
            <Route path="settings" element={<RestaurantSettingsPage />} />
            <Route path="analytics" element={<RestaurantAnalyticsPage />} />
            <Route path="earnings" element={<RestaurantEarningsPage />} />
            <Route path="campaigns" element={<RestaurantCampaignsPage />} />
          </Route>

          <Route path="/delivery-dashboard" element={
            <ProtectedRoute allowedRoles={['delivery']}>
              <DeliveryDashboardPage />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="menu" element={<AdminMenuPage />} />
            <Route path="restaurants" element={<AdminRestaurantsPage />} />
            <Route path="restaurant-name-requests" element={<RestaurantNameChangeRequestsPage />} />
            <Route path="delivery-management" element={<DeliveryManagementPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="campaigns" element={<AdminCampaignsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
