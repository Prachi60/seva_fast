import React from 'react';
import { Check, Shield, Zap, Gift, Users, TrendingUp, ShoppingBag, Layers, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
    FREE_DELIVERY: Zap,
    CASHBACK: Gift,
    VENDOR_ONBOARDING: Users,
    REFERRAL_REWARD: Shield,
    TURNOVER_COMMISSION: TrendingUp,
    ORDER_COMMISSION: ShoppingBag,
    REFERRAL_LEVELS: Layers,
    LEVEL_COMMISSION: Percent,
};

const PlanCard = ({ plan, onEdit, onDelete, isAdmin = false }) => {
    return (
        <div 
            className="group relative bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl overflow-hidden"
            style={{ '--brand-color': plan.displayColor }}
        >
            {/* Background Accent */}
            <div 
                className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 transition-transform duration-700 group-hover:scale-150"
                style={{ backgroundColor: plan.displayColor }}
            />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span 
                            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-3 inline-block"
                            style={{ backgroundColor: plan.displayColor }}
                        >
                            {plan.name}
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                            <span className="text-sm font-bold text-slate-400">/ year</span>
                        </div>
                    </div>
                </div>

                <p className="text-sm font-medium text-slate-500 mb-8 line-clamp-2">
                    {plan.description || "Unlock premium features and elevate your experience."}
                </p>

                <div className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => {
                        const Icon = iconMap[feature.key] || Check;
                        return (
                            <div key={idx} className="flex items-center gap-3">
                                <div 
                                    className="p-2 rounded-xl"
                                    style={{ backgroundColor: `${plan.displayColor}15` }}
                                >
                                    <Icon className="h-4 w-4" style={{ color: plan.displayColor }} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 leading-none mb-1">{feature.label}</p>
                                    <p className="text-[10px] font-bold text-slate-400 leading-none">
                                        {feature.unit === 'Boolean' ? (feature.value ? 'Enabled' : 'Disabled') : `${feature.value}${feature.unit}`}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isAdmin ? (
                    <div className="flex gap-3 pt-4 border-t border-dashed border-slate-100 mt-auto">
                        <button 
                            onClick={() => onEdit(plan)}
                            className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Edit Plan
                        </button>
                        <button 
                            onClick={() => onDelete(plan._id)}
                            className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Delete
                        </button>
                    </div>
                ) : (
                    <button 
                        className="w-full py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-200 transition-all active:scale-95"
                        style={{ backgroundColor: plan.displayColor }}
                    >
                        Subscribe Now
                    </button>
                )}
            </div>
        </div>
    );
};

export default PlanCard;
