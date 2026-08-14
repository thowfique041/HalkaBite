import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { queryAdminOrders } from '../services/adminOrderService';

export const getAdminOrders=async(req:AuthRequest,res:Response)=>{try{const data=await queryAdminOrders(req.query);res.setHeader('Cache-Control','private, max-age=15');return res.json({success:true,data});}catch(error){console.error('Admin order query failed:',error);return res.status(500).json({success:false,message:error instanceof Error?error.message:'Failed to load admin orders'});}};
