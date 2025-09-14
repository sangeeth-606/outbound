import Link from "next/link";
import { Phone, User, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Warm Transfer Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Experience seamless call transfers with AI-powered context sharing between agents.
            Built with LiveKit, OpenAI, and Twilio.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Caller Role */}
            <Link href="/caller" className="group">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <Phone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    Join as Caller
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Start a call with Agent A and experience the warm transfer process.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      You'll be connected to Agent A first, then transferred to Agent B with full context.
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Agent A Role */}
            <Link href="/agent-a" className="group">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                    <User className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    Agent A
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Handle the initial call and initiate warm transfers to other agents.
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      You can transfer calls to Agent B or real phone numbers via Twilio.
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Agent B Role */}
            <Link href="/agent-b" className="group">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                    <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    Agent B
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Receive transferred calls with full context from Agent A.
                  </p>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      You'll receive AI-generated summaries of the previous conversation.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                How It Works
              </h2>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mb-2">1</div>
                  <p className="text-gray-600 dark:text-gray-300">Caller connects to Agent A</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mb-2">2</div>
                  <p className="text-gray-600 dark:text-gray-300">Agent A initiates transfer</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mb-2">3</div>
                  <p className="text-gray-600 dark:text-gray-300">AI generates call summary</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center mb-2">4</div>
                  <p className="text-gray-600 dark:text-gray-300">Agent B receives context</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}