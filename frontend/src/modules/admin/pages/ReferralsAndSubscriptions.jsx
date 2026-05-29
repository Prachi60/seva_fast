import React, { useState, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import PageHeader from '@shared/components/ui/PageHeader';
import {
    Users,
    Search,
    Loader2,
    Gift,
    Award,
    Clock,
    UserPlus,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Pagination from '@shared/components/ui/Pagination';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';

const ReferralsAndSubscriptions = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [customers, setCustomers] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(1);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageSize, searchTerm, filterPlan]);

    const fetchData = async (requestedPage = 1) => {
        try {
            setLoading(true);
            const params = { page: requestedPage, limit: pageSize };
            if (searchTerm.trim()) params.search = searchTerm.trim();
            
            const { data } = await adminApi.getUsers(params);
            if (data.success) {
                const payload = data.result || {};
                let list = Array.isArray(payload.items) ? payload.items : (data.results || []);
                
                if (filterPlan === 'with-plan') {
                    list = list.filter(c => c.currentPlan && new Date(c.planExpiry) > new Date());
                } else if (filterPlan === 'referred') {
                    list = list.filter(c => c.referredBy);
                }

                setCustomers(list);
                setTotal(payload.total || list.length);
                setPage(payload.page || requestedPage);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load customer records");
        } finally {
            setLoading(false);
        }
    };

    const isPlanActive = (cust) => {
        return cust.currentPlan && cust.planExpiry && new Date(cust.planExpiry) > new Date();
    };

    const getFreeDeliveryUsage = (cust) => {
        if (!isPlanActive(cust)) return null;
        const feature = cust.currentPlan?.features?.find(f => f.key === 'FREE_DELIVERY');
        if (!feature || feature.value === false || feature.value === "0") return null;
        
        const limit = parseInt(feature.value, 10);
        const used = cust.monthlyOrders || 0;
        
        if (limit === -1) return { used, limit: 'Unlimited' };
        return { used, limit };
    };

    return (
        <div className="ds-section-spacing">
            <PageHeader
                title="Referrals & Plans"
                description="Monitor user subscriptions and referral networks"
                badge={
                    <div className="ds-stat-card-icon bg-amber-50">
                        <Gift className="ds-icon-lg text-amber-600" />
                    </div>
                }
            />

            {/* Filter & Search Bar */}
            <Card className="ds-card-compact">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 ds-icon-sm text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, email or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ds-input pl-9 focus:border-amber-500 focus:ring-amber-500/20"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
                        <div className="flex bg-gray-100 p-0.5 rounded-lg shrink-0">
                            {[
                                { id: 'all', label: 'All Users' },
                                { id: 'with-plan', label: 'Active Plan' },
                                { id: 'referred', label: 'Referred Users' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterPlan(f.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap",
                                        filterPlan === f.id ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* List Table */}
            <Card className="overflow-hidden relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                            <p className="ds-caption text-gray-500 font-medium">Loading Records...</p>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="ds-table">
                        <thead className="ds-table-header bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="ds-table-header-cell">Customer</th>
                                <th className="ds-table-header-cell">Referred By</th>
                                <th className="ds-table-header-cell">Active Plan</th>
                                <th className="ds-table-header-cell">Plan Usage (This Month)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!loading && customers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <Users className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <p className="ds-h4 text-slate-400">No matching records found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customers.map((cust) => {
                                    const hasPlan = isPlanActive(cust);
                                    const deliveryUsage = getFreeDeliveryUsage(cust);

                                    return (
                                        <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={cust.avatar}
                                                        alt={cust.name}
                                                        className="h-10 w-10 rounded-xl bg-slate-100 object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{cust.name}</p>
                                                        <p className="text-xs font-semibold text-slate-500">{cust.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Referred By */}
                                            <td className="px-6 py-4">
                                                {cust.referredBy ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                                            <UserPlus className="h-4 w-4 text-indigo-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700">{cust.referredBy.name || 'Unknown'}</p>
                                                            <p className="text-[10px] font-semibold text-slate-400">{cust.referredBy.phone}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-400 italic">No Referrer</span>
                                                )}
                                            </td>

                                            {/* Plan Details */}
                                            <td className="px-6 py-4">
                                                {hasPlan ? (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <Award className="h-4 w-4 text-amber-500" />
                                                            <span className="text-sm font-black text-amber-600">
                                                                {cust.currentPlan?.name || 'Unknown Plan'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                                Valid till: {new Date(cust.planExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Badge variant="neutral" className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 text-slate-500 border-none">
                                                        No Active Plan
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Usage */}
                                            <td className="px-6 py-4">
                                                {hasPlan && deliveryUsage ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                                            <span>Free Deliveries Used:</span>
                                                            <span className={cn(deliveryUsage.used >= deliveryUsage.limit && deliveryUsage.limit !== 'Unlimited' ? "text-rose-500" : "text-emerald-600")}>
                                                                {deliveryUsage.used} / {deliveryUsage.limit}
                                                            </span>
                                                        </div>
                                                        {deliveryUsage.limit !== 'Unlimited' && (
                                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={cn("h-full rounded-full transition-all duration-500", deliveryUsage.used >= deliveryUsage.limit ? "bg-rose-500" : "bg-emerald-500")}
                                                                    style={{ width: `${Math.min((deliveryUsage.used / deliveryUsage.limit) * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-gray-100">
                    <Pagination
                        page={page}
                        totalPages={Math.ceil(total / pageSize) || 1}
                        total={total}
                        pageSize={pageSize}
                        onPageChange={(p) => fetchData(p)}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                        }}
                        loading={loading}
                    />
                </div>
            </Card>
        </div>
    );
};

export default ReferralsAndSubscriptions;
