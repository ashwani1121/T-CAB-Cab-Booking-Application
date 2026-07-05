import { useState } from "react";
import { useLocation, Link } from "react-router-dom";  
import { HiMenu, HiX } from "react-icons/hi";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Check active route
  const isActive = (path) => location.pathname === path;

  return (
    <header className="w-full text-white py-4 absolute top-0 left-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6">

        {/* Logo - Points to T-Parcel Home */}
        <Link to="/t-parcel">
          <img src="/assets/logo.png" alt="T-Parcel" className="w-[80px] md:w-[100px]" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 font-sora font-normal text-[15px] leading-[22px] tracking-[0.4px]">

          {/* 1. CORRECTED HOME LINK */}
          <Link
            to="/t-parcel"
            className={`hover:opacity-90 ${isActive("/t-parcel") ? "font-semibold underline underline-offset-8" : ""}`}
          >
            Home
          </Link>

          <Link
            to="/featuresT"
            className={`hover:opacity-90 ${isActive("/featuresT") ? "font-semibold underline underline-offset-8" : ""}`}
          >
            Features
          </Link>
        </nav>

        {/* Desktop T-Cab Button (Switch Back to Main Site) */}
        <Link to="/" className="hidden md:block">
          <button className="bg-white text-blue-600 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 select-none transition-colors">
            T Cab
          </button>
        </Link>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-3xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <HiX /> : <HiMenu />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-[#0038A8] bg-opacity-95 text-white px-6 py-6 space-y-4 absolute w-full left-0 top-full shadow-xl">

          {/* 2. CORRECTED MOBILE HOME LINK */}
          <Link
            to="/t-parcel"
            onClick={() => setMenuOpen(false)} // Close menu on click
            className={`block text-[16px] font-sora tracking-[0.4px] ${isActive("/t-parcel") && "font-semibold underline"}`}
          >
            Home
          </Link>

          <Link
            to="/featuresT"
            onClick={() => setMenuOpen(false)}
            className={`block text-[16px] font-sora tracking-[0.4px] hover:opacity-90 ${isActive("featuresT") ? "font-semibold underline" : ""}`}
          >
            Features
          </Link>

          <hr className="border-white/20" />

          {/* Mobile Switch Button */}
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <button className="w-full bg-white text-blue-600 font-semibold py-2 rounded-lg mt-4">
              Switch to T Cab
            </button>
          </Link>
        </div>
      )}
    </header>
  );
}