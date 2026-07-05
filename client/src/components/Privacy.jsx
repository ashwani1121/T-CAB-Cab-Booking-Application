import React from "react";
import imgl from '../assets/T cab logo.svg';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with gradient */}
      <header style={{background: 'linear-gradient(to right, #032677, #012e9a)'}} className="py-4 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img src={imgl} alt="TCabs Logo" className="h-10 w-auto" />
          <nav className="flex gap-6 text-white font-medium">
            <a href="/" className="hover:underline">Home</a>
            <a href="/demos" className="hover:underline">Demos</a>
            <a href="/contact" className="hover:underline">Contact</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-white">
        <div className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
         

          <p className="mb-4">
            Welcome to <span className="font-semibold">TCabs</span> ("we", "us",
            or "our"). We are committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, share, and protect your
            information when you use our riding and parcel delivery application
            ("Service").
          </p>
          <p className="mb-4">
            By using TCabs, you agree to the collection and use of information in
            accordance with this Privacy Policy. If you do not agree, please do
            not use the Service.
          </p>

          {/* 1. Information We Collect */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            1. Information We Collect
          </h2>
          <p className="mb-3">
            We collect different types of information to provide and improve our
            Service.
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            1.1 Information You Provide to Us
          </h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>
              <span className="font-semibold">Account Information:</span> Name,
              mobile number, email address (if provided), and profile photo (if
              uploaded).
            </li>
            <li>
              <span className="font-semibold">Ride &amp; Parcel Details:</span>{" "}
              Pickup and drop locations, parcel description (if provided), and
              any special instructions.
            </li>
            <li>
              <span className="font-semibold">Support &amp; Feedback:</span>{" "}
              Messages, reviews, ratings, and any documents or screenshots you
              share with support.
            </li>
          </ul>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            1.2 Information We Collect Automatically
          </h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>
              <span className="font-semibold">Location Data:</span> Your
              approximate or precise location (depending on device permissions) to
              show nearby drivers, track rides, and provide accurate pickup and
              drop-off. Drivers' location data is collected during active duty for
              route tracking and safety.
            </li>
            <li>
              <span className="font-semibold">Device &amp; Usage Data:</span>{" "}
              Device model, operating system, app version, IP address, language,
              and time zone, plus app usage details such as pages viewed and time
              spent.
            </li>
            <li>
              <span className="font-semibold">Log Data:</span> Date and time of
              access, app crashes, performance logs, and diagnostic data.
            </li>
          </ul>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            1.3 Payment Information
          </h3>
          <p className="mb-4">
            Payments may be processed by third-party payment gateways. We do not
            store your full card details. Limited payment information (such as
            last 4 digits, transaction ID, and payment status) may be stored to
            identify payments and resolve issues.
          </p>

          {/* 2. How We Use Your Information */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            2. How We Use Your Information
          </h2>
          <p className="mb-3">We use your information to:</p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>
              Provide and operate the Service, including managing accounts,
              connecting riders with drivers, and tracking rides and deliveries.
            </li>
            <li>
              Improve user experience by optimizing routes, pricing, and app
              performance.
            </li>
            <li>
              Communicate with you, including booking confirmations, status
              updates, and important notifications.
            </li>
            <li>
              Offer customer support, handle complaints, and resolve disputes.
            </li>
            <li>
              Enhance security, prevent fraud, and enforce our Terms &amp;
              Conditions.
            </li>
            <li>
              Comply with legal obligations, regulations, and law enforcement
              requests.
            </li>
          </ul>

          {/* 3. Sharing Your Information */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            3. Sharing Your Information
          </h2>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            3.1 With Drivers &amp; Delivery Partners
          </h3>
          <p className="mb-4">
            To complete your ride or parcel delivery, we share certain information
            with drivers, such as your name or display name, pickup and drop
            locations, contact number (or masked calls), and parcel details if
            needed.
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            3.2 With Service Providers
          </h3>
          <p className="mb-4">
            We may share information with trusted third-party providers who help
            us operate the Service, including payment processors, SMS/email
            providers, analytics services, and cloud hosting providers. They are
            required to protect your data and use it only for the services they
            provide.
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            3.3 For Legal Reasons
          </h3>
          <p className="mb-4">
            We may disclose your information if required by law, regulation, or
            legal process, or to respond to lawful requests by public authorities,
            or to protect our rights, privacy, safety, or property, and that of
            our users, drivers, or the public.
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            3.4 Business Transfers
          </h3>
          <p className="mb-4">
            If TCabs is involved in a merger, acquisition, or sale of assets, your
            information may be transferred as part of that transaction. We will
            take steps to ensure your privacy is protected.
          </p>

          {/* 4. Data Retention */}
          <h2 className="text-xl font-semibold mt-8 mb-3">4. Data Retention</h2>
          <p className="mb-4">
            We retain your information for as long as necessary to provide the
            Service, comply with legal obligations, resolve disputes, and enforce
            our agreements. When data is no longer required, we will delete or
            anonymize it within a reasonable period.
          </p>

          {/* 5. Your Rights & Choices */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            5. Your Rights &amp; Choices
          </h2>
          <p className="mb-3">
            Depending on your location and applicable law, you may have the right
            to:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate or incomplete information.</li>
            <li>
              Request deletion of your data, subject to legal and contractual
              limitations.
            </li>
            <li>Restrict or object to certain types of data processing.</li>
            <li>
              Withdraw consent where processing is based on your consent, without
              affecting prior processing.
            </li>
          </ul>
          <p className="mb-4">
            To exercise these rights, please contact us using the details in the{" "}
            <span className="font-semibold">Contact Us</span> section. We may need
            to verify your identity before processing your request.
          </p>

          {/* 6. Cookies & Tracking Technologies */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            6. Cookies &amp; Tracking Technologies
          </h2>
          <p className="mb-4">
            If you access TCabs through a website or web app, we may use cookies
            or similar technologies to keep you logged in, remember your
            preferences, and analyze usage. You can manage cookies through your
            browser settings, but some features may not function properly if
            cookies are disabled.
          </p>

          {/* 7. Data Security */}
          <h2 className="text-xl font-semibold mt-8 mb-3">7. Data Security</h2>
          <p className="mb-4">
            We use reasonable technical and organizational measures to protect
            your data, including encrypted connections (HTTPS), access controls,
            and regular security monitoring. However, no method of transmission or
            storage is 100% secure, and we cannot guarantee absolute security. You
            are responsible for keeping your account details confidential.
          </p>

          {/* 8. Children's Privacy */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            8. Children's Privacy
          </h2>
          <p className="mb-4">
            Our Service is not intended for children under 18 years of age. We do
            not knowingly collect personal data from children under 18. If you
            believe a child has provided us with personal data, please contact us
            so we can take appropriate action.
          </p>

          {/* 9. Third-Party Links & Services */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            9. Third-Party Links &amp; Services
          </h2>
          <p className="mb-4">
            Our app may contain links to third-party websites or services (such as
            maps, payment gateways, or social media). We are not responsible for
            their privacy practices. We encourage you to review the privacy
            policies of those third-party services before providing any personal
            information.
          </p>

          {/* 10. Changes to This Privacy Policy */}
          <h2 className="text-xl font-semibold mt-8 mb-3">
            10. Changes to This Privacy Policy
          </h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. When we do, we
            will update the "Last updated" date above and, where appropriate,
            notify you through the app or by other means. Your continued use of
            the Service after changes are made means you accept the updated
            Privacy Policy.
          </p>

          {/* 11. Contact Us */}
          <h2 className="text-xl font-semibold mt-8 mb-3">11. Contact Us</h2>
          <p className="mb-2">
            If you have any questions, concerns, or requests related to this
            Privacy Policy or your data, you can contact us at:
          </p>
          <ul className="list-none space-y-1 mb-10">
            <li>
              <span className="font-semibold">Name:</span> TCabs Support
            </li>
            <li>
              <span className="font-semibold">Email:</span> www.tcab.cloud
            </li>
            <li>
              <span className="font-semibold">Phone:</span> +91 89719-21813
            </li>
         
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-gray-200 mt-6 md:mt-10" style={{background: 'linear-gradient(to right, #032677, #012e9a)'}}>
        {/* Top section */}
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          
          {/* Brand + description */}
          <div>
            <img src={imgl} alt="logo" className="h-10 w-auto" />
            <p className="text-sm text-gray-400">
              Delivering fast, reliable rides and parcel services with real-time tracking and seamless booking.
            </p>
          </div>

          {/* Important Links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase mb-3 text-gray-300">
              Important
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.tcab.cloud/terms"
                  className="hover:text-white hover:underline cursor-pointer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a
                  href="https://www.tcab.cloud/privacy"
                  className="hover:text-white hover:underline cursor-pointer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy &amp; Policy
                </a>
              </li>
              <li>
                <a
                  href="https://www.tcab.cloud/signin"
                  className="hover:text-white hover:underline cursor-pointer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Demos
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase mb-3 text-gray-300">
              Contact Us
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://tcab.cloud/signin" className="hover:text-white hover:underline">
                  www.tcab.cloud
                </a>
              </li>
              <li>
                <a href="tel:+918971921813" className="hover:text-white hover:underline">
                  +91 8971921813
                </a>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase mb-3 text-gray-300">
              Features
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a className="hover:text-white cursor-pointer">
                  Real-Time Tracking
                </a>
              </li>
              <li>
                <a className="hover:text-white cursor-pointer">
                  Parcel Delivery in Time
                </a>
              </li>
              <li>
                <a className="hover:text-white cursor-pointer">
                  Safe &amp; Affordable
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-400">
            <p className="text-center md:text-left">
              &copy; 2025 TCabs. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="https://www.tcab.cloud/terms" className="hover:text-white hover:underline">
                Terms &amp; Conditions
              </a>
              <a href="https://www.tcab.cloud/privacy" className="hover:text-white hover:underline">
                Privacy &amp; Policy
              </a>
              <a href="#contact" className="hover:text-white hover:underline">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}