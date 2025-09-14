import Link from "next/link";
import { Phone, User, Users, Building2, Shield, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="w-12 h-12 text-blue-400 mr-4" />
            <h1 className="text-5xl font-bold text-white mb-4">
              Attack Capital
            </h1>
          </div>
          <h2 className="text-3xl font-semibold text-blue-200 mb-4">
            Investor Support System
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Professional warm transfer system for seamless investor support with AI-powered context sharing.
            Built with LiveKit, Groq LLM, and Twilio integration.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Investor Support */}
            <Link href="/investor" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-500/20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                    <TrendingUp className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    Investor Support
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Current investors can access portfolio support and compliance assistance.
                  </p>
                  <div className="bg-blue-500/10 rounded-lg p-3">
                    <p className="text-sm text-blue-200">
                      Portfolio access, K1 forms, compliance queries, and account management.
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Prospective Investor */}
            <Link href="/prospect" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-green-500/20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-colors">
                    <Building2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    Prospective Investor
                  </h3>
                  <p className="text-gray-300 mb-4">
                    New investors can connect with our General Partners for investment opportunities.
                  </p>
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <p className="text-sm text-green-200">
                      Investment opportunities, due diligence, and partnership discussions.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Support Specialist */}
            <Link href="/specialist" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-500/20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/30 transition-colors">
                    <User className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    Support Specialist
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Handle initial investor inquiries and route to appropriate experts.
                  </p>
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <p className="text-sm text-purple-200">
                      Access investor data, initiate transfers to Compliance or General Partners.
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Expert (Compliance/GP) */}
            <Link href="/expert" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-orange-500/20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500/30 transition-colors">
                    <Shield className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    Expert (Compliance/GP)
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Receive warm transfers with full context and investor information.
                  </p>
                  <div className="bg-orange-500/10 rounded-lg p-3">
                    <p className="text-sm text-orange-200">
                      AI-generated summaries, portfolio context, and seamless handoffs.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-blue-500/20">
              <h2 className="text-2xl font-semibold text-white mb-4">
                How It Works
              </h2>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mb-2">1</div>
                  <p className="text-gray-300">Investor connects to Support Specialist</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mb-2">2</div>
                  <p className="text-gray-300">Specialist initiates warm transfer</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mb-2">3</div>
                  <p className="text-gray-300">AI generates contextual summary</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center mb-2">4</div>
                  <p className="text-gray-300">Expert receives full context</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}