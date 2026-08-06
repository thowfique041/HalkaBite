import { Request, Response } from 'express';
import { User, Restaurant, FoodItem, RoleChangeLog } from '../models';
import { AuthRequest } from '../middleware/auth';

const allowedRoles = ['user', 'admin', 'restaurant', 'delivery'] as const;
type UserRole = typeof allowedRoles[number];

const logRoleChange = async (
  admin: any,
  user: any,
  previousRole: UserRole,
  newRole: UserRole
) => RoleChangeLog.create({
  adminId: admin._id,
  adminName: admin.name,
  userId: user._id,
  userName: user.name,
  previousRole,
  newRole,
  changedAt: new Date()
});

const deleteOwnedRestaurant = async (ownerId: string) => {
  const restaurant = await Restaurant.findOneAndDelete({ owner: ownerId });
  if (restaurant) {
    await FoodItem.deleteMany({ restaurant: restaurant._id });
  }
  return restaurant;
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const submittedFields = Object.keys(req.body);
    if (submittedFields.length !== 1 || submittedFields[0] !== 'role') {
      return res.status(403).json({
        success: false,
        message: 'Administrators may only update a user role. Personal profile information is protected.'
      });
    }
    if (!allowedRoles.includes(req.body.role)) {
      return res.status(400).json({ success: false, message: 'Invalid user role' });
    }

    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const previousRole = existingUser.role as UserRole;
    const newRole = req.body.role as UserRole;
    if (previousRole === newRole) {
      return res.status(200).json({ success: true, message: 'User role is unchanged', data: existingUser });
    }

    existingUser.role = newRole;
    await existingUser.save();
    await logRoleChange(req.user, existingUser, previousRole, newRole);

    const isRemovingRestaurantRole = previousRole === 'restaurant' && newRole !== 'restaurant';
    if (isRemovingRestaurantRole) await deleteOwnedRestaurant(existingUser._id.toString());

    res.status(200).json({
      success: true,
      message: isRemovingRestaurantRole
        ? 'User updated and linked restaurant removed'
        : 'User updated successfully',
      data: existingUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const removedRestaurant = await deleteOwnedRestaurant(user._id.toString());
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: removedRestaurant
        ? 'User and linked restaurant deleted successfully'
        : 'User deleted successfully',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

// @desc    Convert user to restaurant owner
// @route   PUT /api/users/:id/make-restaurant-owner
// @access  Private/Admin
export const convertToRestaurantOwner = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already a restaurant owner
    if (user.role === 'restaurant') {
      return res.status(400).json({
        success: false,
        message: 'User is already a restaurant owner'
      });
    }

    // Check if user already has a restaurant
    const existingRestaurant = await Restaurant.findOne({ owner: userId });
    if (existingRestaurant) {
      return res.status(400).json({
        success: false,
        message: 'User already has a restaurant assigned'
      });
    }

    // Update user role
    const previousRole = user.role as UserRole;
    user.role = 'restaurant';
    await user.save();
    await logRoleChange(req.user, user, previousRole, 'restaurant');

    res.status(200).json({
      success: true,
      message: 'User successfully converted to restaurant owner',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error converting user to restaurant owner'
    });
  }
};
