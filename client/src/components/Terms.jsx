import React, { useEffect } from 'react';
import imgl from '../assets/T cab logo.svg';

export default function Terms(){
  return(
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
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
          <p className="mb-6">
            Welcome to TCabs. By using our riding and parcel delivery services, you agree to the following terms and conditions. Please read them carefully.
          </p>

          {/* 1. USE OF SERVICE */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">1. Use of the Service</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must be at least 18 years old to use the Service.</li>
              <li>You agree to provide accurate, complete, and current information when booking a ride or delivery.</li>
              <li>You are responsible for keeping your account and OTP/password secure.</li>
            </ul>
          </section>

          {/* 2. RIDES & PARCEL DELIVERIES */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">2. Rides & Parcel Deliveries</h2>
            <p className="mb-2">Our services include:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
              <li>Local rides</li>
              <li>Parcel pickup and delivery</li>
            </ul>
            <p className="mb-2">Delivery and arrival times may vary due to traffic, weather, or other conditions.</p>
            <p className="mb-2">You agree NOT to send prohibited items, including:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
              <li>Weapons, explosives, or flammable materials</li>
              <li>Drugs, alcohol, or restricted substances</li>
              <li>Stolen goods or counterfeit items</li>
            </ul>
            <p>TCabs reserves the right to cancel a ride or delivery if illegal or unsafe items are suspected.</p>
          </section>

          {/* 3. PAYMENTS */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">3. Payments & Charges</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Prices are shown in the app before you confirm your booking.</li>
              <li>By confirming, you agree to pay all applicable charges and taxes.</li>
              <li>Cancellation fees may apply if the driver is already assigned or waiting at pickup.</li>
            </ul>
          </section>

          {/* 4. USER CONDUCT */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">4. User Conduct</h2>
            <p className="mb-2">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Harass or harm drivers, support staff, or other users.</li>
              <li>Damage vehicles or property.</li>
              <li>Use the service for illegal or fraudulent activities.</li>
              <li>Attempt to hack or disrupt the app or servers.</li>
            </ul>
          </section>

          {/* 5. SAFETY */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">5. Safety</h2>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
              <li>Always verify vehicle and driver details before starting a ride.</li>
              <li>Wear helmets and follow local traffic laws.</li>
              <li>Ensure parcels are packed safely and properly.</li>
            </ul>
            <p>TCabs is not liable for loss, damage, or injury caused by negligence or failure to follow safety rules.</p>
          </section>

          {/* 6. LIABILITY */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">6. Limitation of Liability</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We are not responsible for indirect, incidental, or consequential damages.</li>
              <li>Delays or failed deliveries caused by traffic, weather, or third parties are not our responsibility.</li>
              <li>Our total liability is limited to the amount paid for the specific ride or delivery.</li>
            </ul>
          </section>

          {/* 7. THIRD-PARTY PARTNERS */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">7. Third-Party Drivers & Partners</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Some services are provided by independent drivers/partners.</li>
              <li>We try to onboard trusted partners but cannot guarantee their performance.</li>
              <li>Disputes with drivers can be reported to support for mediation assistance.</li>
            </ul>
          </section>

          {/* 8. CHANGES */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">8. Changes to the Service & Terms</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We may update the Service (features, pricing, etc.) anytime.</li>
              <li>We may update these Terms periodically.</li>
              <li>Continued use means you accept updated Terms.</li>
            </ul>
          </section>

          {/* 9. TERMINATION */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">9. Account Termination</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We may suspend or terminate your account for violations or misuse.</li>
              <li>You may uninstall the app or request account deletion anytime.</li>
            </ul>
          </section>

          {/* 10. PRIVACY */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">10. Privacy</h2>
            <p>Your use of TCabs is governed by our Privacy Policy, which explains how we collect and protect your personal and location data.</p>
          </section>

          {/* 11. CONTACT */}
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
            <p className="mb-2">If you have any questions or complaints:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email: www.tcabs.cloud</li>
              <li>Phone: +91 8971921813</li>
            </ul>
          </section>
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