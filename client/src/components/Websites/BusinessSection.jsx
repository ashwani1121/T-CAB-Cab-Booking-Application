export default function BusinessSection() {
  return (
    <section className="w-full py-15 bg-white overflow-hidden select-none">

      {/* TITLE */}
      <h1
        className="
          font-sora font-semibold text-[36px]
          leading-[140%] tracking-[0.15px]
          text-center text-black
        "
      >
        Who is TCAB Designed For?
      </h1>

      <p
        className="
          font-productSansLight font-light text-[16px]
          leading-[100%] tracking-[0.4px]
          text-center text-gray-600
        "
      >
        TCAB is thoughtfully built to empower both business <br />
        founders with the tools they need.
      </p>

      {/* BUSINESS OWNER SECTION */}
      <div className="max-w-7xl mx-auto bg-[#F8FAFF] rounded-2xl p-10 flex flex-col md:flex-row items-center gap-10 mt-12">

        {/* Text Block */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-black">Business Owners</h2>

          <p className="text-gray-600 text-sm mt-2 leading-relaxed">
            Thinking about launching your own on-demand ride-sharing app?
            TCAB equips you with the perfect solution to turn your idea into a
            successful business.
          </p>

          <button className="mt-6 px-6 py-3 bg-black text-white rounded-md font-semibold hover:opacity-85 transition">
            Learn More
          </button>
        </div>

        {/* Right Image */}
        <div className="flex-1 flex justify-end">
          <img src="/assets/owners.png" alt="Business Owners" className="w-[350px]" />
        </div>
      </div>

      {/* =============================== */}
      {/* FULL TESTIMONIAL IMAGE SECTION */}
      {/* =============================== */}
      <div className="max-w-7xl mx-auto mt-1 px-[15px]">
        <img
          src="/assets/testimonials.png"
          alt="Testimonials Section"
          className="w-full h-auto rounded-2xl "
        />
      </div>

    </section>
  );
}
