import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import {
  getUserByIdData,
  getUsersData,
  updateUserWalletData,
} from "../../services/admin/userAdminService.js";

export const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const data = await getUsersData({ page, limit, skip });
    return handleResponse(res, 200, "Users fetched successfully", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserByIdData(id);

    if (!user) {
      return handleResponse(res, 404, "Customer not found");
    }

    return handleResponse(
      res,
      200,
      "Customer details fetched successfully",
      user,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const updateUserWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, action, reason } = req.body;
    
    if (!amount || !action) {
      return handleResponse(res, 400, "Amount and action (add/deduct) are required");
    }

    const result = await updateUserWalletData(id, amount, action, reason);
    return handleResponse(res, 200, "Wallet updated successfully", result);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};
