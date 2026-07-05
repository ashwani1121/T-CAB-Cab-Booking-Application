export default function Hero() {
  return (
    <section
      className="relative min-h-[720px] w-full overflow-hidden pt-24"
      style={{
        background: "linear-gradient(180deg, #0055FF 0%, #0038A8 100%)",
      }}
    >
      {/* Background Blueprint Pattern */}
      <img
        src="/assets/header-bg.png"
        alt="background pattern"
        className="absolute inset-0 w-full h-full object-cover opacity-25"
      />

      {/* Layout Wrapper */}
      <div className="max-w-7xl mx-auto px-[15px] grid md:grid-cols-2 gap-10 items-center relative z-20">

        {/* LEFT SECTION (TEXT BLOCK) */}
        <div className="text-white">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Complete Ride Sharing <br />
            and Parcel Delivery
          </h1>

          <p className="mt-4 text-lg text-white/90 max-w-md leading-relaxed">
            The TCAB ride-sharing software ensures a complete ride-sharing experience
            for all its users — drivers, customers, and admins.
          </p>

          {/* Buttons */}
          <div className="mt-6 flex gap-4">
            <button className="bg-white text-[#0055FF] font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition">
              Buy Now
            </button>
            <button className="border border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition">
              Explore Demo
            </button>
          </div>
        </div>

        {/* RIGHT SECTION (DEVICE PREVIEWS) */}
        <div className="relative flex justify-center md:justify-end">
          {/* Dashboard Behind */}
          <img
            src="/assets/dashboard.png"
            alt="dashboard"
            className="hidden md:block absolute -top-24 right-0 w-[360px] drop-shadow-xl"
          />

          {/* Mobile Screens */}
          <div className="flex gap-4">
            <img src="/assets/phone1.png" alt="phone1" className="w-[110px] md:w-[130px] translate-y-10 drop-shadow-xl" />
            <img src="/assets/phone2.png" alt="phone2" className="w-[110px] md:w-[150px] scale-110 drop-shadow-xl" />
            <img src="/assets/phone3.png" alt="phone3" className="w-[110px] md:w-[130px] translate-y-10 drop-shadow-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
