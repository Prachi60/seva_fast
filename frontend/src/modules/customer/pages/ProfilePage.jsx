import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, MapPin, Package, CreditCard, Wallet, ChevronRight,
    LogOut, ShieldCheck, Heart, HelpCircle, Info, Edit2, ChevronLeft, Bell,
    Share2, Copy, Sparkles, Camera, X
} from 'lucide-react';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import { customerApi } from '../services/customerApi';
import axiosInstance from '@core/api/axios';
import { toast } from 'sonner';
import {
    describePushSupport,
    ensureFcmTokenRegistered,
    startForegroundPushListener
} from '@core/firebase/pushClient';

const TEST_PUSH_STATUS_POLL_INTERVAL_MS = 1500;
const TEST_PUSH_STATUS_MAX_ATTEMPTS = 20;

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, role, logout } = useAuth();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    const [isTestingPush, setIsTestingPush] = React.useState(false);
    const [isCustomOrderModalOpen, setIsCustomOrderModalOpen] = React.useState(false);

    const handleShare = async () => {
        const shareData = {
            title: appName,
            text: `Check out ${appName}!`,
            url: window.location.origin,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.origin);
                toast.success('Link copied to clipboard!');
            }
        } catch (error) {
            if (error?.name !== 'AbortError') {
                toast.error('Could not share at this time.');
            }
        }
    };

    const formatIndiaPhone = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.startsWith('+91')) return raw.replace(/^\+91[\s-]*/, '');
        if (raw.startsWith('91') && raw.length >= 12) return raw.replace(/^91[\s-]*/, '');
        return raw;
    };

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const waitForTestPushResult = async (orderId) => {
        for (let attempt = 0; attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS; attempt += 1) {
            const statusRes = await customerApi.getTestPushNotificationStatus(orderId);
            const result = statusRes?.data?.result || {};
            const status = String(result.status || '').trim().toLowerCase();

            if (status === 'sent' || status === 'failed') {
                return result;
            }

            if (attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS - 1) {
                await wait(TEST_PUSH_STATUS_POLL_INTERVAL_MS);
            }
        }
        return null;
    };

    const handleTestPush = async () => {
        if (isTestingPush) return;
        setIsTestingPush(true);
        try {
            const support = describePushSupport();
            if (!support.supported) {
                throw new Error(support.message || 'Push notifications are not supported on this device/browser setup.');
            }

            await ensureFcmTokenRegistered({ role, platform: 'web' });
            await startForegroundPushListener();
            const res = await customerApi.testPushNotification();
            const orderId = res?.data?.result?.orderId || '';
            if (!orderId) {
                toast.success('Test push triggered');
                return;
            }

            const statusResult = await waitForTestPushResult(orderId);
            if (!statusResult) {
                toast.message(`Test push processing (${orderId})`, {
                    description: 'Notification delivery is taking longer than expected.',
                });
                return;
            }

            if (statusResult.status === 'sent') {
                toast.success(`Test push sent (${orderId})`, {
                    description: 'MongoDB status is marked as sent.',
                });
                return;
            }

            toast.error(`Test push failed (${orderId})`, {
                description: String(statusResult.failureReason || 'Notification delivery failed.'),
            });
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Unknown error';
            toast.error('Failed to trigger test push', {
                description: message,
            });
        } finally {
            setIsTestingPush(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 font-sans">
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-slate-200/60 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/70 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">My Profile</h1>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleTestPush}
                        disabled={isTestingPush}
                        title="Test push notification"
                        className="w-10 h-10 flex items-center justify-center rounded-full transition-colors border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Bell size={18} className={isTestingPush ? "text-slate-400" : "text-slate-700"} />
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-1 relative z-20 space-y-4">

                {/* User Identity Card (ATM Style) */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-slate-700 p-6 mb-2">
                    {/* Background decorations */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    
                    <div className="relative z-10 flex justify-between items-start mb-8">
                        
                        {/* Left Side: Brand Text */}
                        <div className="flex items-center">
                            <span className="text-sm sm:text-base font-black text-white italic tracking-widest drop-shadow-md opacity-90">
                                SEVA FAST
                            </span>
                        </div>
                        
                        {/* Right Side: Actions */}
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleShare}
                                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md cursor-pointer active:scale-95 flex items-center justify-center"
                                title="Share"
                            >
                                <Share2 size={14} className="text-white/90" />
                            </button>
                            <Link to="/profile/edit" className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md" title="Edit Profile">
                                <Edit2 size={14} className="text-white/90" />
                            </Link>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-5">
                        {/* Name and Phone */}
                        <div>
                            <h2 className="text-base leading-tight font-semibold text-slate-900">{user?.name || 'Customer'}</h2>
                            <p className="text-slate-500 text-xs font-medium flex items-center gap-1 mt-0.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase">India</span> +91 {formatIndiaPhone(user?.phone)}
                            </p>
                            {user?.referralCode && (
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(user.referralCode);
                                        toast.success("Referral code copied to clipboard!");
                                    }}
                                    className="flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 px-2 py-1 rounded-md transition-colors"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-wider">Ref Code: {user.referralCode}</span>
                                    <Copy size={12} />
                                </button>
                            )}
                        </div>

                        {/* Referral Code & Plan Expiry Row */}
                        <div className="flex items-end justify-between pt-2">
                            <div>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Referral Code</p>
                                {user?.referralCode ? (
                                    <div 
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.referralCode);
                                            toast.success("Referral code copied to clipboard!");
                                        }}
                                        className="flex items-center gap-2 cursor-pointer group"
                                    >
                                        <span className="text-lg font-bold font-mono tracking-widest group-hover:text-amber-300 transition-colors">
                                            {user.referralCode}
                                        </span>
                                        <Copy size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ) : (
                                    <span className="text-sm font-mono opacity-50 tracking-widest">N/A</span>
                                )}
                            </div>
                            
                            <div className="text-right">
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Valid Thru</p>
                                <div className="text-lg font-bold font-mono tracking-widest">
                                    {user?.currentPlan && user?.planExpiry ? new Date(user.planExpiry).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }).replace('/', ' / ') : 'N / A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Sections */}
                <div className="space-y-4">
                    {/* Account Section */}
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Personal Account</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            <MenuItem
                                icon={Sparkles}
                                label="My Subscription"
                                sub={user?.currentPlan?.name ? `Active: ${user.currentPlan.name}` : "View or upgrade your plan"}
                                path="/plans"
                                color="#a855f7"
                                bg="rgba(168,85,247,0.10)"
                            />
                            <div onClick={() => setIsCustomOrderModalOpen(true)}>
                                <MenuItem
                                    icon={Camera}
                                    label="Custom Photo Order"
                                    sub="Send a picture directly to a seller"
                                    color="#ec4899"
                                    bg="rgba(236,72,153,0.10)"
                                />
                            </div>
                            <MenuItem
                                icon={Package}
                                label="Your Orders"
                                sub="Track, return or buy things again"
                                path="/orders"
                                color="var(--primary)"
                                bg="rgba(16,185,129,0.10)"
                            />
                            <MenuItem
                                icon={CreditCard}
                                label="Order Transactions"
                                sub="View all payments & refunds"
                                path="/transactions"
                                color="#f97316"
                                bg="rgba(249,115,22,0.10)"
                            />
                            <MenuItem
                                icon={Wallet}
                                label="Wallet"
                                sub="Balance & return refunds"
                                path="/wallet"
                                color="#10b981"
                                bg="rgba(16,185,129,0.10)"
                            />
                            <MenuItem
                                icon={Heart}
                                label="Your Wishlist"
                                sub="Your saved items"
                                path="/wishlist"
                                color="#fb7185"
                                bg="rgba(248,113,113,0.08)"
                            />
                            <MenuItem
                                icon={MapPin}
                                label="Saved Addresses"
                                sub="Manage your delivery locations"
                                path="/addresses"
                                color="var(--primary)"
                                bg="rgba(56,189,248,0.10)"
                            />
                        </div>
                    </div>

                    {/* Support Section */}
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Help & Settings</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            <MenuItem
                                icon={HelpCircle}
                                label="Help & Support"
                                path="/support"
                                color="#3b82f6"
                                bg="rgba(59,130,246,0.08)"
                            />
                            <MenuItem
                                icon={ShieldCheck}
                                label="Privacy Policy"
                                path="/privacy"
                                color="#a855f7"
                                bg="rgba(168,85,247,0.08)"
                            />
                            <MenuItem
                                icon={Info}
                                label="About Us"
                                path="/about"
                                color="#14b8a6"
                                bg="rgba(45,212,191,0.08)"
                            />
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="w-full py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold bg-white hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                    <LogOut size={20} />
                    Sign out
                </button>

                <div className="text-center pb-8">
                    <p className="text-[10px] text-slate-400 font-medium">Version 2.4.0 - {appName}</p>
                </div>

            </div>
            
            <CustomPhotoOrderModal 
                isOpen={isCustomOrderModalOpen} 
                onClose={() => setIsCustomOrderModalOpen(false)} 
            />
        </div>
    );
};

