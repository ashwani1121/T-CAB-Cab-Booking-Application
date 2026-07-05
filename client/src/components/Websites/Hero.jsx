export default function Hero() {
  return (
    <section
      className="relative w-full h-[750px] text-white flex items-center overflow-hidden select-none"
    >

      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0">
        <img
          src="/assets/header-bg.png"
          alt="Hero Banner"
          className="w-full h-full object-cover"
        />
      </div>


      {/* CONTENT WRAPPER */}
      <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

        {/* LEFT COLUMN – TEXT */}
        <div>
          <h1 className="font-sora font-light text-[48px] md:text-[60px] leading-[130%] tracking-[0.15px]">
            Complete Ride Sharing <br />
            and Parcel Delivery
          </h1>

          <p className="mt-4 text-white/90 max-w-lg font-light text-[18px] md:text-[20px] leading-[150%]">
            The TCAB ride sharing software ensures a complete ride sharing
            experience for all its users—drivers, customers, and the admin.
          </p>

          {/* BUTTON GROUP */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="bg-white text-[#0055FF] font-semibold px-7 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition-all">
              Explore Demo
            </button>

            <a href="tel:+918971921813">
              <button className="border border-white text-white px-7 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all">
                Call +91 89719 21813
              </button>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}

