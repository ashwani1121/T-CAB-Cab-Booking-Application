import { useState } from "react";
import { 
  Plus, 
  Minus, 
  Instagram, 
  Twitter, 
  Facebook, 
  Github, 
  Headphones, 
  RefreshCw, 
  Award, 
  Users 
} from "lucide-react";
import { Link } from "react-router-dom";

export default function FinalSection(){
    const [openIndex, setOpenIndex] = useState(null);
    const faq = [
        {
            question: "Is there a free trial available?",
            answer:
                "Yes, you can try TCAB free for 30 days. We also provide a free onboarding session to help you get started.",
        },
        {
            question: "Can I change my plan later?",
            answer:
                "Absolutely. You can upgrade or downgrade your plan at any time from the billing section in your dashboard.",
        },
        {
            question: "What is your cancellation policy?",
            answer:
                "You can cancel your subscription at any time. Your account will remain active until the end of the current billing cycle.",
        },
        {
            question: "Can other info be added to an invoice?",
            answer:
                "Yes, you can add your GST details, company name, and billing address to every invoice from the settings page.",
        },
        {
            question: "How does billing work?",
            answer:
                "We bill you monthly or yearly based on your chosen plan. Payments are processed securely through trusted gateways.",
        },
        {
            question: "How do I change my account email?",
            answer:
                "Go to Profile → Account Settings → Change Email. You’ll receive a verification link on your new email.",
        },
    ];

    return(
        <section className="w-full bg-white">
            {/* FAQ Section */}
            <div className="max-w-5xl mx-auto py-20 text-center px-6 select-none">
                <h2
                    className="
                        font-sora 
                        font-semibold 
                        text-[36px] 
                        leading-[140%] 
                        tracking-[0.15px] 
                        text-black 
                        text-center 
                        mb-2
                        "
                >
                    Frequently asked questions
                </h2>
                <p
                    className="
                        font-productSansLight
                        font-light
                        text-[18px]
                        leading-[100%]
                        tracking-[0.4px]
                        text-gray-500
                        text-center
                        mt-3
                        "
                >
                    Everything you need to know about the product and billing.
                </p>
                <div className="space-y-6">
                    {faq.map((item, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div key={index} className="border-b pb-4 mt-3">
                                {/* QUESTION ROW */}
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="w-full flex justify-between items-center text-left"
                                >
                                    <span
                                        className="font-sora font-semibold text-[18px] leading-[130%] tracking-[0px] text-gray-800"
                                    >
                                        {item.question}
                                    </span>
                                    {isOpen ? (
                                        <Minus className="text-gray-500 text-xl" />
                                    ) : (
                                        <Plus className="text-gray-500 text-xl" />
                                    )}
                                </button>
                                {/* ANSWER SECTION */}
                                {isOpen && (
                                    <p className="mt-3 text-gray-600 text-[15px] leading-relaxed text-left">
                                        {item.answer}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Why Choose Section */}
            <div className="max-w-6xl mx-auto text-center py-16 select-none">
                <h3 className="text-[22px] font-bold text-black">Why Choose TCAB?</h3>
                <p className="text-gray-500 text-sm mt-1">
                    Everything you need to know about the product and billing.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mt-10 text-center">
                    <div>
                        <Award className="text-blue-600 w-8 h-8 mx-auto" />
                        <p className="font-semibold text-sm mt-2">98% approval success rate</p>
                        <p className="text-gray-400 text-xs">Highest success rate in the industry</p>
                    </div>
                    <div>
                        <Headphones className="text-blue-600 w-8 h-8 mx-auto" />
                        <p className="font-semibold text-sm mt-2">24/7 support</p>
                        <p className="text-gray-400 text-xs">Round-the-clock customer support</p>
                    </div>
                    <div>
                        <RefreshCw className="text-blue-600 w-8 h-8 mx-auto" />
                        <p className="font-semibold text-sm mt-2">Quick refunds & settlements</p>
                        <p className="text-gray-400 text-xs">Fast value for refunded processes</p>
                    </div>
                    <div>
                        <Users className="text-blue-600 w-8 h-8 mx-auto" />
                        <p className="font-semibold text-sm mt-2">Dedicated experts</p>
                        <p className="text-gray-400 text-xs">Experts ensure performance</p>
                    </div>
                </div>
            </div>
            {/* CTA BANNER */}
            <div className="mt-10 w-full px-[15px] mb-[25px]">
                <div
                    className="relative rounded-2xl overflow-hidden w-full max-w-7xl mx-auto mb-20"
                    style={{
                        backgroundImage: `url('/assets/Banner.png')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        height: "450px", 
                        borderRadius: "25px",
                    }}
                >
                </div>
            </div>
            <footer className="w-full bg-[#0B0E16] text-white py-14">
                <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 px-6">
                    {/* Left */}
                    <div>
                        <img src="/assets/logo.png" className="w-[110px]" />
                        <p className="text-gray-400 text-sm mt-3 leading-loose overflow-hidden select-none">
                            TCAB offers a fully built ride- <br />
                            sharing platform, enabling you to <br />
                            launch your business right away.
                        </p>
                    </div>
                    {/* Middle */}
                    <div>
                        <h4 className="font-semibold mb-3">Quick Links</h4>
                        <ul className="text-gray-400 text-sm space-y-2">
                            <li>
                                <Link
                                    to="/"
                                    className="hover:text-white transition"
                                >
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/pricing"
                                    className="hover:text-white transition"
                                >
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/demo"
                                    className="hover:text-white transition"
                                >
                                    Demo
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/#faq"
                                    className="hover:text-white transition"
                                >
                                    FAQs
                                </Link>
                            </li>
                        </ul>
                    </div>
                    {/* Right */}
                    <div>
                        <h4 className="font-semibold mb-3">Contact Us</h4>
                        <p className="text-gray-400 text-sm">+91 98709 29313</p>
                        <p className="text-gray-400 text-sm mt-1">support@tcab.com</p>

                        <div className="flex gap-4 mt-6 select-none">
                            <img src="/assets/appstore.png" className="w-[140px] hover:opacity-90 cursor-pointer" />
                            <img src="/assets/playstore.png" className="w-[140px] hover:opacity-90 cursor-pointer" />
                        </div>
                    </div>
                </div>
                <hr className="border-white/20 mt-10" />
                <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-xs mt-5 px-6">
                    {/* COPYRIGHT TEXT */}
                    <p className="mb-3 md:mb-0">
                        © Copyright 2025. All rights reserved by <span className="text-white">TCAB</span>
                    </p>
                    
                    {/* LEGAL LINKS */}
                    <div className="flex items-center gap-4 mb-3 md:mb-0">
                        <a href="https://www.tcab.cloud/terms" className="hover:text-white hover:underline transition">
                            Terms &amp; Conditions
                        </a>
                        <span>|</span>
                        <a href="https://www.tcab.cloud/privacy" className="hover:text-white hover:underline transition">
                            Privacy Policy
                        </a>
                    </div>
                    
                    {/* SOCIAL ICONS */}
                    <div className="flex items-center gap-4 text-white text-lg">
                        <Twitter className="cursor-pointer hover:text-blue-400 transition" />
                        <Instagram className="cursor-pointer hover:text-pink-400 transition" />
                        <Facebook className="cursor-pointer hover:text-blue-500 transition" />
                        <Github className="cursor-pointer hover:text-gray-200 transition" />
                    </div>
                </div>
            </footer>
        </section>
    );
}