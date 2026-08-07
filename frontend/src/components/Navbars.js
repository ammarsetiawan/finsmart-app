'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Menu, X, LayoutDashboard, ArrowLeftRight, Target,
    BarChart2, Tag, User, LogOut, ChevronDown, Wallet, ShieldCheck
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import AllocationModal from './AllocationModal';

const NAV_ITEMS = [
    { label: 'DASHBOARD', href: '/dashboard', icon: LayoutDashboard },
    { label: 'TRANSAKSI', href: '/transactions', icon: ArrowLeftRight },
    { label: 'BUDGET', href: '/budgets', icon: Target },
    { label: 'LAPORAN', href: '/reports', icon: BarChart2 },
    { label: 'KATEGORI', href: '/categories', icon: Tag },
    { label: 'SALDO', href: '/balance', icon: Wallet },
    { label: 'ADMIN', href: '/admin', icon: ShieldCheck },
]

export default function Navbar() {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [gajianOpen, setGajianOpen] = useState(false)
    const [user, setUser] = useState(null)
    const pathname = usePathname()
    const router = useRouter()
    const drawerRef = useRef(null)
    const dropdownRef = useRef(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null))
    }, [])

    useEffect(() => {
        function h(e) { if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawerOpen(false) }
        if (drawerOpen) document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [drawerOpen])

    useEffect(() => {
        function h(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false) }
        if (dropdownOpen) document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [dropdownOpen])

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const initials = user?.email?.slice(0, 1).toUpperCase() || 'U'
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

    return (
        <>
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="w-full px-6 lg:px-10">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Image src="/logo.png" alt="Fin Smart" width={120} height={40} className="object-contain" />
                        </div>

                        {/* Desktop menu */}
                        <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
                            {NAV_ITEMS.map(({ label, href }) => (
                                <Link key={label} href={href}
                                    className={`px-4 py-2 text-sm font-bold tracking-wide transition-colors rounded-md ${pathname === href
                                            ? 'text-teal-500 border-b-2 border-teal-500 rounded-none'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop kanan */}
                        <div className="hidden lg:flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => setGajianOpen(true)}
                                className="bg-teal-500 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-teal-600 transition-colors whitespace-nowrap"
                            >
                                MODE GAJIAN
                            </button>

                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(v => !v)}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                                        {initials}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{displayName}</span>
                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                        </div>
                                        <Link href="/profile" onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            <User size={15} /> Profil
                                        </Link>
                                        <button onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut size={15} /> Keluar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile hamburger */}
                        <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100">
                            <Menu size={22} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Overlay drawer */}
            {drawerOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" />}

            {/* Drawer */}
            <div ref={drawerRef}
                className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl transition-transform duration-300 lg:hidden flex flex-col ${drawerOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <Image src="/logo.png" alt="Fin Smart" width={100} height={32} className="object-contain" />
                    <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-md hover:bg-gray-100">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                </div>

                <div className="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
                    {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
                        <Link key={label} href={href} onClick={() => setDrawerOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-colors ${pathname === href ? 'bg-teal-50 text-teal-600' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Icon size={16} className="shrink-0" />{label}
                        </Link>
                    ))}
                    <div className="h-px bg-gray-100 my-2" />
                    <button
                        onClick={() => { setDrawerOpen(false); setGajianOpen(true) }}
                        className="w-full bg-teal-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-teal-600 transition-colors"
                    >
                        MODE GAJIAN
                    </button>
                </div>

                <div className="border-t border-gray-100 p-3 flex flex-col gap-1">
                    <Link href="/profile" onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <User size={15} /> Profil
                    </Link>
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={15} /> Keluar
                    </button>
                </div>
            </div>

            {/* Allocation Modal — bisa dibuka dari mana saja via Navbar */}
            <AllocationModal open={gajianOpen} onClose={() => setGajianOpen(false)} />
        </>
    )
}