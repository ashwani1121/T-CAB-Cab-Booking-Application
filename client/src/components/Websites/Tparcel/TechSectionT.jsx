export default function TechSection() {
  return (
    <section
      className="w-full py-24"
      style={{ background: "linear-gradient(180deg, #0055FF 0%, #0038A8 100%)" }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 px-8 items-center text-white select-none">

        {/* LEFT CONTENT */}
        <div>
          <h2 className="text-4xl font-bold leading-snug">
            Powered by next-gen tech for <br />
            flawless experiences—any <br />
            device, any platform
          </h2>

          <p className="mt-5 text-[15px] text-white/80 leading-relaxed max-w-lg">
            Our cutting-edge technology ensures lightning-fast performance, secure
            transactions, and a consistently smooth experience—no matter what
            device or platform your users prefer. Our system is built to handle
            high-traffic demands, deliver instant updates, and provide seamless
            interactions—so your customers enjoy faster rides, your drivers stay
            fully informed, and your business grows without limitations.
          </p>

          <button className="mt-8 bg-white text-[#0055FF] px-8 py-3 rounded-md font-semibold shadow hover:bg-gray-100 transition">
            Buy Now
          </button>
        </div>

        {/* RIGHT — Single Image */}
        <div className="flex justify-center">
          <img
            src="/assets/features.png"
            alt="Tech Feature Graphic"
            className="w-[380px] md:w-[450px] drop-shadow-xl"
          />
        </div>

      </div>
    </section>
  );
}