const CustomPhotoOrderModal = ({ isOpen, onClose }) => {
    const [file, setFile] = React.useState(null);
    const [city, setCity] = React.useState('');
    const [sellers, setSellers] = React.useState([]);
    const [selectedSellerId, setSelectedSellerId] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [isUploading, setIsUploading] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (isOpen && city.length > 2) {
            fetchSellers();
        }
    }, [city, isOpen]);

    const fetchSellers = async () => {
        try {
            const res = await axiosInstance.get(`/photo-orders/sellers?city=${city}`);
            setSellers(res.data.result || res.data.results || []);
        } catch (error) {
            console.error("Failed to fetch sellers:", error);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error("Please select an image");
        if (!selectedSellerId) return toast.error("Please select a seller");

        try {
            setIsSubmitting(true);
            setIsUploading(true);
            
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadRes = await axiosInstance.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const photoUrl = uploadRes.data.result.url;
            setIsUploading(false);

            await axiosInstance.post('/photo-orders', {
                sellerId: selectedSellerId,
                photoUrl,
                notes,
                city
            });

            toast.success("Custom photo order sent to seller!");
            onClose();
            // Reset
            setFile(null);
            setCity('');
            setSelectedSellerId('');
            setNotes('');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send photo order");
            setIsUploading(false);
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Camera size={18} className="text-brand-600" />
                        Send Photo to Seller
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your City</label>
                        <input 
                            type="text" 
                            placeholder="Type your city to find sellers..." 
                            value={city} 
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-brand-500 outline-none transition-colors"
                        />
                    </div>
                    
                    {city.length > 2 && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Seller</label>
                            <select 
                                value={selectedSellerId} 
                                onChange={(e) => setSelectedSellerId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-brand-500 outline-none transition-colors appearance-none"
                            >
                                <option value="">-- Choose a seller --</option>
                                {sellers.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.shopName || 'Store'})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upload Photo (List)</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center relative bg-slate-50 hover:bg-slate-100 transition-colors">
                            {file ? (
                                <div className="text-sm font-semibold text-brand-600 flex items-center gap-2">
                                    <Sparkles size={16} /> Selected: {file.name}
                                </div>
                            ) : (
                                <>
                                    <Camera size={24} className="text-slate-400 mb-2" />
                                    <span className="text-sm font-medium text-slate-600">Tap to select an image</span>
                                </>
                            )}
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Additional Notes (Optional)</label>
                        <textarea 
                            rows="2"
                            placeholder="Any specific instructions..." 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-brand-500 outline-none transition-colors resize-none"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting || !file || !selectedSellerId}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Camera size={18} />
                        )}
                        {isUploading ? "Uploading Image..." : "Send Request"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, sub, path, color = '#334155', bg = 'rgba(148,163,184,0.12)' }) => (
    <Link to={path || '#'} className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group">
        <div className="flex items-center gap-3">
            <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: bg }}
            >
                <Icon
                    size={20}
                    className="transition-colors"
                    style={{ color }}
                />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
                {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
        <div className="p-1.5 rounded-md group-hover:bg-slate-100 transition-colors">
            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-all group-hover:translate-x-0.5" />
        </div>
    </Link>
);

export default ProfilePage;


