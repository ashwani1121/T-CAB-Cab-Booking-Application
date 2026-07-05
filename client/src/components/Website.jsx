import React, { useEffect } from 'react';
import { Link } from "lucide-react"
import img from '../assets/Hero Banner 2.jpg'; 
import img1 from '../assets/section_1.jpg';
import img2 from '../assets/Section_2.jpg';
import img3 from '../assets/Section_3.jpg';
import img4 from '../assets/Section_4.png';
import img5 from '../assets/Section_5.jpg';
import img6 from '../assets/Section_6.jpg';
import img7 from '../assets/Section_7.jpg';
import img8 from '../assets/Section_8.jpg';
import img9 from '../assets/Section_9.jpg';
import img10 from '../assets/Section_10.jpg';
import img11 from '../assets/Section_11.jpg';
import img12 from '../assets/Section_12.png';
import imgl from '../assets/T cab logo.svg';
const App = () => {
    useEffect(() => {
        // Tawk.to chat widget script
        var Tawk_API = Tawk_API || {};
        var Tawk_LoadStart = new Date();
        (function(){
            var s1 = document.createElement("script");
            var s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.src='https://embed.tawk.to/692829740d02891959543b83/1jb2e3sgv';
            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin', '*');
            s0.parentNode.insertBefore(s1, s0);
        })();
    }, []);
    return(
        <div className="w-full bg-white" style={{ fontFamily: "'Sora', sans-serif" }}>
            {/* --- Header --- */}
            <header className="flex flex-col md:flex-row justify-between items-center px-4 md:px-[5%] py-4 md:py-6 absolute top-0 left-0 w-full z-10 bg-black/30 md:bg-transparent">
                <div className="flex items-center mb-3 md:mb-0">
                <img src={imgl} alt="logo" className="h-8 md:h-10 w-auto" />
                </div>
                <nav className="flex items-center flex-wrap justify-center gap-3 md:gap-0">
                <a 
                    href="#home" 
                    className="no-underline text-white md:ml-5 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] text-sm md:text-base"
                >
                    Home
                </a>
                <a 
                    href="https://tcab.cloud/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="no-underline text-white md:ml-5 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] text-sm md:text-base"
                >
                    Demos
                </a>
                <a 
                    href="https://wa.me/+918971921813" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="no-underline text-white md:ml-5 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] text-sm md:text-base"
                >
                    Contact
                </a>
                </nav>
            </header>
            {/* --- Hero Section --- */}
            <section className="w-full pt-0 flex justify-center bg-white">
                <div className="w-full">
                <img src={img} alt="Section 1 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 1 (Image Only) --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full">
                <img src={img1} alt="Section 1 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 2 (Text + Image) --- */}
            <section className="w-full flex flex-col items-center justify-center py-8 md:py-16 px-4 md:px-[5%] bg-white">
                <div className="mb-6 md:mb-8 text-center">
                <h2 className="text-2xl md:text-[2.5rem] text-[#333] uppercase font-bold m-0">
                    OUR PROGRESS
                </h2>
                </div>
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img2} alt="Section 2 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 3 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img3} alt="Section 3 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 4 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img4} alt="Section 4 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 5 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img5} alt="Section 5 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 6 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img6} alt="Section 6 View" className="w-full h-auto block" />
                </div>
            </section>

            {/* --- Section 7 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img7} alt="Section 7 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 8 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img8} alt="Section 8 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 9 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img9} alt="Section 9 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 10 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img10} alt="Section 10 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Section 11 --- */}
            <section className="w-full p-0 flex justify-center bg-white">
                <div className="w-full max-w-[1200px] flex justify-center">
                <img src={img11} alt="Section 11 View" className="w-full h-auto block" />
                </div>
            </section>
            {/* --- Footer --- */}
            <footer className="text-white mt-6 md:mt-10" style={{background: 'linear-gradient(to right, #032677, #012e9a)'}}>
                {/* Top section */}
                <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    
                    {/* Brand + description */}
                    <div>
                    <img src={imgl} alt="logo" className="h-10 w-auto" />
                    <p className="text-sm text-white-400">
                        Delivering fast, reliable rides and parcel services with real-time tracking and seamless booking.
                    </p>
                    </div>

                    {/* Important Links */}
                    <div>
                    <h3 className="text-sm font-semibold tracking-wide uppercase mb-3 text-white-300">
                        Important
                    </h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <a
                                href="https://www.tcab.cloud/terms"
                                className="hover:text-white hover:underline cursor-pointer"
                                target="_blank"
                                rel="noopener noreferrer"
                                >
                                Terms &amp; Conditions
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://www.tcab.cloud/privacy"
                                className="hover:text-white hover:underline cursor-pointer"
                                target="_blank"
                                rel="noopener noreferrer"
                                >
                                Privacy &amp; Policy
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://www.tcab.cloud/signin"
                                className="hover:text-white hover:underline cursor-pointer"
                                target="_blank"
                                rel="noopener noreferrer"
                                >
                                Demos
                            </a>
                        </li>
                    </ul>
                    </div>

                    {/* Contact */}
                    <div>
                    <h3 className="text-sm font-semibold tracking-wide uppercase mb-3 text-white-300">
                        Contact Us
                    </h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                        <a href="https://tcab.cloud/signin" className="hover:text-white hover:underline">
                            www.tcab.cloud
                        </a>
                        </li>
                        <li>
                        <a href="tel:+918971921813" className="hover:text-white hover:underline">
                            +91 8971921813
                        </a>
                        </li>
                    </ul>
                    </div>

                    {/* Professionals (3 items) */}
                    <div>
                    <h3 className="text-sm font-semibold tracking-wide uppercase mb-3 text-white-300">
                        Feauters
                    </h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                        <a className="hover:text-white cursor-pointer">
                            Real-Time Tracking
                        </a>
                        </li>
                        <li>
                        <a className="hover:text-white cursor-pointer ">
                            Parcel Delivery in Time
                        </a>
                        </li>
                        <li>
                        <a className="hover:text-white cursor-pointer ">
                            Safe & Affordable
                        </a>
                        </li>
                    </ul>
                    </div>
                </div>
                {/* Bottom bar */}
                <div>
                    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-400">
                    <p className="text-center md:text-left">
                        &copy; 2025 TCabs. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <a href="https://www.tcab.cloud/terms" className="hover:text-white hover:underline">
                            Terms &amp; Conditions
                        </a>
                        <a href="https://www.tcab.cloud/privacy" className="hover:text-white hover:underline">
                            Privacy &amp; Policy
                        </a>
                        <a href="#contact" className="hover:text-white hover:underline">
                            Contact
                        </a>
                    </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
export default App;