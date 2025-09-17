"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"

// Custom Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline"
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({ 
  variant = "default", 
  className = "", 
  children, 
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-gray-300 bg-white text-black hover:bg-gray-50"
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

// Custom Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className = "", ...props }) => {
  const baseClasses = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  
  return (
    <input className={`${baseClasses} ${className}`} {...props} />
  )
}

export default function Home() {
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    phone: "",
    accredited: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">AC</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Attack.Capital</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
                OUR FUNDS
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
                PRESENTATION
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
                INVESTORS
              </a>
              <Link href="/support" className="text-gray-700 hover:text-gray-900 font-medium">
                TEAM
              </Link>
              <Link href="/live-transcribe" className="text-gray-700 hover:text-gray-900 font-medium">
                LIVE TRANSCRIBE
              </Link>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link href="/caller">
                <Button
                  variant="outline"
                  className="hidden sm:inline-flex"
                >
                  SCHEDULE CALL
                </Button>
              </Link>
              <Button className="bg-red-400 hover:bg-red-500 text-white px-6">INVEST NOW</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-8">
                Join Attack Capital's
                <br />
                Access Fund
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Access the start-up asset class with a diversified, vetted group of seed-stage companies innovating in
                AI to climate tech from recent Y Combinator batches.
              </p>

              <p className="text-sm text-gray-500 mb-8">*For Accredited investors only</p>

              <Button className="bg-red-400 hover:bg-red-500 text-white px-8 py-3 text-lg">Become an Investor</Button>
            </div>

            <div className="text-xs text-gray-500 leading-relaxed">
              Note this portfolio was put together by Attack Capital and allocations granted by the individual
              companies, and is not sponsored by or endorsed by Y Combinator. "Y Combinator" is a registered trademark
              of Y Combinator, LLC.
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-8 text-white">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2 text-gray-900 drop-shadow-sm">
                Read our strategy of investing across a portfolio of Y Combinator backed startups
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              <Input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                className="border-0"
              />
              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className="border-0"
              />
              <Input
                type="tel"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="border-0"
              />
              <Input
                type="text"
                name="accredited"
                placeholder="Are You An Accredited Investor?"
                value={formData.accredited}
                onChange={handleInputChange}
                className="border-0"
              />
            </div>

            <Button className="w-full bg-white hover:bg-gray-100 text-black py-3 font-medium">
              Download Investor Presentation
            </Button>
          </div>
        </div>
      </main>

      {/* Bottom Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* 0% Management fee */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold text-gray-900 mb-2">0%</div>
            <div className="text-xl font-semibold text-gray-900 mb-4">Management fee</div>
            <p className="text-gray-600 leading-relaxed">
              Your entire capital is invested without any deductions for fund filing & management charges.
            </p>
          </div>

          {/* 20% Carried interest */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold text-gray-900 mb-2">20%</div>
            <div className="text-xl font-semibold text-gray-900 mb-4">Carried interest</div>
            <p className="text-gray-600 leading-relaxed">
              We take 20% out of the profits you make after we return your entire invested capital.
            </p>
          </div>

          {/* $10k Min. investment */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold text-gray-900 mb-2">$10k</div>
            <div className="text-xl font-semibold text-gray-900 mb-4">Min. investment</div>
            <p className="text-gray-600 leading-relaxed">
              Access investment opportunities only available to the top 1% by network & net worth.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="mb-4">
          <p className="text-red-400 font-medium text-sm tracking-wide uppercase mb-4">PERFORMANCE IS EVERYTHING</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-16">What our investors are saying</h2>
        </div>

        <div className="space-y-12 mb-12">
          {/* First Testimonial */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-left">
            <img
              src="/smiling-man-glasses-headshot.png"
              alt="Cory Hill"
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Attack Capital, a YC-backed startup, gives me access to a portfolio of YC deals that otherwise would not
                have been available through my network
              </p>
              <div className="flex items-center">
                <span className="text-red-400 font-medium mr-2">—</span>
                <span className="font-semibold text-red-400">Cory Hill,</span>
                <span className="text-gray-700 ml-1">Ex Engineer at Facebook</span>
              </div>
            </div>
          </div>

          {/* Second Testimonial */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-left">
            <img
              src="/professional-headshot-of-smiling-man-in-white-shir.jpg"
              alt="Varun Villait"
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                The Attack Capital team made it incredibly easy for me to add venture to my portfolio. The entire
                process, from expressing interest to wiring funds, has been first class. I had a chance to speak with
                Kaushik (GP) and loved his vision for the Demo Day fund.
              </p>
              <div className="flex items-center">
                <span className="text-red-400 font-medium mr-2">—</span>
                <span className="font-semibold text-red-400">Varun Villait,</span>
                <span className="text-gray-700 ml-1">CPO at People data labs</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-8">* Unpaid testimonials (they just love us that much)</p>

        <Button className="bg-white hover:bg-gray-100 text-black px-8 py-3 text-lg">
          Download Investor Presentation
        </Button>
      </section>

      {/* Our Investors Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-red-400 font-medium text-sm tracking-wide uppercase mb-4">BACKED BY THE BEST</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">Our investors</h2>
          </div>

          {/* Investor Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {/* Y Combinator */}
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-lg mb-4">
                  <span className="text-white text-2xl font-bold">Y</span>
                </div>
                <div className="text-orange-500 font-semibold text-lg">Combinator</div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">The #1 startup investor by unicorns funded</p>
            </div>

            {/* Slow Ventures */}
            <div className="text-center">
              <div className="mb-6">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">SLOW</div>
                  <div className="text-sm font-medium text-gray-600 tracking-wider">VENTURES</div>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Valley based fund led by past executives of Facebook.com
              </p>
            </div>

            {/* GFC */}
            <div className="text-center">
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-4">GFC</div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Germany based fund led by the billionaire Oliver Samwer.
              </p>
            </div>

            {/* Soma Capital */}
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-lg mb-4">
                  <span className="text-white text-2xl">👑</span>
                </div>
                <div className="text-purple-600 font-semibold text-lg">SOMA</div>
                <div className="text-purple-600 text-sm font-medium">CAPITAL</div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">Fund led by the owners of Sacramento Kings.</p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h3>

            <div className="space-y-4">
              {/* FAQ Item 1 - Expanded */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">
                      How does the Attack Capital Demo Day Fund work?
                    </h4>
                    <span className="text-gray-400 text-xl">−</span>
                  </div>
                </div>
                <div className="p-6 bg-gray-50">
                  <p className="text-gray-600">
                    Your investment is invested in companies in recent Y Combinator batches.
                  </p>
                </div>
              </div>

              {/* FAQ Item 2 */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">
                      Is the Demo Day Access Fund associated with YC?
                    </h4>
                    <span className="text-gray-400 text-xl">+</span>
                  </div>
                </div>
              </div>

              {/* FAQ Item 3 */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">How many investments will the fund make?</h4>
                    <span className="text-gray-400 text-xl">+</span>
                  </div>
                </div>
              </div>

              {/* FAQ Item 4 */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">
                      What terms does the Access fund typically invest on?
                    </h4>
                    <span className="text-gray-400 text-xl">+</span>
                  </div>
                </div>
              </div>

              {/* FAQ Item 5 */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">What is the carry?</h4>
                    <span className="text-gray-400 text-xl">+</span>
                  </div>
                </div>
              </div>

              {/* FAQ Item 6 */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">When are the capital calls?</h4>
                    <span className="text-gray-400 text-xl">+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Access Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* GET ACCESS heading */}
          <p className="text-red-400 font-medium text-sm tracking-wide uppercase mb-8">GET ACCESS</p>

          {/* Investor logos */}
          <div className="flex justify-center items-center gap-6 mb-12 flex-wrap">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">YC</span>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">👑</span>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">UV</span>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">a16z</span>
            </div>
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">Y</span>
            </div>
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">=</span>
            </div>
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">6VC</span>
            </div>
            <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">GFC</span>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">$</span>
            </div>
          </div>

          {/* Main heading */}
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8 text-balance">
            Co-invest with the best venture capitalists & family offices.
          </h2>

          {/* CTA Button */}
          <Button className="bg-red-400 hover:bg-red-500 text-white px-8 py-3 text-lg mb-16">Become an Investor</Button>

          {/* Footer Links Grid */}
          <div className="grid md:grid-cols-4 gap-8 text-left border-t border-gray-200 pt-12">
            {/* About Attack Capital */}
            <div>
              <h3 className="text-red-400 font-semibold text-sm tracking-wide uppercase mb-4">ABOUT ATTACK CAPITAL</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Attack Capital is a Y Combinator backed venture investing platform on a mission to expand co-investment
                opportunities for individual accredited investors with tier-1 venture capital firms.
              </p>

              {/* Contact Info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-red-400">
                  <span className="mr-2">📞</span>
                  <span>929-210-3809</span>
                </div>
                <div className="flex items-center text-red-400">
                  <span className="mr-2">✉️</span>
                  <span>ir@attack.capital</span>
                </div>
                <div className="flex items-center text-red-400">
                  <span className="mr-2">📍</span>
                  <span>650 Franklin Ave, Brooklyn, NY 11238</span>
                </div>
              </div>
            </div>

            {/* Invest */}
            <div>
              <h3 className="text-red-400 font-semibold text-sm tracking-wide uppercase mb-4">INVEST</h3>
              <div className="space-y-3">
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Download Presentation
                </a>
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Make an Investment
                </a>
              </div>
            </div>

            {/* Learn */}
            <div>
              <h3 className="text-red-400 font-semibold text-sm tracking-wide uppercase mb-4">LEARN</h3>
              <div className="space-y-3">
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Join our Newsletter
                </a>
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Know our portfolio
                </a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-red-400 font-semibold text-sm tracking-wide uppercase mb-4">COMPANY</h3>
              <div className="space-y-3">
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Founders
                </a>
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Linkedin
                </a>
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Twitter
                </a>
                <a href="#" className="block text-gray-600 hover:text-gray-900 text-sm">
                  Y Combinator
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white">
        {/* Copyright bar */}
        <div className="bg-gray-100 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-gray-500">
              © 2023 Better Financial Corporation • All Rights reserved • Terms & Conditions • Privacy Policy
            </p>
          </div>
        </div>

        {/* Legal content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-8">
            {/* Important Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">IMPORTANT INFORMATION</h3>
              <div className="space-y-4 text-sm leading-relaxed text-gray-300">
                <p>
                  All trademarks, logos and brand names are the property of their respective owners. All company,
                  product and service names used in this website are for identification purposes only. Use of these
                  names, trademarks and brands does not imply endorsement.
                </p>
                <p>
                  This page and the information contained herein is provided for informational and discussion purposes
                  only and is not intended to be a recommendation for any investment or other advice of any kind, and
                  shall not constitute or imply any offer to purchase, sell or hold any security or to enter into or
                  engage in any type of transaction.
                </p>
                <p>
                  Any financial projections or returns shown on the website are estimated predictions of performance
                  only, are hypothetical, are not based on actual investment results and are not guarantees of future
                  results. Estimated projections do not represent or guarantee the actual results of any transaction,
                  and no representation is made that any transaction will, or is likely to, achieve results or profits
                  similar to those shown. In addition, other financial metrics and calculations shown on the website
                  (including amounts of principal and interest repaid) have not been independently verified or audited
                  and may differ from the actual financial metrics and calculations for any investment, which are
                  contained in the investors' portfolios. Any investment information contained herein has been secured
                  from sources that Attack Capital believes are reliable, but we make no representations or warranties
                  as to the accuracy of such information and accept no liability therefore.
                </p>
                <p>
                  The Demo Day Access Fund is or will be a newly formed entity and has no operating history. Venture
                  investing involves a high degree of risk and is suitable only for sophisticated and qualified
                  accredited investors. Financial and operating risks confronting Startups are significant. While
                  targeted returns should reflect the perceived level of risk in any investment situation, such returns
                  may never be realized and/or may not be adequate to compensate an Investor or a Fund for risks taken.
                  Loss of an Investor's entire investment is possible and can easily occur. Moreover, the timing of any
                  return on investment is highly uncertain.
                </p>
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div>
              <h3 className="text-lg font-semibold mb-4">LEGAL DISCLAIMER</h3>
              <div className="text-sm leading-relaxed text-gray-300">
                <p>
                  The securities offered hereby have not been and will not be registered under the U.S. Securities Act
                  of 1933, as amended (the "Act"), or any state securities laws or blue sky laws or the laws of any
                  non-U.S. jurisdiction, and are being offered and sold in reliance on exemptions from the registration
                  requirements of the Act and state securities laws. The securities cannot be offered, sold or otherwise
                  transferred except in compliance with the Act. In addition, the securities cannot be sold or otherwise
                  transferred except in compliance with the applicable state securities or blue sky laws. The securities
                  have not been approved or disapproved by the SEC, any state securities commission or other regulatory
                  authority, nor have any of the foregoing authorities passed upon the merits of this offering or the
                  adequacy or accuracy of any other materials or information made available to subscriber in connection
                  with this offering. Any representation to the contrary is unlawful. The securities may only be
                  purchased by persons who are "accredited investors," as that term is defined in Section 501(a) of
                  Regulation D promulgated under the Act. View Private Placement Memorandum.
                </p>
              </div>
            </div>

            {/* Forward Looking Statements */}
            <div>
              <h3 className="text-lg font-semibold mb-4">FORWARD LOOKING STATEMENTS</h3>
              <div className="text-sm leading-relaxed text-gray-300">
                <p>
                  The offering materials may contain forward-looking statements and information relating to, among other
                  things, Better Financial Corporation DBA Attack, its business plan and strategy, and its industry.
                  These forward-looking statements are based on the beliefs of, assumptions made by, and information
                  currently available to the company's management. When used in the offering materials, the words
                  "estimate", "project", "believe", "anticipate", "intend", "expect" and similar expressions are
                  intended to identify forward-looking statements, which constitute forward looking statements. These
                  statements reflect management's current views with respect to future events and are subject to risks
                  and uncertainties that could cause Better Financial Corporation DBA Attack actual results to differ
                  materially from those contained in the forward-looking statements. Investors are cautioned not to
                  place undue reliance on these forward-looking statements, which speak only as of the date on which
                  they are made. Better Financial Corporation DBA Attack does not undertake any obligation to revise or
                  update these forward-looking statements to reflect events or circumstances after such date or to
                  reflect the occurrence of unanticipated events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
