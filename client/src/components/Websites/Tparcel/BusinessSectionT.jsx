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
        Who is TPARCEL Designed For?
      </h1>

      <p
        className="
          font-productSansLight font-light text-[16px]
          leading-[100%] tracking-[0.4px]
          text-center text-gray-600
        "
      >
        TPARCEL is thoughtfully built to empower both business <br />
        founders with the tools they need.
      </p>

      {/* BUSINESS OWNER SECTION */}
      <div className="max-w-7xl mx-auto bg-[#F8FAFF] rounded-2xl p-10 flex flex-col md:flex-row items-center gap-10c mt-12">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-black">Business Owners</h2>

          <p className="text-gray-600 text-sm mt-2 leading-relaxed">
            Thinking about launching your own on-demand ride-sharing app?
            TPARCEL equips you with the perfect solution to turn your idea into a
            successful business.
          </p>

          <button className="mt-6 px-6 py-3 bg-black text-white rounded-md font-semibold hover:opacity-85 transition">
            Learn More
          </button>
        </div>

        <div className="flex-1 flex justify-end">
          <img
            src="/assets/owners.png"
            alt="Business Owners"
            className="w-[350px]"
          />
        </div>
      </div>

      {/* TESTIMONIAL SECTION */}
      <div className="relative max-w-7xl mx-auto px-[15px] py-20 overflow-hidden">

        {/* LEFT SIDE DOT PATH + CARS */}
<div className="absolute inset-y-0 left-0 w-1/2 pointer-events-none hidden lg:block">

  {/* TOP DOT PATH */}
  <svg
    className="absolute top-0 left-0 w-full h-[180px]"
    viewBox="0 0 700 180"
    fill="none"
  >
    <path
      d="
        M60 20
        V150
        Q60 165 90 165
        H700
      "
      stroke="#2563EB"
      strokeWidth="2"
      strokeDasharray="6 8"
      strokeLinecap="round"
    />
  </svg>

  {/* TOP CAR (TURNING RIGHT) */}
  <img
    src="/assets/car.png"
    alt="Car"
    className="
      absolute
      top-[135px]
      left-[110px]
      w-12
      rotate-90
    "
  />

  {/* BOTTOM DOT PATH */}
  <svg
  className="absolute bottom-0 left-0 w-full h-[180px]"
  viewBox="0 0 700 180"
  fill="none"
>
  <path
    d="
      M60 130
      V10
      Q60 2 90 2
      H700
    "
    stroke="#2563EB"
    strokeWidth="2"
    strokeDasharray="6 8"
    strokeLinecap="round"
  />
</svg>


  {/* BOTTOM CAR (TURNING LEFT) */}
  <img
    src="/assets/car.png"
    alt="Car"
    className="
      absolute
      bottom-[148px]
      left-[330px]
      w-12
      rotate-270
    "
  />
</div>

        {/* ===== END CAR + DOT SECTION ===== */}

        {/* CONTENT GRID */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* LEFT TEXT */}
          <div className="max-w-md">
            <h2 className="font-sora font-semibold text-[36px] leading-[140%] text-black">
              Trusted by Growing Ride-Sharing Businesses
            </h2>

            <p className="mt-4 font-productSans font-light text-[18px] leading-[140%] text-gray-600">
              A future-ready system that brings reliability, speed, and simplicity
              together. It helped businesses scale faster and deliver a premium
              customer experience.
            </p>
          </div>

          {/* RIGHT TESTIMONIAL CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {[
              {
                name: "Hritika Tiwari",
                img: "/assets/user1.png",
                text:
                  "TCAB helped us streamline our entire ride-sharing operation. The platform is stable, fast, and incredibly easy for our customers to use. It has truly elevated our business."
              },
              {
                name: "Aarav Mehta",
                img: "/assets/user2.png",
                text:
                  "From bookings to tracking to payments, TCAB delivers a seamless experience. Our efficiency improved and customer satisfaction went up instantly."
              },
              {
                name: "Rohan Kapoor",
                img: "/assets/user3.png",
                text:
                  "TCAB transformed our ride-sharing business with a smooth, reliable system that our customers love."
              },
              {
                name: "Rohan Kapoor",
                img: "/assets/user4.png",
                text:
                  "TCAB simplified our workflow and reduced our team’s workload dramatically."
              },
            ].map((item, i) => (
              <div
                key={i}
                className="
                  bg-linear-to-br from-blue-600 to-blue-800
                  rounded-2xl p-6 text-white shadow-xl
                  h-[320px]
                  flex flex-col
                "
              >
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-14 h-14 rounded-full border-4 border-white/30 object-cover"
                />

                <p className="mt-3 font-semibold">{item.name}</p>

                <div className="text-yellow-400 text-sm mt-1">★★★★★</div>

                <p
                  className="
                    mt-4
                    font-productSans
                    font-light
                    text-[16px]
                    leading-[120%]
                    tracking-normal
                    text-white/90
                  "
                >
                  “{item.text}”
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
