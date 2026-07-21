import Link from "next/link";
import { Phone, Users, ArrowRight } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-sm font-bold text-text-label uppercase tracking-widest mb-1">Agent Selection</h2>
        <p className="text-xs text-text-muted">Choose an agent interface to manage calls and transfers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <Link
          href="/agent-a"
          className="card group hover:bg-surface-hover transition-all duration-150"
        >
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-accent-red/15 flex items-center justify-center">
                <Phone className="w-5 h-5 text-accent-red" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main uppercase tracking-wide">Agent Alpha</h3>
                <p className="text-xs text-text-muted">First-line support</p>
              </div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Primary agent interface with live transcription, warm transfer, and call management.
            </p>
            <div className="flex items-center gap-1 text-xs text-accent-red group-hover:gap-2 transition-all">
              <span>Enter Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Link>

        <Link
          href="/agent-b"
          className="card group hover:bg-surface-hover transition-all duration-150"
        >
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main uppercase tracking-wide">Agent Bravo</h3>
                <p className="text-xs text-text-muted">Specialist transfers</p>
              </div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Specialist agent interface for handling warm transfers and complex customer inquiries.
            </p>
            <div className="flex items-center gap-1 text-xs text-accent-cyan group-hover:gap-2 transition-all">
              <span>Enter Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
