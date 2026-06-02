import User from "../../models/customer.js";
import Seller from "../../models/seller.js";
import Plan from "../../models/plan.js";
import Transaction from "../../models/transaction.js";
import Order from "../../models/order.js";

export const processMonthlyTurnoverCommissions = async () => {
    try {
        const now = new Date();
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        
        const sellers = await Seller.find({ onboardedBy: { $ne: null } }).lean();
        if (sellers.length === 0) return { success: true, processed: 0, message: "No referred sellers found" };
        
        let processedCount = 0;
        
        for (const seller of sellers) {
            const user = await User.findById(seller.onboardedBy);
            const isAdmin = user && user.role === 'admin' && user.referralCode === 'SEVAFAST';
            const hasActivePlan = user && user.currentPlan && user.planExpiry >= now;
            
            if (!user || (!isAdmin && !hasActivePlan)) continue;
            
            let commissionPercent = 0;
            
            if (isAdmin) {
                commissionPercent = 5; // Default Admin Turnover Commission e.g. 5%
            } else {
                const plan = await Plan.findById(user.currentPlan);
                if (!plan) continue;
                
                const commissionFeature = plan.features.find(f => f.key === "TURNOVER_COMMISSION");
                commissionPercent = commissionFeature ? Number(commissionFeature.value) : 0;
            }
            
            if (commissionPercent <= 0) continue;
            
            // Check if already processed for this seller for this month to prevent duplicates
            const referenceId = `TURNOVER-COMM-${seller._id}-${startOfPrevMonth.getMonth() + 1}-${startOfPrevMonth.getFullYear()}`;
            const existingTransaction = await Transaction.findOne({ reference: referenceId });
            if (existingTransaction) continue;
            
            const orders = await Order.find({
                seller: seller._id,
                status: "Delivered",
                createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
            }).lean();
            
            const totalTurnover = orders.reduce((sum, order) => {
                return sum + (order.totalAmount || 0);
            }, 0);
            
            if (totalTurnover <= 0) continue;
            
            const commissionAmount = (totalTurnover * commissionPercent) / 100;
            
            user.walletBalance = (user.walletBalance || 0) + commissionAmount;
            await user.save();
            
            await Transaction.create({
                user: user._id,
                userModel: "User",
                type: "Incentive",
                amount: commissionAmount,
                status: "Settled",
                reference: referenceId,
                meta: {
                    sellerId: seller._id,
                    turnoverAmount: totalTurnover,
                    commissionPercent: commissionPercent,
                    description: `Monthly Turnover Commission (${commissionPercent}%) from ${seller.shopName}`,
                    month: startOfPrevMonth.getMonth() + 1,
                    year: startOfPrevMonth.getFullYear()
                }
            });
            
            processedCount++;
        }
        
        return { success: true, processed: processedCount, message: `Successfully processed ${processedCount} turnover commissions.` };
    } catch (error) {
        console.error("Error processing turnover commissions:", error);
        return { success: false, error: error.message };
    }
};

export const processOrderLevelCommissions = async (order) => {
    if (!order || !order.customer || !order.pricing?.total) return;

    // RULE: Only process commission for the customer's FIRST delivered order.
    try {
        const previousDeliveredOrdersCount = await Order.countDocuments({
            customer: order.customer,
            workflowStatus: 'delivered',
            _id: { $ne: order._id }
        });
        if (previousDeliveredOrdersCount > 0) {
            console.log(`[CommissionService] Skipping level commission: Order ${order._id} is not the first order for customer ${order.customer}`);
            return;
        }
    } catch (err) {
        console.error("Error checking previous orders for commission:", err);
        return;
    }
    
    let currentUserId = order.customer;
    let orderAmount = order.pricing.total;
    let orderIdString = order._id.toString();
    
    let orderCustomerName = 'Unknown User';
    try {
        const orderCustomer = await User.findById(currentUserId).lean();
        if (orderCustomer && orderCustomer.name) {
            orderCustomerName = orderCustomer.name;
        }
    } catch (e) {}

    let visited = new Set();
    let currentLevel = 0; 
    
    try {
        while (currentUserId && currentLevel < 15) {
            if (visited.has(currentUserId.toString())) break;
            visited.add(currentUserId.toString());
            
            const currentUser = await User.findById(currentUserId).lean();
            if (!currentUser || !currentUser.referredBy) break;
            
            let referrerId = currentUser.referredBy;
            currentLevel++;
            
            const referrer = await User.findById(referrerId);
            
            const isAdmin = referrer && referrer.role === 'admin' && referrer.referralCode === 'SEVAFAST';
            const hasActivePlan = referrer && referrer.currentPlan && referrer.planExpiry > new Date();
            
            let commissionPercent = 0;
            
            if (isAdmin) {
                const adminLevelCommissions = [10, 5, 2, 1, 0.5]; // Default Admin Commission Structure
                commissionPercent = adminLevelCommissions[currentLevel - 1] || 0;
            } else if (hasActivePlan) {
                const plan = await Plan.findById(referrer.currentPlan).lean();
                if (plan) {
                    const levelFeature = plan.features.find(f => f.key === "LEVEL_COMMISSION");
                    if (levelFeature && Array.isArray(levelFeature.value)) {
                        commissionPercent = levelFeature.value[currentLevel - 1] || 0;
                    }
                }
            }
            
            // Fallback for non-admin referrers without an active plan, or if plan has no commission set
            if (!isAdmin && (!hasActivePlan || commissionPercent === 0) && currentLevel <= 5) {
                const defaultCommissions = [10, 5, 2, 1, 0.5]; // Default up to 5 levels
                commissionPercent = defaultCommissions[currentLevel - 1] || 0;
            }
            
            if (commissionPercent && typeof commissionPercent === 'number' && commissionPercent > 0) {
                    let commissionAmount = (orderAmount * commissionPercent) / 100;
                    
                    referrer.walletBalance = (referrer.walletBalance || 0) + commissionAmount;
                    await referrer.save();
                    
                    await Transaction.create({
                        user: referrer._id,
                        userModel: "User",
                        type: "Commission",
                        amount: commissionAmount,
                        status: "Settled",
                        reference: `LVL-COMM-${orderIdString}-${currentLevel}`,
                        meta: {
                            orderId: order._id,
                            level: currentLevel,
                            commissionPercent: commissionPercent,
                            orderAmount: orderAmount,
                            description: `Referral Commission (${commissionPercent}%) from ${orderCustomerName}`
                        }
                    });
                }
            
            currentUserId = referrerId;
        }
    } catch (err) {
        console.error("Error processing level commissions:", err);
    }
};
