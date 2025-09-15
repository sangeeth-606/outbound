import Link from "next/link";
import { Building2, BarChart3, Phone, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="w-12 h-12 text-black mr-4" />
            <h1 className="text-5xl font-bold text-black mb-4">
              Attack Capital
            </h1>
          </div>
          <h2 className="text-3xl font-semibold text-black mb-4">
            Investor Support System
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professional warm transfer system for seamless investor support with AI-powered context sharing.
            Built with LiveKit, Groq LLM, and Twilio integration.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Link
              href="/caller"
              className="inline-block bg-black text-white font-bold text-xl py-6 px-12 rounded-lg shadow-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105"
            >
              Get Support
            </Link>
          </div>

          {/* Feature Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/analytics"
              className="group bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200 hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center justify-center mb-4">
                <BarChart3 className="w-12 h-12 text-black group-hover:text-gray-700 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Analytics Dashboard</h3>
              <p className="text-gray-600 text-sm">View transfer statistics, success rates, and real-time metrics with interactive charts</p>
            </Link>

            <Link
              href="/agent-a"
              className="group bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200 hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center justify-center mb-4">
                <Phone className="w-12 h-12 text-black group-hover:text-gray-700 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Agent Dashboard</h3>
              <p className="text-gray-600 text-sm">Access the enhanced agent interface with live transcription and transfer history</p>
            </Link>

            <Link
              href="/agent-b"
              className="group bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200 hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center justify-center mb-4">
                <Users className="w-12 h-12 text-black group-hover:text-gray-700 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Specialist Dashboard</h3>
              <p className="text-gray-600 text-sm">Specialized agent interface for handling complex customer inquiries</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}