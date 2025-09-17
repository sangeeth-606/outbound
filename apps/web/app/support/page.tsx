import Link from "next/link";
import { Building2, BarChart3, Phone, Users } from "lucide-react";

export default function AttackCapital() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Support Dashboard
          </h1>
          <p className="text-gray-600">
            Select your agent interface
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Feature Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/agent-a"
              className="group bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-400 rounded flex items-center justify-center group-hover:bg-red-500 transition-colors">
                  <Phone className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Agent Dashboard</h3>
              <p className="text-gray-600 text-sm">Access the enhanced agent interface with live transcription and transfer history</p>
            </Link>

            <Link
              href="/agent-b"
              className="group bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-400 rounded flex items-center justify-center group-hover:bg-red-500 transition-colors">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Specialist Dashboard</h3>
              <p className="text-gray-600 text-sm">Specialized agent interface for handling complex customer inquiries</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
