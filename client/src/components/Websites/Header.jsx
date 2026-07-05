import { useState } from "react";
import { useLocation, Link } from "react-router-dom";  
import { Menu } from 'lucide-react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Check active route
  const isActive = (path) => location.pathname === path;

  return (
    <header className="w-full text-white py-4 absolute top-0 left-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <img src="/assets/logoT.png" alt="TCAB Logo" className="w-80px md:w-[100px]" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 font-sora font-normal text-[15px] leading-[22px] tracking-[0.4px]">

          <a
            href="/"
            className={`hover:opacity-90 ${isActive("/") ? "font-semibold underline underline-offset-8" : ""}`}
          >
            Home
          </a>

          <a
            href="/pricing"
            className={`hover:opacity-90 ${isActive("/pricing") ? "font-semibold underline underline-offset-8" : ""}`}
          >
            Pricing
          </a>

          <a
            href="/demo"
            className={`hover:opacity-90 ${isActive("/demo") ? "font-semibold underline underline-offset-8" : ""}`}
          >
            Demo
          </a>

          <a
            href="/features"
            className={`hover:opacity-90 ${isActive("/features") ? "font-semibold underline underline-offset-8" : ""}`}
          >
            Features
          </a>
        </nav>

        {/* Desktop Whatsapp Button */}
      <Link to="/t-parcel" className="hidden md:block">
        <button className="bg-white text-blue-600 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 select-none transition-colors">
          T Parcel
        </button>
      </Link>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-3xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <Menu /> : <Menu />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-[#0038A8] bg-opacity-95 text-white px-6 py-6 space-y-4 absolute w-full left-0 top-full shadow-xl">

          <a
            href="/"
            className={`block text-[16px] font-sora tracking-[0.4px] ${isActive("/") && "font-semibold underline"}`}
          >
            Home
          </a>

          <a
            href="/pricing"
            className={`block text-[16px] font-sora tracking-[0.4px] ${isActive("/pricing") && "font-semibold underline"}`}
          >
            Pricing
          </a>

          <a
            href="/demo"
            className={`block text-[16px] font-sora tracking-[0.4px] ${isActive("/demo") && "font-semibold underline"}`}
          >
            Demo
          </a>

          <a
            href="/features"
            className={`block text-[16px] font-sora tracking-[0.4px] ${isActive("/features") && "font-semibold underline"}`}
          >
            Features
          </a>

          <hr className="border-white/20" />

          {/* Mobile WhatsApp Button */}
          <a href="https://wa.me/918971921813">
            <button className="w-full bg-white text-blue-600 font-semibold py-2 rounded-lg mt-4">
              Whatsapp
            </button>
          </a>
        </div>
      )}
    </header>
  );
}
