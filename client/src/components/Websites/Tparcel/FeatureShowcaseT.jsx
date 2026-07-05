export default function FeatureShowcase() {
  return (
    <section className="w-full bg-white py-20 select-none">

      {/* Top Heading */}
      <div className="max-w-6xl mx-auto text-center px-6">
        <h2 className="font-sora font-semibold text-4xl leading-[140%] tracking-[0.15px] text-black">
          T Parcel Delivery Software
        </h2>

        <p className="font-productSans font-light text-[16px] leading-[130%] tracking-[0.4px] text-gray-500 max-w-lg mx-auto mt-3">
          TParcel provides an end‑to‑end parcel delivery solution designed to meet the needs of couriers, senders, and administrators.
        </p>
      </div>

      {/* BACKGROUND WRAPPER */}
      <div className="max-w-7xl mx-auto mt-10 relative rounded-2xl overflow-hidden">

        {/* BACKGROUND IMAGE */}
        <img
          src="/assets/Features-set.png"
          alt="Feature background"
          className="w-full h-[1050px] object-cover rounded-2xl"
        />


        {/* GRID BOX CONTENT */}
        <div className="absolute inset-0 px-10 pt-10">

          {/* TITLE INSIDE BOX */}
          <h3 className="font-sora
    font-semibold
    text-[32px]
    leading-[140%]
    tracking-[0.15px]
    text-center
    flex
    items-center
    text-white">
            Here’s what TPARCEL brings to you
          </h3>

          <p className="font-productSans
    font-light
    text-[18px]
    leading-[100%]
    tracking-[0.4px]
    text-white/80
    mt-1
    flex
    items-center">
            TParcel offers a comprehensive parcel‑delivery solution tailored 
            <br/>
            to the needs of couriers, senders, and business owners.
          </p>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 ">

            {/* RIDER APPLICATION */}

            <div className="rounded-2xl border border-white/30 p-0 ">
              <div>
                <h3 className="font-sora
    font-semibold
    text-[24px]
    leading-[140%]
    tracking-[0.15px]
    text-center
    flex
    items-center
    text-white ml-5 mt-5">
                  User Application
                </h3>

                <p className="
    font-productSans
    font-light
    text-[16px]
    leading-[100%]
    tracking-[0.4px]
    text-white/80
    mt-2
    max-w-xs
    flex
    items-center
    ml-5
  "
                >
                  User can quickly request a pickup, track their courier in real time, and enjoy a safe, seamless delivery experience & more.
                </p>
              </div>


              <div className="h-[300px] mt-4 w-full relative hidden md:block">
                <img
                  src="/assets/driver-mobile.png"
                  alt="Rider app"
                  className="absolute bottom-0 right-1 object-contain h-full"
                />
              </div>
            </div>

            {/* DRIVER APPLICATION */}
            <div className="rounded-2xl border border-white/30 p-0 ">
              <div>
                <h3 className="font-sora
    font-semibold
    text-[24px]
    leading-[140%]
    tracking-[0.15px]
    text-center
    flex
    items-center
    text-white ml-5 mt-5">
                  Delivery Partner Application
                </h3>

                <p className="
    font-productSans
    font-light
    text-[16px]
    leading-[100%]
    tracking-[0.4px]
    text-white/80
    mt-2
    max-w-xs
    flex
    items-center
    ml-5
  "
                >
                  Delivery Partners receive delivery requests instantly, navigate easily, enjoy instant parcel booking, real-time tracking, and earn securely with every completed delivery.
                </p>
              </div>
              <div className="h-[300px] w-full relative hidden md:block">
                <img
                  src="/assets/driver-mobile.png"
                  className="absolute bottom-0 right-1 object-contain h-full"
                  alt="Driver app"
                />
              </div>
            </div>


            {/* ADMIN PANEL */}
            <div
              className="
    rounded-2xl
    border border-white/30
    flex flex-col md:flex-row
    justify-between md:col-span-2 
    h-full
  "
            >
              <div className="ml-5 mt-5">
                <h3
                  className="
        font-sora
    font-semibold
    text-[24px]
    leading-[140%]
    tracking-[0.15px]
    text-white
      "
                >
                  Admin panel
                </h3>

                <p
                  className="
        font-productSans
    font-light
    text-[16px]
    leading-[100%]
    tracking-[0.4px]
    text-white/80
    mt-2
      "
                >
                 Monitor live rides, track earnings, view user growth, and analyze performance — all in one simple, powerful dashboard.
                </p>
              </div>
              <div className="h-[300px]  w-full relative hidden md:block">
                <img
                  src="/assets/mackbookhome.png"
                  alt="Admin dashboard"
                  className="
      absolute bottom-0 right-1 object-contain h-full transalte-y-3  
    "
                />
              </div>
            </div>
          </div>


          {/* VIEW DEMO BUTTON */}
          <div className="w-full flex justify-center mt-10">
            <button
              className="
                px-6 py-3
                bg-white/10 text-white
                border border-white
                rounded-lg shadow-lg
                backdrop-blur-md
                flex items-center gap-2
                hover:bg-white/20
                transition
              "
            >
              View Demo
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
