import { Router } from 'express'; import { authorize, protect } from '../middleware/auth'; import { campaignClick, cancelCampaign, createCampaign, customerSearch, getCustomerNotifications, listAllCampaigns, listMyCampaigns, readCustomerNotifications } from '../controllers/campaignController';
const router=Router();
router.get('/customer-notifications',protect,authorize('user'),getCustomerNotifications); router.patch('/customer-notifications/read-all',protect,authorize('user'),readCustomerNotifications);
router.get('/admin/all',protect,authorize('admin'),listAllCampaigns); router.get('/customers',protect,authorize('restaurant'),customerSearch); router.get('/',protect,authorize('restaurant'),listMyCampaigns); router.post('/',protect,authorize('restaurant'),createCampaign); router.patch('/:id/cancel',protect,authorize('restaurant'),cancelCampaign); router.post('/:id/click',protect,authorize('user'),campaignClick);
export default router;
