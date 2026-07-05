import { Instagram, Twitter, Facebook, Github } from "lucide-react";
import { Link } from "react-router-dom";

const Features = () => {
  return (
    <div className="w-full bg-white font-[Segoe_UI,Tahoma,Geneva,Verdana,sans-serif]">

      {/* TOP BLUE HEADER BAR (75px height) */}
      <div className="w-full h-[75px] bg-[#003BFF]"></div>

       {/* --- Section 1 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full">
          <img src="/assets/section_1.jpg" alt="Section 1 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 2 (Text + Image) --- */}
      <section className="w-full flex flex-col items-center justify-center py-16 px-[5%] bg-white">
        <div className="mb-8 text-center">
          <h2 className="text-[2.5rem] text-[#333] uppercase font-bold m-0">
            OUR PROGRESS
          </h2>
        </div>
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_2.jpg" alt="Section 2 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 3 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_3.jpg" alt="Section 3 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 4 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_4.png" alt="Section 4 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 5 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_5.jpg" alt="Section 5 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 6 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_6.jpg" alt="Section 6 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 7 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_7.jpg" alt="Section 7 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 8 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_8.jpg" alt="Section 8 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 9 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_9.jpg" alt="Section 9 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 10 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_10.jpg" alt="Section 10 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 11 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_11.jpg" alt="Section 11 View" className="w-full h-auto block" />
        </div>
      </section>

      {/* --- Section 12 --- */}
      <section className="w-full p-0 flex justify-center bg-white">
        <div className="w-full max-w-[1200px] flex justify-center">
          <img src="/assets/Section_12.png" alt="Section 12 View" className="w-full h-auto block" />
        </div>
      </section>


      {/* FINAL TCAB FOOTER (FIXED & WORKING)  */}
      <footer className="w-full bg-[#0B0E16] text-white py-14 select-none mt-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 px-6">
          
          {/* Left Section */}
          <div>
            <img src='./assets/logo.png' className="w-[110px]" />
            <p className="text-gray-400 text-sm mt-3 leading-loose">
              TCAB offers a fully built ride- <br />
              sharing platform, enabling you to <br />
              launch your business right away.
            </p>
          </div>

          {/* Middle Section */}
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/demo" className="hover:text-white">Demo</Link></li>
              <li><Link to="/#faq" className="hover:text-white">FAQs</Link></li>
            </ul>
          </div>

          {/* Right Section */}
          <div>
            <h4 className="font-semibold mb-3">Contact Us</h4>
            <p className="text-gray-400 text-sm">+91 98709 29313</p>
            <p className="text-gray-400 text-sm mt-1">support@tcab.com</p>

            <div className="flex gap-4 mt-6 select-none">
              <img src="./assets/appstore.png" className="w-[140px] hover:opacity-90 cursor-pointer" />
              <img src="./assets/playstore.png" className="w-[140px] hover:opacity-90 cursor-pointer" />
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

    </div>
  );
};

export default Features;