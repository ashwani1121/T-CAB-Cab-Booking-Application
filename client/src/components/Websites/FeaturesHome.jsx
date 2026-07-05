import {
  MapPin,
  Shield,
  Bell,
  PieChart,
  Truck,
  Clock,
  BarChart2,
  Settings,
} from "lucide-react";

export default function FeaturesHome() {
  const features = [
    {
      title: "Real-Time Tracking",
      desc: "Track your driver live with accurate GPS navigation and estimated arrival updates.",
      icon: <MapPin size={22} />,
    },
    {
      title: "Safety Tools",
      desc: "Access SOS alerts, trip sharing, and emergency contacts for safer travel every time.",
      icon: <Shield size={22} />,
    },
    {
      title: "Smart Ride Requests",
      desc: "Receive nearby ride requests with clear trip details and optimized route assignments.",
      icon: <Bell size={22} />,
    },
    {
      title: "Earnings Dashboard",
      desc: "Track daily income, bonuses, incentives, and completed trips all in one place.",
      icon: <PieChart size={22} />,
    },
    {
      title: "Fleet Management",
      desc: "Assign fleets, manage vehicle documents, approve registrations, and track performance.",
      icon: <Truck size={22} />,
    },
    {
      title: "Real-Time Trip Tracking",
      desc: "Admin can monitor active rides with analytics, driver & rider locations, and heatmaps.",
      icon: <Clock size={22} />,
    },
    {
      title: "Performance Insights",
      desc: "View trends, completion stats, and driving behavior reports with smart filters.",
      icon: <BarChart2 size={22} />,
    },
    {
      title: "Configuration & Settings",
      desc: "Control fares, promo codes, notifications, zones, and ride categories as needed.",
      icon: <Settings size={22} />,
    },
  ];

  return (
    <section className="w-full bg-white py-20">
      <div className="max-w-7xl mx-auto px-6 text-center select-none">

        {/* Section Heading */}
        <h2 className="text-4xl font-bold text-gray-900">
          Essential Future-Ready Features
        </h2>

        <p className="text-gray-500 text-sm max-w-xl mx-auto mt-3 leading-relaxed">
          Transform your ride-sharing platform with powerful features designed for 
          speed, security, and seamless experiences.
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="
                flex flex-col items-start p-6 bg-white rounded-2xl 
                shadow-sm border border-gray-100
                hover:shadow-lg hover:-translate-y-1
                transition-all duration-300 cursor-default
              "
              role="article"
            >
              {/* Icon Box */}
              <div className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg mb-4">
                {feature.icon}
              </div>

              {/* Title */}
              <h4 className="text-lg font-semibold text-gray-900">
                {feature.title}
              </h4>

              {/* Description */}
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}