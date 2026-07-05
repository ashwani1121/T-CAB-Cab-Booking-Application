import { useState } from "react";
import {
  Plus,
  Minus,
  Headphones,
  RefreshCw,
  Award,
  Users,
  Instagram,
  Twitter,
  Facebook,
  Github
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Pricing() {
  const [openIndex, setOpenIndex] = useState(null);

  const faq = [
    { question: "Is there a free trial available?", answer: "Yes, you can try TCAB free for 30 days." },
    { question: "Can I change my plan later?", answer: "You can upgrade or downgrade anytime." },
    { question: "What is your cancellation policy?", answer: "Cancel anytime. Access remains until billing cycle ends." },
    { question: "Can other info be added to an invoice?", answer: "Yes, GST + Company details + Billing address can be added." },
    { question: "How does billing work?", answer: "You can choose monthly or yearly secure billing." },
    { question: "How do I change my account email?", answer: "Go to Profile → Settings → Change Email." }
  ];

  return (
    <section className="w-full bg-white">

      {/* ============================================ */}
      {/* HERO SECTION WITH IMAGE BG        */}
      {/* ============================================ */}
      <div
        className="w-full h-[650px] bg-cover bg-center bg-no-repeat text-white flex items-center overflow-hidden select-none"
        style={{
          backgroundImage: `url('/assets/Pricing.png')`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 pr-[750px]">

          {/* Heading */}
          <h1
            className="
              font-sora
              font-light
              text-[48px]
              leading-[140%]
              tracking-[0.15px]
              text-white
            "
          >
            Launch Your Ride <br />
            Sharing App – Try the <br />
            Free Demo
          </h1>

          {/* Description */}
          <p
            className="
              font-productSansLight
              font-light
              text-[20px]
              leading-[140%]
              tracking-[0.15px]
              text-white/90
              max-w-xl
              mt-4
            "
          >
            See how our complete ride-sharing system works in real <br />
            time. Test the overview, booking flow, tracking, and more.
          </p>

          {/* --- ADDED BUTTON HERE --- */}
          <div className="mt-8">
            <a
              href="https://tcab.cloud/signin"
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-block
                px-8
                py-3
                bg-white
                text-[#0055FF]
                font-semibold
                text-lg
                rounded-md
                shadow-lg
                hover:bg-gray-100
                transition-all
                duration-300
              "
            >
              View Demo
            </a>
          </div>

        </div>
      </div>

      {/* ============================================ */}
      {/* DEMO TITLE + DESCRIPTION         */}
      {/* ============================================ */}

      <h1
        className="
          font-sora 
          font-semibold 
          text-[32px] 
          leading-[140%] 
          tracking-[0.15px] 
          text-center 
          text-black
          mt-[50px]
          select-none
        "
      >
        Test the Demo Yourself
      </h1>

      <p
        className="
          font-productSansLight
          font-light
          text-[16px]
          leading-[100%]
          tracking-[0.4px]
          text-center
          text-gray-600
          select-none
        "
      >
        Take a tour of the rider app, driver app, and admin <br />
        dashboard. Test features and see how our system <br />
        works in real time.
      </p>

      {/* DEMO IMAGE */}
      
      <div className="w-full max-w-7xl mx-auto mt-16 px-[15px] select-none">
        <img
          src="/assets/demof.png"
          alt="Demo Overview"
          className="w-full h-auto rounded-2xl shadow-lg object-contain"
        />
      </div>

      {/* ============================================ */}
      {/* FAQ SECTION               */}
      {/* ============================================ */}
      <div className="max-w-5xl mx-auto py-20 text-center px-6 select-none">
        <h2 className="font-sora font-semibold text-[36px] leading-[140%] tracking-[0.15px] text-black mb-2">
          Frequently asked questions
        </h2>

        <p className="font-productSansLight font-light text-[18px] leading-[100%] tracking-[0.4px] text-gray-500 mt-3">
          Everything you need to know about the product and billing.
        </p>

        <div className="space-y-6 mt-10">
          {faq.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="border-b pb-4">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex justify-between items-center text-left"
                >
                  <span className="font-sora font-semibold text-[18px] leading-[130%] text-gray-800">
                    {item.question}
                  </span>
                  {isOpen ? (
                    <Minus className="text-gray-500 text-xl" />
                  ) : (
                    <Plus className="text-gray-500 text-xl" />
                  )}
                </button>

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

      {/* ============================================ */}
      {/* WHY CHOOSE TCAB               */}
      {/* ============================================ */}
      <div className="max-w-6xl mx-auto text-center py-16 select-none">
        <h3 className="text-[22px] font-bold text-black ">Why Choose TCAB?</h3>
        <p className="text-gray-500 text-sm mt-1">
          Everything you need to know about the product and billing.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mt-10 text-center">
          <div>
            <Award className="text-blue-600 w-8 h-8 mx-auto" />
            <p className="font-semibold text-sm mt-2">
              98% approval success rate
            </p>
            <p className="text-gray-400 text-xs">
              Highest success rate in the industry
            </p>
          </div>

          <div>
            <Headphones className="text-blue-600 w-8 h-8 mx-auto" />
            <p className="font-semibold text-sm mt-2">24/7 support</p>
            <p className="text-gray-400 text-xs">Round-the-clock support</p>
          </div>

          <div>
            <RefreshCw className="text-blue-600 w-8 h-8 mx-auto" />
            <p className="font-semibold text-sm mt-2">Quick settlements</p>
            <p className="text-gray-400 text-xs">Fast refund processing</p>
          </div>

          <div>
            <Users className="text-blue-600 w-8 h-8 mx-auto" />
            <p className="font-semibold text-sm mt-2">Dedicated experts</p>
            <p className="text-gray-400 text-xs">Expert support team</p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* CTA BANNER                    */}
      {/* ============================================ */}
      <div className="w-full px-[15px] mb-[25px]">
        <div className="w-full max-w-7xl mx-auto mb-20 rounded-2xl overflow-hidden select-none">
          <img
            src="/assets/pricing-banner.png"
            alt="Pricing CTA Banner"
            className="w-full h-auto rounded-2xl object-contain"
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* FOOTER                      */}
      {/* ============================================ */}
      <footer className="w-full bg-[#0B0E16] text-white py-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 px-6 select-none">
          <div>
            <img src="/assets/logo.png" className="w-[110px]" />
            <p className="text-gray-400 text-sm mt-3 leading-loose">
              TCAB offers a fully built ride- <br />
              sharing platform, enabling you to <br />
              launch your business right away.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>

            <ul className="text-gray-400 text-sm space-y-2">
              <li>
                <Link to="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>

              <li>
                <Link to="/pricing" className="hover:text-white transition">
                  Pricing
                </Link>
              </li>

              <li>
                <Link to="/demo" className="hover:text-white transition">
                  Demo
                </Link>
              </li>

              <li>
                <Link to="/#faq" className="hover:text-white transition">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Contact Us</h4>
            <p className="text-gray-400 text-sm">+91 98709 29313</p>
            <p className="text-gray-400 text-sm mt-1">support@tcab.com</p>

            <div className="flex gap-4 mt-6 select-none">
              <img
                src="/assets/appstore.png"
                className="w-[140px] hover:opacity-90 cursor-pointer"
              />
              <img
                src="/assets/playstore.png"
                className="w-[140px] hover:opacity-90 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <hr className="border-white/20 mt-10" />

        <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-xs mt-5 px-6">
          <p>© Copyright 2025 TCAB. All rights reserved.</p>
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