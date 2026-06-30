import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, X } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import axiosInstance from '@/core/api/axios';
import { useAuth } from '@/core/context/AuthContext';
import PlanCard from '@/shared/components/ui/PlanCard';

// Razorpay removed in favor of PhonePe
const PlansPage = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingPlanId, setProcessingPlanId] = useState(null);
    const [referralModalOpen, setReferralModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [referralCode, setReferralCode] = useState('');
    
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        if (referralModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [referralModalOpen]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const res = await customerApi.getPlans({ forceRefresh: true });
            setPlans(res.data.results || res.data.result || []);
        } catch (error) {
            toast.error("Failed to load plans");
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribeClick = (plan) => {
        setSelectedPlan(plan);
        setReferralCode('');
        setReferralModalOpen(true);
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const initiateRazorpay = async () => {
        if (!selectedPlan) return;
        if (!referralCode.trim()) {
            toast.error("Referral code is required to activate a plan.");
            return;
        }
        
        setProcessingPlanId(selectedPlan._id);
        
        try {
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error("Razorpay SDK failed to load. Are you online?");
                setProcessingPlanId(null);
                return;
            }

            const initRes = await axiosInstance.post('/plans/subscribe/initiate', {
                planId: selectedPlan._id,
                referralCode: referralCode.trim() || undefined
            });

            if (initRes.data.result.success) {
                const { orderId, amount, currency, referredBy, razorpayKey } = initRes.data.result;

                const options = {
                    key: razorpayKey,
                    amount: amount,
                    currency: currency,
                    name: "Seva Fast",
                    description: `Subscription: ${selectedPlan.name}`,
                    order_id: orderId,
                    handler: async function (response) {
                        try {
                            const verifyRes = await axiosInstance.post('/plans/subscribe/verify', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: selectedPlan._id,
                                referredBy: referredBy
                            });
                            
                            if (verifyRes.data.result) {
                                toast.success("Plan activated successfully!");
                                if (refreshUser) {
                                    await refreshUser();
                                }
                            } else {
                                toast.error("Payment verification failed");
                            }
                        } catch (err) {
                            toast.error("Failed to verify payment");
                        }
                    },
                    prefill: {
                        name: user?.name || "Customer",
                        contact: user?.phone || ""
                    },
                    theme: {
                        color: "#0f172a"
                    }
                };
                
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response){
                    toast.error(response.error.description || "Payment failed");
                });
                setReferralModalOpen(false);
                rzp.open();
            } else {
                toast.error("Failed to activate plan");
                setReferralModalOpen(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to initiate payment");
            setReferralModalOpen(false);
        } finally {
            setProcessingPlanId(null);
        }
    };

    const displayPlans = plans;

    return (
        <div className="min-h-screen bg-slate-50 pt-safe-top pb-safe-bottom font-['Outfit',_sans-serif]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="px-4 h-16 flex items-center gap-4 max-w-7xl mx-auto">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">
                            {user?.currentPlan ? "My Subscription" : "Subscription Plans"}
                        </h1>
                        <p className="text-xs font-bold text-slate-400">
                            {user?.currentPlan ? "Your active plan details" : "Choose a plan to continue shopping"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
                        Loading Plans...
                    </div>
                ) : displayPlans.length === 0 ? (
                    <div className="py-20 text-center font-bold text-slate-400 uppercase tracking-widest text-sm">
                        No active plans available
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayPlans.map(plan => {
                            const isActivePlan = user?.currentPlan && (user.currentPlan === plan._id || user.currentPlan._id === plan._id);
                            return (
                                <div key={plan._id} className="relative">
                                    {processingPlanId === plan._id && (
                                        <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm rounded-[32px] flex items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-white border-t-black rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    <div 
                                        onClick={() => !isActivePlan && handleSubscribeClick(plan)}
                                        className={isActivePlan ? "opacity-90 pointer-events-none" : "cursor-pointer"}
                                    >
                                        <PlanCard 
                                            plan={plan} 
                                            isAdmin={false} 
                                            isActive={isActivePlan}
                                            expiryDate={user?.planExpiry}
                                        />
                                        {isActivePlan && (
                                            <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                                <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                                                    Active Plan
                                                </div>
                                                <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold text-slate-500 uppercase shadow-sm border border-slate-100">
                                                    Valid till: {new Date(user.planExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Referral Modal */}
            <AnimatePresence>
                {referralModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl relative"
                        >
                            <button 
                                onClick={() => setReferralModalOpen(false)}
                                className="absolute top-6 right-6 w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                            
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Enter Referral Code</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1 mb-3">
                                    A valid referral code is required to proceed with payment.
                                </p>
                                <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-amber-600 text-xs font-black">!</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-900/60 uppercase tracking-widest mb-0.5">Default Admin Code</p>
                                        <p className="text-xs font-bold text-amber-900 leading-tight">
                                            Don't have a referral code? Use <span 
                                                onClick={() => {
                                                    navigator.clipboard.writeText('SEVAFAST');
                                                    toast.success('Admin code copied!');
                                                }}
                                                className="font-black text-amber-700 tracking-wider cursor-pointer hover:underline"
                                                title="Click to copy"
                                            >SEVAFAST</span> to continue.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <input 
                                type="text"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE (REQUIRED)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all uppercase tracking-widest mb-6"
                            />

                            <button 
                                onClick={initiateRazorpay}
                                disabled={!referralCode.trim()}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                Activate Plan (₹{selectedPlan?.price})
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PlansPage;
