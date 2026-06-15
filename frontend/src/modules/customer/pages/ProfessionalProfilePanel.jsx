import React, { useState, useEffect } from 'react';
import { customerApi } from '../services/customerApi';
import { useToast } from '@shared/components/ui/Toast';
import {
    Briefcase,
    Loader2,
    Sparkles,
    CheckCircle2,
    XCircle,
    Clock,
    Plus,
    Trash2,
    DollarSign,
    MapPin,
    Calendar,
    Phone,
    Mail,
    AlertCircle,
    User,
    ChevronRight,
    Edit2
} from 'lucide-react';

const ProfessionalProfilePanel = () => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [ad, setAd] = useState(null);
    const [categories, setCategories] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);

    // Form registration state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [profession, setProfession] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [experienceYears, setExperienceYears] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [lat, setLat] = useState('22.7196'); // Default Indore coordinates
    const [lng, setLng] = useState('75.8577');
    const [isLocating, setIsLocating] = useState(false);

    // Catalog edit state
    const [isEditingCatalog, setIsEditingCatalog] = useState(false);
    const [servicesList, setServicesList] = useState([]);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServicePrice, setNewServicePrice] = useState('');
    const [newServiceDesc, setNewServiceDesc] = useState('');

    const loadProfile = async () => {
        try {
            setIsLoading(true);
            // Fetch categories first
            const catRes = await customerApi.getProfessionalCategories();
            if (catRes.data?.success) {
                setCategories(catRes.data.result || catRes.data.results || []);
            }

            // Fetch wallet balance from profile
            const profileRes = await customerApi.getProfile();
            if (profileRes.data?.success) {
                setWalletBalance(profileRes.data.result?.walletBalance || 0);
            }

            // Fetch ad profile
            const adRes = await customerApi.getProfessionalProfile();
            if (adRes.data?.success) {
                const profile = adRes.data.result;
                setAd(profile);
                if (profile) {
                    setServicesList(profile.services || []);
                }
            }
        } catch (error) {
            if (error.response?.status === 404) {
                // No profile created yet
                setAd(null);
            } else {
                console.error("Failed to load professional profile", error);
                showToast("Failed to load profile details", "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleAutoDetectLocation = () => {
        if (!navigator.geolocation) {
            return showToast("Geolocation is not supported by your browser", "error");
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLat(position.coords.latitude.toFixed(6));
                setLng(position.coords.longitude.toFixed(6));
                setIsLocating(false);
                showToast("Coordinates detected successfully!", "success");
            },
            (error) => {
                console.error("Geolocation error:", error);
                setIsLocating(false);
                showToast("Failed to detect location. Please type manually or enable location access.", "error");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!name || !phone || !profession || !categoryId || !description || !address || !city) {
            return showToast("Please fill all required fields", "error");
        }
        if (phone.length !== 10) {
            return showToast("Phone number must be exactly 10 digits", "error");
        }
        try {
            setIsLoading(true);
            const payload = {
                name,
                phone,
                email,
                profession,
                categoryId,
                experienceYears: Number(experienceYears) || 0,
                description,
                address,
                city,
                lat: parseFloat(lat) || 22.7196,
                lng: parseFloat(lng) || 75.8577
            };
            const res = await customerApi.createProfessionalProfile(payload);
            if (res.data?.success) {
                showToast("Professional advertisement registered successfully!", "success");
                loadProfile();
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Registration failed", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayListing = async () => {
        if (!window.confirm("Pay the ₹499 listing fee from your wallet balance to activate this ad?")) return;
        try {
            setIsLoading(true);
            const res = await customerApi.payProfessionalProfile();
            if (res.data?.success) {
                showToast("Listing activation payment successful!", "success");
                loadProfile();
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Payment failed", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddServiceItem = () => {
        if (!newServiceName.trim() || !newServicePrice) {
            return showToast("Service name and price are required", "error");
        }
        const newItem = {
            name: newServiceName.trim(),
            price: parseFloat(newServicePrice) || 0,
            description: newServiceDesc.trim(),
            durationMinutes: 30
        };
        setServicesList([...servicesList, newItem]);
        setNewServiceName('');
        setNewServicePrice('');
        setNewServiceDesc('');
    };

    const handleRemoveServiceItem = (index) => {
        setServicesList(servicesList.filter((_, i) => i !== index));
    };

    const handleSaveCatalog = async () => {
        try {
            setIsLoading(true);
            const res = await customerApi.updateProfessionalServices({ services: servicesList });
            if (res.data?.success) {
                showToast("Service catalog updated and is pending moderation approval.", "success");
                setIsEditingCatalog(false);
                loadProfile();
            }
        } catch (error) {
            showToast("Failed to save services list", "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <Loader2 className="h-12 w-12 text-brand-500 animate-spin" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Professional Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-750 pb-20">
            {ad ? (
                /* PROFILE DASHBOARD DISPLAY */
                <div className="space-y-8">
                    {/* Header profile block */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-950">{ad.name}</h1>
                                <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-black text-brand-600 uppercase tracking-wider">{ad.profession}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400" /> {ad.city} ({ad.address})</span>
                                <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-slate-400" /> {ad.phone}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-slate-400" /> {ad.experienceYears} Yrs Exp</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 bg-slate-50 p-4 rounded-3xl border border-slate-100 min-w-[150px]">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Wallet Balance</span>
                            <span className="text-xl font-black text-slate-900">₹{walletBalance}</span>
                        </div>
                    </div>

                    {/* Verification & Subscription Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Approval Status Card */}
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${
                                ad.approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                ad.approvalStatus === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                                {ad.approvalStatus === 'approved' ? <CheckCircle2 className="h-8 w-8" /> :
                                 ad.approvalStatus === 'rejected' ? <XCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Verification Status</span>
                                <h3 className="text-lg font-black text-slate-900 capitalize">{ad.approvalStatus}</h3>
                                {ad.rejectionReason && (
                                    <p className="text-xs font-bold text-rose-500 mt-1">Reason: {ad.rejectionReason}</p>
                                )}
                            </div>
                        </div>

                        {/* Subscription Status Card */}
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl ${
                                    ad.paymentStatus === 'paid' ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-400'
                                }`}>
                                    <DollarSign className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ad Subscription Status</span>
                                    <h3 className="text-lg font-black text-slate-900 capitalize">{ad.paymentStatus}</h3>
                                    {ad.expiresAt && ad.paymentStatus === 'paid' && (
                                        <p className="text-xs font-semibold text-slate-400">Expires on: {new Date(ad.expiresAt).toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                            {ad.paymentStatus !== 'paid' && (
                                <button
                                    onClick={handlePayListing}
                                    className="px-6 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105"
                                >
                                    Pay ₹499
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Catalog Services Editor */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Service Price Catalog</h2>
                                <p className="text-xs text-slate-400 font-bold mt-1">Manage individual service task items you offer to customers.</p>
                            </div>
                            {!isEditingCatalog ? (
                                <button
                                    onClick={() => setIsEditingCatalog(true)}
                                    className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                                >
                                    <Edit2 className="h-4 w-4" /> Edit List
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveCatalog}
                                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingCatalog(false);
                                            setServicesList(ad.services || []);
                                        }}
                                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditingCatalog ? (
                            /* Editing Catalog Inputs */
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Service Title</label>
                                        <input
                                            type="text"
                                            value={newServiceName}
                                            onChange={(e) => setNewServiceName(e.target.value)}
                                            placeholder="e.g. Tap Leak Repair"
                                            className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-1 focus:ring-brand-500/20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pricing (₹)</label>
                                        <input
                                            type="number"
                                            value={newServicePrice}
                                            onChange={(e) => setNewServicePrice(e.target.value)}
                                            placeholder="e.g. 199"
                                            className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-1 focus:ring-brand-500/20"
                                        />
                                    </div>
                                    <div className="space-y-1 flex gap-2">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Description</label>
                                            <input
                                                type="text"
                                                value={newServiceDesc}
                                                onChange={(e) => setNewServiceDesc(e.target.value)}
                                                placeholder="Brief summary..."
                                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-1 focus:ring-brand-500/20"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddServiceItem}
                                            className="px-4 py-3 bg-black text-white rounded-xl transition-all flex items-center justify-center"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {servicesList.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic text-center py-6 font-bold">No services added to your catalog yet.</p>
                                    ) : (
                                        servicesList.map((svc, i) => (
                                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900">{svc.name}</h4>
                                                    {svc.description && <p className="text-xs text-slate-400 font-bold">{svc.description}</p>}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-black text-emerald-600">₹{svc.price}</span>
                                                    <button
                                                        onClick={() => handleRemoveServiceItem(i)}
                                                        className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Ready Catalog View Only */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ad.services?.length > 0 ? (
                                    ad.services.map((svc, i) => (
                                        <div key={i} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex justify-between items-center">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900">{svc.name}</h4>
                                                {svc.description && <p className="text-xs text-slate-400 font-bold mt-0.5">{svc.description}</p>}
                                            </div>
                                            <span className="text-sm font-black text-emerald-600">₹{svc.price}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                                        <p className="text-xs text-slate-400 font-bold">Your service catalog is empty. Click edit above to list service offerings.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* SERVICE PROFESSIONAL REGISTRATION WIZARD */
                <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-950 flex items-center gap-2">
                            List Your Professional Service
                            <Sparkles className="h-5 w-5 text-brand-500" />
                        </h1>
                        <p className="text-sm text-slate-400 font-bold mt-1">Get verified, advertise your service category, and connect with local customers.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phone Number</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="10-digit mobile number"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address (Optional)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="yourname@domain.com"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Profession Service Title</label>
                                <input
                                    type="text"
                                    required
                                    value={profession}
                                    onChange={(e) => setProfession(e.target.value)}
                                    placeholder="e.g. Master Plumber, AC Mechanic"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Service Category</label>
                                <select
                                    required
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">Select a category...</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Years of Experience</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={experienceYears}
                                    onChange={(e) => setExperienceYears(e.target.value)}
                                    placeholder="e.g. 5"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Operational City</label>
                                <input
                                    type="text"
                                    required
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="e.g. Indore"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Address</label>
                                <input
                                    type="text"
                                    required
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Detailed shop or service area address"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 p-5 bg-indigo-50/40 rounded-3xl border border-indigo-100/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-800">Set Service Location Coordinates</h4>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                                        Customers will locate you based on these coordinates. Use auto-detect for accuracy.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAutoDetectLocation}
                                    disabled={isLocating}
                                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-60 shrink-0"
                                >
                                    {isLocating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Detecting...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-4 w-4" />
                                            Detect My Location
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latitude Coordinate</label>
                                <input
                                    type="text"
                                    required
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    placeholder="e.g. 22.7196"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Longitude Coordinate</label>
                                <input
                                    type="text"
                                    required
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                    placeholder="e.g. 75.8577"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Service Profile Description</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Introduce your plumbing/electrician services, specializations, tools, and booking callout policies..."
                                rows="4"
                                className="w-full px-5 py-4 bg-slate-50 border-none rounded-[16px] text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
                            />
                        </div>

                        <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Advertisement Listing Subscription Fee</h4>
                                <p className="text-xs text-amber-700 font-bold leading-relaxed">
                                    Registration creates a pending profile. You will need to pay ₹499 via wallet balance to activate the listing for a 30-day period.
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-5 bg-black hover:scale-[1.01] transition-all text-white rounded-[24px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 mt-8 shadow-xl shadow-brand-100"
                        >
                            Register Profile Details <ChevronRight className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProfessionalProfilePanel;
