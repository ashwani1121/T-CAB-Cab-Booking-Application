export default function FeatureShowcase() {
  return (
    <section className="w-full bg-white py-20">

      {/* Top Heading */}
      <div className="max-w-6xl mx-auto text-center px-6 select-none">

        <h2 className="font-sora font-semibold text-4xl leading-[140%] tracking-[0.15px] text-black">
          T Cab Ride Sharing Software
        </h2>

        <p className="font-productSans font-light text-[16px] leading-[130%] tracking-[0.4px] text-gray-500 max-w-lg mx-auto mt-3">
          TCAB provides an end-to-end ride-sharing solution designed to meet the needs of drivers,
          customers, and administrators.
        </p>

      </div>

      {/* FEATURE IMAGE + BUTTON */}
      <div className="max-w-6xl mx-auto mt-12 relative">

        {/* Feature Image */}
        <img
          src="/assets/Featureframe.png"
          alt="TCAB Feature Set"
          className="w-full rounded-2xl shadow-xl"
        />

        {/* Overlapping Button */}
        <button
          className="
            absolute left-1/2 -translate-x-1/2 
            -bottom-20 px-8 py-3 bg-black text-white rounded-lg font-semibold
            shadow-xl border border-white
            hover:bg-gray-800 transition-all duration-200
            flex items-center gap-2
          "
        >
          View Demo

          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Extra space so button doesn’t overlap next section */}
      <div className="h-24"></div>

    </section>
  );
}
