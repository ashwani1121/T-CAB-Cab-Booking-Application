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
    { question: "How do I change my account email?", answer: "Go to Profile → Settings → Change Email." },
  ];

  return (
    <section className="w-full bg-white">

      {/* HERO WITH YOUR NEW BACKGROUND IMAGE */}
      <div
        className="w-full h-[650px] bg-cover bg-center bg-no-repeat text-white flex items-center overflow-hidden select-none"
        style={{
          backgroundImage: `url('/assets/Pricing.png')`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 pr-[700px] ">

          {/* --- Updated Heading (Sora Light, 48px) --- */}
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
            We have got a plan <br /> that's perfect for you
          </h1>

          {/* --- Updated Description (Product Sans Light, 20px) --- */}
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
            The TCAB ride sharing software ensures a complete ride-sharing
            experience for all its users—drivers, customers, and the admin.
          </p>
          {/* --- Billing Toggle Box --- */}
          <div className="mt-10 flex items-center gap-4 ">

            {/* Toggle Container */}
            <div className="
      flex 
      items-center 
      bg-white/10 
      backdrop-blur-md 
      border border-white/20 
      rounded-full 
      p-1 
      overflow-hidden
    "
            >

              {/* Monthly Active */}
              <button
                className="
        px-5
        py-2 
        bg-white 
        text-blue-600 
        font-semibold 
        rounded-full
      "
              >
                Monthly
              </button>

              {/* Annually Inactive */}
              <button
                className="
        px-5
        py-2 
        text-white/80 
        font-light
      "
              >
                Annually
              </button>

            </div>

            {/* Save 25% Arrow + Text */}
            <div className="flex items-center gap-2">
              <img
                src="./assets/arrow.png"
                className="w-auto"
                alt="arrow"
              />
              <span className="text-white/90 text-sm">Save 25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* VERSION & PAYMENT IMAGES SECTION */}
        <div className="max-w-5xl mx-auto px-[15px] -mt-20 relative z-20">
        <img
          src="./assets/imgp.png"
          alt="Pricing Version"
          className="w-full rounded-2xl mb-12"
        />

        <img
          src="./assets/payment.png"
          alt="Payment Methods"
          className="w-full rounded-2xl"
        />
      </div> 

      {/* FAQ */} 
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
                  <span className="font-sora font-semibold text-[18px] text-gray-800">
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

      {/* WHY CHOOSE SECTION */}
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

      {/* CTA BANNER */}
      <div className="w-full px-[15px] mb-[25px] select-none">
        <div className="w-full max-w-7xl mx-auto mb-20 rounded-2xl overflow-hidden">
          <img
            src="./assets/pricing-banner.png"
            alt="Pricing CTA Banner"
            className="w-full h-auto rounded-2xl object-contain"
          />
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full bg-[#0B0E16] text-white py-14 select-none">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 px-6">
          <div>
            <img src='./assets/logo.png' className="w-[110px]" />
            <p className="text-gray-400 text-sm mt-3 leading-loose">
              TCAB offers a fully built ride- <br />
              sharing platform, enabling you to <br />
              launch your business right away.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>

            <ul className="text-gray-400 text-sm space-y-2">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/demo" className="hover:text-white">Demo</Link></li>
              <li><Link to="/#faq" className="hover:text-white">FAQs</Link></li>
            </ul>
          </div>

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
          <p>© Copyright 2025 TCAB. All rights reserved.</p>
          <div className="flex items-center gap-4 text-white text-lg">
            <Twitter />
            <Instagram />
            <Facebook />
            <Github />
          </div>
        </div>
      </footer>
    </section>
  );

}
